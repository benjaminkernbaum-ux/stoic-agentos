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

  // API Keys (Settings tab)
  const [apiKeys, setApiKeys] = useState([]);
  const [apiKeysLoading, setApiKeysLoading] = useState(false);
  const [newKey, setNewKey] = useState(null); // full key shown once after creation
  const [creatingKey, setCreatingKey] = useState(false);

  // Welcome banner — show the first API key once after signup
  const [welcomeKey, setWelcomeKey] = useState(() => {
    if (typeof sessionStorage === 'undefined') return null;
    return sessionStorage.getItem('stoic_first_api_key');
  });
  const dismissWelcomeKey = () => {
    sessionStorage.removeItem('stoic_first_api_key');
    setWelcomeKey(null);
  };

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

  const authHeaders = useCallback(async () => {
    const token = (await supabase.auth.getSession()).data.session?.access_token;
    return { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };
  }, []);

  const fetchApiKeys = useCallback(async () => {
    if (!org?.id) return;
    setApiKeysLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/v1/api-keys?org_id=${org.id}`, { headers: await authHeaders() });
      if (res.ok) setApiKeys(await res.json());
    } catch (err) {
      console.error('Failed to load API keys:', err);
    }
    setApiKeysLoading(false);
  }, [org?.id, authHeaders]);

  useEffect(() => {
    if (activeTab === 'settings' && org?.id) fetchApiKeys();
  }, [activeTab, org?.id, fetchApiKeys]);

  const handleCreateKey = async () => {
    if (!org?.id) return;
    setCreatingKey(true);
    try {
      const res = await fetch(`${API_BASE}/api/v1/api-keys?org_id=${org.id}`, {
        method: 'POST',
        headers: await authHeaders(),
        body: JSON.stringify({ name: 'Generated from dashboard' }),
      });
      if (res.ok) {
        const created = await res.json();
        setNewKey(created.key);
        fetchApiKeys();
      }
    } catch (err) {
      console.error('Create key failed:', err);
    }
    setCreatingKey(false);
  };

  const handleToggleKey = async (id, currentlyActive) => {
    if (!org?.id) return;
    try {
      await fetch(`${API_BASE}/api/v1/api-keys/${id}?org_id=${org.id}`, {
        method: 'PATCH',
        headers: await authHeaders(),
        body: JSON.stringify({ active: !currentlyActive }),
      });
      fetchApiKeys();
    } catch (err) {
      console.error('Toggle failed:', err);
    }
  };

  const [killSwitchBusy, setKillSwitchBusy] = useState(false);
  const handleKillSwitch = async (action) => {
    if (!org?.id) return;
    const verb = action === 'pause' ? 'PAUSE ALL' : 'RESUME ALL';
    if (action === 'pause' && !confirm(`${verb} API keys?\n\nEvery SDK using this org will get 401 on the next request. Use this if an agent is misbehaving in production.`)) return;
    setKillSwitchBusy(true);
    try {
      await fetch(`${API_BASE}/api/v1/kill-switch?org_id=${org.id}`, {
        method: 'POST',
        headers: await authHeaders(),
        body: JSON.stringify({ action }),
      });
      fetchApiKeys();
      fetchData();
    } catch (err) {
      console.error('Kill switch failed:', err);
    }
    setKillSwitchBusy(false);
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

        {/* Welcome — first-time API key banner */}
        {welcomeKey && (
          <div className="dash-content" style={{ paddingBottom: 0 }}>
            <div className="dash-panel" style={{ border: '1px solid rgba(155,89,255,0.4)', background: 'linear-gradient(135deg, rgba(155,89,255,0.08), rgba(77,124,255,0.08))' }}>
              <div className="dash-panel-header">
                <h3>👋 Your API key is ready</h3>
                <button className="btn btn-ghost btn-sm" onClick={dismissWelcomeKey}>Dismiss</button>
              </div>
              <p style={{ color: 'var(--text-dim)', marginBottom: 12 }}>
                Copy this now — it&apos;s the only time we&apos;ll show it in full. You can generate more in the Settings tab.
              </p>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <code style={{ flex: 1, padding: 10, background: 'rgba(0,0,0,0.4)', borderRadius: 6, fontFamily: 'monospace', overflowX: 'auto' }}>{welcomeKey}</code>
                <button className="btn btn-primary btn-sm" onClick={() => { navigator.clipboard?.writeText(welcomeKey); }}>Copy</button>
              </div>
              <details style={{ marginTop: 12 }}>
                <summary style={{ cursor: 'pointer', color: 'var(--accent-cyan)' }}>Quick-start with the SDK</summary>
                <pre style={{ marginTop: 8, padding: 12, background: 'rgba(0,0,0,0.4)', borderRadius: 6, overflowX: 'auto', fontSize: 13 }}>
{`npm install @stoic/agentos-sdk

import { AgentOS } from '@stoic/agentos-sdk';
const os = new AgentOS({ apiKey: '${welcomeKey.slice(0, 16)}…', workspace: 'my-app' });
await os.capture({ type: 'note', title: 'Hello AgentOS!' });`}
                </pre>
              </details>
            </div>
          </div>
        )}

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
              <div className="dash-panel-header">
                <h3>API Keys</h3>
                <button className="btn btn-primary btn-sm" onClick={handleCreateKey} disabled={creatingKey}>
                  {creatingKey ? 'Creating…' : '+ New Key'}
                </button>
              </div>

              {newKey && (
                <div className="dash-settings-row" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 8, background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.3)', padding: 12, borderRadius: 8 }}>
                  <strong style={{ color: 'var(--accent-green)' }}>⚠ Copy this key now — it won&apos;t be shown again</strong>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <code style={{ flex: 1, padding: 8, background: 'rgba(0,0,0,0.4)', borderRadius: 4, fontFamily: 'monospace', overflowX: 'auto' }}>{newKey}</code>
                    <button className="btn btn-ghost btn-sm" onClick={() => { navigator.clipboard?.writeText(newKey); }}>Copy</button>
                    <button className="btn btn-ghost btn-sm" onClick={() => setNewKey(null)}>Dismiss</button>
                  </div>
                </div>
              )}

              {apiKeysLoading && <div className="dash-settings-row"><span style={{ color: 'var(--text-dim)' }}>Loading…</span></div>}

              {!apiKeysLoading && apiKeys.length === 0 && (
                <div className="dash-empty-state" style={{ padding: 32 }}>
                  <div className="dash-empty-icon">🔑</div>
                  <p>No API keys yet. Click &quot;+ New Key&quot; to generate one for the SDK.</p>
                </div>
              )}

              {apiKeys.map(k => (
                <div key={k.id} className="dash-settings-row" style={{ alignItems: 'center' }}>
                  <label>{k.name}</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1 }}>
                    <code style={{ flex: 1, padding: 6, background: 'rgba(0,0,0,0.3)', borderRadius: 4, fontFamily: 'monospace', opacity: k.active ? 1 : 0.4 }}>{k.key}</code>
                    <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>
                      {k.last_used_at ? `Used ${new Date(k.last_used_at).toLocaleDateString()}` : 'Never used'}
                    </span>
                    {k.active ? (
                      <button className="btn btn-ghost btn-sm" onClick={() => handleToggleKey(k.id, true)}>Pause</button>
                    ) : (
                      <>
                        <span style={{ fontSize: 12, color: 'var(--accent-red)' }}>Paused</span>
                        <button className="btn btn-ghost btn-sm" onClick={() => handleToggleKey(k.id, false)}>Resume</button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Containment / Kill switch panel */}
            <div className="dash-panel" style={{ marginTop: 20, border: '1px solid rgba(239,68,68,0.3)' }}>
              <div className="dash-panel-header">
                <h3>🛑 Containment</h3>
                <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>
                  Emergency stop for all agents using this org&apos;s API keys
                </span>
              </div>
              <div className="dash-settings-row" style={{ alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ flex: 1 }}>
                  <strong style={{ display: 'block', marginBottom: 4 }}>Kill switch — pause all keys</strong>
                  <span style={{ fontSize: 13, color: 'var(--text-dim)' }}>
                    Revokes every active key in one click. SDKs will start receiving 401 within seconds.
                    Resume any time. The action is logged to your audit feed.
                  </span>
                </div>
                {apiKeys.some(k => k.active) ? (
                  <button
                    className="btn btn-sm"
                    style={{ background: 'rgba(239,68,68,0.15)', color: 'var(--accent-red)', border: '1px solid rgba(239,68,68,0.4)' }}
                    onClick={() => handleKillSwitch('pause')}
                    disabled={killSwitchBusy}
                  >
                    {killSwitchBusy ? 'Working…' : '🛑 Pause all'}
                  </button>
                ) : (
                  <button
                    className="btn btn-sm"
                    style={{ background: 'rgba(34,197,94,0.15)', color: 'var(--accent-green)', border: '1px solid rgba(34,197,94,0.4)' }}
                    onClick={() => handleKillSwitch('resume')}
                    disabled={killSwitchBusy}
                  >
                    {killSwitchBusy ? 'Working…' : '✅ Resume all'}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
