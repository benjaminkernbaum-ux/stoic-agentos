import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase, API_BASE } from '../lib/supabase';
import OnboardingTour from '../components/OnboardingTour';
import './Dashboard.css';

// ── Toast system ──────────────────────────────────────────────
let _toastId = 0;
function useToast() {
  const [toasts, setToasts] = useState([]);
  const show = useCallback((msg, type = 'info') => {
    const id = ++_toastId;
    setToasts(t => [...t, { id, msg, type }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3500);
  }, []);
  return { toasts, show };
}

function ToastContainer({ toasts }) {
  if (!toasts.length) return null;
  return (
    <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 9999, display: 'flex', flexDirection: 'column', gap: 8 }}>
      {toasts.map(t => (
        <div key={t.id} style={{
          padding: '12px 18px', borderRadius: 10, fontSize: 13, fontWeight: 600,
          background: t.type === 'error' ? 'rgba(255,71,87,0.15)' : t.type === 'success' ? 'rgba(0,230,138,0.15)' : 'rgba(155,89,255,0.15)',
          border: `1px solid ${t.type === 'error' ? 'rgba(255,71,87,0.4)' : t.type === 'success' ? 'rgba(0,230,138,0.4)' : 'rgba(155,89,255,0.4)'}`,
          color: t.type === 'error' ? '#ff4757' : t.type === 'success' ? '#00e68a' : '#9b59ff',
          backdropFilter: 'blur(12px)',
          maxWidth: 320,
        }}>
          {t.type === 'error' ? '✕ ' : t.type === 'success' ? '✓ ' : 'ℹ '}{t.msg}
        </div>
      ))}
    </div>
  );
}

const STATUS_COLORS = {
  running: '#00e68a',
  success: '#00d4ff',
  idle: 'rgba(255,255,255,0.3)',
  error: '#ff4757',
  disabled: 'rgba(255,255,255,0.15)',
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

const CMD_ITEMS = [
  { id: 'overview',   icon: '📊', name: 'Go to Overview',    desc: 'Fleet overview and stats',       tab: 'overview' },
  { id: 'agents',     icon: '🤖', name: 'Go to Agents',      desc: 'Agent registry and status',      tab: 'agents' },
  { id: 'workspaces', icon: '📦', name: 'Go to Workspaces',  desc: 'Connected codebases',            tab: 'workspaces' },
  { id: 'brain',      icon: '🧠', name: 'Go to Brain',       desc: 'Knowledge and observations',     tab: 'brain' },
  { id: 'graph',      icon: '🕸️', name: 'Go to Graph',       desc: 'Knowledge visualization',       tab: 'graph' },
  { id: 'settings',   icon: '⚙️', name: 'Go to Settings',    desc: 'API keys and account',           tab: 'settings' },
];

const TAB_TITLES = {
  overview:   'Overview',
  agents:     'Agent Registry',
  workspaces: 'Workspaces',
  brain:      'Knowledge Brain',
  graph:      'Knowledge Graph',
  settings:   'Settings',
};

const BRAIN_FILTERS = ['all', 'note', 'decision', 'architecture', 'git_commit', 'deployment', 'discovery', 'error'];

export default function Dashboard() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, org, signOut, loading: authLoading } = useAuth();
  const { toasts, show: toast } = useToast();

  const [activeTab, setActiveTab] = useState('overview');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [time, setTime] = useState(new Date());
  const [cmdOpen, setCmdOpen] = useState(false);
  const [cmdQuery, setCmdQuery] = useState('');
  const [brainFilter, setBrainFilter] = useState('all');

  // Data
  const [agents, setAgents] = useState([]);
  const [observations, setObservations] = useState([]);
  const [workspaces, setWorkspaces] = useState([]);
  const [stats, setStats] = useState({ agents: 0, workspaces: 0, observations: 0, knowledgeItems: 0 });
  const [usage, setUsage] = useState({ count: 0, limit: 10000 });
  const [dataLoading, setDataLoading] = useState(true);

  const [captureForm, setCaptureForm] = useState({ type: 'note', title: '', content: '' });
  const [captureLoading, setCaptureLoading] = useState(false);
  const [apiKey, setApiKey] = useState(null);
  const [apiKeys, setApiKeys] = useState([]);
  const [upgradeLoading, setUpgradeLoading] = useState(false);
  const [keyGenLoading, setKeyGenLoading] = useState(false);

  const onCaptureRef = useRef(null);
  const cmdInputRef = useRef(null);

  // Live clock
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // Cmd+K palette
  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setCmdOpen(o => !o);
        setCmdQuery('');
      }
      if (e.key === 'Escape') setCmdOpen(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // Focus cmd input when opened
  useEffect(() => {
    if (cmdOpen) setTimeout(() => cmdInputRef.current?.focus(), 50);
  }, [cmdOpen]);

  // Stripe redirect handling
  useEffect(() => {
    if (searchParams.get('upgraded') === 'true') {
      toast('Plan upgraded successfully! Welcome to Pro.', 'success');
      window.history.replaceState({}, '', '/dashboard');
    } else if (searchParams.get('cancelled') === 'true') {
      toast('Upgrade cancelled — you are still on the free plan.', 'info');
      window.history.replaceState({}, '', '/dashboard');
    }
  }, []);

  const fetchData = useCallback(async () => {
    if (!org?.id) return;
    setDataLoading(true);
    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      const headers = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };
      const [agentsRes, obsRes, wsRes, statsRes] = await Promise.allSettled([
        fetch(`${API_BASE}/api/v1/agents?org_id=${org.id}`, { headers }),
        fetch(`${API_BASE}/api/v1/observations?org_id=${org.id}&limit=50`, { headers }),
        fetch(`${API_BASE}/api/v1/workspaces?org_id=${org.id}`, { headers }),
        fetch(`${API_BASE}/api/v1/stats?org_id=${org.id}`, { headers }),
      ]);
      if (agentsRes.status === 'fulfilled' && agentsRes.value.ok) setAgents(await agentsRes.value.json());
      if (obsRes.status === 'fulfilled' && obsRes.value.ok) setObservations(await obsRes.value.json());
      if (wsRes.status === 'fulfilled' && wsRes.value.ok) setWorkspaces(await wsRes.value.json());
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
    if (!org?.id) return;
    (async () => {
      try {
        const token = (await supabase.auth.getSession()).data.session?.access_token;
        if (!token) return;
        const res = await fetch(`${API_BASE}/api/v1/api-keys?org_id=${org.id}`, {
          headers: { 'Authorization': `Bearer ${token}` },
        });
        if (res.ok) setApiKeys(await res.json());
      } catch (err) {
        console.error('Failed to load API keys:', err);
      }
    })();
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
        onCaptureRef.current?.();
      }
    } catch (err) {
      console.error('Capture failed:', err);
      toast('Failed to capture observation. Try again.', 'error');
    }
    setCaptureLoading(false);
  };

  const handleLogout = async () => {
    await signOut();
    navigate('/');
  };

  const handleUpgrade = async (plan = 'pro') => {
    setUpgradeLoading(true);
    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      const res = await fetch(`${API_BASE}/api/v1/billing/checkout`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan }),
      });
      if (res.ok) {
        const { url } = await res.json();
        if (url) window.location.href = url;
      } else {
        const body = await res.json().catch(() => ({}));
        toast(body.error || 'Failed to start checkout', 'error');
      }
    } catch {
      toast('Checkout unavailable. Please try again later.', 'error');
    }
    setUpgradeLoading(false);
  };

  const handleGenerateKey = async () => {
    setKeyGenLoading(true);
    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      if (!token) { toast('Session expired — please sign in again', 'error'); return; }
      const res = await fetch(`${API_BASE}/api/v1/api-keys`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: `Key ${new Date().toLocaleDateString()}` }),
      });
      if (res.ok) {
        const newKey = await res.json();
        setApiKey(newKey.key);
        toast("API key generated — copy it now, it won't be shown again", 'success');
        const listRes = await fetch(`${API_BASE}/api/v1/api-keys?org_id=${org.id}`, {
          headers: { 'Authorization': `Bearer ${token}` },
        });
        if (listRes.ok) setApiKeys(await listRes.json());
      } else {
        const body = await res.json().catch(() => ({}));
        toast(body.error || 'Failed to generate key', 'error');
      }
    } catch {
      toast('Failed to generate key — check your connection', 'error');
    } finally {
      setKeyGenLoading(false);
    }
  };

  const handleRevokeKey = async (k) => {
    if (!window.confirm('Revoke this API key? Agents using it will stop working.')) return;
    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      const res = await fetch(`${API_BASE}/api/v1/api-keys/${k.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (res.ok) {
        setApiKeys(prev => prev.map(key => key.id === k.id ? { ...key, active: false } : key));
        toast('API key revoked', 'info');
      } else {
        toast('Failed to revoke key', 'error');
      }
    } catch {
      toast('Failed to revoke key — check your connection', 'error');
    }
  };

  if (authLoading) return null;

  const liveAgents  = agents.filter(a => a.status === 'running').length;
  const errorAgents = agents.filter(a => a.status === 'error').length;
  const usagePct    = usage.limit > 0 ? ((usage.count / usage.limit) * 100).toFixed(1) : 0;
  const userName    = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User';
  const orgName     = org?.name || 'My Organization';
  const planName    = (org?.plan || 'free').toUpperCase();
  const firstInit   = userName.charAt(0).toUpperCase();
  const isNewUser   = !dataLoading && agents.length === 0 && observations.length === 0 && workspaces.length === 0;
  const filteredObs = brainFilter === 'all' ? observations : observations.filter(o => o.type === brainFilter);
  const filteredCmds = CMD_ITEMS.filter(item =>
    !cmdQuery || item.name.toLowerCase().includes(cmdQuery.toLowerCase()) || item.desc.toLowerCase().includes(cmdQuery.toLowerCase())
  );

  return (
    <div className="dash">

      {/* ── Command Palette ── */}
      {cmdOpen && (
        <div className="cmd-backdrop" onClick={() => setCmdOpen(false)}>
          <div className="cmd-modal" onClick={e => e.stopPropagation()}>
            <div className="cmd-input-row">
              <span className="cmd-search-icon">🔍</span>
              <input
                ref={cmdInputRef}
                className="cmd-input"
                placeholder="Search or jump to..."
                value={cmdQuery}
                onChange={e => setCmdQuery(e.target.value)}
              />
              <span className="cmd-esc">ESC</span>
            </div>
            <div className="cmd-section-label">Navigation</div>
            {filteredCmds.map(item => (
              <div
                key={item.id}
                className="cmd-item"
                onClick={() => { setActiveTab(item.tab); setCmdOpen(false); }}
              >
                <div className="cmd-item-icon">{item.icon}</div>
                <div className="cmd-item-text">
                  <div className="cmd-item-name">{item.name}</div>
                  <div className="cmd-item-desc">{item.desc}</div>
                </div>
                <span className="cmd-item-badge">→</span>
              </div>
            ))}
            <div className="cmd-footer">
              <span>↑↓ navigate</span>
              <span>↵ select</span>
              <span>ESC close</span>
            </div>
          </div>
        </div>
      )}

      {/* ── Sidebar ── */}
      <aside className={`dash-sidebar${sidebarOpen ? '' : ' collapsed'}`}>
        <div className="dash-brand">
          <div className="dash-brand-icon">⚡</div>
          {sidebarOpen && (
            <>
              <span className="dash-brand-name">AgentOS</span>
              <span className="dash-brand-version">v2</span>
            </>
          )}
        </div>

        <nav className="dash-nav">
          <div className="dash-nav-section">Main</div>

          {[
            { id: 'overview',   icon: '📊', label: 'Overview',   badge: errorAgents > 0 ? { text: errorAgents, color: 'red' } : null },
            { id: 'agents',     icon: '🤖', label: 'Agents',     badge: liveAgents > 0 ? { text: liveAgents, color: 'green' } : null },
            { id: 'workspaces', icon: '📦', label: 'Workspaces', badge: null },
            { id: 'brain',      icon: '🧠', label: 'Brain',      badge: null },
            { id: 'graph',      icon: '🕸️', label: 'Graph',      badge: null },
          ].map(item => (
            <button
              key={item.id}
              className={`dash-nav-btn${activeTab === item.id ? ' active' : ''}`}
              onClick={() => setActiveTab(item.id)}
            >
              <span className="dash-nav-icon">{item.icon}</span>
              <span className="dash-nav-label">{item.label}</span>
              {item.badge && (
                <span className={`dash-nav-badge ${item.badge.color}`}>{item.badge.text}</span>
              )}
            </button>
          ))}

          <div className="dash-nav-section" style={{ marginTop: 8 }}>System</div>

          <button
            id="ob-nav-settings"
            className={`dash-nav-btn${activeTab === 'settings' ? ' active' : ''}`}
            onClick={() => setActiveTab('settings')}
          >
            <span className="dash-nav-icon">⚙️</span>
            <span className="dash-nav-label">Settings</span>
          </button>
        </nav>

        <div className="dash-sidebar-foot">
          <div className="dash-plan-chip">
            <div className="dash-plan-dot" />
            <span className="dash-plan-text">{planName} PLAN</span>
          </div>
          <div className="dash-kbd-hint">
            <span className="dash-kbd">⌘</span>
            <span className="dash-kbd">K</span>
            <span style={{ marginLeft: 4 }}>Command palette</span>
          </div>
          <button className="dash-nav-btn" onClick={handleLogout}>
            <span className="dash-nav-icon">🚪</span>
            <span className="dash-nav-label">Sign out</span>
          </button>
          <button
            className="dash-collapse-btn"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            title={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
          >
            {sidebarOpen ? '◀' : '▶'}
          </button>
        </div>
      </aside>

      {/* ── Body ── */}
      <div className="dash-body">

        {/* Topbar */}
        <header className="dash-topbar">
          <span className="dash-topbar-title">{TAB_TITLES[activeTab]}</span>
          <div className="dash-topbar-divider" />
          <button
            className="dash-search-btn"
            onClick={() => { setCmdOpen(true); setCmdQuery(''); }}
          >
            <span className="dash-search-icon">🔍</span>
            <span className="dash-search-text">Search everything...</span>
            <span className="dash-search-shortcut">
              <span className="dash-kbd">⌘</span>
              <span className="dash-kbd">K</span>
            </span>
          </button>
          <div className="dash-topbar-spacer" />
          <div className="dash-live-indicator">
            <div className="dash-live-dot" />
            {liveAgents} live
          </div>
          <span className="dash-time">
            {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </span>
          <button
            className="dash-topbar-capture"
            onClick={() => setActiveTab('overview')}
          >
            + Capture
          </button>
          <div
            className="dash-avatar"
            onClick={() => setActiveTab('settings')}
            title={`${userName} — ${orgName}`}
          >
            {firstInit}
          </div>
        </header>

        {/* ── Overview Tab ── */}
        {activeTab === 'overview' && (
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
                <div className="dash-metric-value">{stats.workspaces || workspaces.length}</div>
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
                    <div className="dash-empty-icon">🤖</div>
                    <h4>No agents yet</h4>
                    <p>Install the SDK to register your first agent automatically</p>
                    <code className="dash-empty-cmd">npm install stoic-agentos-sdk</code>
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
                    <p>Capture your first observation below</p>
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
                  placeholder="What happened? Document an agent decision, error, or insight..."
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
        )}

        {/* ── Agents Tab ── */}
        {activeTab === 'agents' && (
          <div className="dash-content">
            {agents.length > 0 ? (
              <div className="dash-agent-grid">
                {agents.map(agent => (
                  <div key={agent.id} className="dash-agent-card">
                    <div className="dash-agent-card-top">
                      <span className="dash-agent-card-name">{agent.name}</span>
                      <span className={`dash-agent-status-badge ${agent.status || 'idle'}`}>
                        {agent.status || 'idle'}
                      </span>
                    </div>
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
                      <span className="dash-agent-heartbeat">
                        {agent.last_heartbeat
                          ? new Date(agent.last_heartbeat).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                          : 'Never'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="dash-panel">
                <div className="dash-empty" style={{ padding: 60 }}>
                  <div className="dash-empty-icon">🤖</div>
                  <h4>Register your first agent</h4>
                  <p>Wrap your AI agents with the SDK and they will appear here automatically with live status tracking.</p>
                  <code className="dash-empty-cmd">npm install stoic-agentos-sdk</code>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Workspaces Tab ── */}
        {activeTab === 'workspaces' && (
          <div className="dash-content">
            <div className="dash-ws-grid">
              {workspaces.map(ws => (
                <div key={ws.id} className="dash-ws-card">
                  <div className="dash-ws-card-top">
                    <div className="dash-ws-card-icon">📦</div>
                    <span className="dash-ws-card-name">{ws.name}</span>
                    <div className={`dash-ws-status-dot ${ws.status || 'inactive'}`} />
                  </div>
                  <div className="dash-ws-meta">
                    <span className="dash-ws-tag">🌿 {ws.branch || 'main'}</span>
                    {ws.stack && <span className="dash-ws-tag">🛠 {ws.stack}</span>}
                  </div>
                </div>
              ))}
              <button className="dash-ws-card dash-ws-add">
                <span className="dash-ws-add-icon">+</span>
                <span>Add Workspace</span>
              </button>
            </div>
            {workspaces.length === 0 && (
              <div className="dash-panel" style={{ marginTop: 14 }}>
                <div className="dash-empty" style={{ padding: 60 }}>
                  <div className="dash-empty-icon">📦</div>
                  <h4>No workspaces connected</h4>
                  <p>Workspaces are auto-created when you use the SDK or git hooks in a project directory.</p>
                  <code className="dash-empty-cmd">npx stoic-agentos-sdk init</code>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Brain Tab ── */}
        {activeTab === 'brain' && (
          <div className="dash-content">
            <div className="dash-panel">
              <div className="dash-filter-bar">
                {BRAIN_FILTERS.map(f => (
                  <button
                    key={f}
                    className={`dash-filter-pill${brainFilter === f ? ' active' : ''}`}
                    onClick={() => setBrainFilter(f)}
                  >
                    {f === 'all' ? 'All' : f.replace('_', ' ')}
                  </button>
                ))}
              </div>

              {filteredObs.length > 0 ? (
                <div className="dash-obs-list">
                  {filteredObs.map(obs => (
                    <div key={obs.id} className="dash-obs-row">
                      <div className={`dash-obs-icon-wrap ${obs.type || 'note'}`}>
                        {TYPE_ICONS[obs.type] || '📌'}
                      </div>
                      <div className="dash-obs-body">
                        <div className="dash-obs-title">{obs.title}</div>
                        {obs.content && <div className="dash-obs-content">{obs.content}</div>}
                        <div className="dash-obs-meta">
                          <span className={`dash-obs-type ${obs.type || 'note'}`}>{obs.type || 'note'}</span>
                          <span className="dash-obs-time">{new Date(obs.created_at).toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="dash-empty" style={{ padding: 60 }}>
                  <div className="dash-empty-icon">🧠</div>
                  <h4>{brainFilter !== 'all' ? `No "${brainFilter}" observations` : 'Knowledge brain is empty'}</h4>
                  <p>Observations from your agents, git hooks, and captures will appear here.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Graph Tab ── */}
        {activeTab === 'graph' && (
          <div className="dash-content">
            <div className="dash-upgrade-cta">
              <span className="dash-upgrade-icon">🕸️</span>
              <h3>Knowledge Graph</h3>
              <p>
                Visualize how your agents' decisions, code changes, and discoveries interconnect
                across time and projects. Unlock the full intelligence layer.
              </p>
              <div className="dash-upgrade-features">
                <span className="dash-upgrade-feat">Interactive graph visualization</span>
                <span className="dash-upgrade-feat">Cross-agent relationships</span>
                <span className="dash-upgrade-feat">Temporal clustering</span>
                <span className="dash-upgrade-feat">Export as SVG / JSON</span>
              </div>
              <button
                className="btn btn-primary"
                onClick={() => handleUpgrade('pro')}
                disabled={upgradeLoading}
              >
                {upgradeLoading ? 'Loading...' : 'Upgrade to Pro — $29/mo'}
              </button>
            </div>
          </div>
        )}

        {/* ── Settings Tab ── */}
        {activeTab === 'settings' && (
          <div className="dash-content">

            {/* Account */}
            <div className="dash-settings-section">
              <div className="dash-settings-section-head">Account</div>

              <div className="dash-settings-row">
                <div className="dash-settings-icon">👤</div>
                <div className="dash-settings-info">
                  <div className="dash-settings-label">Name</div>
                  <div className="dash-settings-value">{userName}</div>
                </div>
              </div>

              <div className="dash-settings-row">
                <div className="dash-settings-icon">✉️</div>
                <div className="dash-settings-info">
                  <div className="dash-settings-label">Email</div>
                  <div className="dash-settings-value">{user?.email || ''}</div>
                </div>
              </div>

              <div className="dash-settings-row">
                <div className="dash-settings-icon">🏢</div>
                <div className="dash-settings-info">
                  <div className="dash-settings-label">Organization</div>
                  <div className="dash-settings-value">{orgName}</div>
                </div>
              </div>

              <div className="dash-settings-row">
                <div className="dash-settings-icon">⭐</div>
                <div className="dash-settings-info">
                  <div className="dash-settings-label">Plan</div>
                  <div className="dash-settings-value">{planName}</div>
                </div>
                {planName === 'FREE' && (
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={() => handleUpgrade('pro')}
                    disabled={upgradeLoading}
                  >
                    {upgradeLoading ? '...' : 'Upgrade to Pro'}
                  </button>
                )}
              </div>
            </div>

            {/* API Keys */}
            <div className="dash-settings-section">
              <div className="dash-settings-section-head">
                API Keys
                <button
                  className="btn btn-primary btn-sm"
                  disabled={keyGenLoading}
                  onClick={handleGenerateKey}
                >
                  {keyGenLoading ? 'Generating...' : '+ Generate Key'}
                </button>
              </div>

              {apiKey && (
                <div className="dash-api-key-reveal">
                  <code
                    style={{ cursor: 'pointer' }}
                    onClick={() => { navigator.clipboard.writeText(apiKey).catch(() => {}); toast('API key copied!', 'success'); }}
                  >
                    {apiKey}
                  </code>
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => { navigator.clipboard.writeText(apiKey).catch(() => {}); toast('API key copied!', 'success'); }}
                  >
                    Copy
                  </button>
                </div>
              )}

              {apiKeys.length > 0 ? apiKeys.map(k => (
                <div key={k.id} className="dash-settings-row" style={{ opacity: k.active ? 1 : 0.4 }}>
                  <div className="dash-settings-icon">🔑</div>
                  <div className="dash-settings-info">
                    <div className="dash-settings-label">{k.name}</div>
                    <div className="dash-settings-value">{k.key}</div>
                  </div>
                  <span className={`dash-badge ${k.active ? 'green' : 'red'}`}>
                    {k.active ? 'Active' : 'Revoked'}
                  </span>
                  {k.active && (
                    <button
                      className="btn btn-danger btn-sm"
                      onClick={() => handleRevokeKey(k)}
                    >
                      Revoke
                    </button>
                  )}
                </div>
              )) : (
                <div className="dash-empty">
                  <div className="dash-empty-icon">🔑</div>
                  <p>No API keys yet. Generate one to connect your agents.</p>
                </div>
              )}
            </div>

            {/* Danger zone */}
            <div className="dash-settings-section">
              <div className="dash-settings-section-head">Account Actions</div>
              <div className="dash-settings-row">
                <div className="dash-settings-icon">🚪</div>
                <div className="dash-settings-info">
                  <div className="dash-settings-label">Sign out</div>
                  <div className="dash-settings-value">End your current session</div>
                </div>
                <button className="btn btn-ghost btn-sm" onClick={handleLogout}>Sign out</button>
              </div>
            </div>
          </div>
        )}

      </div>

      <OnboardingTour
        isNewUser={isNewUser}
        agents={agents}
        observations={observations}
        apiKey={apiKey}
        userName={userName}
        planName={org?.plan || 'free'}
        setActiveTab={setActiveTab}
        onCaptureRef={onCaptureRef}
      />

      <ToastContainer toasts={toasts} />
    </div>
  );
}
