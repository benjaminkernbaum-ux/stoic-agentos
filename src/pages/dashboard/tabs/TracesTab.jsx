import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase, API_BASE } from '../../../lib/supabase';
import { EmptyState, TracesEmptyViz } from '../../../components/SkeletonLoader';

/**
 * ═══════════════════════════════════════════════════
 *  TracesTab — Stoic redesign
 *  Same props, same endpoints, same filtering logic
 *  as the original. Only the presentation layer changed:
 *  instrument-grade type, bronze/ink palette, SVG icons.
 * ═══════════════════════════════════════════════════
 */

const MONO = "'JetBrains Mono', monospace";
const SERIF = "'Marcellus', serif";

const PROVIDER_BADGES = {
  openai:    { label: 'OpenAI',    color: '#5FC48D', bg: 'rgba(95,196,141,0.10)' },
  anthropic: { label: 'Anthropic', color: '#CE9B4F', bg: 'rgba(206,155,79,0.10)' },
  unknown:   { label: 'LLM',       color: '#8E9EFF', bg: 'rgba(142,158,255,0.10)' },
};

const SPAN_TYPE_META = {
  'chat.completions':        { color: '#8E9EFF', label: 'Chat' },
  'chat.completions.stream': { color: '#7B8CF0', label: 'Stream' },
  'messages.create':         { color: '#CE9B4F', label: 'Messages' },
  'messages.create.stream':  { color: '#B8863E', label: 'Stream' },
  tool_use:                  { color: '#67D4E8', label: 'Tool Use' },
  retrieval:                 { color: '#E2A94F', label: 'Retrieval' },
  memory_recall:             { color: '#B39DFF', label: 'Memory Recall' },
  recall:                    { color: '#B39DFF', label: 'Recall' },
  llm_call:                  { color: '#8E9EFF', label: 'LLM Call' },
};

const STATUS_CFG = {
  running: { color: '#E2A94F', bg: 'rgba(226,169,79,0.10)',  label: 'Running' },
  success: { color: '#5FC48D', bg: 'rgba(95,196,141,0.10)',  label: 'Completed' },
  error:   { color: '#E36D6D', bg: 'rgba(227,109,109,0.10)', label: 'Error' },
};

/* ── tiny SVG icon set (replaces emojis) ── */
const Icon = {
  traces: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M3 5h13M3 10h18M3 15h9M3 20h15" strokeLinecap="round"/></svg>,
  bolt:   <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M13 2L4 14h6l-1 8 9-12h-6l1-8z" strokeLinejoin="round"/></svg>,
  tokens: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="8" width="18" height="8" rx="2"/><path d="M7 12h.01M12 12h.01M17 12h.01" strokeLinecap="round"/></svg>,
  cost:   <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="9"/><path d="M12 7v10M15 9.5c0-1.4-1.3-2.5-3-2.5s-3 1-3 2.5 1.3 2 3 2.5 3 1 3 2.5-1.3 2.5-3 2.5-3-1.1-3-2.5" strokeLinecap="round"/></svg>,
  spans:  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M10 13a5 5 0 007.5.5l3-3a5 5 0 00-7-7l-1.7 1.7M14 11a5 5 0 00-7.5-.5l-3 3a5 5 0 007 7l1.7-1.7" strokeLinecap="round"/></svg>,
  search: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3" strokeLinecap="round"/></svg>,
  brain:  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="3"/><circle cx="12" cy="12" r="8" strokeDasharray="3 3"/></svg>,
  lock:   <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="4" y="10" width="16" height="10" rx="2"/><path d="M8 10V7a4 4 0 018 0v3"/></svg>,
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

/* ── Stat Card ── */
function StatCard({ icon, label, value, color, sub }) {
  return (
    <div style={{
      flex: '1 1 150px', padding: '15px 18px',
      background: 'var(--surface-2)',
      border: '1px solid var(--line)',
      borderRadius: 'var(--radius-lg)',
      position: 'relative', overflow: 'hidden',
    }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: `linear-gradient(90deg, transparent, ${color}55, transparent)` }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 9, color: 'var(--gray-3)' }}>
        <span style={{ display: 'grid', placeItems: 'center', color }}>{icon}</span>
        <span style={{ fontSize: 9.5, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.16em', fontFamily: MONO }}>{label}</span>
      </div>
      <div style={{ fontSize: 24, fontWeight: 600, color: 'var(--white)', letterSpacing: '-0.01em', fontFamily: MONO, fontVariantNumeric: 'tabular-nums' }}>
        {value}
      </div>
      {sub && <div style={{ fontSize: 10, color, marginTop: 5, fontFamily: MONO }}>{sub}</div>}
    </div>
  );
}

/* ── Span Waterfall Row ── */
function SpanRow({ span, totalDurationMs }) {
  const meta = SPAN_TYPE_META[span.type] || SPAN_TYPE_META.llm_call;
  const badge = PROVIDER_BADGES[span.provider] || PROVIDER_BADGES.unknown;
  const left = totalDurationMs > 0 ? (span.startMs / totalDurationMs) * 100 : 0;
  const width = totalDurationMs > 0 ? Math.max((span.durationMs / totalDurationMs) * 100, 3) : 100;

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 9, padding: '6px 0',
      paddingLeft: (span.depth || 0) * 20,
    }}>
      <span style={{ width: 7, height: 7, borderRadius: 2, flexShrink: 0, background: meta.color }} />

      {span.provider && span.provider !== 'unknown' && (
        <span style={{
          fontSize: 8, padding: '1px 6px', borderRadius: 100, fontWeight: 600, letterSpacing: '0.08em',
          textTransform: 'uppercase', fontFamily: MONO,
          background: badge.bg, color: badge.color, border: `1px solid ${badge.color}33`,
        }}>{badge.label}</span>
      )}

      <span style={{
        fontSize: 11, fontWeight: 500, color: 'var(--gray-1)', minWidth: 110,
        fontFamily: MONO, overflow: 'hidden',
        textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      }}>
        {span.name}
      </span>

      {span.model && (
        <span style={{
          fontSize: 9, padding: '1px 6px', borderRadius: 4,
          background: 'var(--surface-4)', color: 'var(--gray-3)',
          fontFamily: MONO, flexShrink: 0,
        }}>{span.model}</span>
      )}

      <div style={{
        flex: 1, height: 12, position: 'relative',
        background: 'rgba(201,182,150,0.04)', borderRadius: 3, overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute', left: `${left}%`, width: `${width}%`,
          height: '100%', borderRadius: 3,
          background: span.status === 'error' ? 'var(--status-error)' : meta.color,
          opacity: 0.85,
        }} />
      </div>

      <span style={{ fontSize: 10, color: 'var(--gray-3)', fontFamily: MONO, minWidth: 50, textAlign: 'right', flexShrink: 0 }}>
        {formatDuration(span.durationMs)}
      </span>

      {span.tokens && (
        <span style={{ fontSize: 9, color: 'var(--gray-4)', fontFamily: MONO, flexShrink: 0 }}>
          {(span.tokens.input + span.tokens.output).toLocaleString()} tok
        </span>
      )}

      {span.cost_usd > 0 && (
        <span style={{ fontSize: 9, color: 'var(--status-live)', fontFamily: MONO, flexShrink: 0 }}>
          {formatCost(span.cost_usd)}
        </span>
      )}

      <span style={{
        width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
        background: span.status === 'error' ? 'var(--status-error)' : 'var(--status-live)',
      }} />
    </div>
  );
}

/* ── Single Trace Row (expandable) ── */
function TraceRow({ trace, expanded, onToggle }) {
  const statusCfg = STATUS_CFG[trace.status] || STATUS_CFG.success;
  const spans = trace.spans || [];

  return (
    <div
      onClick={onToggle}
      style={{
        background: expanded ? 'rgba(206,155,79,0.05)' : 'var(--surface-2)',
        border: `1px solid ${expanded ? 'rgba(206,155,79,0.28)' : 'var(--line)'}`,
        borderRadius: 'var(--radius-lg)',
        padding: '14px 18px',
        cursor: 'pointer',
        transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
        position: 'relative', overflow: 'hidden',
      }}
    >
      {expanded && (
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: 'var(--gradient-hero)' }} />
      )}

      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 7 }}>
        <span style={{
          width: 7, height: 7, borderRadius: '50%',
          background: statusCfg.color,
          boxShadow: `0 0 8px ${statusCfg.color}50`,
          animation: trace.status === 'running' ? 'pulse-dot 2s infinite' : 'none',
          flexShrink: 0,
        }} />

        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--white)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {trace.name}
        </span>

        {trace.agent && (
          <span style={{
            fontSize: 10, padding: '2px 8px', borderRadius: 100,
            background: 'var(--surface-4)', border: '1px solid var(--line-mid)',
            color: 'var(--gray-2)', fontFamily: MONO,
          }}>{trace.agent}</span>
        )}

        <span style={{
          fontSize: 8.5, fontWeight: 600, padding: '3px 9px', borderRadius: 100,
          background: statusCfg.bg, color: statusCfg.color,
          border: `1px solid ${statusCfg.color}33`,
          textTransform: 'uppercase', letterSpacing: '0.1em', fontFamily: MONO,
        }}>{statusCfg.label}</span>

        <span style={{ fontSize: 10, color: 'var(--gray-3)', fontFamily: MONO, flexShrink: 0 }}>
          {formatDuration(trace.duration_ms)}
        </span>

        <span style={{ fontSize: 10, color: 'var(--gray-4)', flexShrink: 0, fontFamily: MONO }}>
          {timeAgo(trace.started_at || trace.created_at)}
        </span>

        <span style={{ fontSize: 9, color: 'var(--gray-3)', transition: 'transform 0.2s', transform: expanded ? 'rotate(90deg)' : 'rotate(0)' }}>▶</span>
      </div>

      {/* Mini waterfall preview */}
      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
        <div style={{ flex: 1, height: 16, position: 'relative', background: 'rgba(201,182,150,0.04)', borderRadius: 4, overflow: 'hidden' }}>
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
                  background: sp.status === 'error' ? 'var(--status-error)' : meta.color,
                  opacity: 0.75,
                }}
              />
            );
          })}
        </div>

        {/* Quick stats */}
        <div style={{ display: 'flex', gap: 10, flexShrink: 0, alignItems: 'center' }}>
          {(() => {
            const recallCount = spans.filter(sp => sp.type === 'memory_recall' || sp.type === 'recall' || sp.type === 'retrieval').length;
            return recallCount > 0 ? (
              <span style={{ fontSize: 8, color: '#B39DFF', background: 'rgba(179,157,255,0.08)', border: '1px solid rgba(179,157,255,0.22)', padding: '2px 7px', borderRadius: 100, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4, fontFamily: MONO, letterSpacing: '0.08em' }}>
                {Icon.brain} {recallCount} RECALL
              </span>
            ) : null;
          })()}
          {trace.span_count > 0 && (
            <span style={{ fontSize: 9, color: 'var(--gray-3)', fontFamily: MONO }}>
              <strong style={{ color: 'var(--gray-2)', fontWeight: 600 }}>{trace.span_count}</strong> spans
            </span>
          )}
          {trace.total_tokens > 0 && (
            <span style={{ fontSize: 9, color: 'var(--gray-3)', fontFamily: MONO }}>
              <strong style={{ color: 'var(--gray-2)', fontWeight: 600 }}>{trace.total_tokens.toLocaleString()}</strong> tok
            </span>
          )}
          {parseFloat(trace.total_cost_usd) > 0 && (
            <span style={{ fontSize: 9, color: 'var(--status-live)', fontFamily: MONO }}>
              {formatCost(trace.total_cost_usd)}
            </span>
          )}
        </div>
      </div>

      {/* ─── Expanded Detail ─── */}
      {expanded && (
        <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--line)' }} onClick={e => e.stopPropagation()}>
          <div style={{ fontSize: 9, fontWeight: 600, color: 'var(--gray-3)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.18em', fontFamily: MONO }}>
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
              background: 'rgba(227,109,109,0.05)',
              border: '1px solid rgba(227,109,109,0.16)',
              borderRadius: 8,
            }}>
              <div style={{ fontSize: 9, fontWeight: 600, color: 'var(--status-error)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.14em', fontFamily: MONO }}>Error</div>
              <div style={{ fontSize: 10, color: 'var(--gray-3)', fontFamily: MONO, whiteSpace: 'pre-wrap' }}>
                {spans.find(s => s.error_message)?.error_message}
              </div>
            </div>
          )}

          {/* Quality Evaluations */}
          {trace.evaluations && trace.evaluations.length > 0 && (
            <div style={{
              marginTop: 10, padding: '10px 14px',
              background: 'rgba(95,196,141,0.04)',
              border: '1px solid rgba(95,196,141,0.15)',
              borderRadius: 8,
              marginBottom: 10,
            }}>
              <div style={{ fontSize: 9, fontWeight: 600, color: 'var(--status-live)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.14em', fontFamily: MONO }}>
                Quality Evaluations
              </div>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                {trace.evaluations.map((e, idx) => (
                  <div key={e.id || idx} style={{
                    background: 'var(--surface-3)', border: '1px solid var(--line-mid)',
                    borderRadius: 8, padding: '7px 11px', display: 'flex', flexDirection: 'column', gap: 2,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                      <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--white)' }}>{e.name}</span>
                      {e.score !== null && (
                        <span style={{
                          fontSize: 10, fontWeight: 600, fontFamily: MONO,
                          color: e.score >= 0.8 ? 'var(--status-live)' : e.score >= 0.5 ? 'var(--status-warn)' : 'var(--status-error)',
                        }}>{(e.score * 100).toFixed(0)}%</span>
                      )}
                      {e.value && (
                        <span style={{
                          fontSize: 8.5, padding: '1px 6px', borderRadius: 100, fontWeight: 600, fontFamily: MONO,
                          letterSpacing: '0.08em',
                          background: e.value === 'good' ? 'rgba(95,196,141,0.1)' : e.value === 'bad' ? 'rgba(227,109,109,0.1)' : 'rgba(226,169,79,0.1)',
                          color: e.value === 'good' ? 'var(--status-live)' : e.value === 'bad' ? 'var(--status-error)' : 'var(--status-warn)',
                          textTransform: 'uppercase',
                        }}>{e.value}</span>
                      )}
                    </div>
                    {e.comment && <div style={{ fontSize: 10, color: 'var(--gray-3)', marginTop: 2 }}>{e.comment}</div>}
                    <div style={{ fontSize: 8, color: 'var(--gray-4)', marginTop: 4, fontFamily: MONO }}>
                      Source: {e.source} {e.model ? `(${e.model})` : ''}
                    </div>
                  </div>
                ))}
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
                Models: <strong style={{ color: 'var(--gray-2)', fontWeight: 600 }}>
                  {[...new Set(spans.filter(s => s.model).map(s => s.model))].join(', ')}
                </strong>
              </span>
            )}
            <span style={{ fontSize: 10, color: 'var(--gray-3)' }}>
              Trace ID: <strong style={{ color: 'var(--gray-2)', fontFamily: MONO, fontWeight: 500 }}>
                {trace.trace_id}
              </strong>
            </span>
            <span style={{ fontSize: 10, color: 'var(--gray-3)', fontFamily: MONO }}>
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
          (t.id === traceId || t.trace_id === traceId) ? { ...t, spans: detail.spans || [], evaluations: detail.evaluations || [] } : t
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

  const hasActiveFilters = statusFilter !== 'all' || agentFilter !== 'all' || searchQuery !== '' || dateRange !== '90d';
  const clearFilters = () => {
    setStatusFilter('all');
    setAgentFilter('all');
    setSearchQuery('');
    setDateRange('90d');
  };

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

  // ── Empty State (no data at all) ──
  if (isEmpty) {
    return (
      <div className="dash-content">
        <div className="dash-panel" style={{ minHeight: 'calc(100vh - 140px)' }}>
          <div className="dash-panel-head">
            <span className="dash-panel-title">Agent Traces</span>
          </div>
          <EmptyState
            variant="traces"
            title="Trace Your Agent Execution"
            description="Capture every LLM call, tool use, and retrieval step with timing, tokens, and cost breakdowns — all in a visual waterfall."
            icon={<TracesEmptyViz />}
            steps={[
              'Install SDK: npm i stoic-agentos-sdk',
              'Call os.instrument() to auto-patch OpenAI & Anthropic',
              'Every LLM call is captured as a trace with spans',
            ]}
          >
            <div style={{
              marginTop: 4, padding: '14px 18px', background: 'var(--surface-3)',
              border: '1px solid var(--line-mid)', borderRadius: 10, fontSize: 12,
              color: 'var(--gray-3)', fontFamily: MONO, textAlign: 'left',
              maxWidth: 380, width: '100%',
            }}>
              <div style={{ color: 'var(--gray-4)', fontSize: 10, marginBottom: 4 }}>// Quick start</div>
              <div>import {'{'} AgentOS {'}'} from 'stoic-agentos-sdk';</div>
              <div>const os = new AgentOS({'{'} apiKey: 'sk_live_xxx' {'}'});</div>
              <div style={{ color: 'var(--accent)' }}>os.instrument(); // patches OpenAI & Anthropic</div>
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
        <StatCard icon={Icon.traces} label="Total Traces" value={stats.total} color="var(--accent)" sub={stats.running > 0 ? `${stats.running} running` : undefined} />
        <StatCard icon={Icon.bolt} label="Avg Latency" value={formatDuration(stats.avgLatency)} color="#67D4E8" />
        <StatCard icon={Icon.tokens} label="Total Tokens" value={stats.tokens.toLocaleString()} color="var(--synapse, #8E9EFF)" />
        <StatCard icon={Icon.cost} label="Est. Cost" value={formatCost(stats.cost)} color="var(--status-live)" />
        <StatCard icon={Icon.spans} label="Spans" value={stats.spans.toLocaleString()} color="var(--accent-bright)" sub={stats.errors > 0 ? `${stats.errors} errors` : undefined} />
      </div>

      {/* ── Filter Bar ── */}
      <div className="dash-panel" style={{ marginBottom: 16 }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12, padding: '12px 18px',
          flexWrap: 'wrap',
        }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '7px 12px', background: 'var(--surface-3)',
            border: '1px solid var(--line)', borderRadius: 9,
            flex: '1 1 200px', maxWidth: 320, color: 'var(--gray-4)',
          }}>
            {Icon.search}
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
            {['all', 'running', 'success', 'error'].map(s => {
              const dotColor = s === 'running' ? 'var(--status-warn)' : s === 'success' ? 'var(--status-live)' : s === 'error' ? 'var(--status-error)' : null;
              return (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={`dash-filter-pill${statusFilter === s ? ' active' : ''}`}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
                >
                  {dotColor && <span style={{ width: 6, height: 6, borderRadius: '50%', background: dotColor, display: 'inline-block' }} />}
                  {s === 'all' ? 'All' : s === 'running' ? 'Running' : s === 'success' ? 'Done' : 'Error'}
                </button>
              );
            })}
          </div>

          {/* Agent dropdown */}
          <select
            value={agentFilter}
            onChange={e => setAgentFilter(e.target.value)}
            style={{
              padding: '7px 10px', background: 'var(--surface-3)',
              border: '1px solid var(--line)', borderRadius: 9,
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
              padding: '7px 10px', background: 'var(--surface-3)',
              border: '1px solid var(--line)', borderRadius: 9,
              color: 'var(--gray-2)', fontSize: 12, fontFamily: 'inherit',
              cursor: 'pointer', outline: 'none',
            }}
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
          </select>

          <span style={{ fontSize: 11, color: 'var(--gray-3)', marginLeft: 'auto', fontFamily: MONO }}>
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
                border: `1px solid ${badge.color}28`, borderRadius: 100,
                display: 'flex', alignItems: 'center', gap: 12,
              }}>
                <span style={{ fontSize: 10.5, fontWeight: 600, color: badge.color, letterSpacing: '0.06em', textTransform: 'uppercase', fontFamily: MONO }}>{badge.label}</span>
                <span style={{ fontSize: 10, color: 'var(--gray-3)', fontFamily: MONO }}>{data.calls} calls</span>
                <span style={{ fontSize: 10, color: 'var(--gray-3)', fontFamily: MONO }}>{data.tokens?.toLocaleString()} tok</span>
                <span style={{ fontSize: 10, color: 'var(--status-live)', fontFamily: MONO }}>{formatCost(data.cost)}</span>
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
          <div className="dash-panel" style={{ padding: 44, textAlign: 'center' }}>
            <div style={{ fontSize: 13, color: 'var(--gray-2)', fontWeight: 600, marginBottom: 6 }}>
              {traces.length > 0 ? `${traces.length} trace${traces.length === 1 ? '' : 's'} hidden by filters` : 'No traces match the current filters'}
            </div>
            {traces.length > 0 && hasActiveFilters && (
              <>
                <div style={{ fontSize: 11.5, color: 'var(--gray-3)', marginBottom: 14 }}>
                  Your traces exist but fall outside the current date range, status, or search filters.
                </div>
                <button
                  onClick={clearFilters}
                  style={{
                    padding: '8px 18px', borderRadius: 9, cursor: 'pointer',
                    background: 'var(--accent-glow)', border: '1px solid rgba(206,155,79,0.4)',
                    color: 'var(--accent-bright)', fontSize: 12, fontWeight: 600, fontFamily: 'inherit',
                  }}
                >
                  Clear filters — show everything
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {/* ── Pro Upsell ── */}
      {(planName?.toLowerCase() || 'free') === 'free' && (
        <div style={{
          marginTop: 16, padding: '13px 18px',
          background: 'var(--accent-glow)',
          border: '1px solid rgba(206,155,79,0.18)',
          borderRadius: 'var(--radius-lg)',
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <span style={{ color: 'var(--accent)', display: 'grid', placeItems: 'center' }}>{Icon.lock}</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--gray-1)' }}>Pro: Advanced Tracing</div>
            <div style={{ fontSize: 10.5, color: 'var(--gray-3)' }}>
              Auto-instrumentation · Cost alerts · Model comparison · Prompt versioning · Unlimited retention
            </div>
          </div>
          <span style={{
            fontSize: 9, padding: '3px 9px', borderRadius: 100, fontFamily: MONO, letterSpacing: '0.14em',
            background: 'rgba(206,155,79,0.18)', color: 'var(--accent-bright)', fontWeight: 600,
            border: '1px solid rgba(206,155,79,0.35)',
          }}>PRO</span>
        </div>
      )}
    </div>
  );
}
