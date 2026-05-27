import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase, API_BASE } from '../../../lib/supabase';
import { EmptyState, TracesEmptyViz } from '../../../components/SkeletonLoader';

/**
 * ═══════════════════════════════════════════════════
 *  TracesTab — Production-grade Trace Explorer
 *  Full filtering, analytics, expandable span details
 * ═══════════════════════════════════════════════════
 */

const PROVIDER_BADGES = {
  openai:    { label: 'OpenAI',    color: '#10a37f', bg: 'rgba(16,163,127,0.12)' },
  anthropic: { label: 'Anthropic', color: '#d97757', bg: 'rgba(217,119,87,0.12)' },
  unknown:   { label: 'LLM',      color: '#a78bfa', bg: 'rgba(167,139,250,0.12)' },
};

const SPAN_TYPE_META = {
  'chat.completions':        { icon: '🧠', color: '#a78bfa', label: 'Chat' },
  'chat.completions.stream': { icon: '🌊', color: '#7c3aed', label: 'Stream' },
  'messages.create':         { icon: '🧠', color: '#ff8c42', label: 'Messages' },
  'messages.create.stream':  { icon: '🌊', color: '#e07830', label: 'Stream' },
  tool_use:                  { icon: '🔧', color: '#67e8f9', label: 'Tool Use' },
  retrieval:                 { icon: '📚', color: '#ff8c42', label: 'Retrieval' },
  llm_call:                  { icon: '🧠', color: '#a78bfa', label: 'LLM Call' },
};

const STATUS_CFG = {
  running: { color: '#fbbf24', bg: 'rgba(251,191,36,0.10)', label: 'Running' },
  success: { color: '#34c759', bg: 'rgba(52,199,89,0.10)', label: 'Completed' },
  error:   { color: '#ff3b30', bg: 'rgba(255,59,48,0.10)', label: 'Error' },
};

function formatDuration(ms) {
  if (!ms) return '—';
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${(ms / 60000).toFixed(1)}m`;
}

function formatCost(usd) {
  const v = parseFloat(usd || 0);
  if (v === 0) return '$0.00';
  if (v < 0.01) return `$${v.toFixed(4)}`;
  return `$${v.toFixed(2)}`;
}

function timeAgo(ts) {
  if (!ts) return '—';
  const s = Math.floor((Date.now() - new Date(ts).getTime()) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

// ── Stat Card ──
function StatCard({ icon, label, value, color, sub }) {
  return (
    <div style={{
      flex: '1 1 140px', padding: '16px 18px',
      background: 'var(--surface-2)',
      border: '1px solid var(--line-mid)',
      borderRadius: 'var(--radius-lg)',
      transition: 'all 0.25s',
      cursor: 'default',
      position: 'relative', overflow: 'hidden',
    }}>
      <div style={{ position: 'absolute', top: 0, left: '10%', right: '10%', height: 1, background: `linear-gradient(90deg, transparent, ${color}40, transparent)` }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
        <span style={{ fontSize: 18 }}>{icon}</span>
        <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--gray-3)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</span>
      </div>
      <div style={{ fontSize: 26, fontWeight: 800, color, letterSpacing: '-0.03em', fontVariantNumeric: 'tabular-nums', textShadow: `0 0 30px ${color}25` }}>
        {value}
      </div>
      {sub && <div style={{ fontSize: 10, color: 'var(--gray-3)', marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

// ── Span Waterfall Row ──
function SpanRow({ span, totalDurationMs }) {
  const meta = SPAN_TYPE_META[span.type] || SPAN_TYPE_META.llm_call;
  const badge = PROVIDER_BADGES[span.provider] || PROVIDER_BADGES.unknown;
  const left = totalDurationMs > 0 ? (span.startMs / totalDurationMs) * 100 : 0;
  const width = totalDurationMs > 0 ? Math.max((span.durationMs / totalDurationMs) * 100, 3) : 100;

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8, padding: '5px 0',
      paddingLeft: (span.depth || 0) * 20,
    }}>
      <span style={{ fontSize: 13, width: 20, textAlign: 'center' }}>{meta.icon}</span>

      {span.provider && span.provider !== 'unknown' && (
        <span style={{
          fontSize: 8, padding: '1px 5px', borderRadius: 3, fontWeight: 700,
          background: badge.bg, color: badge.color,
        }}>{badge.label}</span>
      )}

      <span style={{
        fontSize: 11, fontWeight: 600, color: meta.color, minWidth: 100,
        fontFamily: "'JetBrains Mono', monospace", overflow: 'hidden',
        textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      }}>
        {span.name}
      </span>

      {span.model && (
        <span style={{
          fontSize: 9, padding: '1px 5px', borderRadius: 3,
          background: 'var(--surface-4)', color: 'var(--gray-3)',
          fontFamily: "'JetBrains Mono', monospace", flexShrink: 0,
        }}>{span.model}</span>
      )}

      <div style={{
        flex: 1, height: 12, position: 'relative',
        background: 'rgba(124,58,237,0.04)', borderRadius: 3, overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute', left: `${left}%`, width: `${width}%`,
          height: '100%', borderRadius: 3,
          background: span.status === 'error' ? '#ff3b30' : meta.color,
          opacity: 0.8,
        }} />
      </div>

      <span style={{ fontSize: 10, color: 'var(--gray-3)', fontFamily: "'JetBrains Mono', monospace", minWidth: 50, textAlign: 'right', flexShrink: 0 }}>
        {formatDuration(span.durationMs)}
      </span>

      {span.tokens && (
        <span style={{ fontSize: 9, color: 'var(--gray-4)', fontFamily: "'JetBrains Mono', monospace", flexShrink: 0 }}>
          {(span.tokens.input + span.tokens.output).toLocaleString()} tok
        </span>
      )}

      {span.cost_usd > 0 && (
        <span style={{ fontSize: 9, color: '#34c759', fontFamily: "'JetBrains Mono', monospace", flexShrink: 0 }}>
          {formatCost(span.cost_usd)}
        </span>
      )}

      <span style={{
        width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
        background: span.status === 'error' ? '#ff3b30' : '#34c759',
      }} />
    </div>
  );
}

// ── Single Trace Row (expandable) ──
function TraceRow({ trace, expanded, onToggle }) {
  const statusCfg = STATUS_CFG[trace.status] || STATUS_CFG.success;
  const spans = trace.spans || [];

  return (
    <div
      onClick={onToggle}
      style={{
        background: expanded ? 'rgba(124,58,237,0.06)' : 'var(--surface-2)',
        border: `1px solid ${expanded ? 'rgba(167,139,250,0.25)' : 'var(--line-mid)'}`,
        borderRadius: 'var(--radius-lg)',
        padding: '14px 18px',
        cursor: 'pointer',
        transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
        position: 'relative', overflow: 'hidden',
      }}
    >
      {/* Top gradient */}
      {expanded && (
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: 'var(--gradient-hero)' }} />
      )}

      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
        <span style={{
          width: 7, height: 7, borderRadius: '50%',
          background: statusCfg.color,
          boxShadow: `0 0 8px ${statusCfg.color}50`,
          animation: trace.status === 'running' ? 'pulse-dot 2s infinite' : 'none',
        }} />

        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--white)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {trace.name}
        </span>

        {/* Agent badge */}
        {trace.agent && (
          <span style={{
            fontSize: 10, padding: '2px 8px', borderRadius: 4,
            background: 'var(--surface-4)', border: '1px solid var(--line)',
            color: 'var(--gray-3)', fontFamily: "'JetBrains Mono', monospace",
          }}>{trace.agent}</span>
        )}

        {/* Status badge */}
        <span style={{
          fontSize: 9, fontWeight: 700, padding: '2px 8px', borderRadius: 4,
          background: statusCfg.bg, color: statusCfg.color,
          textTransform: 'uppercase', letterSpacing: '0.06em',
        }}>{statusCfg.label}</span>

        {/* Duration */}
        <span style={{ fontSize: 10, color: 'var(--gray-3)', fontFamily: "'JetBrains Mono', monospace", flexShrink: 0 }}>
          {formatDuration(trace.duration_ms)}
        </span>

        {/* Time ago */}
        <span style={{ fontSize: 10, color: 'var(--gray-4)', flexShrink: 0 }}>
          {timeAgo(trace.started_at || trace.created_at)}
        </span>

        {/* Expand arrow */}
        <span style={{ fontSize: 10, color: 'var(--gray-3)', transition: 'transform 0.2s', transform: expanded ? 'rotate(90deg)' : 'rotate(0)' }}>▶</span>
      </div>

      {/* Mini waterfall preview */}
      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
        <div style={{ flex: 1, height: 16, position: 'relative', background: 'rgba(124,58,237,0.04)', borderRadius: 4, overflow: 'hidden' }}>
          {spans.map((sp, i) => {
            const traceStart = new Date(trace.started_at);
            const spanStart = new Date(sp.started_at);
            const startMs = Math.max(0, spanStart - traceStart);
            const totalMs = trace.duration_ms || 1000;
            const left = (startMs / totalMs) * 100;
            const w = Math.max(((sp.latency_ms || 0) / totalMs) * 100, 2);
            const meta = SPAN_TYPE_META[sp.type] || SPAN_TYPE_META.llm_call;
            return (
              <div
                key={sp.id || i}
                title={`${sp.provider}/${sp.model} — ${sp.latency_ms || 0}ms`}
                style={{
                  position: 'absolute', left: `${left}%`, width: `${w}%`,
                  top: i === 0 ? 2 : 8, height: 6, borderRadius: 2,
                  background: sp.status === 'error' ? '#ff3b30' : meta.color,
                  opacity: 0.7,
                }}
              />
            );
          })}
        </div>

        {/* Quick stats */}
        <div style={{ display: 'flex', gap: 10, flexShrink: 0 }}>
          {trace.span_count > 0 && (
            <span style={{ fontSize: 9, color: 'var(--gray-3)' }}>
              <strong style={{ color: 'var(--gray-2)' }}>{trace.span_count}</strong> spans
            </span>
          )}
          {trace.total_tokens > 0 && (
            <span style={{ fontSize: 9, color: 'var(--gray-3)' }}>
              <strong style={{ color: 'var(--gray-2)' }}>{trace.total_tokens.toLocaleString()}</strong> tok
            </span>
          )}
          {parseFloat(trace.total_cost_usd) > 0 && (
            <span style={{ fontSize: 9, color: '#34c759' }}>
              {formatCost(trace.total_cost_usd)}
            </span>
          )}
        </div>
      </div>

      {/* ─── Expanded Detail ─── */}
      {expanded && (
        <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--line)' }} onClick={e => e.stopPropagation()}>
          {/* Span waterfall */}
          <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--gray-3)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Execution Waterfall — {spans.length} spans
          </div>

          {spans.length > 0 ? (
            spans.map((sp, i) => {
              const traceStart = new Date(trace.started_at);
              const spanStart = new Date(sp.started_at);
              const startMs = Math.max(0, spanStart - traceStart);
              return (
                <SpanRow
                  key={sp.id || i}
                  span={{
                    ...sp,
                    name: `${sp.provider || 'unknown'}:${sp.type || 'call'}`,
                    startMs,
                    durationMs: sp.latency_ms || 0,
                    depth: i === 0 ? 0 : 1,
                    tokens: { input: sp.prompt_tokens || 0, output: sp.completion_tokens || 0 },
                  }}
                  totalDurationMs={trace.duration_ms || 1}
                />
              );
            })
          ) : (
            <div style={{ fontSize: 11, color: 'var(--gray-3)', padding: '8px 0' }}>
              No span data available. The SDK will auto-capture spans when instrumented.
            </div>
          )}

          {/* Error details */}
          {spans.some(s => s.error_message) && (
            <div style={{
              marginTop: 10, padding: '8px 12px',
              background: 'rgba(255,59,48,0.06)',
              border: '1px solid rgba(255,59,48,0.12)',
              borderRadius: 8,
            }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#ff3b30', marginBottom: 4 }}>Error</div>
              <div style={{ fontSize: 10, color: 'var(--gray-3)', fontFamily: "'JetBrains Mono', monospace", whiteSpace: 'pre-wrap' }}>
                {spans.find(s => s.error_message)?.error_message}
              </div>
            </div>
          )}

          {/* Metadata footer */}
          <div style={{
            marginTop: 10, padding: '8px 12px',
            background: 'var(--surface-3)', borderRadius: 8,
            display: 'flex', gap: 16, flexWrap: 'wrap',
          }}>
            {spans.some(s => s.model) && (
              <span style={{ fontSize: 10, color: 'var(--gray-3)' }}>
                Models: <strong style={{ color: 'var(--gray-2)' }}>
                  {[...new Set(spans.filter(s => s.model).map(s => s.model))].join(', ')}
                </strong>
              </span>
            )}
            <span style={{ fontSize: 10, color: 'var(--gray-3)' }}>
              Trace ID: <strong style={{ color: 'var(--gray-2)', fontFamily: "'JetBrains Mono', monospace" }}>
                {trace.trace_id}
              </strong>
            </span>
            <span style={{ fontSize: 10, color: 'var(--gray-3)' }}>
              {new Date(trace.started_at || trace.created_at).toLocaleString()}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════
//  MAIN TracesTab
// ═══════════════════════════════════════════════════
export default function TracesTab({ traces: initialTraces, traceStats: initialStats, observations, agents, planName }) {
  const [traces, setTraces] = useState(initialTraces || []);
  const [traceStats, setTraceStats] = useState(initialStats || null);
  const [expandedTraceId, setExpandedTraceId] = useState(null);
  const [loading, setLoading] = useState(false);

  // Filters
  const [statusFilter, setStatusFilter] = useState('all');
  const [agentFilter, setAgentFilter] = useState('all');
  const [dateRange, setDateRange] = useState('30d');
  const [searchQuery, setSearchQuery] = useState('');

  // Sync with parent data
  useEffect(() => { if (initialTraces?.length) setTraces(initialTraces); }, [initialTraces]);
  useEffect(() => { if (initialStats) setTraceStats(initialStats); }, [initialStats]);

  // Fetch trace detail (with spans) when expanding
  const fetchTraceDetail = useCallback(async (traceId) => {
    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      const res = await fetch(`${API_BASE}/api/v1/traces/${traceId}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (res.ok) {
        const detail = await res.json();
        setTraces(prev => prev.map(t =>
          (t.id === traceId || t.trace_id === traceId) ? { ...t, spans: detail.spans || [] } : t
        ));
      }
    } catch (err) {
      console.error('Failed to fetch trace detail:', err);
    }
  }, []);

  const handleToggle = useCallback((trace) => {
    if (expandedTraceId === trace.id) {
      setExpandedTraceId(null);
    } else {
      setExpandedTraceId(trace.id);
      // Lazy-load spans if not already loaded
      if (!trace.spans || trace.spans.length === 0) {
        fetchTraceDetail(trace.trace_id || trace.id);
      }
    }
  }, [expandedTraceId, fetchTraceDetail]);

  // Derive unique agents from traces
  const traceAgents = useMemo(() => {
    const set = new Set();
    traces.forEach(t => { if (t.agent) set.add(t.agent); });
    return [...set].sort();
  }, [traces]);

  // Filter traces
  const filteredTraces = useMemo(() => {
    let result = traces;
    // Date range filter
    const daysMap = { '7d': 7, '30d': 30, '90d': 90 };
    const days = daysMap[dateRange] || 30;
    const cutoff = Date.now() - days * 86400000;
    result = result.filter(t => {
      const ts = new Date(t.started_at || t.created_at).getTime();
      return ts >= cutoff;
    });
    if (statusFilter !== 'all') result = result.filter(t => t.status === statusFilter);
    if (agentFilter !== 'all') result = result.filter(t => t.agent === agentFilter);
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(t =>
        (t.name || '').toLowerCase().includes(q) ||
        (t.trace_id || '').toLowerCase().includes(q) ||
        (t.agent || '').toLowerCase().includes(q)
      );
    }
    return result;
  }, [traces, statusFilter, agentFilter, searchQuery, dateRange]);

  // Compute filtered stats
  const stats = useMemo(() => {
    const total = filteredTraces.length;
    const running = filteredTraces.filter(t => t.status === 'running').length;
    const errors = filteredTraces.filter(t => t.status === 'error').length;
    const tokens = filteredTraces.reduce((s, t) => s + (t.total_tokens || 0), 0);
    const cost = filteredTraces.reduce((s, t) => s + parseFloat(t.total_cost_usd || 0), 0);
    const avgLatency = total > 0
      ? Math.round(filteredTraces.reduce((s, t) => s + (t.duration_ms || 0), 0) / total)
      : 0;
    const spans = filteredTraces.reduce((s, t) => s + (t.span_count || 0), 0);
    return { total, running, errors, tokens, cost, avgLatency, spans };
  }, [filteredTraces]);

  const isEmpty = !traces.length && !observations?.length;

  // ── Empty State ──
  if (isEmpty) {
    return (
      <div className="dash-content">
        <div className="dash-panel" style={{ minHeight: 'calc(100vh - 140px)' }}>
          <div className="dash-panel-head">
            <span className="dash-panel-title">
              <span className="dash-panel-title-icon">📊</span>
              Agent Traces
            </span>
          </div>
          <EmptyState
            variant="traces"
            title="Trace Your Agent Execution"
            description="Capture every LLM call, tool use, and retrieval step with timing, tokens, and cost breakdowns — all in a visual waterfall."
            icon={<TracesEmptyViz />}
            steps={[
              'Install SDK: npm i @stoic/agentos-sdk',
              'Call os.instrument() to auto-patch OpenAI & Anthropic',
              'Every LLM call is captured as a trace with spans',
            ]}
          >
            <div style={{
              marginTop: 4, padding: '14px 18px', background: 'var(--surface-3)',
              border: '1px solid var(--line-mid)', borderRadius: 10, fontSize: 12,
              color: 'var(--gray-3)', fontFamily: "'JetBrains Mono', monospace", textAlign: 'left',
              maxWidth: 380, width: '100%',
            }}>
              <div style={{ color: 'var(--gray-4)', fontSize: 10, marginBottom: 4 }}>// Quick start</div>
              <div>import {'{'} AgentOS {'}'} from 'stoic-agentos-sdk';</div>
              <div>const os = new AgentOS({'{'} apiKey: 'sk_live_xxx' {'}'});</div>
              <div style={{ color: '#a78bfa' }}>os.instrument(); // patches OpenAI & Anthropic</div>
            </div>
          </EmptyState>
        </div>
      </div>
    );
  }

  return (
    <div className="dash-content">
      {/* ── Stats Row ── */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <StatCard icon="📊" label="Total Traces" value={stats.total} color="var(--accent-bright)" sub={stats.running > 0 ? `${stats.running} running` : undefined} />
        <StatCard icon="⚡" label="Avg Latency" value={formatDuration(stats.avgLatency)} color="#67e8f9" />
        <StatCard icon="🔤" label="Total Tokens" value={stats.tokens.toLocaleString()} color="#c4b5fd" />
        <StatCard icon="💰" label="Est. Cost" value={formatCost(stats.cost)} color="#34c759" />
        <StatCard icon="🔗" label="Spans" value={stats.spans.toLocaleString()} color="#a78bfa" sub={stats.errors > 0 ? `${stats.errors} errors` : undefined} />
      </div>

      {/* ── Filter Bar ── */}
      <div className="dash-panel" style={{ marginBottom: 16 }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12, padding: '12px 18px',
          flexWrap: 'wrap',
        }}>
          {/* Search */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '6px 12px', background: 'var(--surface-3)',
            border: '1px solid var(--line)', borderRadius: 8,
            flex: '1 1 200px', maxWidth: 320,
          }}>
            <span style={{ fontSize: 12, opacity: 0.4 }}>🔍</span>
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search traces..."
              style={{
                background: 'none', border: 'none', outline: 'none',
                color: 'var(--white)', fontSize: 12, fontFamily: 'inherit',
                width: '100%',
              }}
            />
          </div>

          {/* Status filter pills */}
          <div style={{ display: 'flex', gap: 4 }}>
            {['all', 'running', 'success', 'error'].map(s => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`dash-filter-pill${statusFilter === s ? ' active' : ''}`}
                style={{ fontSize: 11 }}
              >
                {s === 'all' ? 'All' : s === 'running' ? '🟡 Running' : s === 'success' ? '✅ Done' : '❌ Error'}
              </button>
            ))}
          </div>

          {/* Agent dropdown */}
          <select
            value={agentFilter}
            onChange={e => setAgentFilter(e.target.value)}
            style={{
              padding: '6px 10px', background: 'var(--surface-3)',
              border: '1px solid var(--line)', borderRadius: 8,
              color: 'var(--gray-2)', fontSize: 12, fontFamily: 'inherit',
              cursor: 'pointer', outline: 'none',
            }}
          >
            <option value="all">All Agents</option>
            {traceAgents.map(a => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>

          {/* Date range */}
          <select
            value={dateRange}
            onChange={e => setDateRange(e.target.value)}
            style={{
              padding: '6px 10px', background: 'var(--surface-3)',
              border: '1px solid var(--line)', borderRadius: 8,
              color: 'var(--gray-2)', fontSize: 12, fontFamily: 'inherit',
              cursor: 'pointer', outline: 'none',
            }}
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
          </select>

          {/* Count */}
          <span style={{ fontSize: 11, color: 'var(--gray-3)', marginLeft: 'auto' }}>
            {filteredTraces.length} / {traces.length} traces
          </span>
        </div>
      </div>

      {/* ── Provider Breakdown (from real stats) ── */}
      {traceStats?.providers && Object.keys(traceStats.providers).length > 0 && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
          {Object.entries(traceStats.providers).map(([provider, data]) => {
            const badge = PROVIDER_BADGES[provider] || PROVIDER_BADGES.unknown;
            return (
              <div key={provider} style={{
                padding: '8px 14px', background: badge.bg,
                border: `1px solid ${badge.color}25`, borderRadius: 10,
                display: 'flex', alignItems: 'center', gap: 10,
              }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: badge.color }}>{badge.label}</span>
                <span style={{ fontSize: 10, color: 'var(--gray-3)' }}>{data.calls} calls</span>
                <span style={{ fontSize: 10, color: 'var(--gray-3)' }}>{data.tokens?.toLocaleString()} tok</span>
                <span style={{ fontSize: 10, color: '#34c759' }}>{formatCost(data.cost)}</span>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Trace List ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {filteredTraces.length > 0 ? (
          filteredTraces.map(trace => (
            <TraceRow
              key={trace.id}
              trace={trace}
              expanded={expandedTraceId === trace.id}
              onToggle={() => handleToggle(trace)}
            />
          ))
        ) : (
          <div className="dash-panel" style={{ padding: 48, textAlign: 'center' }}>
            <div style={{ fontSize: 28, opacity: 0.2, marginBottom: 8 }}>🔍</div>
            <div style={{ fontSize: 13, color: 'var(--gray-3)' }}>No traces match the current filters</div>
          </div>
        )}
      </div>

      {/* ── Pro Upsell ── */}
      {(planName?.toLowerCase() || 'free') === 'free' && (
        <div style={{
          marginTop: 16, padding: '12px 18px',
          background: 'rgba(124,58,237,0.04)',
          border: '1px solid rgba(124,58,237,0.12)',
          borderRadius: 'var(--radius-lg)',
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <span style={{ fontSize: 14 }}>🔒</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--gray-1)' }}>Pro: Advanced Tracing</div>
            <div style={{ fontSize: 10, color: 'var(--gray-3)' }}>
              Auto-instrumentation · Cost alerts · Model comparison · Prompt versioning · Unlimited retention
            </div>
          </div>
          <span style={{
            fontSize: 10, padding: '3px 8px', borderRadius: 4,
            background: 'rgba(124,58,237,0.15)', color: '#a78bfa', fontWeight: 700,
          }}>PRO</span>
        </div>
      )}
    </div>
  );
}
