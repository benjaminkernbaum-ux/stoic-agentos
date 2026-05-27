import { useState, useEffect, useRef, useMemo } from 'react';
import AnimatedCounter from '../../../components/AnimatedCounter';
import { SkeletonStatCards, SkeletonAgentRows, SkeletonTimeline, SkeletonUsageBar, EmptyState } from '../../../components/SkeletonLoader';
import { STATUS_COLORS, TYPE_ICONS, CAPTURE_HINTS } from '../constants';

const CAPTURE_TYPES = [
  { value: 'note', icon: '📝', label: 'Note' },
  { value: 'decision', icon: '🎯', label: 'Decision' },
  { value: 'discovery', icon: '🔬', label: 'Discovery' },
  { value: 'concept', icon: '💡', label: 'Concept' },
  { value: 'error', icon: '⚠️', label: 'Error' },
];

/* ═══════════════════════════════════════════
   MINI SPARKLINE — SVG inline chart
   ═══════════════════════════════════════════ */
function Sparkline({ data, color = '#9b59ff', width = 80, height = 28 }) {
  if (!data || data.length < 2) return null;

  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;
  const padY = 2;
  const stepX = width / (data.length - 1);

  const points = data.map((val, i) => {
    const x = i * stepX;
    const y = height - padY - ((val - min) / range) * (height - padY * 2);
    return `${x},${y}`;
  }).join(' ');

  // Gradient fill area
  const areaPoints = `0,${height} ${points} ${width},${height}`;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      style={{ display: 'block', overflow: 'visible' }}
    >
      <defs>
        <linearGradient id={`sparkGrad-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon
        points={areaPoints}
        fill={`url(#sparkGrad-${color.replace('#', '')})`}
      />
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/* ═══════════════════════════════════════════
   STAT CARD with sparkline + glow hover
   ═══════════════════════════════════════════ */
function StatCard({ icon, trend, trendType = 'neutral', value, label, sublabel, colorClass, sparkData, sparkColor }) {
  return (
    <div className={`dash-metric ${colorClass} dash-metric-glow`}>
      <div className="dash-metric-top">
        <div className="dash-metric-icon">{icon}</div>
        <span className={`dash-metric-trend ${trendType}`}>{trend}</span>
      </div>
      <div className="dash-metric-value">{value}</div>
      <div className="dash-metric-label">{label}</div>
      <div className="dash-metric-bottom">
        <div className="dash-metric-sub">{sublabel}</div>
        {sparkData && sparkData.length > 1 && (
          <div className="dash-metric-spark">
            <Sparkline data={sparkData} color={sparkColor} />
          </div>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   GENERATE SYNTHETIC SPARKLINE DATA
   from observations for visual appeal
   ═══════════════════════════════════════════ */
function useSparklineData(observations) {
  return useMemo(() => {
    if (!observations || observations.length === 0) return [];
    // Build 7-day buckets from observations
    const now = Date.now();
    const days = 7;
    const buckets = new Array(days).fill(0);
    observations.forEach(obs => {
      const age = now - new Date(obs.created_at).getTime();
      const dayIdx = Math.floor(age / (86400000));
      if (dayIdx >= 0 && dayIdx < days) {
        buckets[days - 1 - dayIdx]++;
      }
    });
    // If all zeros, generate a gentle upward trend
    if (buckets.every(b => b === 0)) {
      return [1, 2, 2, 3, 4, 5, 7];
    }
    return buckets;
  }, [observations]);
}

/* ═══════════════════════════════════════════
   RELATIVE TIME HELPER
   ═══════════════════════════════════════════ */
function timeAgo(dateStr) {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = (now - then) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export default function OverviewTab({ stats, agents, observations, liveAgents, errorAgents, usage, usagePct, planName, captureForm, setCaptureForm, captureLoading, handleCapture, handleSeedDemo, seedLoading, setShowAgentModal, setActiveTab, placeholderIdx, onCaptureRef }) {
  const sparkObs = useSparklineData(observations);
  // Simple agent spark: running agents over time simulation
  const agentSpark = agents.length > 0 ? [1, 2, 3, 3, 4, agents.filter(a => a.status === 'running').length || 1, agents.length] : [];
  const kbSpark = (stats.knowledgeItems || 0) > 0 ? [0, 1, 1, 2, 3, 3, stats.knowledgeItems || 0] : [];

  return (
    <div className="dash-content">

      {/* Metric cards */}
      <div id="ob-stats" className="dash-metrics">
        <StatCard
          icon="🤖"
          trend="TOTAL"
          trendType="neutral"
          value={<AnimatedCounter end={stats.agents || agents.length} color="var(--accent-bright)" duration={1200} />}
          label="Agents"
          sublabel={`${liveAgents} running · ${errorAgents} errors`}
          colorClass="purple"
          sparkData={agentSpark}
          sparkColor="#9b59ff"
        />

        <StatCard
          icon="📦"
          trend="REPOS"
          trendType="neutral"
          value={<AnimatedCounter end={stats.workspaces || 0} color="#67e8f9" duration={1200} />}
          label="Workspaces"
          sublabel="Connected repositories"
          colorClass="cyan"
        />

        <StatCard
          icon="🧠"
          trend={observations.length > 0 ? `+${Math.min(observations.length, 99)}` : 'NEW'}
          trendType={observations.length > 0 ? 'up' : 'neutral'}
          value={<AnimatedCounter end={stats.observations || observations.length} color="var(--accent-bright)" duration={1200} />}
          label="Observations"
          sublabel="This month"
          colorClass="green"
          sparkData={sparkObs}
          sparkColor="#00e68a"
        />

        <StatCard
          icon="💡"
          trend="STORED"
          trendType="neutral"
          value={<AnimatedCounter end={stats.knowledgeItems || 0} color="var(--accent-bright)" duration={1200} />}
          label="Knowledge Items"
          sublabel="Persistent insights"
          colorClass="orange"
          sparkData={kbSpark}
          sparkColor="#ff9f43"
        />
      </div>

      {/* Usage bar */}
      <div className="dash-usage">
        <div className="dash-usage-info">
          <div className="dash-usage-row">
            <span className="dash-usage-label">Observations this month</span>
            <div className="dash-usage-values">
              <span className="dash-usage-count">{usage.count.toLocaleString()}</span>
              <span className="dash-usage-sep">/</span>
              <span className="dash-usage-limit">{usage.limit.toLocaleString()}</span>
            </div>
          </div>
          <div className="dash-usage-track">
            <div className="dash-usage-fill" style={{ width: `${Math.min(Number(usagePct), 100)}%` }} />
          </div>
        </div>
        <div>
          <div className="dash-usage-pct">{usagePct}%</div>
          <div className="dash-usage-plan">{planName} tier</div>
        </div>
      </div>

      {/* Two-column: Agent fleet + Timeline */}
      <div className="dash-grid-2">
        <div className="dash-panel">
          <div className="dash-panel-head">
            <span className="dash-panel-title">
              <span className="dash-panel-title-icon">🤖</span>
              Agent Fleet
            </span>
            <button className="dash-panel-action" onClick={() => setActiveTab('agents')}>View all →</button>
          </div>
          {agents.length > 0 ? (
            <div className="dash-agent-feed">
              {agents.slice(0, 8).map(agent => (
                <div key={agent.id} className="dash-agent-row">
                  <div className={`dash-status-dot ${agent.status || 'idle'}`} />
                  <span className="dash-agent-name">{agent.name}</span>
                  <span className="dash-agent-module">{agent.module}</span>
                  <span
                    className="dash-agent-status-text"
                    style={{ color: STATUS_COLORS[agent.status] || STATUS_COLORS.idle }}
                  >
                    {agent.status || 'idle'}
                  </span>
                  <span className="dash-agent-runs">{agent.total_runs || 0}r</span>
                </div>
              ))}
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
                {seedLoading ? 'Seeding...' : '⚡ Seed Demo Data'}
              </button>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowAgentModal(true)}>
                + Register Agent
              </button>
            </EmptyState>
          )}
        </div>

        <div className="dash-panel">
          <div className="dash-panel-head">
            <span className="dash-panel-title">
              <span className="dash-panel-title-icon">⚡</span>
              Activity Feed
            </span>
            <button className="dash-panel-action" onClick={() => setActiveTab('brain')}>View all →</button>
          </div>
          {observations.length > 0 ? (
            <div className="dash-timeline">
              {observations.slice(0, 8).map((obs, i) => (
                <div
                  key={obs.id}
                  className={`dash-tl-item ${i === 0 ? 'dash-tl-item-latest' : ''}`}
                >
                  <div className="dash-tl-icon">{TYPE_ICONS[obs.type] || '📌'}</div>
                  <div className="dash-tl-body">
                    <div className="dash-tl-title">{obs.title}</div>
                    <div className="dash-tl-meta">
                      <span className="dash-tl-type">{obs.type || 'note'}</span>
                      <span className="dash-tl-time" title={new Date(obs.created_at).toLocaleString()}>
                        {timeAgo(obs.created_at)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              variant="default"
              title="Activity Feed"
              description="Observations from your agents will appear here as a live timeline. Use Quick Capture below to add your first entry."
            >
              <button className="btn-seed" onClick={() => handleSeedDemo()} disabled={seedLoading}>
                {seedLoading ? 'Seeding...' : '⚡ Seed Demo Data'}
              </button>
            </EmptyState>
          )}
        </div>
      </div>

      {/* Quick capture — terminal style */}
      <div id="ob-capture" className="dash-capture-panel">
        <div className="dash-capture-head">
          <span className="dash-capture-terminal">~/agentos $</span>
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)', marginLeft: 'auto' }}>Quick Capture</span>
        </div>
        <form onSubmit={handleCapture} className="dash-capture-body" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
            {CAPTURE_TYPES.map(ct => {
              const isActive = captureForm.type === ct.value;
              return (
                <button
                  key={ct.value}
                  type="button"
                  onClick={() => setCaptureForm({ ...captureForm, type: ct.value })}
                  style={{
                    padding: '4px 10px',
                    fontSize: 11,
                    borderRadius: 16,
                    border: `1px solid ${isActive ? 'rgba(167,139,250,0.5)' : 'rgba(255,255,255,0.1)'}`,
                    background: isActive ? 'rgba(167,139,250,0.2)' : 'transparent',
                    color: isActive ? '#a78bfa' : 'rgba(255,255,255,0.35)',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    lineHeight: 1.4,
                    fontFamily: 'inherit',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                  }}
                >
                  <span>{ct.icon}</span>
                  <span>{ct.label}</span>
                </button>
              );
            })}
          </div>
          <div style={{ display: 'flex', gap: 8, width: '100%' }}>
          <input
            type="text"
            placeholder={CAPTURE_HINTS[placeholderIdx]}
            value={captureForm.title}
            onChange={e => setCaptureForm({ ...captureForm, title: e.target.value })}
            className="dash-capture-input"
            style={{ flex: 1 }}
            required
          />
          <button type="submit" className="dash-capture-submit" disabled={captureLoading}>
            {captureLoading ? '...' : 'Capture →'}
          </button>
          </div>
        </form>
      </div>
    </div>
  );
}
