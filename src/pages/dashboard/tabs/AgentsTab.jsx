import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../../lib/supabase';
import { EmptyState } from '../../../components/SkeletonLoader';

/**
 * ═══════════════════════════════════════════════════
 *  AgentsTab v2 — Premium Agent Registry
 *  Enhanced cards with left accent, better hierarchy,
 *  search/filter, and status-driven visual design
 * ═══════════════════════════════════════════════════
 */

const HEARTBEAT_THRESHOLDS = {
  online:  2 * 60 * 1000,
  idle:    10 * 60 * 1000,
};

function getHeartbeatStatus(lastHeartbeat) {
  if (!lastHeartbeat) return 'offline';
  const elapsed = Date.now() - new Date(lastHeartbeat).getTime();
  if (elapsed < HEARTBEAT_THRESHOLDS.online) return 'online';
  if (elapsed < HEARTBEAT_THRESHOLDS.idle) return 'idle';
  return 'offline';
}

const LIVE_STATUS = {
  online:  { color: '#22c55e', label: 'Online', bg: 'rgba(34,197,94,0.08)' },
  idle:    { color: '#f59e0b', label: 'Idle',   bg: 'rgba(245,158,11,0.08)' },
  offline: { color: '#71717a', label: 'Offline', bg: 'rgba(113,113,122,0.08)' },
};

const STATUS_CFG = {
  running: { color: '#22c55e', bg: 'rgba(34,197,94,0.1)',  border: 'rgba(34,197,94,0.25)' },
  idle:    { color: '#71717a', bg: 'rgba(113,113,122,0.08)', border: 'rgba(113,113,122,0.15)' },
  error:   { color: '#ef4444', bg: 'rgba(239,68,68,0.1)',  border: 'rgba(239,68,68,0.25)' },
  success: { color: '#a1a1aa', bg: 'rgba(161,161,170,0.08)', border: 'rgba(161,161,170,0.15)' },
  paused:  { color: '#f59e0b', bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.2)' },
};

function timeAgo(ts) {
  if (!ts) return 'Never';
  const s = Math.floor((Date.now() - new Date(ts).getTime()) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

/* Mini bar chart for runs/errors visual */
function MiniBar({ value, max, color = 'rgba(167,139,250,0.4)' }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div style={{ width: 48, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
      <div style={{ width: `${pct}%`, height: '100%', borderRadius: 2, background: color, transition: 'width 0.4s ease' }} />
    </div>
  );
}

export default function AgentsTab({ agents, setShowAgentModal, setSelectedAgent, handleSeedDemo, seedLoading }) {
  const [recentlyUpdated, setRecentlyUpdated] = useState(new Set());
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'

  const orgId = useMemo(() => agents[0]?.org_id || null, [agents]);
  const maxRuns = useMemo(() => Math.max(...agents.map(a => a.total_runs || 0), 1), [agents]);

  useEffect(() => {
    if (!orgId) return;
    const channel = supabase
      .channel(`agents-realtime-${orgId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'agents', filter: `org_id=eq.${orgId}` },
        (payload) => {
          if (payload.eventType === 'UPDATE' || payload.eventType === 'INSERT') {
            setRecentlyUpdated(prev => new Set([...prev, payload.new.id]));
            setTimeout(() => {
              setRecentlyUpdated(prev => { const n = new Set(prev); n.delete(payload.new.id); return n; });
            }, 5000);
          }
        }
      ).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [orgId]);

  const counts = useMemo(() => {
    const online = agents.filter(a => getHeartbeatStatus(a.last_heartbeat) === 'online').length;
    const idle = agents.filter(a => getHeartbeatStatus(a.last_heartbeat) === 'idle').length;
    const offline = agents.filter(a => getHeartbeatStatus(a.last_heartbeat) === 'offline').length;
    const running = agents.filter(a => a.status === 'running').length;
    const errors = agents.filter(a => a.status === 'error').length;
    return { online, idle, offline, running, errors, total: agents.length };
  }, [agents]);

  const filtered = useMemo(() => {
    let result = agents;
    if (statusFilter !== 'all') {
      if (statusFilter === 'online') result = result.filter(a => getHeartbeatStatus(a.last_heartbeat) === 'online');
      else if (statusFilter === 'offline') result = result.filter(a => getHeartbeatStatus(a.last_heartbeat) === 'offline');
      else result = result.filter(a => a.status === statusFilter);
    }
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(a =>
        (a.name || '').toLowerCase().includes(q) ||
        (a.module || '').toLowerCase().includes(q) ||
        (a.description || '').toLowerCase().includes(q)
      );
    }
    return result;
  }, [agents, statusFilter, search]);

  return (
    <div className="dash-content">

      {/* ── Status Summary Bar ── */}
      <div className="agent-summary-bar">
        <div className="agent-summary-stats">
          <div className="agent-summary-stat">
            <span className="agent-summary-num">{counts.total}</span>
            <span className="agent-summary-lbl">Total</span>
          </div>
          <div className="agent-summary-divider" />
          <div className="agent-summary-stat">
            <span className="agent-summary-dot" style={{ background: '#22c55e', boxShadow: '0 0 6px rgba(34,197,94,0.5)' }} />
            <span className="agent-summary-num" style={{ color: '#22c55e' }}>{counts.online}</span>
            <span className="agent-summary-lbl">Online</span>
          </div>
          <div className="agent-summary-stat">
            <span className="agent-summary-dot" style={{ background: '#f59e0b' }} />
            <span className="agent-summary-num" style={{ color: '#f59e0b' }}>{counts.idle}</span>
            <span className="agent-summary-lbl">Idle</span>
          </div>
          <div className="agent-summary-stat">
            <span className="agent-summary-dot" style={{ background: '#71717a' }} />
            <span className="agent-summary-num">{counts.offline}</span>
            <span className="agent-summary-lbl">Offline</span>
          </div>
          {counts.errors > 0 && (
            <div className="agent-summary-stat">
              <span className="agent-summary-dot" style={{ background: '#ef4444' }} />
              <span className="agent-summary-num" style={{ color: '#ef4444' }}>{counts.errors}</span>
              <span className="agent-summary-lbl">Errors</span>
            </div>
          )}
        </div>
        <div className="agent-summary-actions">
          <input
            type="text"
            placeholder="Search agents..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="agent-search-input"
          />
          <button className="btn btn-primary btn-sm" onClick={() => setShowAgentModal(true)}>+ Register Agent</button>
        </div>
      </div>

      {/* ── Filter Pills ── */}
      <div className="agent-filter-row">
        {['all', 'running', 'idle', 'error', 'online', 'offline'].map(f => (
          <button key={f}
            className={`agent-filter-pill ${statusFilter === f ? 'active' : ''}`}
            onClick={() => setStatusFilter(f)}
          >
            {f === 'all' ? `All (${counts.total})` : f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
        <div style={{ flex: 1 }} />
        <div className="agent-view-toggle">
          <button className={`agent-view-btn ${viewMode === 'grid' ? 'active' : ''}`} onClick={() => setViewMode('grid')} title="Grid view">▦</button>
          <button className={`agent-view-btn ${viewMode === 'list' ? 'active' : ''}`} onClick={() => setViewMode('list')} title="List view">☰</button>
        </div>
      </div>

      {/* ── Agent Cards / List ── */}
      {filtered.length > 0 ? (
        viewMode === 'grid' ? (
          <div className="agent-grid-v2">
            {filtered.map(agent => {
              const hbStatus = getHeartbeatStatus(agent.last_heartbeat);
              const liveCfg = LIVE_STATUS[hbStatus];
              const sCfg = STATUS_CFG[agent.status] || STATUS_CFG.idle;
              const isRecent = recentlyUpdated.has(agent.id);
              return (
                <div key={agent.id}
                  className={`agent-card-v2 ${isRecent ? 'pulse' : ''}`}
                  onClick={() => setSelectedAgent(agent)}
                  style={{ borderLeftColor: sCfg.border }}
                >
                  <div className="agent-card-header">
                    <div className="agent-card-avatar" style={{ background: sCfg.bg, borderColor: sCfg.border }}>
                      <span style={{ color: sCfg.color }}>🤖</span>
                    </div>
                    <div className="agent-card-info">
                      <span className="agent-card-name">{agent.name}</span>
                      <span className="agent-card-module">{agent.module || 'general'}</span>
                    </div>
                    <div className="agent-card-badges">
                      <span className="agent-status-pill" style={{ background: sCfg.bg, color: sCfg.color, borderColor: sCfg.border }}>
                        {agent.status || 'idle'}
                      </span>
                    </div>
                  </div>

                  {agent.description && (
                    <p className="agent-card-desc">{agent.description}</p>
                  )}

                  <div className="agent-card-metrics">
                    <div className="agent-card-metric">
                      <div className="agent-card-metric-top">
                        <span className="agent-card-metric-val">{agent.total_runs || 0}</span>
                        <span className="agent-card-metric-lbl">Runs</span>
                      </div>
                      <MiniBar value={agent.total_runs || 0} max={maxRuns} color="rgba(167,139,250,0.5)" />
                    </div>
                    <div className="agent-card-metric">
                      <div className="agent-card-metric-top">
                        <span className={`agent-card-metric-val ${(agent.total_errors || 0) > 0 ? 'error' : ''}`}>
                          {agent.total_errors || 0}
                        </span>
                        <span className="agent-card-metric-lbl">Errors</span>
                      </div>
                      <MiniBar value={agent.total_errors || 0} max={Math.max(agent.total_runs || 1, agent.total_errors || 1)} color={(agent.total_errors || 0) > 0 ? 'rgba(239,68,68,0.5)' : 'rgba(255,255,255,0.06)'} />
                    </div>
                  </div>

                  <div className="agent-card-footer">
                    <div className="agent-card-heartbeat">
                      <span className="agent-card-hb-dot" style={{ background: liveCfg.color }} />
                      <span className="agent-card-hb-text">{timeAgo(agent.last_heartbeat)}</span>
                    </div>
                    {agent.trigger && <span className="agent-card-trigger">{agent.trigger}</span>}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* ── List View ── */
          <div className="bento-table-panel">
            <div className="bento-table-wrap">
              <table className="bento-table">
                <thead>
                  <tr>
                    <th>Agent</th>
                    <th>Module</th>
                    <th>Status</th>
                    <th>Heartbeat</th>
                    <th style={{ textAlign: 'right' }}>Runs</th>
                    <th style={{ textAlign: 'right' }}>Errors</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(agent => {
                    const hbStatus = getHeartbeatStatus(agent.last_heartbeat);
                    const liveCfg = LIVE_STATUS[hbStatus];
                    const sCfg = STATUS_CFG[agent.status] || STATUS_CFG.idle;
                    return (
                      <tr key={agent.id} onClick={() => setSelectedAgent(agent)} style={{ cursor: 'pointer' }}>
                        <td className="bento-table-name">{agent.name}</td>
                        <td className="bento-table-module">{agent.module || '—'}</td>
                        <td>
                          <span className="agent-status-pill" style={{ background: sCfg.bg, color: sCfg.color, borderColor: sCfg.border }}>
                            {agent.status || 'idle'}
                          </span>
                        </td>
                        <td>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                            <span className="agent-card-hb-dot" style={{ background: liveCfg.color }} />
                            <span className="bento-table-time">{timeAgo(agent.last_heartbeat)}</span>
                          </span>
                        </td>
                        <td className="bento-table-runs">{agent.total_runs || 0}</td>
                        <td className="bento-table-runs" style={{ color: (agent.total_errors || 0) > 0 ? '#ef4444' : undefined }}>{agent.total_errors || 0}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )
      ) : agents.length > 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--gray-3)' }}>
          <div style={{ fontSize: 24, marginBottom: 12, opacity: 0.4 }}>🔍</div>
          <p>No agents match your filters</p>
          <button className="agent-filter-pill active" onClick={() => { setStatusFilter('all'); setSearch(''); }} style={{ marginTop: 12 }}>Clear filters</button>
        </div>
      ) : (
        <div className="dash-panel">
          <EmptyState
            variant="agents"
            title="Register Your First Agent"
            description="Create agents manually or use the SDK to auto-register them on first heartbeat."
            steps={[
              'Install SDK: npm i stoic-agentos-sdk',
              'Call os.wrapAgent() in your agent code',
              'Agents auto-register on first run',
            ]}
          >
            <button className="btn-seed" onClick={() => setShowAgentModal(true)}>+ Register Agent</button>
            <button className="btn btn-ghost btn-sm" onClick={() => handleSeedDemo()} disabled={seedLoading}>{seedLoading ? '...' : '⚡ Seed Demo'}</button>
          </EmptyState>
        </div>
      )}
    </div>
  );
}
