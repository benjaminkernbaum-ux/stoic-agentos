import { useState, useMemo, useCallback, useEffect } from 'react';
import { supabase, API_BASE } from '../../../lib/supabase';

/**
 * ═══════════════════════════════════════════════════
 *  WorkflowsTab — Agent Execution Workflows
 *  Visual timeline of agent runs with status indicators
 *  Error highlighting, drill-down, and export
 * ═══════════════════════════════════════════════════
 */

const STATUS_CFG = {
  running: { color: '#fbbf24', bg: 'rgba(251,191,36,0.10)', icon: '🟡', label: 'Running' },
  success: { color: '#34c759', bg: 'rgba(52,199,89,0.10)', icon: '🟢', label: 'Completed' },
  error:   { color: '#ff3b30', bg: 'rgba(255,59,48,0.10)', icon: '🔴', label: 'Error' },
  idle:    { color: 'var(--gray-3)', bg: 'var(--surface-4)', icon: '⚪', label: 'Idle' },
  paused:  { color: '#ff9f0a', bg: 'rgba(255,159,10,0.10)', icon: '🟠', label: 'Paused' },
};

const TYPE_ICONS = {
  architecture: '🏗️', decision: '🧭', git_commit: '📝', deployment: '🚀',
  error: '❌', discovery: '💡', note: '📌', file_edit: '✏️',
  agent_run: '🤖', command: '⚡', config: '⚙️', dependency: '📦',
};

function timeAgo(ts) {
  if (!ts) return '—';
  const s = Math.floor((Date.now() - new Date(ts).getTime()) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

function formatTime(ts) {
  if (!ts) return '—';
  return new Date(ts).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

// ── Agent Workflow Card ──
function AgentWorkflowCard({ agent, events, expanded, onToggle }) {
  const statusCfg = STATUS_CFG[agent.status] || STATUS_CFG.idle;
  const totalRuns = agent.total_runs || 0;
  const totalErrors = agent.total_errors || 0;
  const errorRate = totalRuns > 0 ? ((totalErrors / totalRuns) * 100).toFixed(1) : 0;
  const recentEvents = events.slice(0, 20);
  const hasErrors = totalErrors > 0 || events.some(e => e.type === 'error');

  return (
    <div
      style={{
        background: expanded ? 'rgba(124,58,237,0.04)' : 'var(--surface-2)',
        border: `1px solid ${expanded ? 'rgba(167,139,250,0.25)' : hasErrors ? 'rgba(255,59,48,0.15)' : 'var(--line-mid)'}`,
        borderRadius: 'var(--radius-lg)',
        overflow: 'hidden',
        transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
        position: 'relative',
      }}
    >
      {/* Top gradient for active/error agents */}
      {(agent.status === 'running' || hasErrors) && (
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: 2,
          background: hasErrors
            ? 'linear-gradient(90deg, #ff3b30, #ff9f0a)'
            : 'var(--gradient-hero)',
        }} />
      )}

      {/* ── Header ── */}
      <div
        onClick={onToggle}
        style={{
          display: 'flex', alignItems: 'center', gap: 14,
          padding: '16px 20px', cursor: 'pointer',
        }}
      >
        {/* Status indicator */}
        <div style={{
          width: 10, height: 10, borderRadius: '50%',
          background: statusCfg.color,
          boxShadow: `0 0 8px ${statusCfg.color}50`,
          animation: agent.status === 'running' ? 'pulse-dot 2s infinite' : 'none',
          flexShrink: 0,
        }} />

        {/* Agent name */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: 14, fontWeight: 700, color: 'var(--white)',
            fontFamily: "'JetBrains Mono', monospace",
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            letterSpacing: '-0.01em',
          }}>
            {agent.name}
          </div>
          {agent.description && (
            <div style={{ fontSize: 11, color: 'var(--gray-3)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {agent.description}
            </div>
          )}
        </div>

        {/* Stats chips */}
        <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
          <span style={{
            fontSize: 10, padding: '3px 8px', borderRadius: 4,
            background: statusCfg.bg, color: statusCfg.color,
            fontWeight: 700, textTransform: 'uppercase',
          }}>{statusCfg.label}</span>

          <span style={{
            fontSize: 10, padding: '3px 8px', borderRadius: 4,
            background: 'var(--surface-4)', border: '1px solid var(--line)',
            color: 'var(--gray-2)', fontVariantNumeric: 'tabular-nums',
          }}>
            {totalRuns} runs
          </span>

          {totalErrors > 0 && (
            <span style={{
              fontSize: 10, padding: '3px 8px', borderRadius: 4,
              background: 'rgba(255,59,48,0.10)', color: '#ff3b30',
              fontWeight: 700,
            }}>
              {totalErrors} errors ({errorRate}%)
            </span>
          )}
        </div>

        {/* Module tag */}
        {agent.module && (
          <span style={{
            fontSize: 10, padding: '2px 7px', borderRadius: 4,
            background: 'var(--surface-4)', border: '1px solid var(--line)',
            color: 'var(--gray-3)', flexShrink: 0,
          }}>{agent.module}</span>
        )}

        {/* Last heartbeat */}
        <span style={{ fontSize: 10, color: 'var(--gray-4)', fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>
          {agent.last_heartbeat ? timeAgo(agent.last_heartbeat) : 'Never'}
        </span>

        {/* Expand toggle */}
        <span style={{
          fontSize: 10, color: 'var(--gray-3)',
          transition: 'transform 0.2s',
          transform: expanded ? 'rotate(90deg)' : 'rotate(0)',
        }}>▶</span>
      </div>

      {/* ── Visual Timeline ── */}
      {expanded && (
        <div style={{ borderTop: '1px solid var(--line)', padding: '16px 20px' }}>
          {/* Timeline header */}
          <div style={{
            fontSize: 10, fontWeight: 700, color: 'var(--gray-3)',
            textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12,
          }}>
            Activity Timeline — {recentEvents.length} events
          </div>

          {recentEvents.length > 0 ? (
            <div style={{ position: 'relative', paddingLeft: 24 }}>
              {/* Timeline line */}
              <div style={{
                position: 'absolute', left: 7, top: 8, bottom: 8, width: 1,
                background: 'linear-gradient(to bottom, var(--line-mid), transparent)',
              }} />

              {recentEvents.map((event, i) => {
                const isError = event.type === 'error';
                return (
                  <div key={event.id || i} style={{
                    display: 'flex', gap: 12, padding: '8px 0',
                    position: 'relative',
                    transition: 'all 0.15s',
                  }}>
                    {/* Timeline dot */}
                    <div style={{
                      width: 14, height: 14, borderRadius: '50%',
                      background: isError ? 'rgba(255,59,48,0.15)' : 'var(--surface-4)',
                      border: `2px solid ${isError ? '#ff3b30' : 'var(--line-mid)'}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 7, flexShrink: 0,
                      position: 'absolute', left: -24, top: 10,
                      zIndex: 1,
                    }}>
                      {isError ? '!' : ''}
                    </div>

                    {/* Event icon */}
                    <span style={{ fontSize: 13, width: 20, textAlign: 'center', flexShrink: 0, marginTop: 1 }}>
                      {TYPE_ICONS[event.type] || '📌'}
                    </span>

                    {/* Event body */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontSize: 12, fontWeight: 500, color: isError ? '#ff3b30' : 'var(--gray-1)',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>
                        {event.title}
                      </div>
                      {event.content && (
                        <div style={{
                          fontSize: 11, color: 'var(--gray-3)', marginTop: 2,
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                          maxWidth: 500,
                        }}>
                          {event.content}
                        </div>
                      )}
                    </div>

                    {/* Type badge */}
                    <span style={{
                      fontSize: 9, padding: '2px 6px', borderRadius: 3,
                      background: isError ? 'rgba(255,59,48,0.10)' : 'var(--surface-4)',
                      border: `1px solid ${isError ? 'rgba(255,59,48,0.15)' : 'var(--line)'}`,
                      color: isError ? '#ff3b30' : 'var(--gray-3)',
                      fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em',
                      flexShrink: 0, alignSelf: 'flex-start',
                    }}>{event.type || 'note'}</span>

                    {/* Timestamp */}
                    <span style={{
                      fontSize: 10, color: 'var(--gray-4)',
                      fontVariantNumeric: 'tabular-nums', flexShrink: 0,
                      alignSelf: 'flex-start',
                    }}>
                      {formatTime(event.created_at)}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={{ padding: '12px 0', fontSize: 12, color: 'var(--gray-3)' }}>
              No activity recorded for this agent yet. Use the SDK to capture observations.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Workflow Summary Stat ──
function WorkflowStat({ icon, value, label, color }) {
  return (
    <div style={{
      flex: '1 1 120px', padding: '14px 16px',
      background: 'var(--surface-2)', border: '1px solid var(--line-mid)',
      borderRadius: 'var(--radius-lg)', position: 'relative', overflow: 'hidden',
    }}>
      <div style={{ position: 'absolute', top: 0, left: '10%', right: '10%', height: 1, background: `linear-gradient(90deg, transparent, ${color}40, transparent)` }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        <span style={{ fontSize: 16 }}>{icon}</span>
      </div>
      <div style={{ fontSize: 22, fontWeight: 800, color, letterSpacing: '-0.03em', fontVariantNumeric: 'tabular-nums', textShadow: `0 0 30px ${color}25` }}>
        {value}
      </div>
      <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--gray-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 2 }}>
        {label}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════
//  MAIN WorkflowsTab
// ═══════════════════════════════════════════════════
export default function WorkflowsTab({ agents, observations, workspaces, planName, handleUpgrade }) {
  const [expandedAgent, setExpandedAgent] = useState(null);
  const [viewMode, setViewMode] = useState('timeline'); // timeline | grid
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('recent'); // recent | errors | runs

  // Build per-agent event maps
  const agentEvents = useMemo(() => {
    const map = {};
    agents.forEach(a => { map[a.id] = []; });
    (observations || []).forEach(obs => {
      if (obs.agent_id && map[obs.agent_id]) {
        map[obs.agent_id].push(obs);
      }
    });
    // Sort each agent's events by time desc
    Object.keys(map).forEach(k => {
      map[k].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    });
    return map;
  }, [agents, observations]);

  // Filter & sort agents
  const filteredAgents = useMemo(() => {
    let result = [...agents];

    if (statusFilter !== 'all') {
      result = result.filter(a => a.status === statusFilter);
    }

    switch (sortBy) {
      case 'errors':
        result.sort((a, b) => (b.total_errors || 0) - (a.total_errors || 0));
        break;
      case 'runs':
        result.sort((a, b) => (b.total_runs || 0) - (a.total_runs || 0));
        break;
      case 'recent':
      default:
        result.sort((a, b) => {
          const at = a.last_heartbeat ? new Date(a.last_heartbeat) : new Date(0);
          const bt = b.last_heartbeat ? new Date(b.last_heartbeat) : new Date(0);
          return bt - at;
        });
    }
    return result;
  }, [agents, statusFilter, sortBy]);

  // Overall stats
  const overallStats = useMemo(() => {
    const total = agents.length;
    const running = agents.filter(a => a.status === 'running').length;
    const errors = agents.filter(a => a.status === 'error').length;
    const totalRuns = agents.reduce((s, a) => s + (a.total_runs || 0), 0);
    const totalErrors = agents.reduce((s, a) => s + (a.total_errors || 0), 0);
    return { total, running, errors, totalRuns, totalErrors };
  }, [agents]);

  const isEmpty = agents.length === 0;

  // ── Empty State ──
  if (isEmpty) {
    return (
      <div className="dash-content" style={{ height: 'calc(100vh - 80px)' }}>
        <div className="dash-panel" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
          <div className="dash-panel-head">
            <span className="dash-panel-title">
              <span className="dash-panel-title-icon">🔗</span>
              Agent Workflows
            </span>
          </div>
          <div className="dash-empty" style={{ padding: 80, flex: 1 }}>
            <div className="dash-empty-icon">🔗</div>
            <h4>No Agent Workflows</h4>
            <p>Register agents to visualize their execution workflows, status timelines, and error patterns.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="dash-content">
      {/* ── Summary Stats ── */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <WorkflowStat icon="🤖" value={overallStats.total} label="Total Agents" color="var(--accent-bright)" />
        <WorkflowStat icon="🟢" value={overallStats.running} label="Running" color="#34c759" />
        <WorkflowStat icon="🔴" value={overallStats.errors} label="Errors" color="#ff3b30" />
        <WorkflowStat icon="▶️" value={overallStats.totalRuns.toLocaleString()} label="Total Runs" color="#67e8f9" />
        <WorkflowStat icon="⚠️" value={overallStats.totalErrors.toLocaleString()} label="Total Errors" color="#ff9f0a" />
      </div>

      {/* ── Controls ── */}
      <div className="dash-panel" style={{ marginBottom: 16 }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12, padding: '12px 18px',
          flexWrap: 'wrap',
        }}>
          {/* View mode */}
          <div style={{ display: 'flex', gap: 2, background: 'var(--surface-3)', borderRadius: 8, padding: 2 }}>
            {[
              { id: 'timeline', icon: '📋', label: 'Timeline' },
              { id: 'grid', icon: '📊', label: 'Grid' },
            ].map(v => (
              <button
                key={v.id}
                onClick={() => setViewMode(v.id)}
                style={{
                  padding: '5px 12px', fontSize: 11, fontWeight: 600,
                  borderRadius: 6, border: 'none',
                  background: viewMode === v.id ? 'var(--accent-deep)' : 'transparent',
                  color: viewMode === v.id ? '#fff' : 'var(--gray-3)',
                  cursor: 'pointer', fontFamily: 'inherit',
                  transition: 'all 0.15s',
                }}
              >
                {v.icon} {v.label}
              </button>
            ))}
          </div>

          {/* Status filter */}
          <div style={{ display: 'flex', gap: 4 }}>
            {['all', 'running', 'idle', 'error', 'paused'].map(s => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`dash-filter-pill${statusFilter === s ? ' active' : ''}`}
                style={{ fontSize: 11 }}
              >
                {s === 'all' ? 'All' : (STATUS_CFG[s]?.icon || '') + ' ' + (STATUS_CFG[s]?.label || s)}
              </button>
            ))}
          </div>

          {/* Sort */}
          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value)}
            style={{
              padding: '6px 10px', background: 'var(--surface-3)',
              border: '1px solid var(--line)', borderRadius: 8,
              color: 'var(--gray-2)', fontSize: 12, fontFamily: 'inherit',
              cursor: 'pointer', outline: 'none',
            }}
          >
            <option value="recent">Most Recent</option>
            <option value="errors">Most Errors</option>
            <option value="runs">Most Runs</option>
          </select>

          <span style={{ fontSize: 11, color: 'var(--gray-3)', marginLeft: 'auto' }}>
            {filteredAgents.length} agents
          </span>
        </div>
      </div>

      {/* ── Timeline View ── */}
      {viewMode === 'timeline' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filteredAgents.map(agent => (
            <AgentWorkflowCard
              key={agent.id}
              agent={agent}
              events={agentEvents[agent.id] || []}
              expanded={expandedAgent === agent.id}
              onToggle={() => setExpandedAgent(expandedAgent === agent.id ? null : agent.id)}
            />
          ))}
        </div>
      )}

      {/* ── Grid View ── */}
      {viewMode === 'grid' && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
          gap: 12,
        }}>
          {filteredAgents.map(agent => {
            const statusCfg = STATUS_CFG[agent.status] || STATUS_CFG.idle;
            const events = agentEvents[agent.id] || [];
            const recentErrors = events.filter(e => e.type === 'error').slice(0, 3);

            return (
              <div key={agent.id} style={{
                background: 'var(--surface-2)',
                border: `1px solid ${recentErrors.length > 0 ? 'rgba(255,59,48,0.15)' : 'var(--line-mid)'}`,
                borderRadius: 'var(--radius-lg)',
                padding: '18px',
                transition: 'all 0.25s',
                position: 'relative', overflow: 'hidden',
              }}>
                {/* Top gradient */}
                {agent.status === 'running' && (
                  <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: 'var(--gradient-hero)' }} />
                )}

                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                  <div style={{
                    width: 8, height: 8, borderRadius: '50%',
                    background: statusCfg.color,
                    boxShadow: `0 0 8px ${statusCfg.color}50`,
                    animation: agent.status === 'running' ? 'pulse-dot 2s infinite' : 'none',
                  }} />
                  <span style={{
                    fontSize: 13, fontWeight: 700,
                    fontFamily: "'JetBrains Mono', monospace",
                    color: 'var(--white)', flex: 1,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>{agent.name}</span>
                  <span style={{
                    fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 4,
                    background: statusCfg.bg, color: statusCfg.color,
                    textTransform: 'uppercase',
                  }}>{statusCfg.label}</span>
                </div>

                {/* Stats */}
                <div style={{ display: 'flex', gap: 16, marginBottom: 14 }}>
                  <div>
                    <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--white)', fontVariantNumeric: 'tabular-nums' }}>{agent.total_runs || 0}</div>
                    <div style={{ fontSize: 9, color: 'var(--gray-3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Runs</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 20, fontWeight: 800, color: (agent.total_errors || 0) > 0 ? '#ff3b30' : 'var(--white)', fontVariantNumeric: 'tabular-nums' }}>{agent.total_errors || 0}</div>
                    <div style={{ fontSize: 9, color: 'var(--gray-3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Errors</div>
                  </div>
                </div>

                {/* Mini activity bar */}
                <div style={{
                  height: 24, display: 'flex', gap: 1,
                  background: 'rgba(124,58,237,0.04)', borderRadius: 4, overflow: 'hidden',
                  marginBottom: 12,
                }}>
                  {events.slice(0, 30).map((e, i) => (
                    <div
                      key={i}
                      title={`${e.type}: ${e.title}`}
                      style={{
                        flex: 1, minWidth: 3,
                        background: e.type === 'error' ? '#ff3b30' : e.type === 'deployment' ? '#34c759' : 'var(--accent)',
                        opacity: 0.3 + (0.7 * (1 - i / 30)),
                      }}
                    />
                  ))}
                </div>

                {/* Recent errors */}
                {recentErrors.length > 0 && (
                  <div style={{
                    padding: '8px 10px', background: 'rgba(255,59,48,0.06)',
                    border: '1px solid rgba(255,59,48,0.10)', borderRadius: 8,
                    marginBottom: 10,
                  }}>
                    <div style={{ fontSize: 9, fontWeight: 700, color: '#ff3b30', marginBottom: 4, textTransform: 'uppercase' }}>Recent Errors</div>
                    {recentErrors.map((err, i) => (
                      <div key={i} style={{ fontSize: 10, color: 'var(--gray-3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', padding: '1px 0' }}>
                        {err.title}
                      </div>
                    ))}
                  </div>
                )}

                {/* Footer */}
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  paddingTop: 10, borderTop: '1px solid var(--line)',
                }}>
                  <span style={{ fontSize: 10, color: 'var(--gray-3)' }}>{agent.module}</span>
                  <span style={{ fontSize: 10, color: 'var(--gray-4)', fontVariantNumeric: 'tabular-nums' }}>
                    {agent.last_heartbeat ? timeAgo(agent.last_heartbeat) : 'Never'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {filteredAgents.length === 0 && (
        <div className="dash-panel" style={{ padding: 48, textAlign: 'center' }}>
          <div style={{ fontSize: 28, opacity: 0.2, marginBottom: 8 }}>🔍</div>
          <div style={{ fontSize: 13, color: 'var(--gray-3)' }}>No agents match the current filters</div>
        </div>
      )}

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
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--gray-1)' }}>Pro: Interactive Workflow Builder</div>
            <div style={{ fontSize: 10, color: 'var(--gray-3)' }}>
              Drag-and-drop nodes · Custom triggers · Conditional branching · Visual DAG editor
            </div>
          </div>
          <button
            onClick={() => handleUpgrade?.('pro')}
            style={{
              padding: '4px 12px', fontSize: 10, fontWeight: 800,
              background: 'rgba(124,58,237,0.15)', color: '#a78bfa',
              border: '1px solid rgba(124,58,237,0.2)', borderRadius: 6,
              cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            Upgrade
          </button>
        </div>
      )}
    </div>
  );
}
