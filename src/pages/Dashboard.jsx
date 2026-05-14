import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './Dashboard.css';

const DEMO_AGENTS = [
  { id: 1, name: 'AUTOMATE', module: 'content', status: 'running', runs: 142, errors: 3 },
  { id: 2, name: 'WIRE-TRANSFER', module: 'finance', status: 'idle', runs: 89, errors: 1 },
  { id: 3, name: 'STOICBOT', module: 'content', status: 'running', runs: 567, errors: 12 },
  { id: 4, name: 'FIN-CFO', module: 'finance', status: 'success', runs: 45, errors: 0 },
  { id: 5, name: 'LEDGER', module: 'finance', status: 'running', runs: 234, errors: 2 },
  { id: 6, name: 'SCRAPER', module: 'gtm', status: 'idle', runs: 78, errors: 5 },
  { id: 7, name: 'AD-GEN', module: 'gtm', status: 'error', runs: 23, errors: 8 },
  { id: 8, name: 'REPLY-ENGINE', module: 'crm', status: 'running', runs: 312, errors: 4 },
];

const DEMO_OBSERVATIONS = [
  { id: 1, type: 'architecture', title: 'Migrated to Supabase RLS policies', agent: 'AUTOMATE', time: '2 min ago' },
  { id: 2, type: 'decision', title: 'Switched to GPT-4o-mini for cost reduction', agent: 'FIN-CFO', time: '15 min ago' },
  { id: 3, type: 'git_commit', title: '[stoic-agentos] feat: add signup page', agent: null, time: '23 min ago' },
  { id: 4, type: 'deployment', title: 'API deployed to Railway — v0.1.0', agent: 'AUTOMATE', time: '45 min ago' },
  { id: 5, type: 'error', title: 'SMTP timeout on batch send', agent: 'REPLY-ENGINE', time: '1h ago' },
  { id: 6, type: 'discovery', title: 'Knowledge graph reduced query time by 60%', agent: 'STOICBOT', time: '2h ago' },
];

const DEMO_WORKSPACES = [
  { name: 'stoic-agentos', branch: 'master', dirty: 0, stack: 'React + Express', status: 'clean' },
  { name: 'stoiccrm-saas', branch: 'main', dirty: 3, stack: 'React + Supabase', status: 'dirty' },
  { name: 'stoic-factory', branch: 'main', dirty: 0, stack: 'Python + FFmpeg', status: 'clean' },
  { name: 'StoicHub', branch: 'main', dirty: 1, stack: 'Node.js + Railway', status: 'dirty' },
];

const STATUS_COLORS = {
  running: 'var(--accent-green)',
  success: 'var(--accent-cyan)',
  idle: 'var(--text-dim)',
  error: 'var(--accent-red)',
  disabled: 'var(--text-muted)',
};

const TYPE_ICONS = {
  architecture: '🏗️',
  decision: '🧭',
  git_commit: '📝',
  deployment: '🚀',
  error: '❌',
  discovery: '💡',
  note: '📌',
  agent_run: '🤖',
};

export default function Dashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [sidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem('agentos_user');
    if (!stored) {
      navigate('/login');
      return;
    }
    setUser(JSON.parse(stored));
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('agentos_user');
    navigate('/');
  };

  if (!user) return null;

  const liveAgents = DEMO_AGENTS.filter(a => a.status === 'running').length;
  const errorAgents = DEMO_AGENTS.filter(a => a.status === 'error').length;

  return (
    <div className="dash">
      {/* ── Sidebar ── */}
      <aside className={`dash-sidebar ${sidebarOpen ? '' : 'collapsed'}`}>
        <div className="dash-sidebar-header">
          <div className="dash-logo">
            <div className="dash-logo-icon">⚡</div>
            {sidebarOpen && <span>AgentOS</span>}
          </div>
          <button className="dash-toggle" onClick={() => setSidebarOpen(!sidebarOpen)}>
            {sidebarOpen ? '◀' : '▶'}
          </button>
        </div>

        <nav className="dash-nav">
          {[
            { id: 'overview', icon: '📊', label: 'Overview' },
            { id: 'agents', icon: '🤖', label: 'Agents' },
            { id: 'workspaces', icon: '📦', label: 'Workspaces' },
            { id: 'brain', icon: '🧠', label: 'Brain' },
            { id: 'graph', icon: '🕸️', label: 'Graph' },
            { id: 'settings', icon: '⚙️', label: 'Settings' },
          ].map(item => (
            <button
              key={item.id}
              className={`dash-nav-item ${activeTab === item.id ? 'active' : ''}`}
              onClick={() => setActiveTab(item.id)}
            >
              <span className="dash-nav-icon">{item.icon}</span>
              {sidebarOpen && <span>{item.label}</span>}
            </button>
          ))}
        </nav>

        <div className="dash-sidebar-footer">
          {sidebarOpen && (
            <div className="dash-plan-badge">
              <span className="dash-plan-dot" />
              FREE PLAN
            </div>
          )}
          <button className="dash-nav-item" onClick={handleLogout}>
            <span className="dash-nav-icon">🚪</span>
            {sidebarOpen && <span>Logout</span>}
          </button>
        </div>
      </aside>

      {/* ── Main Content ── */}
      <main className="dash-main">
        {/* Header */}
        <header className="dash-header">
          <div>
            <h1 className="dash-title">
              {activeTab === 'overview' && 'Agent Fleet Overview'}
              {activeTab === 'agents' && 'Agent Registry'}
              {activeTab === 'workspaces' && 'Workspaces'}
              {activeTab === 'brain' && 'Knowledge Brain'}
              {activeTab === 'graph' && 'Knowledge Graph'}
              {activeTab === 'settings' && 'Settings'}
            </h1>
            <p className="dash-subtitle">Welcome, {user.name} · {user.org}</p>
          </div>
          <div className="dash-header-actions">
            <div className="dash-status-badges">
              <span className="dash-badge green">{liveAgents} Live</span>
              <span className="dash-badge purple">{DEMO_AGENTS.length - liveAgents - errorAgents} Idle</span>
              {errorAgents > 0 && <span className="dash-badge red">{errorAgents} Error</span>}
            </div>
            <button className="btn btn-primary btn-sm">+ New Agent</button>
          </div>
        </header>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="dash-content">
            {/* Stats Grid */}
            <div className="dash-stats-grid">
              <div className="dash-stat-card">
                <div className="dash-stat-value purple">{DEMO_AGENTS.length}</div>
                <div className="dash-stat-label">Total Agents</div>
                <div className="dash-stat-trend up">+3 this week</div>
              </div>
              <div className="dash-stat-card">
                <div className="dash-stat-value cyan">{DEMO_WORKSPACES.length}</div>
                <div className="dash-stat-label">Workspaces</div>
                <div className="dash-stat-trend up">+1 this week</div>
              </div>
              <div className="dash-stat-card">
                <div className="dash-stat-value green">324</div>
                <div className="dash-stat-label">Observations</div>
                <div className="dash-stat-trend up">+47 today</div>
              </div>
              <div className="dash-stat-card">
                <div className="dash-stat-value orange">7</div>
                <div className="dash-stat-label">Knowledge Items</div>
                <div className="dash-stat-trend neutral">Active</div>
              </div>
            </div>

            {/* Usage Bar */}
            <div className="dash-usage-bar">
              <div className="dash-usage-header">
                <span>Observations this month</span>
                <span className="dash-usage-count">324 / 10,000</span>
              </div>
              <div className="dash-usage-track">
                <div className="dash-usage-fill" style={{ width: '3.24%' }} />
              </div>
              <span className="dash-usage-hint">3.2% of free tier used</span>
            </div>

            {/* Two columns: Agents + Activity */}
            <div className="dash-grid-2col">
              {/* Agent Fleet */}
              <div className="dash-panel">
                <div className="dash-panel-header">
                  <h3>Agent Fleet</h3>
                  <button className="btn btn-ghost btn-sm" onClick={() => setActiveTab('agents')}>View all →</button>
                </div>
                <div className="dash-agent-list">
                  {DEMO_AGENTS.map(agent => (
                    <div key={agent.id} className="dash-agent-row">
                      <div className="dash-agent-dot" style={{ background: STATUS_COLORS[agent.status] }} />
                      <span className="dash-agent-name">{agent.name}</span>
                      <span className="dash-agent-module">{agent.module}</span>
                      <span className="dash-agent-status" style={{ color: STATUS_COLORS[agent.status] }}>
                        {agent.status}
                      </span>
                      <span className="dash-agent-runs">{agent.runs} runs</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Activity Timeline */}
              <div className="dash-panel">
                <div className="dash-panel-header">
                  <h3>Activity Feed</h3>
                  <button className="btn btn-ghost btn-sm" onClick={() => setActiveTab('brain')}>View all →</button>
                </div>
                <div className="dash-activity-list">
                  {DEMO_OBSERVATIONS.map(obs => (
                    <div key={obs.id} className="dash-activity-row">
                      <span className="dash-activity-icon">{TYPE_ICONS[obs.type]}</span>
                      <div className="dash-activity-content">
                        <div className="dash-activity-title">{obs.title}</div>
                        <div className="dash-activity-meta">
                          {obs.agent && <span className="dash-activity-agent">{obs.agent}</span>}
                          <span>{obs.time}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Agents Tab */}
        {activeTab === 'agents' && (
          <div className="dash-content">
            <div className="dash-panel">
              <table className="dash-table">
                <thead>
                  <tr><th>Agent</th><th>Module</th><th>Status</th><th>Total Runs</th><th>Errors</th><th>Actions</th></tr>
                </thead>
                <tbody>
                  {DEMO_AGENTS.map(agent => (
                    <tr key={agent.id}>
                      <td><span className="dash-agent-dot" style={{ background: STATUS_COLORS[agent.status], display: 'inline-block', marginRight: 8 }} />{agent.name}</td>
                      <td><span className="dash-module-tag">{agent.module}</span></td>
                      <td style={{ color: STATUS_COLORS[agent.status], fontWeight: 600 }}>{agent.status}</td>
                      <td>{agent.runs}</td>
                      <td style={{ color: agent.errors > 5 ? 'var(--accent-red)' : 'var(--text-dim)' }}>{agent.errors}</td>
                      <td><button className="btn btn-ghost btn-sm">Configure</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Workspaces Tab */}
        {activeTab === 'workspaces' && (
          <div className="dash-content">
            <div className="dash-workspace-grid">
              {DEMO_WORKSPACES.map((ws, i) => (
                <div key={i} className="dash-workspace-card">
                  <div className="dash-workspace-header">
                    <span className="dash-workspace-name">📦 {ws.name}</span>
                    <span className={`dash-badge ${ws.status === 'clean' ? 'green' : 'orange'}`}>
                      {ws.status === 'clean' ? '✓ Clean' : `${ws.dirty} dirty`}
                    </span>
                  </div>
                  <div className="dash-workspace-meta">
                    <span>🌿 {ws.branch}</span>
                    <span>🛠 {ws.stack}</span>
                  </div>
                </div>
              ))}
              <div className="dash-workspace-card dash-workspace-add">
                <span>+ Add Workspace</span>
              </div>
            </div>
          </div>
        )}

        {/* Brain Tab */}
        {activeTab === 'brain' && (
          <div className="dash-content">
            <div className="dash-panel">
              <div className="dash-panel-header"><h3>Recent Observations</h3></div>
              <div className="dash-activity-list">
                {DEMO_OBSERVATIONS.map(obs => (
                  <div key={obs.id} className="dash-activity-row">
                    <span className="dash-activity-icon">{TYPE_ICONS[obs.type]}</span>
                    <div className="dash-activity-content">
                      <div className="dash-activity-title">{obs.title}</div>
                      <div className="dash-activity-meta">
                        {obs.agent && <span className="dash-activity-agent">{obs.agent}</span>}
                        <span className="dash-activity-type">{obs.type}</span>
                        <span>{obs.time}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Graph Tab */}
        {activeTab === 'graph' && (
          <div className="dash-content">
            <div className="dash-panel" style={{ textAlign: 'center', padding: 60 }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>🕸️</div>
              <h3>Knowledge Graph</h3>
              <p style={{ color: 'var(--text-dim)', marginTop: 8 }}>Interactive visualization coming in Pro plan</p>
              <button className="btn btn-primary" style={{ marginTop: 20 }}>Upgrade to Pro — $49/mo</button>
            </div>
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <div className="dash-content">
            <div className="dash-panel">
              <div className="dash-panel-header"><h3>API Keys</h3></div>
              <div className="dash-settings-row">
                <label>Your API Key</label>
                <div className="dash-api-key">
                  <code>sk_live_demo_xxxxxxxxxxxxxxxx</code>
                  <button className="btn btn-ghost btn-sm">📋 Copy</button>
                </div>
              </div>
              <div className="dash-settings-row">
                <label>Organization</label>
                <input type="text" value={user.org} readOnly className="dash-settings-input" />
              </div>
              <div className="dash-settings-row">
                <label>Plan</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span className="dash-plan-badge" style={{ margin: 0 }}>FREE</span>
                  <button className="btn btn-primary btn-sm">Upgrade</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
