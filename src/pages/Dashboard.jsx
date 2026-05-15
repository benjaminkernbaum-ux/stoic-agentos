import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase, API_BASE } from '../lib/supabase';
import './Dashboard.css';

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
  file_edit: '✏️',
};

export default function Dashboard() {
  const navigate = useNavigate();
  const { user, org, signOut, loading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Real data states
  const [agents, setAgents] = useState([]);
  const [observations, setObservations] = useState([]);
  const [workspaces, setWorkspaces] = useState([]);
  const [stats, setStats] = useState({ agents: 0, workspaces: 0, observations: 0, knowledgeItems: 0 });
  const [usage, setUsage] = useState({ count: 0, limit: 10000 });
  const [dataLoading, setDataLoading] = useState(true);

  // Quick Capture form
  const [captureForm, setCaptureForm] = useState({ type: 'note', title: '', content: '' });
  const [captureLoading, setCaptureLoading] = useState(false);

  const fetchData = useCallback(async () => {
    if (!org?.id) return;
    setDataLoading(true);

    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      const headers = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };

      // Fetch all data in parallel
      const [agentsRes, obsRes, wsRes, statsRes] = await Promise.allSettled([
        fetch(`${API_BASE}/api/v1/agents?org_id=${org.id}`, { headers }),
        fetch(`${API_BASE}/api/v1/observations?org_id=${org.id}&limit=20`, { headers }),
        fetch(`${API_BASE}/api/v1/workspaces?org_id=${org.id}`, { headers }),
        fetch(`${API_BASE}/api/v1/stats?org_id=${org.id}`, { headers }),
      ]);

      if (agentsRes.status === 'fulfilled' && agentsRes.value.ok)
        setAgents(await agentsRes.value.json());
      if (obsRes.status === 'fulfilled' && obsRes.value.ok)
        setObservations(await obsRes.value.json());
      if (wsRes.status === 'fulfilled' && wsRes.value.ok)
        setWorkspaces(await wsRes.value.json());
      if (statsRes.status === 'fulfilled' && statsRes.value.ok) {
        const s = await statsRes.value.json();
        setStats(s);
        setUsage({ count: s.observations || 0, limit: s.observationLimit || 10000 });
      }
    } catch (err) {
      console.error('Failed to fetch dashboard data:', err);
    }
    setDataLoading(false);
  }, [org?.id]);

  useEffect(() => {
    if (org?.id) fetchData();
  }, [org?.id, fetchData]);

  const handleCapture = async (e) => {
    e.preventDefault();
    if (!captureForm.title.trim()) return;
    setCaptureLoading(true);

    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      const res = await fetch(`${API_BASE}/api/v1/observations`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...captureForm, org_id: org.id }),
      });
      if (res.ok) {
        const newObs = await res.json();
        setObservations(prev => [newObs, ...prev]);
        setStats(prev => ({ ...prev, observations: (prev.observations || 0) + 1 }));
        setUsage(prev => ({ ...prev, count: prev.count + 1 }));
        setCaptureForm({ type: 'note', title: '', content: '' });
      }
    } catch (err) {
      console.error('Capture failed:', err);
    }
    setCaptureLoading(false);
  };

  const handleLogout = async () => {
    await signOut();
    navigate('/');
  };

  if (authLoading) return null;

  const liveAgents = agents.filter(a => a.status === 'running').length;
  const errorAgents = agents.filter(a => a.status === 'error').length;
  const usagePct = usage.limit > 0 ? ((usage.count / usage.limit) * 100).toFixed(1) : 0;

  const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User';
  const orgName = org?.name || 'My Organization';
  const planName = (org?.plan || 'free').toUpperCase();

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
              {planName} PLAN
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
            <p className="dash-subtitle">Welcome, {userName} · {orgName}</p>
          </div>
          <div className="dash-header-actions">
            <div className="dash-status-badges">
              <span className="dash-badge green">{liveAgents} Live</span>
              <span className="dash-badge purple">{agents.length - liveAgents - errorAgents} Idle</span>
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
                <div className="dash-stat-value purple">{stats.agents || agents.length}</div>
                <div className="dash-stat-label">Total Agents</div>
              </div>
              <div className="dash-stat-card">
                <div className="dash-stat-value cyan">{stats.workspaces || workspaces.length}</div>
                <div className="dash-stat-label">Workspaces</div>
              </div>
              <div className="dash-stat-card">
                <div className="dash-stat-value green">{stats.observations || observations.length}</div>
                <div className="dash-stat-label">Observations</div>
              </div>
              <div className="dash-stat-card">
                <div className="dash-stat-value orange">{stats.knowledgeItems || 0}</div>
                <div className="dash-stat-label">Knowledge Items</div>
              </div>
            </div>

            {/* Usage Bar */}
            <div className="dash-usage-bar">
              <div className="dash-usage-header">
                <span>Observations this month</span>
                <span className="dash-usage-count">{usage.count.toLocaleString()} / {usage.limit.toLocaleString()}</span>
              </div>
              <div className="dash-usage-track">
                <div className="dash-usage-fill" style={{ width: `${Math.min(usagePct, 100)}%` }} />
              </div>
              <span className="dash-usage-hint">{usagePct}% of {planName.toLowerCase()} tier used</span>
            </div>

            {/* Two columns: Agents + Activity */}
            <div className="dash-grid-2col">
              {/* Agent Fleet */}
              <div className="dash-panel">
                <div className="dash-panel-header">
                  <h3>Agent Fleet</h3>
                  <button className="btn btn-ghost btn-sm" onClick={() => setActiveTab('agents')}>View all →</button>
                </div>
                {agents.length > 0 ? (
                  <div className="dash-agent-list">
                    {agents.slice(0, 8).map(agent => (
                      <div key={agent.id} className="dash-agent-row">
                        <div className="dash-agent-dot" style={{ background: STATUS_COLORS[agent.status] || STATUS_COLORS.idle }} />
                        <span className="dash-agent-name">{agent.name}</span>
                        <span className="dash-agent-module">{agent.module}</span>
                        <span className="dash-agent-status" style={{ color: STATUS_COLORS[agent.status] || STATUS_COLORS.idle }}>
                          {agent.status}
                        </span>
                        <span className="dash-agent-runs">{agent.total_runs || 0} runs</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="dash-empty-state">
                    <div className="dash-empty-icon">🤖</div>
                    <h4>No agents yet</h4>
                    <p>Install the SDK to register your first agent</p>
                    <code className="dash-empty-code">npm install @stoic/agentos-sdk</code>
                  </div>
                )}
              </div>

              {/* Activity Timeline */}
              <div className="dash-panel">
                <div className="dash-panel-header">
                  <h3>Activity Feed</h3>
                  <button className="btn btn-ghost btn-sm" onClick={() => setActiveTab('brain')}>View all →</button>
                </div>
                {observations.length > 0 ? (
                  <div className="dash-activity-list">
                    {observations.slice(0, 8).map(obs => (
                      <div key={obs.id} className="dash-activity-row">
                        <span className="dash-activity-icon">{TYPE_ICONS[obs.type] || '📌'}</span>
                        <div className="dash-activity-content">
                          <div className="dash-activity-title">{obs.title}</div>
                          <div className="dash-activity-meta">
                            {obs.agent_id && <span className="dash-activity-agent">{obs.agent_id}</span>}
                            <span>{new Date(obs.created_at).toLocaleString()}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="dash-empty-state">
                    <div className="dash-empty-icon">📝</div>
                    <h4>No observations yet</h4>
                    <p>Capture your first observation below</p>
                  </div>
                )}
              </div>
            </div>

            {/* Quick Capture */}
            <div className="dash-panel">
              <div className="dash-panel-header"><h3>Quick Capture</h3></div>
              <form onSubmit={handleCapture} className="dash-capture-form">
                <select 
                  value={captureForm.type} 
                  onChange={e => setCaptureForm({...captureForm, type: e.target.value})}
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
                  placeholder="What happened?" 
                  value={captureForm.title}
                  onChange={e => setCaptureForm({...captureForm, title: e.target.value})}
                  className="dash-capture-input"
                  required
                />
                <button type="submit" className="btn btn-primary btn-sm" disabled={captureLoading}>
                  {captureLoading ? '...' : 'Capture'}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Agents Tab */}
        {activeTab === 'agents' && (
          <div className="dash-content">
            <div className="dash-panel">
              {agents.length > 0 ? (
                <table className="dash-table">
                  <thead>
                    <tr><th>Agent</th><th>Module</th><th>Status</th><th>Total Runs</th><th>Errors</th><th>Actions</th></tr>
                  </thead>
                  <tbody>
                    {agents.map(agent => (
                      <tr key={agent.id}>
                        <td><span className="dash-agent-dot" style={{ background: STATUS_COLORS[agent.status], display: 'inline-block', marginRight: 8 }} />{agent.name}</td>
                        <td><span className="dash-module-tag">{agent.module}</span></td>
                        <td style={{ color: STATUS_COLORS[agent.status], fontWeight: 600 }}>{agent.status}</td>
                        <td>{agent.total_runs || 0}</td>
                        <td style={{ color: (agent.total_errors || 0) > 5 ? 'var(--accent-red)' : 'var(--text-dim)' }}>{agent.total_errors || 0}</td>
                        <td><button className="btn btn-ghost btn-sm">Configure</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="dash-empty-state" style={{ padding: 60 }}>
                  <div className="dash-empty-icon">🤖</div>
                  <h4>Register your first agent</h4>
                  <p>Use the SDK to wrap your AI agents and they&apos;ll appear here automatically</p>
                  <code className="dash-empty-code">
                    {`const os = new AgentOS({ apiKey: 'your-key' });\nos.wrapAgent('my-bot', async (ctx) => { ... });`}
                  </code>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Workspaces Tab */}
        {activeTab === 'workspaces' && (
          <div className="dash-content">
            <div className="dash-workspace-grid">
              {workspaces.map(ws => (
                <div key={ws.id} className="dash-workspace-card">
                  <div className="dash-workspace-header">
                    <span className="dash-workspace-name">📦 {ws.name}</span>
                    <span className={`dash-badge ${ws.status === 'active' ? 'green' : 'orange'}`}>
                      {ws.status === 'active' ? '✓ Active' : ws.status}
                    </span>
                  </div>
                  <div className="dash-workspace-meta">
                    <span>🌿 {ws.branch || 'main'}</span>
                    <span>🛠 {ws.stack || 'Not set'}</span>
                  </div>
                </div>
              ))}
              <div className="dash-workspace-card dash-workspace-add">
                <span>+ Add Workspace</span>
              </div>
            </div>
            {workspaces.length === 0 && (
              <div className="dash-panel">
                <div className="dash-empty-state" style={{ padding: 60 }}>
                  <div className="dash-empty-icon">📦</div>
                  <h4>No workspaces connected</h4>
                  <p>Workspaces are auto-created when you use the SDK or CLI</p>
                  <code className="dash-empty-code">npx @stoic/agentos-sdk init</code>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Brain Tab */}
        {activeTab === 'brain' && (
          <div className="dash-content">
            <div className="dash-panel">
              <div className="dash-panel-header"><h3>All Observations</h3></div>
              {observations.length > 0 ? (
                <div className="dash-activity-list">
                  {observations.map(obs => (
                    <div key={obs.id} className="dash-activity-row">
                      <span className="dash-activity-icon">{TYPE_ICONS[obs.type] || '📌'}</span>
                      <div className="dash-activity-content">
                        <div className="dash-activity-title">{obs.title}</div>
                        <div className="dash-activity-meta">
                          {obs.agent_id && <span className="dash-activity-agent">{obs.agent_id}</span>}
                          <span className="dash-activity-type">{obs.type}</span>
                          <span>{new Date(obs.created_at).toLocaleString()}</span>
                        </div>
                        {obs.content && <div className="dash-activity-body">{obs.content}</div>}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="dash-empty-state" style={{ padding: 60 }}>
                  <div className="dash-empty-icon">🧠</div>
                  <h4>Your knowledge brain is empty</h4>
                  <p>Observations from your agents and git hooks will appear here</p>
                </div>
              )}
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
              <div className="dash-panel-header"><h3>Account</h3></div>
              <div className="dash-settings-row">
                <label>Email</label>
                <input type="text" value={user?.email || ''} readOnly className="dash-settings-input" />
              </div>
              <div className="dash-settings-row">
                <label>Organization</label>
                <input type="text" value={orgName} readOnly className="dash-settings-input" />
              </div>
              <div className="dash-settings-row">
                <label>Plan</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span className="dash-plan-badge" style={{ margin: 0 }}>{planName}</span>
                  {planName === 'FREE' && <button className="btn btn-primary btn-sm">Upgrade</button>}
                </div>
              </div>
            </div>
            <div className="dash-panel" style={{ marginTop: 20 }}>
              <div className="dash-panel-header"><h3>API Keys</h3></div>
              <div className="dash-settings-row">
                <label>Your API Key</label>
                <div className="dash-api-key">
                  <code>Install SDK to generate a key</code>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
