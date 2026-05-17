import { STATUS_COLORS, TYPE_ICONS, CAPTURE_HINTS } from '../constants';

export default function OverviewTab({ stats, agents, observations, liveAgents, errorAgents, usage, usagePct, planName, captureForm, setCaptureForm, captureLoading, handleCapture, handleSeedDemo, seedLoading, setShowAgentModal, setActiveTab, placeholderIdx, onCaptureRef }) {
  return (
    <div className="dash-content">

      {/* Metric cards */}
      <div id="ob-stats" className="dash-metrics">
        <div className="dash-metric purple">
          <div className="dash-metric-top">
            <div className="dash-metric-icon">🤖</div>
            <span className="dash-metric-trend neutral">TOTAL</span>
          </div>
          <div className="dash-metric-value">{stats.agents || agents.length}</div>
          <div className="dash-metric-label">Agents</div>
          <div className="dash-metric-sub">{liveAgents} running · {errorAgents} errors</div>
        </div>

        <div className="dash-metric cyan">
          <div className="dash-metric-top">
            <div className="dash-metric-icon">📦</div>
            <span className="dash-metric-trend neutral">REPOS</span>
          </div>
          <div className="dash-metric-value">{stats.workspaces || 0}</div>
          <div className="dash-metric-label">Workspaces</div>
          <div className="dash-metric-sub">Connected repositories</div>
        </div>

        <div className="dash-metric green">
          <div className="dash-metric-top">
            <div className="dash-metric-icon">🧠</div>
            <span className={`dash-metric-trend ${observations.length > 0 ? 'up' : 'neutral'}`}>
              {observations.length > 0 ? `+${Math.min(observations.length, 99)}` : 'NEW'}
            </span>
          </div>
          <div className="dash-metric-value">{stats.observations || observations.length}</div>
          <div className="dash-metric-label">Observations</div>
          <div className="dash-metric-sub">This month</div>
        </div>

        <div className="dash-metric orange">
          <div className="dash-metric-top">
            <div className="dash-metric-icon">💡</div>
            <span className="dash-metric-trend neutral">STORED</span>
          </div>
          <div className="dash-metric-value">{stats.knowledgeItems || 0}</div>
          <div className="dash-metric-label">Knowledge Items</div>
          <div className="dash-metric-sub">Persistent insights</div>
        </div>
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
            <div className="dash-empty">
              <div className="dash-empty-icon">🚀</div>
              <h4>Quick Start</h4>
              <p>Get started in seconds — seed sample data or register your first agent manually.</p>
              <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
                <button className="btn btn-primary btn-sm" onClick={() => handleSeedDemo()} disabled={seedLoading}>
                  {seedLoading ? 'Seeding...' : '⚡ Seed Demo Data'}
                </button>
                <button className="btn btn-ghost btn-sm" onClick={() => setShowAgentModal(true)}>
                  + Register Agent
                </button>
              </div>
            </div>
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
              {observations.slice(0, 8).map(obs => (
                <div key={obs.id} className="dash-tl-item">
                  <div className="dash-tl-icon">{TYPE_ICONS[obs.type] || '📌'}</div>
                  <div className="dash-tl-body">
                    <div className="dash-tl-title">{obs.title}</div>
                    <div className="dash-tl-meta">
                      <span className="dash-tl-type">{obs.type || 'note'}</span>
                      <span className="dash-tl-time">
                        {new Date(obs.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="dash-empty">
              <div className="dash-empty-icon">📝</div>
              <h4>No activity yet</h4>
              <p>Use the Quick Capture bar below, or seed demo data to see how observations work.</p>
              <button className="btn btn-primary btn-sm" style={{ marginTop: 8 }} onClick={() => handleSeedDemo()} disabled={seedLoading}>
                {seedLoading ? 'Seeding...' : '⚡ Seed Demo Data'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Quick capture — terminal style */}
      <div id="ob-capture" className="dash-capture-panel">
        <div className="dash-capture-head">
          <span className="dash-capture-terminal">~/agentos $</span>
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)', marginLeft: 'auto' }}>Quick Capture</span>
        </div>
        <form onSubmit={handleCapture} className="dash-capture-body">
          <select
            value={captureForm.type}
            onChange={e => setCaptureForm({ ...captureForm, type: e.target.value })}
            className="dash-capture-select"
          >
            <option value="note">📌 Note</option>
            <option value="decision">🧭 Decision</option>
            <option value="architecture">🏗️ Architecture</option>
            <option value="deployment">🚀 Deployment</option>
            <option value="discovery">💡 Discovery</option>
            <option value="error">❌ Error</option>
          </select>
          <input
            type="text"
            placeholder={CAPTURE_HINTS[placeholderIdx]}
            value={captureForm.title}
            onChange={e => setCaptureForm({ ...captureForm, title: e.target.value })}
            className="dash-capture-input"
            required
          />
          <button type="submit" className="dash-capture-submit" disabled={captureLoading}>
            {captureLoading ? '...' : 'Capture →'}
          </button>
        </form>
      </div>
    </div>
  );
}
