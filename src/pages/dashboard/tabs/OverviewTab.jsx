import { useState, useEffect, useRef, useMemo } from 'react';
import AnimatedCounter from '../../../components/AnimatedCounter';
import { SkeletonStatCards, SkeletonAgentRows, SkeletonTimeline, SkeletonUsageBar, EmptyState } from '../../../components/SkeletonLoader';
import { STATUS_COLORS, TYPE_ICONS, CAPTURE_HINTS } from '../constants';

const CAPTURE_TYPES = [
  { value: 'note', label: 'Note' },
  { value: 'decision', label: 'Decision' },
  { value: 'discovery', label: 'Discovery' },
  { value: 'concept', label: 'Concept' },
  { value: 'error', label: 'Error' },
];

/* ═══════════════════════════════════════════
   AREA CHART — smooth filled SVG
   ═══════════════════════════════════════════ */
function AreaChart({ data, width = 200, height = 60, color = 'rgba(167,139,250,0.5)' }) {
  if (!data || data.length < 2) return null;
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;
  const padY = 4;
  const stepX = width / (data.length - 1);
  const points = data.map((val, i) => {
    const x = i * stepX;
    const y = height - padY - ((val - min) / range) * (height - padY * 2);
    return { x, y };
  });
  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');
  const areaPath = `${linePath} L${width},${height} L0,${height} Z`;
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ display: 'block', overflow: 'visible' }}>
      <defs>
        <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill="url(#areaGrad)" />
      <path d={linePath} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* ═══════════════════════════════════════════
   HEALTH RING — circular SVG progress
   ═══════════════════════════════════════════ */
function HealthRing({ value = 0, size = 120, strokeWidth = 8 }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;
  const color = value > 75 ? '#22c55e' : value > 50 ? '#f59e0b' : '#ef4444';
  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={strokeWidth} />
        <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke={color} strokeWidth={strokeWidth}
          strokeDasharray={circumference} strokeDashoffset={offset}
          strokeLinecap="round" style={{ transition: 'stroke-dashoffset 1s ease' }} />
      </svg>
      <div style={{
        position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
      }}>
        <span style={{ fontSize: 28, fontWeight: 600, color: '#fafafa', letterSpacing: -0.5 }}>{value}%</span>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   SPARKLINE DATA from observations
   ═══════════════════════════════════════════ */
function useSparklineData(observations) {
  return useMemo(() => {
    if (!observations || observations.length === 0) return [1, 2, 2, 3, 4, 5, 7];
    const now = Date.now();
    const days = 14;
    const buckets = new Array(days).fill(0);
    observations.forEach(obs => {
      const age = now - new Date(obs.created_at).getTime();
      const dayIdx = Math.floor(age / 86400000);
      if (dayIdx >= 0 && dayIdx < days) buckets[days - 1 - dayIdx]++;
    });
    if (buckets.every(b => b === 0)) return [1, 1, 2, 2, 3, 4, 4, 5, 5, 6, 6, 7, 8, 9];
    return buckets;
  }, [observations]);
}

/* ═══════════════════════════════════════════
   TIME AGO
   ═══════════════════════════════════════════ */
function timeAgo(dateStr) {
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

/* ═══════════════════════════════════════════
   COMPUTE HEALTH SCORE
   ═══════════════════════════════════════════ */
function computeHealth(agents, observations, workspaces) {
  const recentObs = observations.filter(o => (Date.now() - new Date(o.created_at).getTime()) < 7 * 86400000).length;
  const errors = agents.filter(a => a.status === 'error').length;
  return Math.min(100, Math.round(
    (recentObs > 0 ? 25 : 0) +
    (agents.length > 0 ? 25 : 0) +
    (workspaces.length > 0 ? 25 : 0) +
    (errors === 0 ? 25 : Math.max(0, 25 - errors * 5))
  ));
}

/* ═══════════════════════════════════════════
   MAIN OVERVIEW TAB — BENTO GRID LAYOUT
   ═══════════════════════════════════════════ */
export default function OverviewTab({ stats, agents, observations, liveAgents, errorAgents, usage, usagePct, planName, captureForm, setCaptureForm, captureLoading, handleCapture, handleSeedDemo, seedLoading, setShowAgentModal, setActiveTab, placeholderIdx, onCaptureRef }) {
  const sparkData = useSparklineData(observations);
  const healthScore = computeHealth(agents, observations, []);

  return (
    <div className="dash-content">

      {/* ── BENTO ROW 1: Hero + Side Metrics ── */}
      <div className="bento-row-1">
        <div className="bento-hero">
          <div className="bento-hero-top">
            <div>
              <div className="bento-label">AI AGENTS</div>
              <div className="bento-hero-value">
                <AnimatedCounter end={stats.agents || agents.length} color="#fafafa" duration={800} />
              </div>
              <div className="bento-hero-sub">{liveAgents} running · {errorAgents} errors</div>
            </div>
          </div>
          <div className="bento-hero-chart">
            <AreaChart data={sparkData} width={360} height={80} color="rgba(167,139,250,0.6)" />
          </div>
        </div>

        <div className="bento-side">
          <div className="bento-card">
            <div className="bento-label">WORKSPACES</div>
            <div className="bento-card-value">
              <AnimatedCounter end={stats.workspaces || 0} color="#fafafa" duration={800} />
            </div>
            <div className="bento-card-sub">Connected repos</div>
          </div>
          <div className="bento-card">
            <div className="bento-label">OBSERVATIONS</div>
            <div className="bento-card-value">
              <AnimatedCounter end={stats.observations || observations.length} color="#fafafa" duration={800} />
            </div>
            <div className="bento-card-sub">This month</div>
          </div>
        </div>
      </div>

      {/* ── BENTO ROW 2: Usage bar ── */}
      <div className="bento-usage">
        <div className="bento-usage-info">
          <span className="bento-label" style={{ marginBottom: 0 }}>USAGE</span>
          <span className="bento-usage-nums">{usage.count.toLocaleString()} / {usage.limit.toLocaleString()}</span>
        </div>
        <div className="bento-usage-track">
          <div className="bento-usage-fill" style={{ width: `${Math.min(Number(usagePct), 100)}%` }} />
        </div>
        <div className="bento-usage-right">
          <span className="bento-usage-pct">{usagePct}%</span>
          <span className="bento-card-sub">{planName}</span>
        </div>
      </div>

      {/* ── BENTO ROW 3: Agent Fleet Table ── */}
      <div className="bento-table-panel">
        <div className="bento-table-head">
          <span className="bento-table-title">Agent Fleet</span>
          <button className="bento-table-action" onClick={() => setActiveTab('agents')}>View all →</button>
        </div>
        {agents.length > 0 ? (
          <div className="bento-table-wrap">
            <table className="bento-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Module</th>
                  <th>Status</th>
                  <th>Last Active</th>
                  <th style={{ textAlign: 'right' }}>Runs</th>
                </tr>
              </thead>
              <tbody>
                {agents.slice(0, 8).map(agent => (
                  <tr key={agent.id}>
                    <td className="bento-table-name">{agent.name}</td>
                    <td className="bento-table-module">{agent.module || '—'}</td>
                    <td>
                      <span className={`bento-status-dot ${agent.status || 'idle'}`} />
                      <span className="bento-status-text" style={{ color: STATUS_COLORS[agent.status] || STATUS_COLORS.idle }}>
                        {agent.status || 'idle'}
                      </span>
                    </td>
                    <td className="bento-table-time">{agent.last_heartbeat ? timeAgo(agent.last_heartbeat) : '—'}</td>
                    <td className="bento-table-runs">{agent.total_runs || 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            variant="agents"
            title="Launch Your Agent Fleet"
            description="Get operational in seconds — seed sample data to preview your fleet, or register your first agent."
            steps={[
              'Install the SDK: npm i @stoic/agentos-sdk',
              'Send your first heartbeat from any agent',
              'Watch real-time status appear here',
            ]}
          >
            <button className="btn-seed" onClick={() => handleSeedDemo()} disabled={seedLoading}>
              {seedLoading ? 'Seeding...' : 'Seed Demo Data'}
            </button>
            <button className="btn btn-ghost btn-sm" onClick={() => setShowAgentModal(true)}>
              + Register Agent
            </button>
          </EmptyState>
        )}
      </div>

      {/* ── BENTO ROW 4: Activity Feed + Health Ring ── */}
      <div className="bento-row-4">
        <div className="bento-panel">
          <div className="bento-table-head">
            <span className="bento-table-title">Activity Feed</span>
            <button className="bento-table-action" onClick={() => setActiveTab('brain')}>View all →</button>
          </div>
          {observations.length > 0 ? (
            <div className="bento-feed">
              {observations.slice(0, 6).map((obs, i) => (
                <div key={obs.id} className={`bento-feed-item ${i === 0 ? 'latest' : ''}`}>
                  <div className="bento-feed-time">{timeAgo(obs.created_at)}</div>
                  <div className="bento-feed-dot" />
                  <div className="bento-feed-body">
                    <div className="bento-feed-title">{obs.title}</div>
                    <div className="bento-feed-type">{obs.type || 'note'}</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState variant="default" title="Activity Feed" description="Observations from your agents will appear here as a live timeline.">
              <button className="btn-seed" onClick={() => handleSeedDemo()} disabled={seedLoading}>
                {seedLoading ? 'Seeding...' : 'Seed Demo Data'}
              </button>
            </EmptyState>
          )}
        </div>

        <div className="bento-panel bento-health">
          <div className="bento-table-head">
            <span className="bento-table-title">System Health</span>
          </div>
          <div className="bento-health-body">
            <HealthRing value={healthScore} size={140} strokeWidth={10} />
            <div className="bento-health-stats">
              <div className="bento-health-stat">
                <span className="bento-health-val" style={{ color: liveAgents > 0 ? '#22c55e' : 'rgba(161,161,170,0.85)' }}>{liveAgents}</span>
                <span className="bento-health-lbl">Live</span>
              </div>
              <div className="bento-health-stat">
                <span className="bento-health-val" style={{ color: errorAgents > 0 ? '#ef4444' : 'rgba(161,161,170,0.85)' }}>{errorAgents}</span>
                <span className="bento-health-lbl">Errors</span>
              </div>
              <div className="bento-health-stat">
                <span className="bento-health-val">{observations.length}</span>
                <span className="bento-health-lbl">Events</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Quick Capture ── */}
      <div id="ob-capture" className="bento-capture">
        <form onSubmit={handleCapture} className="bento-capture-form">
          <div className="bento-capture-types">
            {CAPTURE_TYPES.map(ct => (
              <button key={ct.value} type="button"
                className={`bento-capture-type ${captureForm.type === ct.value ? 'active' : ''}`}
                onClick={() => setCaptureForm({ ...captureForm, type: ct.value })}
              >{ct.label}</button>
            ))}
          </div>
          <div className="bento-capture-row">
            <input type="text" placeholder={CAPTURE_HINTS[placeholderIdx]}
              value={captureForm.title}
              onChange={e => setCaptureForm({ ...captureForm, title: e.target.value })}
              className="bento-capture-input" required />
            <button type="submit" className="bento-capture-btn" disabled={captureLoading}>
              {captureLoading ? '...' : 'Capture'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
