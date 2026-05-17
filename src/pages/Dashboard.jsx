import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase, API_BASE } from '../lib/supabase';
import OnboardingTour from '../components/OnboardingTour';
import KnowledgeGraph from '../components/KnowledgeGraph';
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

  // New: modals & UI state
  const [showAgentModal, setShowAgentModal] = useState(false);
  const [showWsModal, setShowWsModal] = useState(false);
  const [agentForm, setAgentForm] = useState({ name: '', module: '', description: '' });
  const [wsForm, setWsForm] = useState({ name: '', branch: 'main', stack: '' });
  const [expandedObs, setExpandedObs] = useState(null);
  const [seedLoading, setSeedLoading] = useState(false);
  const [knowledgeItems, setKnowledgeItems] = useState([]);
  const [obsSearch, setObsSearch] = useState('');
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [placeholderIdx, setPlaceholderIdx] = useState(0);

  const onCaptureRef = useRef(null);
  const cmdInputRef = useRef(null);

  const CAPTURE_HINTS = [
    'Deployed v1.3 to staging...',
    'Fixed memory leak in agent-5...',
    'Switched from GPT-4 to Claude for summarization...',
    'Discovered N+1 query in workspace sync...',
    'Architecture: moved to event-driven pipeline...',
    'Error: rate limit hit on OpenAI endpoint...',
  ];

  // Live clock
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // Rotate capture placeholder
  useEffect(() => {
    const t = setInterval(() => setPlaceholderIdx(i => (i + 1) % CAPTURE_HINTS.length), 4000);
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

  // ── Seed Demo Data ──
  const handleSeedDemo = async () => {
    setSeedLoading(true);
    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      const headers = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };
      const demoAgents = [
        { name: 'content-writer', module: 'content', description: 'Generates blog posts and social copy', status: 'running' },
        { name: 'code-reviewer', module: 'engineering', description: 'Reviews PRs and suggests improvements', status: 'idle' },
        { name: 'data-pipeline', module: 'analytics', description: 'ETL pipeline for daily metrics', status: 'running' },
      ];
      const demoObs = [
        { type: 'deployment', title: 'Deployed v1.3 to production', content: 'Zero-downtime deployment via Railway. All health checks passed.' },
        { type: 'decision', title: 'Switched content-writer from GPT-4 to Claude 3.5', content: 'Claude produces 40% fewer hallucinations on our domain-specific content.' },
        { type: 'architecture', title: 'Migrated to event-driven pipeline', content: 'Replaced polling with webhooks. Latency dropped from 2.4s to 180ms.' },
        { type: 'error', title: 'Rate limit hit on OpenAI API', content: 'Exceeded 10K RPM on the summarization endpoint. Added exponential backoff.' },
        { type: 'discovery', title: 'Found N+1 query in workspace sync', content: 'Each workspace was making individual DB calls. Batched into single query — 8x speedup.' },
      ];
      for (const a of demoAgents) {
        await fetch(`${API_BASE}/api/v1/agents`, { method: 'POST', headers, body: JSON.stringify({ ...a, org_id: org.id }) });
      }
      for (const o of demoObs) {
        await fetch(`${API_BASE}/api/v1/observations`, { method: 'POST', headers, body: JSON.stringify({ ...o, org_id: org.id }) });
      }
      toast('Demo data seeded! Explore your dashboard.', 'success');
      await fetchData();
    } catch (err) {
      console.error('Seed failed:', err);
      toast('Failed to seed demo data', 'error');
    }
    setSeedLoading(false);
  };

  // ── Register Agent ──
  const handleRegisterAgent = async (e) => {
    e.preventDefault();
    if (!agentForm.name.trim()) return;
    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      const res = await fetch(`${API_BASE}/api/v1/agents`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...agentForm, org_id: org.id, status: 'idle' }),
      });
      if (res.ok) {
        const newAgent = await res.json();
        setAgents(prev => [newAgent, ...prev]);
        setAgentForm({ name: '', module: '', description: '' });
        setShowAgentModal(false);
        toast('Agent registered!', 'success');
      } else {
        const body = await res.json().catch(() => ({}));
        toast(body.error || 'Failed to register agent', 'error');
      }
    } catch { toast('Failed to register agent', 'error'); }
  };

  // ── Add Workspace ──
  const handleAddWorkspace = async (e) => {
    e.preventDefault();
    if (!wsForm.name.trim()) return;
    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      const res = await fetch(`${API_BASE}/api/v1/workspaces`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...wsForm, org_id: org.id, status: 'active' }),
      });
      if (res.ok) {
        const newWs = await res.json();
        setWorkspaces(prev => [newWs, ...prev]);
        setWsForm({ name: '', branch: 'main', stack: '' });
        setShowWsModal(false);
        toast('Workspace added!', 'success');
      } else {
        const body = await res.json().catch(() => ({}));
        toast(body.error || 'Failed to add workspace', 'error');
      }
    } catch { toast('Failed to add workspace', 'error'); }
  };

  // ── Delete Observation ──
  const handleDeleteObs = async (obsId) => {
    if (!window.confirm('Delete this observation?')) return;
    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      const res = await fetch(`${API_BASE}/api/v1/observations/${obsId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (res.ok) {
        setObservations(prev => prev.filter(o => o.id !== obsId));
        setStats(prev => ({ ...prev, observations: Math.max(0, (prev.observations || 1) - 1) }));
        toast('Observation deleted', 'info');
      }
    } catch { toast('Failed to delete', 'error'); }
  };

  // ── Fetch Knowledge Items ──
  const fetchKnowledge = useCallback(async () => {
    if (!org?.id) return;
    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      const res = await fetch(`${API_BASE}/api/v1/knowledge-items?org_id=${org.id}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (res.ok) setKnowledgeItems(await res.json());
    } catch {}
  }, [org?.id]);

  useEffect(() => { if (org?.id) fetchKnowledge(); }, [org?.id, fetchKnowledge]);

  if (authLoading) return null;

  const liveAgents  = agents.filter(a => a.status === 'running').length;
  const errorAgents = agents.filter(a => a.status === 'error').length;
  const usagePct    = usage.limit > 0 ? ((usage.count / usage.limit) * 100).toFixed(1) : 0;
  const userName    = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User';
  const orgName     = org?.name || 'My Organization';
  const planName    = (org?.plan || 'free').toUpperCase();
  const firstInit   = userName.charAt(0).toUpperCase();
  const isNewUser   = !dataLoading && agents.length === 0 && observations.length === 0 && workspaces.length === 0;
  const filteredObs = observations.filter(o => {
    if (brainFilter !== 'all' && o.type !== brainFilter) return false;
    if (obsSearch) {
      const q = obsSearch.toLowerCase();
      return (o.title || '').toLowerCase().includes(q) || (o.content || '').toLowerCase().includes(q);
    }
    return true;
  });
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
                    <div className="dash-empty-icon">🚀</div>
                    <h4>Quick Start</h4>
                    <p>Get started in seconds — seed sample data or register your first agent manually.</p>
                    <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
                      <button className="btn btn-primary btn-sm" onClick={handleSeedDemo} disabled={seedLoading}>
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
                    <button className="btn btn-primary btn-sm" style={{ marginTop: 8 }} onClick={handleSeedDemo} disabled={seedLoading}>
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
        )}

        {activeTab === 'agents' && (
          <div className="dash-content">
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 14 }}>
              <button className="btn btn-primary btn-sm" onClick={() => setShowAgentModal(true)}>+ Register Agent</button>
            </div>
            {agents.length > 0 ? (
              <div className="dash-agent-grid">
                {agents.map(agent => (
                  <div key={agent.id} className="dash-agent-card" onClick={() => setSelectedAgent(agent)} style={{ cursor: 'pointer' }}>
                    <div className="dash-agent-card-top">
                      <span className="dash-agent-card-name">{agent.name}</span>
                      <span className={`dash-agent-status-badge ${agent.status || 'idle'}`}>
                        {agent.status || 'idle'}
                      </span>
                    </div>
                    {agent.description && <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', margin: '6px 0 8px', lineHeight: 1.4 }}>{agent.description}</div>}
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
                  <p>Create agents manually or use the SDK to auto-register them.</p>
                  <div style={{ display: 'flex', gap: 8, marginTop: 12, justifyContent: 'center' }}>
                    <button className="btn btn-primary btn-sm" onClick={() => setShowAgentModal(true)}>+ Register Agent</button>
                    <button className="btn btn-ghost btn-sm" onClick={handleSeedDemo} disabled={seedLoading}>{seedLoading ? '...' : '⚡ Seed Demo'}</button>
                  </div>
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
              <button className="dash-ws-card dash-ws-add" onClick={() => setShowWsModal(true)}>
                <span className="dash-ws-add-icon">+</span>
                <span>Add Workspace</span>
              </button>
            </div>
            {workspaces.length === 0 && (
              <div className="dash-panel" style={{ marginTop: 14 }}>
              <div className="dash-empty" style={{ padding: 60 }}>
                  <div className="dash-empty-icon">📦</div>
                  <h4>No workspaces connected</h4>
                  <p>Add a workspace manually or use the SDK to auto-create them.</p>
                  <button className="btn btn-primary btn-sm" style={{ marginTop: 10 }} onClick={() => setShowWsModal(true)}>+ Add Workspace</button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Brain Tab ── */}
        {activeTab === 'brain' && (
          <div className="dash-content">
            <div className="dash-panel">
              {/* Search bar */}
              <div style={{ marginBottom: 12 }}>
                <input
                  type="text" placeholder="Search observations..."
                  value={obsSearch} onChange={e => setObsSearch(e.target.value)}
                  style={{ width: '100%', padding: '10px 14px', background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)', borderRadius: 8, color: '#fff', fontSize: 13, outline: 'none', fontFamily: 'var(--font-body)' }}
                />
              </div>
              {/* Filter pills with counts */}
              <div className="dash-filter-bar">
                {BRAIN_FILTERS.map(f => {
                  const count = f === 'all' ? observations.length : observations.filter(o => o.type === f).length;
                  return (
                    <button key={f} className={`dash-filter-pill${brainFilter === f ? ' active' : ''}`} onClick={() => setBrainFilter(f)}>
                      {f === 'all' ? 'All' : f.replace('_', ' ')} {count > 0 && <span style={{ marginLeft: 4, opacity: 0.5 }}>({count})</span>}
                    </button>
                  );
                })}
              </div>

              {filteredObs.length > 0 ? (
                <div className="dash-obs-list">
                  {filteredObs.map(obs => (
                    <div key={obs.id} className={`dash-obs-row${expandedObs === obs.id ? ' expanded' : ''}`} onClick={() => setExpandedObs(expandedObs === obs.id ? null : obs.id)} style={{ cursor: 'pointer' }}>
                      <div className={`dash-obs-icon-wrap ${obs.type || 'note'}`}>
                        {TYPE_ICONS[obs.type] || '📌'}
                      </div>
                      <div className="dash-obs-body" style={{ flex: 1 }}>
                        <div className="dash-obs-title">{obs.title}</div>
                        {expandedObs === obs.id && obs.content && (
                          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', margin: '8px 0', padding: '10px 12px', background: 'rgba(255,255,255,0.03)', borderRadius: 6, lineHeight: 1.6, borderLeft: '2px solid var(--accent-purple)' }}>
                            {obs.content}
                          </div>
                        )}
                        <div className="dash-obs-meta">
                          <span className={`dash-obs-type ${obs.type || 'note'}`}>{obs.type || 'note'}</span>
                          <span className="dash-obs-time">{new Date(obs.created_at).toLocaleString()}</span>
                        </div>
                      </div>
                      {expandedObs === obs.id && (
                        <button onClick={(e) => { e.stopPropagation(); handleDeleteObs(obs.id); }} style={{ background: 'rgba(255,71,87,0.1)', border: '1px solid rgba(255,71,87,0.3)', color: '#ff4757', padding: '4px 10px', borderRadius: 6, fontSize: 11, cursor: 'pointer', marginLeft: 8, whiteSpace: 'nowrap' }}>
                          Delete
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="dash-empty" style={{ padding: 60 }}>
                  <div className="dash-empty-icon">🧠</div>
                  <h4>{brainFilter !== 'all' ? `No "${brainFilter}" observations` : 'Knowledge brain is empty'}</h4>
                  <p>Capture observations or seed demo data to get started.</p>
                  <button className="btn btn-primary btn-sm" style={{ marginTop: 8 }} onClick={handleSeedDemo} disabled={seedLoading}>{seedLoading ? '...' : '⚡ Seed Demo Data'}</button>
                </div>
              )}
            </div>

            {/* Knowledge Items section */}
            <div className="dash-panel" style={{ marginTop: 14 }}>
              <div className="dash-panel-head">
                <span className="dash-panel-title">
                  <span className="dash-panel-title-icon">💡</span>
                  Knowledge Items
                  {knowledgeItems.length > 0 && <span style={{ marginLeft: 6, fontSize: 12, opacity: 0.4 }}>({knowledgeItems.length})</span>}
                </span>
              </div>
              {knowledgeItems.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {knowledgeItems.map(ki => (
                    <div key={ki.id} style={{ padding: '14px 16px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)', borderRadius: 10 }}>
                      <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>{ki.title || ki.key}</div>
                      {ki.content && <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', lineHeight: 1.5 }}>{ki.content.substring(0, 200)}{ki.content.length > 200 ? '...' : ''}</div>}
                      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)', marginTop: 6 }}>{new Date(ki.created_at).toLocaleDateString()}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="dash-empty">
                  <div className="dash-empty-icon">💡</div>
                  <p>Knowledge items from your agents will appear here. Use the SDK to persist decisions and discoveries.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Graph Tab ── */}
        {activeTab === 'graph' && (
          <div className="dash-content" style={{ height: 'calc(100vh - 80px)' }}>
            <div className="dash-panel" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              <div className="dash-panel-head">
                <span className="dash-panel-title">
                  <span className="dash-panel-title-icon">🕸️</span>
                  Knowledge Graph
                  <span style={{ fontSize: 11, opacity: 0.4, marginLeft: 8 }}>
                    {observations.length > 50 ? '50 / ' + observations.length + ' nodes (Free tier)' : observations.length + ' nodes'}
                  </span>
                </span>
                {observations.length > 0 && (
                  <button className="dash-panel-action" onClick={() => {
                    const data = JSON.stringify(observations, null, 2);
                    const blob = new Blob([data], { type: 'application/json' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url; a.download = 'agentos-observations.json'; a.click();
                    URL.revokeObjectURL(url);
                    toast('Exported observations as JSON', 'success');
                  }}>Export JSON →</button>
                )}
              </div>
              <div style={{ flex: 1, minHeight: 0 }}>
                <KnowledgeGraph
                  observations={observations}
                  agents={agents}
                  onUpgrade={handleUpgrade}
                  upgradeLoading={upgradeLoading}
                />
              </div>
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

      {/* ── Register Agent Modal ── */}
      {showAgentModal && (
        <div className="cmd-backdrop" onClick={() => setShowAgentModal(false)}>
          <div className="cmd-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 440, padding: 28 }}>
            <h3 style={{ fontSize: 18, fontWeight: 800, marginBottom: 16 }}>Register Agent</h3>
            <form onSubmit={handleRegisterAgent} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <input placeholder="Agent name (e.g. content-writer)" required value={agentForm.name} onChange={e => setAgentForm({...agentForm, name: e.target.value})} style={{ padding: '10px 14px', background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)', borderRadius: 8, color: '#fff', fontSize: 13, outline: 'none' }} />
              <input placeholder="Module (e.g. engineering, content, analytics)" value={agentForm.module} onChange={e => setAgentForm({...agentForm, module: e.target.value})} style={{ padding: '10px 14px', background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)', borderRadius: 8, color: '#fff', fontSize: 13, outline: 'none' }} />
              <textarea placeholder="Description (optional)" value={agentForm.description} onChange={e => setAgentForm({...agentForm, description: e.target.value})} rows={3} style={{ padding: '10px 14px', background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)', borderRadius: 8, color: '#fff', fontSize: 13, outline: 'none', resize: 'vertical', fontFamily: 'var(--font-body)' }} />
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => setShowAgentModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary btn-sm">Register Agent</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Add Workspace Modal ── */}
      {showWsModal && (
        <div className="cmd-backdrop" onClick={() => setShowWsModal(false)}>
          <div className="cmd-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 440, padding: 28 }}>
            <h3 style={{ fontSize: 18, fontWeight: 800, marginBottom: 16 }}>Add Workspace</h3>
            <form onSubmit={handleAddWorkspace} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <input placeholder="Workspace name (e.g. stoic-agentos)" required value={wsForm.name} onChange={e => setWsForm({...wsForm, name: e.target.value})} style={{ padding: '10px 14px', background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)', borderRadius: 8, color: '#fff', fontSize: 13, outline: 'none' }} />
              <input placeholder="Branch (default: main)" value={wsForm.branch} onChange={e => setWsForm({...wsForm, branch: e.target.value})} style={{ padding: '10px 14px', background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)', borderRadius: 8, color: '#fff', fontSize: 13, outline: 'none' }} />
              <input placeholder="Stack (e.g. React, Python, Node.js)" value={wsForm.stack} onChange={e => setWsForm({...wsForm, stack: e.target.value})} style={{ padding: '10px 14px', background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)', borderRadius: 8, color: '#fff', fontSize: 13, outline: 'none' }} />
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => setShowWsModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary btn-sm">Add Workspace</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Agent Detail Modal ── */}
      {selectedAgent && (
        <div className="cmd-backdrop" onClick={() => setSelectedAgent(null)}>
          <div className="cmd-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 500, padding: 28 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(155,89,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>🤖</div>
              <div>
                <div style={{ fontSize: 18, fontWeight: 800 }}>{selectedAgent.name}</div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>{selectedAgent.module || 'No module'}</div>
              </div>
              <span className={`dash-agent-status-badge ${selectedAgent.status || 'idle'}`} style={{ marginLeft: 'auto' }}>{selectedAgent.status || 'idle'}</span>
            </div>
            {selectedAgent.description && <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', marginBottom: 16, lineHeight: 1.5 }}>{selectedAgent.description}</div>}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 16 }}>
              <div style={{ padding: 14, background: 'rgba(255,255,255,0.03)', borderRadius: 10, textAlign: 'center', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: 22, fontWeight: 900, color: 'var(--accent-cyan)' }}>{selectedAgent.total_runs || 0}</div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase' }}>Runs</div>
              </div>
              <div style={{ padding: 14, background: 'rgba(255,255,255,0.03)', borderRadius: 10, textAlign: 'center', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: 22, fontWeight: 900, color: (selectedAgent.total_errors || 0) > 0 ? '#ff4757' : 'var(--accent-green)' }}>{selectedAgent.total_errors || 0}</div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase' }}>Errors</div>
              </div>
              <div style={{ padding: 14, background: 'rgba(255,255,255,0.03)', borderRadius: 10, textAlign: 'center', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--accent-purple)' }}>{selectedAgent.last_heartbeat ? new Date(selectedAgent.last_heartbeat).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}</div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase' }}>Last Heartbeat</div>
              </div>
            </div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)' }}>ID: {selectedAgent.id}</div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
              <button className="btn btn-ghost btn-sm" onClick={() => setSelectedAgent(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
