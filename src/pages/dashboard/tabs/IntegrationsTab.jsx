import { useState, useMemo, useEffect, useCallback } from 'react';
import { supabase, API_BASE } from '../../../lib/supabase';

const INTEGRATIONS = {
  google: {
    label: 'Google Workspace', icon: '🔵',
    items: [
      { id: 'gmail', name: 'Gmail', icon: '📧', desc: 'Read, compose, and organize emails in your Gmail inbox.', color: '#ea4335', status: 'stable' },
      { id: 'bigquery', name: 'BigQuery', icon: '📊', desc: 'Run queries and analyze large datasets in BigQuery.', color: '#4285f4', status: 'stable' },
      { id: 'calendar', name: 'Calendar', icon: '📅', desc: 'Manage calendar events and meeting schedules.', color: '#34a853', status: 'stable' },
      { id: 'docs', name: 'Docs', icon: '📄', desc: 'Create, read, and edit documents.', color: '#4285f4', status: 'stable' },
      { id: 'sheets', name: 'Sheets', icon: '📗', desc: 'Read, update, and analyze spreadsheet data.', color: '#34a853', status: 'stable' },
      { id: 'drive', name: 'Drive', icon: '💾', desc: 'Search, upload, and organize files.', color: '#fbbc04', status: 'stable' },
    ],
  },
  microsoft: {
    label: 'Microsoft 365', icon: '🟦',
    items: [
      { id: 'excel', name: 'Excel', icon: '📊', desc: 'Read, write, and analyze Excel workbooks.', color: '#217346', status: 'stable' },
      { id: 'outlook', name: 'Outlook', icon: '📨', desc: 'Manage Outlook emails, meetings, and calendars.', color: '#0078d4', status: 'stable' },
      { id: 'teams', name: 'Teams', icon: '💬', desc: 'Send messages and collaborate in Teams channels.', color: '#6264a7', status: 'stable' },
      { id: 'sharepoint', name: 'SharePoint', icon: '🏢', desc: 'Browse and manage documents and sites.', color: '#036c70', status: 'beta' },
      { id: 'powerpoint', name: 'PowerPoint', icon: '📽️', desc: 'Create and edit presentations.', color: '#b7472a', status: 'beta' },
    ],
  },
  devtools: {
    label: 'Developer Tools', icon: '🛠️',
    items: [
      { id: 'github', name: 'GitHub', icon: '🐙', desc: 'Repositories, issues, PRs, and code review.', color: '#f0f6fc', status: 'stable' },
      { id: 'vercel', name: 'Vercel', icon: '▲', desc: 'Deploy, monitor, and manage deployments.', color: '#ffffff', status: 'stable' },
      { id: 'jira', name: 'Jira', icon: '📋', desc: 'Track issues, sprints, and project progress.', color: '#0052cc', status: 'stable' },
      { id: 'linear', name: 'Linear', icon: '📐', desc: 'Manage issues, projects, and workflows.', color: '#5e6ad2', status: 'beta' },
      { id: 'supabase', name: 'Supabase', icon: '⚡', desc: 'Database, auth, and realtime subscriptions.', color: '#3ecf8e', status: 'stable' },
    ],
  },
  data: {
    label: 'Data & AI', icon: '🧠',
    items: [
      { id: 'openai', name: 'OpenAI', icon: '🤖', desc: 'GPT-4o, embeddings, and assistant APIs.', color: '#10a37f', status: 'stable' },
      { id: 'anthropic', name: 'Anthropic', icon: '🅰️', desc: 'Claude models for analysis and generation.', color: '#d4a574', status: 'stable' },
      { id: 'pinecone', name: 'Pinecone', icon: '🌲', desc: 'Vector database for semantic search.', color: '#000000', status: 'beta' },
      { id: 'snowflake', name: 'Snowflake', icon: '❄️', desc: 'Cloud data warehouse queries.', color: '#29b5e8', status: 'beta' },
    ],
  },
  comms: {
    label: 'Communication', icon: '💬',
    items: [
      { id: 'slack', name: 'Slack', icon: '💬', desc: 'Messages, channels, and workflow automation.', color: '#4a154b', status: 'stable' },
      { id: 'notion', name: 'Notion', icon: '📓', desc: 'Pages, databases, and knowledge base.', color: '#ffffff', status: 'stable' },
      { id: 'discord', name: 'Discord', icon: '🎮', desc: 'Server messages and bot interactions.', color: '#5865f2', status: 'beta' },
      { id: 'zapier', name: 'Zapier', icon: '⚡', desc: 'Connect and automate 5,000+ apps.', color: '#ff4a00', status: 'stable' },
      { id: 'smtp', name: 'SMTP Server', icon: '📧', desc: 'Connect custom SMTP server credentials for Mercury agent email outreach.', color: '#10a37f', status: 'stable' },
      { id: 'twilio', name: 'Twilio Gateway', icon: '📞', desc: 'Connect Twilio credentials for Hermes WhatsApp and SMS outreach agent.', color: '#f22f46', status: 'stable' },
    ],
  },
};

const CATEGORIES = [
  { id: 'all', label: 'All', icon: '📦' },
  { id: 'connected', label: 'Connected', icon: '🔗' },
  { id: 'google', label: 'Google', icon: '🔵' },
  { id: 'microsoft', label: 'Microsoft', icon: '🟦' },
  { id: 'devtools', label: 'Dev Tools', icon: '🛠️' },
  { id: 'data', label: 'Data & AI', icon: '🧠' },
  { id: 'comms', label: 'Communication', icon: '💬' },
];

async function getAuthHeaders() {
  const token = (await supabase.auth.getSession()).data.session?.access_token;
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
}

export default function IntegrationsTab({ org, toast }) {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [connected, setConnected] = useState(new Set(['github', 'slack', 'supabase']));
  const [activeModal, setActiveModal] = useState(null); // 'smtp' | 'twilio' | null
  const [smtpForm, setSmtpForm] = useState({ host: '', port: '587', user: '', pass: '', fromEmail: '', secure: false });
  const [twilioForm, setTwilioForm] = useState({ accountSid: '', authToken: '', fromNumber: '' });
  const [formLoading, setFormLoading] = useState(false);
  const [details, setDetails] = useState({ smtp: null, twilio: null });

  // Fetch credential configuration metadata (safe display values)
  const fetchCredentialStatus = useCallback(async (type) => {
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`${API_BASE}/api/v1/integrations/credentials/${type}`, { headers });
      if (res.ok) {
        const data = await res.json();
        setDetails(prev => ({ ...prev, [type]: data.configured ? data.details : null }));
        if (data.configured) {
          setConnected(prev => new Set([...prev]).add(type));
        } else {
          setConnected(prev => {
            const next = new Set(prev);
            next.delete(type);
            return next;
          });
        }
      }
    } catch {}
  }, []);

  // Fetch persisted connected integrations on mount
  const fetchConnected = useCallback(async () => {
    if (!org?.id) return;
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`${API_BASE}/api/v1/integrations?org_id=${org.id}`, { headers });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const { connected: ids } = await res.json();
      if (Array.isArray(ids)) {
        setConnected(new Set(ids));
      }
    } catch {
      // API failed — keep default local state
    }
  }, [org?.id]);

  useEffect(() => {
    fetchConnected();
    if (org?.id) {
      fetchCredentialStatus('smtp');
      fetchCredentialStatus('twilio');
    }
  }, [org?.id, fetchConnected, fetchCredentialStatus]);

  const toggleConnect = async (id) => {
    const isConnected = connected.has(id);
    // Optimistic update
    setConnected(prev => {
      const next = new Set(prev);
      if (isConnected) next.delete(id); else next.add(id);
      return next;
    });
    // Persist to backend
    try {
      const headers = await getAuthHeaders();
      if (isConnected) {
        await fetch(`${API_BASE}/api/v1/integrations/${id}`, { method: 'DELETE', headers });
      } else {
        await fetch(`${API_BASE}/api/v1/integrations`, {
          method: 'POST', headers, body: JSON.stringify({ integration_id: id }),
        });
      }
    } catch {
      // Revert on failure
      setConnected(prev => {
        const next = new Set(prev);
        if (isConnected) next.add(id); else next.delete(id);
        return next;
      });
      toast?.(`Connection update failed — reverted`, 'error');
    }
  };

  const handleSmtpSubmit = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`${API_BASE}/api/v1/integrations/credentials`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ type: 'smtp', credentials: smtpForm }),
      });
      if (res.ok) {
        toast?.('✨ SMTP Server connected successfully', 'success');
        setConnected(prev => new Set([...prev]).add('smtp'));
        setDetails(prev => ({
          ...prev,
          smtp: {
            host: smtpForm.host,
            port: smtpForm.port,
            user: smtpForm.user ? `${smtpForm.user.slice(0, 3)}...` : null,
            fromEmail: smtpForm.fromEmail,
          }
        }));
        setActiveModal(null);
      } else {
        const body = await res.json();
        toast?.(body.error || 'Connection failed', 'error');
      }
    } catch (err) {
      toast?.('Connection failed: Network error', 'error');
    }
    setFormLoading(false);
  };

  const handleTwilioSubmit = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`${API_BASE}/api/v1/integrations/credentials`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ type: 'twilio', credentials: twilioForm }),
      });
      if (res.ok) {
        toast?.('✨ Twilio Gateway connected successfully', 'success');
        setConnected(prev => new Set([...prev]).add('twilio'));
        setDetails(prev => ({
          ...prev,
          twilio: {
            accountSid: twilioForm.accountSid ? `${twilioForm.accountSid.slice(0, 6)}...` : null,
            fromNumber: twilioForm.fromNumber,
          }
        }));
        setActiveModal(null);
      } else {
        const body = await res.json();
        toast?.(body.error || 'Connection failed', 'error');
      }
    } catch (err) {
      toast?.('Connection failed: Network error', 'error');
    }
    setFormLoading(false);
  };

  const handleDisconnectCredentials = async (type) => {
    if (!window.confirm(`Are you sure you want to disconnect your ${type.toUpperCase()} integration and delete all credentials?`)) return;
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`${API_BASE}/api/v1/integrations/credentials/${type}`, {
        method: 'DELETE',
        headers,
      });
      if (res.ok) {
        toast?.(`${type.toUpperCase()} credentials deleted successfully`, 'success');
        setConnected(prev => {
          const next = new Set(prev);
          next.delete(type);
          return next;
        });
        setDetails(prev => ({ ...prev, [type]: null }));
      } else {
        const body = await res.json();
        toast?.(body.error || 'Failed to delete credentials', 'error');
      }
    } catch {
      toast?.('Failed to delete credentials: Network error', 'error');
    }
  };


  const totalIntegrations = Object.values(INTEGRATIONS).reduce((s, g) => s + g.items.length, 0);

  const sections = useMemo(() => {
    const result = [];
    for (const [key, section] of Object.entries(INTEGRATIONS)) {
      let items = section.items;
      if (search) {
        const q = search.toLowerCase();
        items = items.filter(i => i.name.toLowerCase().includes(q) || i.desc.toLowerCase().includes(q));
      }
      if (category === 'connected') {
        items = items.filter(i => connected.has(i.id));
      } else if (category !== 'all') {
        if (key !== category) items = [];
      }
      if (items.length > 0) result.push({ ...section, key, items });
    }
    return result;
  }, [search, category, connected]);

  return (
    <div className="dash-content hub-layout">
      {/* Sidebar */}
      <div className="hub-sidebar">
        <div className="hub-sidebar-header">🔌 Connect Hub</div>
        <input
          className="hub-search"
          placeholder="Search integrations..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <div className="hub-cats">
          {CATEGORIES.map(cat => (
            <button
              key={cat.id}
              className={`hub-cat ${category === cat.id ? 'active' : ''}`}
              onClick={() => setCategory(cat.id)}
            >
              <span className="hub-cat-icon">{cat.icon}</span>
              <span className="hub-cat-label">{cat.label}</span>
              {cat.id === 'connected' && <span className="hub-cat-count">{connected.size}</span>}
            </button>
          ))}
        </div>
        <div className="hub-sidebar-footer">
          <button className="hub-custom-mcp">+ Custom MCP Server</button>
        </div>
      </div>

      {/* Main */}
      <div className="hub-main">
        {/* Stats strip */}
        <div className="hub-stats">
          <div className="hub-stat">
            <span className="hub-stat-value">{totalIntegrations}</span>
            <span className="hub-stat-label">Available</span>
          </div>
          <div className="hub-stat">
            <span className="hub-stat-value connected">{connected.size}</span>
            <span className="hub-stat-label">Connected</span>
          </div>
          <div className="hub-stat">
            <span className="hub-stat-value">{Object.keys(INTEGRATIONS).length}</span>
            <span className="hub-stat-label">Categories</span>
          </div>
        </div>

        {sections.length === 0 ? (
          <div className="hub-empty">
            <span style={{ fontSize: 48 }}>🔌</span>
            <h3>No integrations found</h3>
            <p>Try a different search or category</p>
          </div>
        ) : (
          sections.map(section => (
            <div key={section.key} className="hub-group">
              <div className="hub-group-header">
                <span className="hub-group-icon">{section.icon}</span>
                <span className="hub-group-label">{section.label}</span>
                <span className="hub-group-count">{section.items.length}</span>
              </div>
              <div className="hub-grid">
                {section.items.map(item => (
                  <div key={item.id} className={`hub-card ${connected.has(item.id) ? 'connected' : ''}`}>
                    <div className="hub-card-top">
                      <div className="hub-card-icon" style={{ background: `${item.color}15` }}>
                        <span>{item.icon}</span>
                      </div>
                      {item.status === 'beta' && <span className="hub-card-beta">BETA</span>}
                      {connected.has(item.id) && <span className="hub-card-live">● Live</span>}
                    </div>
                    <h4 className="hub-card-name">{item.name}</h4>
                    <p className="hub-card-desc">{item.desc}</p>
                    <button
                      className={`hub-card-btn ${connected.has(item.id) ? 'disconnect' : ''}`}
                      onClick={() => toggleConnect(item.id)}
                    >
                      {connected.has(item.id) ? '✓ Disconnect' : 'Connect →'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
