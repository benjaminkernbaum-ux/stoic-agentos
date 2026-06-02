import { useState } from 'react';

const SKILLS = [
  { id: 'web-search', name: 'Web Search', icon: '🔍', category: 'Tools', desc: 'Search the web for real-time information, news, and documentation using semantic search.', agents: 5, status: 'active' },
  { id: 'file-ops', name: 'File Operations', icon: '📁', category: 'Tools', desc: 'Read, write, create, and manage files across connected workspaces and storage services.', agents: 3, status: 'active' },
  { id: 'api-calls', name: 'API Calls', icon: '🌐', category: 'Tools', desc: 'Make HTTP requests to external APIs with authentication, rate limiting, and retry logic.', agents: 7, status: 'active' },
  { id: 'memory-recall', name: 'Memory Recall', icon: '🧠', category: 'Knowledge', desc: 'Access episodic and semantic memory to recall past interactions, decisions, and learned context.', agents: 4, status: 'active' },
  { id: 'code-exec', name: 'Code Execution', icon: '⚡', category: 'Actions', desc: 'Execute Python, JavaScript, and shell scripts in a sandboxed environment with resource limits.', agents: 6, status: 'active' },
  { id: 'email-send', name: 'Email', icon: '✉️', category: 'Actions', desc: 'Compose, send, and manage emails via Gmail and Outlook integrations with template support.', agents: 2, status: 'active' },
  { id: 'slack-msg', name: 'Slack Messaging', icon: '💬', category: 'Actions', desc: 'Post messages, create threads, react to messages, and manage Slack channel interactions.', agents: 3, status: 'active' },
  { id: 'db-query', name: 'Database Query', icon: '🗄️', category: 'Tools', desc: 'Run SQL queries against PostgreSQL, MySQL, and BigQuery with result formatting and pagination.', agents: 4, status: 'active' },
  { id: 'doc-parse', name: 'Document Parser', icon: '📄', category: 'Knowledge', desc: 'Extract text, tables, and metadata from PDFs, Word documents, and spreadsheets.', agents: 2, status: 'active' },
  { id: 'vector-search', name: 'Vector Search', icon: '🔮', category: 'Knowledge', desc: 'Perform semantic similarity search across embedded documents and knowledge bases.', agents: 5, status: 'active' },
  { id: 'scheduling', name: 'Scheduling', icon: '⏰', category: 'Actions', desc: 'Create, modify, and manage calendar events and automated recurring schedules.', agents: 1, status: 'active' },
  { id: 'screenshot', name: 'Screenshot Capture', icon: '📸', category: 'Tools', desc: 'Capture screenshots of web pages, dashboards, and UIs for visual analysis and reporting.', agents: 1, status: 'beta' },
];

const CATEGORIES = ['All', 'Tools', 'Knowledge', 'Actions'];

export default function SkillsTab() {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');

  const filtered = SKILLS.filter(s => {
    const matchCat = category === 'All' || s.category === category;
    const matchSearch = !search ||
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.desc.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  const totalAgents = SKILLS.reduce((sum, s) => sum + s.agents, 0);

  return (
    <div className="dash-content">
      {/* Header */}
      <div className="fleet-section-header">
        <div>
          <h2 className="fleet-section-title">🧩 Skills Library</h2>
          <p className="fleet-section-sub">{SKILLS.length} skills available · {totalAgents} agent connections</p>
        </div>
      </div>

      {/* Filters */}
      <div className="fleet-filter-bar">
        <input
          className="fleet-filter-search"
          placeholder="Search skills..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <div className="fleet-filter-chips">
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              className={`fleet-filter-chip ${category === cat ? 'active' : ''}`}
              onClick={() => setCategory(cat)}
            >{cat}</button>
          ))}
        </div>
      </div>

      {/* Grid */}
      <div className="fleet-skills-grid">
        {filtered.map(skill => (
          <div key={skill.id} className="fleet-skill-card">
            <div className="fleet-skill-card-top">
              <span className="fleet-skill-icon">{skill.icon}</span>
              {skill.status === 'beta' && (
                <span className="fleet-skill-beta">BETA</span>
              )}
            </div>
            <h4 className="fleet-skill-name">{skill.name}</h4>
            <p className="fleet-skill-desc">{skill.desc}</p>
            <div className="fleet-skill-footer">
              <span className="fleet-skill-cat">{skill.category}</span>
              <span className="fleet-skill-agents">
                <span className="fleet-skill-agent-dot" />
                {skill.agents} agent{skill.agents !== 1 ? 's' : ''}
              </span>
            </div>
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="fleet-empty-center">
          <span style={{ fontSize: 48 }}>🧩</span>
          <h3>No skills found</h3>
          <p>Try adjusting your search or category filter</p>
        </div>
      )}
    </div>
  );
}
