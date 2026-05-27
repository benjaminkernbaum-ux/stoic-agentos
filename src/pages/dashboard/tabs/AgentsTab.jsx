import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../../lib/supabase';
import { EmptyState } from '../../../components/SkeletonLoader';

/**
 * ═══════════════════════════════════════════════════
 *  AgentsTab — with Supabase Realtime Status
 *  Live status badges (🟢 online, 🟡 idle, 🔴 offline)
 *  Pulsing animation for recently active agents
 * ═══════════════════════════════════════════════════
 */

const HEARTBEAT_THRESHOLDS = {
  online:  2 * 60 * 1000,   // last heartbeat < 2 min
  idle:    10 * 60 * 1000,  // last heartbeat < 10 min
  // else: offline
};

function getHeartbeatStatus(lastHeartbeat) {
  if (!lastHeartbeat) return 'offline';
  const elapsed = Date.now() - new Date(lastHeartbeat).getTime();
  if (elapsed < HEARTBEAT_THRESHOLDS.online) return 'online';
  if (elapsed < HEARTBEAT_THRESHOLDS.idle) return 'idle';
  return 'offline';
}

const LIVE_STATUS = {
  online:  { emoji: '🟢', color: '#34c759', label: 'Online', glow: 'rgba(52,199,89,0.4)' },
  idle:    { emoji: '🟡', color: '#fbbf24', label: 'Idle', glow: 'rgba(251,191,36,0.3)' },
  offline: { emoji: '🔴', color: '#ff3b30', label: 'Offline', glow: 'rgba(255,59,48,0.3)' },
};

function timeAgo(ts) {
  if (!ts) return 'Never';
  const s = Math.floor((Date.now() - new Date(ts).getTime()) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

export default function AgentsTab({ agents, setShowAgentModal, setSelectedAgent, handleSeedDemo, seedLoading }) {
  const [recentlyUpdated, setRecentlyUpdated] = useState(new Set());

  // Stable org_id derived from agents
  const orgId = useMemo(() => agents[0]?.org_id || null, [agents]);

  // ── Supabase Realtime subscription ──
  useEffect(() => {
    if (!orgId) return;

    const channel = supabase
      .channel(`agents-realtime-${orgId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'agents',
          filter: `org_id=eq.${orgId}`,
        },
        (payload) => {
          if (payload.eventType === 'UPDATE' || payload.eventType === 'INSERT') {
            setRecentlyUpdated(prev => new Set([...prev, payload.new.id]));
            setTimeout(() => {
              setRecentlyUpdated(prev => {
                const next = new Set(prev);
                next.delete(payload.new.id);
                return next;
              });
            }, 5000);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [orgId]);



  return (
    <div className="dash-content">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        {/* Live status summary */}
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          {agents.length > 0 && (() => {
            const online = agents.filter(a => getHeartbeatStatus(a.last_heartbeat) === 'online').length;
            const idle = agents.filter(a => getHeartbeatStatus(a.last_heartbeat) === 'idle').length;
            const offline = agents.filter(a => getHeartbeatStatus(a.last_heartbeat) === 'offline').length;
            return (
              <>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '4px 10px', borderRadius: 6,
                  background: 'var(--surface-3)', border: '1px solid var(--line)',
                  fontSize: 11, color: 'var(--gray-2)', fontWeight: 600,
                }}>
                  <span style={{
                    width: 6, height: 6, borderRadius: '50%',
                    background: '#34c759',
                    boxShadow: '0 0 6px rgba(52,199,89,0.5)',
                    animation: 'pulse-dot 2s infinite',
                  }} />
                  LIVE
                </div>
                {online > 0 && (
                  <span style={{ fontSize: 11, color: '#34c759', fontWeight: 600 }}>
                    🟢 {online} online
                  </span>
                )}
                {idle > 0 && (
                  <span style={{ fontSize: 11, color: '#fbbf24', fontWeight: 600 }}>
                    🟡 {idle} idle
                  </span>
                )}
                {offline > 0 && (
                  <span style={{ fontSize: 11, color: 'var(--gray-3)' }}>
                    🔴 {offline} offline
                  </span>
                )}
              </>
            );
          })()}
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => setShowAgentModal(true)}>+ Register Agent</button>
      </div>

      {agents.length > 0 ? (
        <div className="dash-agent-grid">
          {agents.map(agent => {
            const hbStatus = getHeartbeatStatus(agent.last_heartbeat);
            const liveCfg = LIVE_STATUS[hbStatus];
            const isRecent = recentlyUpdated.has(agent.id);

            return (
              <div
                key={agent.id}
                className="dash-agent-card"
                onClick={() => setSelectedAgent(agent)}
                style={{
                  cursor: 'pointer',
                  animation: isRecent ? 'realtimePulse 1s ease-out' : undefined,
                  boxShadow: isRecent ? `0 0 20px ${liveCfg.glow}` : undefined,
                }}
              >
                <div className="dash-agent-card-top">
                  <span className="dash-agent-card-name">{agent.name}</span>
                  {/* Live status badge with heartbeat-based color */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{
                      width: 8, height: 8, borderRadius: '50%',
                      background: liveCfg.color,
                      boxShadow: hbStatus === 'online' ? `0 0 8px ${liveCfg.glow}` : 'none',
                      animation: hbStatus === 'online' ? 'pulse-dot 2s infinite' : 'none',
                      display: 'inline-block',
                    }} />
                    <span className={`dash-agent-status-badge ${agent.status || 'idle'}`}>
                      {agent.status || 'idle'}
                    </span>
                  </div>
                </div>

                {agent.description && (
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', margin: '6px 0 8px', lineHeight: 1.4 }}>
                    {agent.description}
                  </div>
                )}

                <div className="dash-agent-card-stats">
                  <div className="dash-agent-stat">
                    <span className="dash-agent-stat-val">{agent.total_runs || 0}</span>
                    <span className="dash-agent-stat-lbl">Runs</span>
                  </div>
                  <div className="dash-agent-stat">
                    <span className={`dash-agent-stat-val${(agent.total_errors || 0) > 0 ? ' err' : ''}`}>
                      {agent.total_errors || 0}
                    </span>
                    <span className="dash-agent-stat-lbl">Errors</span>
                  </div>
                </div>

                <div className="dash-agent-card-foot">
                  <span className="dash-agent-module">{agent.module}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 12 }}>{liveCfg.emoji}</span>
                    <span className="dash-agent-heartbeat" style={{ color: liveCfg.color }}>
                      {timeAgo(agent.last_heartbeat)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="dash-panel">
          <EmptyState
            variant="agents"
            title="Register Your First Agent"
            description="Create agents manually or use the SDK to auto-register them on first heartbeat."
            steps={[
              'Install SDK: npm i @stoic/agentos-sdk',
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
