import { useState, useEffect, useRef } from 'react';

const TRACE_TYPES = {
  'chat.completions':        { icon: '🧠', color: '#9b59ff', label: 'Chat' },
  'chat.completions.stream': { icon: '🌊', color: '#7c3aed', label: 'Stream' },
  'messages.create':         { icon: '🧠', color: '#ff8c42', label: 'Messages' },
  'messages.create.stream':  { icon: '🌊', color: '#e07830', label: 'Stream' },
  tool_use:                  { icon: '🔧', color: '#00b4d8', label: 'Tool Use' },
  retrieval:                 { icon: '📚', color: '#ff8c42', label: 'Retrieval' },
  decision:                  { icon: '⚖️', color: '#4ecdc4', label: 'Decision' },
  output:                    { icon: '📤', color: '#00e68a', label: 'Output' },
  error:                     { icon: '❌', color: '#ff4757', label: 'Error' },
  llm_call:                  { icon: '🧠', color: '#9b59ff', label: 'LLM Call' },
};

const PROVIDER_BADGES = {
  openai:    { label: 'OpenAI', color: '#10a37f', bg: 'rgba(16,163,127,0.12)' },
  anthropic: { label: 'Anthropic', color: '#d97757', bg: 'rgba(217,119,87,0.12)' },
  unknown:   { label: 'LLM', color: '#9b59ff', bg: 'rgba(155,89,255,0.12)' },
};

// Generate fallback demo trace data from observations (when no real traces exist)
function generateDemoTraces(observations, agents) {
  if (!observations?.length) return [];

  const traces = [];
  const agentMap = {};
  agents?.forEach(a => { agentMap[a.id] = a; });

  observations.slice(0, 10).forEach((obs, idx) => {
    const traceId = `trace-${obs.id?.slice(0, 8) || idx}`;
    const baseTime = new Date(obs.created_at || Date.now());
    const agentName = obs.agent_id ? (agentMap[obs.agent_id]?.name || 'agent') : 'content-writer';

    const spans = [
      {
        id: `${traceId}-root`,
        name: `${obs.type || 'task'}:process`,
        type: 'chat.completions',
        provider: 'openai',
        model: 'gpt-4o',
        startMs: 0,
        durationMs: 800 + Math.random() * 2000,
        depth: 0,
        tokens: { input: 120 + Math.floor(Math.random() * 500), output: 50 + Math.floor(Math.random() * 300) },
        status: obs.type === 'error' ? 'error' : 'success',
      },
      {
        id: `${traceId}-retrieve`,
        name: 'memory:recall',
        type: 'retrieval',
        provider: 'unknown',
        model: null,
        startMs: 50,
        durationMs: 150 + Math.random() * 300,
        depth: 1,
        tokens: null,
        status: 'success',
      },
      {
        id: `${traceId}-tool`,
        name: obs.type === 'deployment' ? 'deploy:execute' :
              obs.type === 'error' ? 'error:analyze' :
              obs.type === 'decision' ? 'decision:evaluate' :
              'tool:execute',
        type: 'tool_use',
        provider: 'unknown',
        model: null,
        startMs: 200 + Math.random() * 200,
        durationMs: 200 + Math.random() * 600,
        depth: 1,
        tokens: null,
        status: obs.type === 'error' ? 'error' : 'success',
      },
      {
        id: `${traceId}-output`,
        name: 'output:format',
        type: 'messages.create',
        provider: 'anthropic',
        model: 'claude-3.5-sonnet',
        startMs: 600 + Math.random() * 400,
        durationMs: 50 + Math.random() * 100,
        depth: 1,
        tokens: { input: 0, output: 30 + Math.floor(Math.random() * 80) },
        status: 'success',
      },
    ];

    traces.push({
      id: traceId,
      title: obs.title || 'Untitled trace',
      type: obs.type,
      agent: agentName,
      timestamp: baseTime.toISOString(),
      totalDurationMs: Math.max(...spans.map(s => s.startMs + s.durationMs)),
      totalTokens: spans.reduce((sum, s) => sum + (s.tokens?.input || 0) + (s.tokens?.output || 0), 0),
      cost: (Math.random() * 0.05 + 0.002).toFixed(4),
      spans,
      status: obs.type === 'error' ? 'error' : 'success',
      isDemo: true,
    });
  });

  return traces;
}

// Transform real API traces into the format the UI expects
function transformRealTraces(apiTraces) {
  if (!apiTraces?.length) return [];

  return apiTraces.map(t => {
    const spans = (t.spans || []).map((sp, idx) => {
      const traceStart = new Date(t.started_at);
      const spanStart = new Date(sp.started_at);
      const startMs = spanStart - traceStart;

      return {
        id: sp.span_id || sp.id,
        name: `${sp.provider}:${sp.type || 'call'}`,
        type: sp.type || 'chat.completions',
        provider: sp.provider || 'unknown',
        model: sp.model,
        startMs: Math.max(0, startMs),
        durationMs: sp.latency_ms || 0,
        depth: idx === 0 ? 0 : 1,
        tokens: { input: sp.prompt_tokens || 0, output: sp.completion_tokens || 0 },
        status: sp.status || 'success',
        error_message: sp.error_message,
        cost_usd: sp.cost_usd,
        metadata: sp.metadata,
      };
    });

    return {
      id: t.trace_id,
      title: t.name || 'Untitled trace',
      type: 'llm_call',
      agent: t.agent || 'auto-instrumented',
      timestamp: t.started_at || t.created_at,
      totalDurationMs: t.duration_ms || spans.reduce((max, s) => Math.max(max, s.startMs + s.durationMs), 0),
      totalTokens: t.total_tokens || 0,
      cost: parseFloat(t.total_cost_usd || 0).toFixed(4),
      spans,
      status: t.status || 'success',
      isDemo: false,
    };
  });
}

export default function TraceTimeline({ traces: apiTraces, traceStats, observations, agents, plan }) {
  const [displayTraces, setDisplayTraces] = useState([]);
  const [selectedTrace, setSelectedTrace] = useState(null);
  const [filter, setFilter] = useState('all');
  const containerRef = useRef(null);

  // Use real traces if available, otherwise fall back to demo data
  useEffect(() => {
    if (apiTraces?.length > 0) {
      setDisplayTraces(transformRealTraces(apiTraces));
    } else {
      setDisplayTraces(generateDemoTraces(observations, agents));
    }
  }, [apiTraces, observations, agents]);

  const hasRealData = apiTraces?.length > 0;

  const filteredTraces = filter === 'all'
    ? displayTraces
    : displayTraces.filter(t => t.status === filter);

  // Use real stats if available
  const totalCost = traceStats?.total_cost_usd ?? displayTraces.reduce((sum, t) => sum + parseFloat(t.cost), 0);
  const totalTokens = traceStats?.total_tokens ?? displayTraces.reduce((sum, t) => sum + t.totalTokens, 0);
  const avgLatency = traceStats?.avg_latency_ms ?? (displayTraces.length ? Math.round(displayTraces.reduce((sum, t) => sum + t.totalDurationMs, 0) / displayTraces.length) : 0);
  const totalSpans = traceStats?.total_spans ?? displayTraces.reduce((sum, t) => sum + (t.spans?.length || 0), 0);

  if (!observations?.length && !apiTraces?.length) {
    return (
      <div className="dash-empty" style={{ padding: 60 }}>
        <div className="dash-empty-icon">📊</div>
        <h4>Agent Traces</h4>
        <p>Capture observations or instrument your LLM calls to see detailed traces with timing, token usage, and cost analytics.</p>
        <div style={{
          marginTop: 16, padding: '12px 16px', background: 'rgba(155,89,255,0.06)',
          border: '1px solid rgba(155,89,255,0.15)', borderRadius: 10, fontSize: 12,
          color: 'rgba(255,255,255,0.5)', fontFamily: 'monospace', textAlign: 'left',
        }}>
          <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 10, marginBottom: 4 }}>// Quick start — add to your entry file</div>
          <div>import {'{'} AgentOS {'}'} from 'stoic-agentos-sdk';</div>
          <div>const os = new AgentOS({'{'} apiKey: 'sk_live_xxx' {'}'});</div>
          <div style={{ color: '#9b59ff' }}>os.instrument(); // ← patches OpenAI & Anthropic</div>
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} style={{ display: 'flex', flexDirection: 'column', gap: 16, height: '100%' }}>

      {/* Demo mode banner */}
      {!hasRealData && displayTraces.length > 0 && (
        <div style={{
          padding: '8px 14px', background: 'rgba(255,200,50,0.06)',
          border: '1px solid rgba(255,200,50,0.15)', borderRadius: 8,
          display: 'flex', alignItems: 'center', gap: 10, fontSize: 11,
          color: 'rgba(255,255,255,0.5)',
        }}>
          <span>⚡</span>
          <span>Showing simulated traces from observations. <strong style={{ color: 'rgba(255,255,255,0.7)' }}>Install the SDK</strong> for real LLM instrumentation data.</span>
        </div>
      )}

      {/* Stats Bar */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        {[
          { label: 'Total Traces', value: displayTraces.length, icon: '📊', color: '#9b59ff' },
          { label: 'Avg Latency', value: `${avgLatency}ms`, icon: '⚡', color: '#00b4d8' },
          { label: 'Total Tokens', value: totalTokens.toLocaleString(), icon: '🔤', color: '#ff8c42' },
          { label: 'Est. Cost', value: `$${parseFloat(totalCost).toFixed(3)}`, icon: '💰', color: '#00e68a' },
          ...(hasRealData ? [{ label: 'Total Spans', value: totalSpans, icon: '🔗', color: '#4ecdc4' }] : []),
        ].map((s, i) => (
          <div key={i} style={{
            flex: '1 1 130px', padding: '12px 16px', background: 'rgba(255,255,255,0.02)',
            border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10,
            display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <span style={{ fontSize: 18 }}>{s.icon}</span>
            <div>
              <div style={{ fontSize: 16, fontWeight: 800, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: 0.5 }}>{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Provider breakdown (real data only) */}
      {hasRealData && traceStats?.providers && Object.keys(traceStats.providers).length > 0 && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {Object.entries(traceStats.providers).map(([provider, data]) => {
            const badge = PROVIDER_BADGES[provider] || PROVIDER_BADGES.unknown;
            return (
              <div key={provider} style={{
                padding: '6px 12px', background: badge.bg,
                border: `1px solid ${badge.color}25`, borderRadius: 8,
                display: 'flex', alignItems: 'center', gap: 8,
              }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: badge.color }}>{badge.label}</span>
                <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>{data.calls} calls</span>
                <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>${data.cost.toFixed(3)}</span>
              </div>
            );
          })}
        </div>
      )}

      {/* Filter bar */}
      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
        {['all', 'success', 'error'].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{
              padding: '4px 12px', fontSize: 11, fontWeight: 600, borderRadius: 6,
              border: `1px solid ${filter === f ? 'var(--accent-purple)' : 'rgba(255,255,255,0.08)'}`,
              background: filter === f ? 'rgba(155,89,255,0.15)' : 'transparent',
              color: filter === f ? '#fff' : 'rgba(255,255,255,0.4)',
              cursor: 'pointer', transition: 'all 0.15s',
              textTransform: 'capitalize',
            }}
          >{f}</button>
        ))}
        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', marginLeft: 'auto' }}>
          {filteredTraces.length} traces
        </span>
      </div>

      {/* Trace List */}
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
        {filteredTraces.map(trace => (
          <div
            key={trace.id}
            onClick={() => setSelectedTrace(selectedTrace?.id === trace.id ? null : trace)}
            style={{
              padding: '12px 16px', borderRadius: 10,
              background: selectedTrace?.id === trace.id ? 'rgba(155,89,255,0.08)' : 'rgba(255,255,255,0.02)',
              border: `1px solid ${selectedTrace?.id === trace.id ? 'rgba(155,89,255,0.3)' : 'rgba(255,255,255,0.05)'}`,
              cursor: 'pointer', transition: 'all 0.15s',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <span style={{
                width: 6, height: 6, borderRadius: '50%',
                background: trace.status === 'error' ? '#ff4757' : '#00e68a',
              }} />
              <span style={{ fontSize: 13, fontWeight: 700, flex: 1 }}>{trace.title}</span>

              {/* Provider badges on spans */}
              {trace.spans?.slice(0, 3).map(sp => {
                const badge = PROVIDER_BADGES[sp.provider] || PROVIDER_BADGES.unknown;
                return sp.provider && sp.provider !== 'unknown' ? (
                  <span key={sp.id} style={{
                    fontSize: 9, padding: '2px 6px', borderRadius: 4, fontWeight: 700,
                    background: badge.bg, color: badge.color,
                  }}>{badge.label}</span>
                ) : null;
              })}

              <span style={{
                fontSize: 10, padding: '2px 8px', borderRadius: 4,
                background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.4)',
              }}>{trace.agent}</span>
              <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', fontFamily: 'monospace' }}>
                {trace.totalDurationMs.toFixed(0)}ms
              </span>
            </div>

            {/* Mini waterfall preview */}
            <div style={{ height: 18, position: 'relative', background: 'rgba(255,255,255,0.02)', borderRadius: 4, overflow: 'hidden' }}>
              {trace.spans.map(span => {
                const left = trace.totalDurationMs > 0 ? (span.startMs / trace.totalDurationMs) * 100 : 0;
                const width = trace.totalDurationMs > 0 ? Math.max((span.durationMs / trace.totalDurationMs) * 100, 2) : 10;
                const cfg = TRACE_TYPES[span.type] || TRACE_TYPES.llm_call;
                return (
                  <div
                    key={span.id}
                    title={`${span.name} — ${span.durationMs.toFixed(0)}ms${span.model ? ` (${span.model})` : ''}`}
                    style={{
                      position: 'absolute', left: `${left}%`, width: `${width}%`,
                      top: span.depth * 9, height: 8, borderRadius: 2,
                      background: span.status === 'error' ? '#ff4757' : cfg.color,
                      opacity: 0.7,
                    }}
                  />
                );
              })}
            </div>

            {/* Expanded detail */}
            {selectedTrace?.id === trace.id && (
              <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                {/* Waterfall detail */}
                <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.3)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  Execution Waterfall
                </div>
                {trace.spans.map(span => {
                  const cfg = TRACE_TYPES[span.type] || TRACE_TYPES.llm_call;
                  const badge = PROVIDER_BADGES[span.provider] || PROVIDER_BADGES.unknown;
                  return (
                    <div key={span.id} style={{
                      display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0',
                      paddingLeft: span.depth * 20,
                    }}>
                      <span style={{ fontSize: 12 }}>{cfg.icon}</span>

                      {/* Provider badge */}
                      {span.provider && span.provider !== 'unknown' && (
                        <span style={{
                          fontSize: 8, padding: '1px 5px', borderRadius: 3, fontWeight: 700,
                          background: badge.bg, color: badge.color,
                        }}>{badge.label}</span>
                      )}

                      <span style={{ fontSize: 11, fontWeight: 600, color: cfg.color, minWidth: 120, fontFamily: 'monospace' }}>
                        {span.name}
                      </span>

                      {/* Model tag */}
                      {span.model && (
                        <span style={{
                          fontSize: 9, padding: '1px 5px', borderRadius: 3,
                          background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.35)',
                          fontFamily: 'monospace',
                        }}>{span.model}</span>
                      )}

                      <div style={{
                        flex: 1, height: 12, position: 'relative', background: 'rgba(255,255,255,0.03)',
                        borderRadius: 3, overflow: 'hidden',
                      }}>
                        <div style={{
                          position: 'absolute',
                          left: trace.totalDurationMs > 0 ? `${(span.startMs / trace.totalDurationMs) * 100}%` : '0%',
                          width: trace.totalDurationMs > 0 ? `${Math.max((span.durationMs / trace.totalDurationMs) * 100, 3)}%` : '100%',
                          height: '100%', borderRadius: 3,
                          background: span.status === 'error' ? '#ff4757' : cfg.color,
                          opacity: 0.8,
                        }} />
                      </div>
                      <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', fontFamily: 'monospace', minWidth: 50, textAlign: 'right' }}>
                        {span.durationMs.toFixed(0)}ms
                      </span>
                      {span.tokens && (
                        <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.2)', fontFamily: 'monospace' }}>
                          {span.tokens.input + span.tokens.output} tok
                        </span>
                      )}
                      {span.cost_usd > 0 && (
                        <span style={{ fontSize: 9, color: '#00e68a', fontFamily: 'monospace' }}>
                          ${parseFloat(span.cost_usd).toFixed(4)}
                        </span>
                      )}
                      <span style={{
                        width: 6, height: 6, borderRadius: '50%',
                        background: span.status === 'error' ? '#ff4757' : '#00e68a',
                      }} />
                    </div>
                  );
                })}

                {/* Error detail */}
                {trace.spans.some(s => s.error_message) && (
                  <div style={{
                    marginTop: 8, padding: '6px 10px', background: 'rgba(255,71,87,0.08)',
                    border: '1px solid rgba(255,71,87,0.15)', borderRadius: 6,
                  }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: '#ff4757', marginBottom: 2 }}>Error</div>
                    <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', fontFamily: 'monospace', whiteSpace: 'pre-wrap' }}>
                      {trace.spans.find(s => s.error_message)?.error_message}
                    </div>
                  </div>
                )}

                {/* Metadata */}
                <div style={{
                  marginTop: 10, padding: '8px 12px', background: 'rgba(0,0,0,0.2)', borderRadius: 6,
                  display: 'flex', gap: 16, flexWrap: 'wrap',
                }}>
                  {trace.spans.some(s => s.model) && (
                    <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>
                      Models: <strong style={{ color: 'rgba(255,255,255,0.5)' }}>
                        {[...new Set(trace.spans.filter(s => s.model).map(s => s.model))].join(', ')}
                      </strong>
                    </span>
                  )}
                  <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>
                    Tokens: <strong style={{ color: 'rgba(255,255,255,0.5)' }}>{trace.totalTokens.toLocaleString()}</strong>
                  </span>
                  <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>
                    Cost: <strong style={{ color: '#00e68a' }}>${trace.cost}</strong>
                  </span>
                  <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>
                    Spans: <strong style={{ color: 'rgba(255,255,255,0.5)' }}>{trace.spans.length}</strong>
                  </span>
                  <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>
                    {new Date(trace.timestamp).toLocaleString()}
                  </span>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Pro upsell for advanced features */}
      {plan === 'free' && (
        <div style={{
          padding: '10px 16px', background: 'rgba(155,89,255,0.06)',
          border: '1px solid rgba(155,89,255,0.15)', borderRadius: 10,
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <span style={{ fontSize: 14 }}>🔒</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.7)' }}>Pro: Advanced Tracing</div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)' }}>
              Auto-instrumentation · Cost alerts · Model comparison · Prompt versioning · Unlimited retention
            </div>
          </div>
          <span style={{
            fontSize: 10, padding: '3px 8px', borderRadius: 4,
            background: 'rgba(155,89,255,0.2)', color: '#9b59ff', fontWeight: 700,
          }}>PRO</span>
        </div>
      )}
    </div>
  );
}
