import { useState, useMemo } from 'react';

const INTEGRATIONS = {
  google: {
    label: 'Google',
    icon: 'G',
    items: [
      { id: 'gmail', name: 'Gmail', icon: '📧', desc: 'Read, compose, and organize emails in your Gmail inbox.', color: '#ea4335' },
      { id: 'bigquery', name: 'Google BigQuery', icon: '📊', desc: 'Run queries and analyze large datasets stored in Google BigQuery.', color: '#4285f4' },
      { id: 'calendar', name: 'Google Calendar', icon: '📅', desc: 'View, create, and manage calendar events and meeting schedules.', color: '#34a853' },
      { id: 'docs', name: 'Google Docs', icon: '📄', desc: 'Create, read, and edit documents in Google Docs.', color: '#4285f4' },
      { id: 'sheets', name: 'Google Sheets', icon: '📗', desc: 'Read, update, and analyze data in Google Sheets spreadsheets.', color: '#34a853' },
      { id: 'drive', name: 'Google Drive', icon: '💾', desc: 'Search, upload, and organize files in Google Drive.', color: '#fbbc04' },
    ],
  },
  microsoft: {
    label: 'Microsoft',
    icon: '⊞',
    items: [
      { id: 'excel', name: 'Excel', icon: '📊', desc: 'Read, write, and analyze data in Microsoft Excel workbooks.', color: '#217346' },
      { id: 'outlook', name: 'Outlook', icon: '📨', desc: 'Read, draft, and organize Outlook emails, meetings, and calendar...', color: '#0078d4' },
      { id: 'powerpoint', name: 'PowerPoint', icon: '📽️', desc: 'Search, read, and create Microsoft PowerPoint presentations.', color: '#b7472a' },
      { id: 'sharepoint', name: 'SharePoint', icon: '🏢', desc: 'Browse, read, and manage documents and sites in Microsoft...', color: '#036c70' },
      { id: 'teams', name: 'Teams', icon: '💬', desc: 'Send and read messages, channels, and collaboration updates in...', color: '#6264a7' },
      { id: 'word', name: 'Word', icon: '📝', desc: 'Search, read, and create Microsoft Word documents.', color: '#2b579a' },
    ],
  },
  devtools: {
    label: 'Developer',
    items: [
      { id: 'github', name: 'GitHub', icon: '🐙', desc: 'Browse repositories, manage issues and pull requests, and review...', color: '#f0f6fc' },
      { id: 'jira', name: 'Jira', icon: '📋', desc: 'Create, update, and track issues and sprints in Jira projects.', color: '#0052cc' },
      { id: 'linear', name: 'Linear', icon: '📐', desc: 'Manage issues, projects, and workflows in Linear.', color: '#5e6ad2' },
      { id: 'vercel', name: 'Vercel', icon: '▲', desc: 'Deploy, monitor, and manage Vercel projects and deployments.', color: '#ffffff' },
    ],
  },
  other: {
    label: 'Other',
    items: [
      { id: 'slack', name: 'Slack', icon: '💬', desc: 'Send messages, manage channels, and automate Slack workflows.', color: '#4a154b' },
      { id: 'notion', name: 'Notion', icon: '📓', desc: 'Read, create, and organize pages and databases in Notion.', color: '#ffffff' },
      { id: 'exa', name: 'Exa', icon: '🔍', desc: 'Search the web using AI-powered semantic search for highly releva...', color: '#5b5fc7' },
      { id: 'apollo', name: 'Apollo', icon: '✳️', desc: 'Search contacts, enrich leads, and manage your sales pipeline with...', color: '#7c5cfc' },
      { id: 'airtable', name: 'Airtable', icon: '🗃️', desc: 'Read, create, and manage records in Airtable bases.', color: '#18bfff' },
      { id: 'zapier', name: 'Zapier', icon: '⚡', desc: 'Connect and automate workflows across 5,000+ apps with Zapier.', color: '#ff4a00' },
    ],
  },
};

const CATEGORIES = [
  { id: 'all', label: 'All', icon: '📦' },
  { id: 'connected', label: 'Connected', icon: '🔗' },
  { id: 'google', label: 'Productivity', icon: '📊' },
  { id: 'devtools', label: 'Developer', icon: '🛠️' },
  { id: 'other', label: 'Communication', icon: '💬' },
];

export default function IntegrationsTab() {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [connected, setConnected] = useState(new Set());

  const toggleConnect = (id) => {
    setConnected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

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
    <div className="dash-content fleet-integrations-layout">
      {/* Left filter sidebar */}
      <div className="fleet-integ-sidebar">
        <input
          className="fleet-integ-search"
          placeholder="Search..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />

        <div className="fleet-integ-cats">
          {CATEGORIES.map(cat => (
            <button
              key={cat.id}
              className={`fleet-integ-cat ${category === cat.id ? 'active' : ''}`}
              onClick={() => setCategory(cat.id)}
            >
              <span className="fleet-integ-cat-icon">{cat.icon}</span>
              <span>{cat.label}</span>
            </button>
          ))}
        </div>

        <div className="fleet-integ-section-label">APPS</div>
        <button className="fleet-integ-cat" onClick={() => setCategory('other')}>
          <span className="fleet-integ-cat-icon">💬</span><span>Slack & Teams</span>
        </button>

        <div className="fleet-integ-section-label">WORKSPACE</div>
        <button className="fleet-integ-cat">
          <span className="fleet-integ-cat-icon">💻</span><span>Computer</span>
        </button>
      </div>

      {/* Main grid */}
      <div className="fleet-integ-main">
        {sections.length === 0 ? (
          <div className="fleet-integ-empty">
            <span style={{ fontSize: 48 }}>🔌</span>
            <h3>No integrations found</h3>
            <p>Try a different search or category</p>
          </div>
        ) : (
          sections.map(section => (
            <div key={section.key} className="fleet-integ-group">
              <div className="fleet-integ-group-header">
                <span className="fleet-integ-group-icon">{section.icon || '⚙️'}</span>
                <span className="fleet-integ-group-label">{section.label}</span>
              </div>
              <div className="fleet-integ-grid">
                {section.items.map(item => (
                  <div key={item.id} className="fleet-integ-card">
                    <div className="fleet-integ-card-icon" style={{ background: `${item.color}18`, color: item.color }}>
                      {item.icon}
                    </div>
                    <div className="fleet-integ-card-info">
                      <div className="fleet-integ-card-name">{item.name}</div>
                      <div className="fleet-integ-card-desc">{item.desc}</div>
                    </div>
                    <button
                      className={`fleet-integ-connect ${connected.has(item.id) ? 'connected' : ''}`}
                      onClick={() => toggleConnect(item.id)}
                    >
                      {connected.has(item.id) ? '✓ Connected' : 'Connect'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}

        <button className="fleet-integ-custom-mcp">
          <span style={{ marginRight: 8 }}>+</span> Custom MCP
        </button>
      </div>
    </div>
  );
}
