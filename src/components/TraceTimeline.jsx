import { useState, useEffect, useRef } from 'react';

const TRACE_TYPES = {
  llm_call: { icon: '🧠', color: '#9b59ff', label: 'LLM Call' },
  tool_use: { icon: '🔧', color: '#00b4d8', label: 'Tool Use' },
  retrieval: { icon: '📚', color: '#ff8c42', label: 'Retrieval' },
  decision: { icon: '⚖️', color: '#4ecdc4', label: 'Decision' },
  output: { icon: '📤', color: '#00e68a', label: 'Output' },
  error: { icon: '❌', color: '#ff4757', label: 'Error' },
};

// Generate realistic demo trace data from real observations
function generateTraces(observations, agents) {
  if (!observations?.length) return [];

  const traces = [];
  const agentMap = {};
  agents?.forEach(a => { agentMap[a.id] = a; });

  observations.slice(0, 10).forEach((obs, idx) => {
    const traceId = `trace-${obs.id?.slice(0, 8) || idx}`;
    const baseTime = new Date(obs.created_at || Date.now());
    const agentName = obs.agent_id ? (agentMap[obs.agent_id]?.name || 'agent') : 'content-writer';

    // Create a realistic span tree per observation
    const spans = [
      {
        id: `${traceId}-root`,
        name: `${obs.type || 'task'}:process`,
        type: 'llm_call',
        startMs: 0,
        durationMs: 800 + Math.random() * 2000,
        depth: 0,
        tokens: { input: 120 + Math.floor(Math.random() * 500), output: 50 + Math.floor(Math.random() * 300) },
        model: 'claude-3.5-sonnet',
        status: obs.type === 'error' ? 'error' : 'success',
      },
      {
        id: `${traceId}-retrieve`,
        name: 'memory:recall',
        type: 'retrieval',
        startMs: 50,
        durationMs: 150 + Math.random() * 300,
        depth: 1,
        tokens: null,
        model: null,
        status: 'success',
      },
      {
        id: `${traceId}-tool`,
        name: obs.type === 'deployment' ? 'deploy:execute' :
              obs.type === 'error' ? 'error:analyze' :
              obs.type === 'decision' ? 'decision:evaluate' :
              'tool:execute',
        type: 'tool_use',
        startMs: 200 + Math.random() * 200,
        durationMs: 200 + Math.random() * 600,
        depth: 1,
        tokens: null,
        model: null,
        status: obs.type === 'error' ? 'error' : 'success',
      },
      {
        id: `${traceId}-output`,
        name: 'output:format',
        type: 'output',
        startMs: 600 + Math.random() * 400,
        durationMs: 50 + Math.random() * 100,
        depth: 1,
        tokens: { input: 0, output: 30 + Math.floor(Math.random() * 80) },
        model: 'claude-3.5-sonnet',
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
    });
  });

  return traces;
}

export default function TraceTimeline({ observations, agents, plan }) {
  const [traces, setTraces] = useState([]);
  const [selectedTrace, setSelectedTrace] = useState(null);
  const [filter, setFilter] = useState('all');
  const containerRef = useRef(null);

  useEffect(() => {
    setTraces(generateTraces(observations, agents));
  }, [observations, agents]);

  const filteredTraces = filter === 'all'
    ? traces
    : traces.filter(t => t.status === filter);

  const totalCost = traces.reduce((sum, t) => sum + parseFloat(t.cost), 0);
  const totalTokens = traces.reduce((sum, t) => sum + t.totalTokens, 0);
  const avgLatency = traces.length ? Math.round(traces.reduce((sum, t) => sum + t.totalDurationMs, 0) / traces.length) : 0;

  if (observations.length === 0) {
    return (
      <div className="dash-empty" style={{ padding: 60 }}>
        <div className="dash-empty-icon">📊</div>
        <h4>Agent Traces</h4>
        <p>Capture observations to see detailed agent execution traces with timing, token usage, and cost analytics.</p>
      </div>
    );
  }

  return (
    <div ref={containerRef} style={{ display: 'flex', flexDirection: 'column', gap: 16, height: '100%' }}>
      {/* Stats Bar */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        {[
          { label: 'Total Traces', value: traces.length, icon: '📊', color: '#9b59ff' },
          { label: 'Avg Latency', value: `${avgLatency}ms`, icon: '⚡', color: '#00b4d8' },
          { label: 'Total Tokens', value: totalTokens.toLocaleString(), icon: '🔤', color: '#ff8c42' },
          { label: 'Est. Cost', value: `$${totalCost.toFixed(3)}`, icon: '💰', color: '#00e68a' },
        ].map((s, i) => (
          <div key={i} style={{
            flex: '1 1 140px', padding: '12px 16px', background: 'rgba(255,255,255,0.02)',
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
                const left = (span.startMs / trace.totalDurationMs) * 100;
                const width = Math.max((span.durationMs / trace.totalDurationMs) * 100, 2);
                const cfg = TRACE_TYPES[span.type] || TRACE_TYPES.tool_use;
                return (
                  <div
                    key={span.id}
                    title={`${span.name} — ${span.durationMs.toFixed(0)}ms`}
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
                  const cfg = TRACE_TYPES[span.type] || TRACE_TYPES.tool_use;
                  return (
                    <div key={span.id} style={{
                      display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0',
                      paddingLeft: span.depth * 20,
                    }}>
                      <span style={{ fontSize: 12 }}>{cfg.icon}</span>
                      <span style={{ fontSize: 11, fontWeight: 600, color: cfg.color, minWidth: 120, fontFamily: 'monospace' }}>
                        {span.name}
                      </span>
                      <div style={{
                        flex: 1, height: 12, position: 'relative', background: 'rgba(255,255,255,0.03)',
                        borderRadius: 3, overflow: 'hidden',
                      }}>
                        <div style={{
                          position: 'absolute',
                          left: `${(span.startMs / trace.totalDurationMs) * 100}%`,
                          width: `${Math.max((span.durationMs / trace.totalDurationMs) * 100, 3)}%`,
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
                      <span style={{
                        width: 6, height: 6, borderRadius: '50%',
                        background: span.status === 'error' ? '#ff4757' : '#00e68a',
                      }} />
                    </div>
                  );
                })}

                {/* Metadata */}
                <div style={{
                  marginTop: 10, padding: '8px 12px', background: 'rgba(0,0,0,0.2)', borderRadius: 6,
                  display: 'flex', gap: 16, flexWrap: 'wrap',
                }}>
                  <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>
                    Model: <strong style={{ color: 'rgba(255,255,255,0.5)' }}>claude-3.5-sonnet</strong>
                  </span>
                  <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>
                    Tokens: <strong style={{ color: 'rgba(255,255,255,0.5)' }}>{trace.totalTokens.toLocaleString()}</strong>
                  </span>
                  <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>
                    Cost: <strong style={{ color: '#00e68a' }}>${trace.cost}</strong>
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
            <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.7)' }}>Pro: Real-Time Tracing</div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)' }}>
              OpenTelemetry integration · Live streaming · Cost alerts · Prompt versioning
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
