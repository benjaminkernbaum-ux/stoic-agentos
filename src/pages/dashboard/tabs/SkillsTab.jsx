import { useState } from 'react';

const CAPABILITIES = [
  { id: 'web-search', name: 'Web Search', icon: '🔍', category: 'Perception', desc: 'Real-time web search with semantic ranking and source validation.', agents: 5, reliability: 98, tier: 'core' },
  { id: 'file-ops', name: 'File Operations', icon: '📁', category: 'Perception', desc: 'Read, write, create, and manage files across connected workspaces.', agents: 3, reliability: 99, tier: 'core' },
  { id: 'api-calls', name: 'API Gateway', icon: '🌐', category: 'Action', desc: 'HTTP requests with auth, rate limiting, retry logic, and response parsing.', agents: 7, reliability: 97, tier: 'core' },
  { id: 'memory-recall', name: 'Memory Recall', icon: '🧠', category: 'Cognition', desc: 'Episodic and semantic memory — recall past interactions and learned context.', agents: 4, reliability: 94, tier: 'core' },
  { id: 'code-exec', name: 'Code Sandbox', icon: '⚡', category: 'Action', desc: 'Execute Python, JavaScript, and shell scripts in a sandboxed environment.', agents: 6, reliability: 96, tier: 'core' },
  { id: 'email-send', name: 'Email', icon: '✉️', category: 'Action', desc: 'Compose, send, and manage emails via Gmail and Outlook.', agents: 2, reliability: 99, tier: 'standard' },
  { id: 'slack-msg', name: 'Slack', icon: '💬', category: 'Action', desc: 'Post messages, create threads, react to messages in Slack.', agents: 3, reliability: 98, tier: 'standard' },
  { id: 'db-query', name: 'SQL Query', icon: '🗄️', category: 'Perception', desc: 'Run SQL queries against PostgreSQL, MySQL, and BigQuery.', agents: 4, reliability: 95, tier: 'standard' },
  { id: 'doc-parse', name: 'Doc Parser', icon: '📄', category: 'Perception', desc: 'Extract text, tables, and metadata from PDFs, Word docs, spreadsheets.', agents: 2, reliability: 92, tier: 'standard' },
  { id: 'vector-search', name: 'Vector Search', icon: '🔮', category: 'Cognition', desc: 'Semantic similarity search across embedded documents and knowledge bases.', agents: 5, reliability: 96, tier: 'core' },
  { id: 'scheduling', name: 'Scheduler', icon: '⏰', category: 'Action', desc: 'Create and manage calendar events and automated recurring schedules.', agents: 1, reliability: 99, tier: 'standard' },
  { id: 'screenshot', name: 'Visual Capture', icon: '📸', category: 'Perception', desc: 'Capture screenshots of web pages and UIs for visual analysis.', agents: 1, reliability: 88, tier: 'experimental' },
  { id: 'reasoning', name: 'Chain-of-Thought', icon: '🔗', category: 'Cognition', desc: 'Multi-step reasoning with verification and self-correction loops.', agents: 6, reliability: 91, tier: 'core' },
  { id: 'planning', name: 'Task Planner', icon: '🗺️', category: 'Cognition', desc: 'Break complex goals into sub-tasks, manage dependencies, track progress.', agents: 4, reliability: 93, tier: 'core' },
];

const CATEGORIES = ['All', 'Perception', 'Cognition', 'Action'];

const TIER_STYLES = {
  core: { color: '#a78bfa', bg: 'rgba(167,139,250,0.12)', label: 'CORE' },
  standard: { color: '#60a5fa', bg: 'rgba(96,165,250,0.12)', label: 'STANDARD' },
  experimental: { color: '#fbbf24', bg: 'rgba(251,191,36,0.12)', label: 'EXPERIMENTAL' },
};

export default function SkillsTab({ agents = [] }) {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');

  // Compute real agent counts per capability
  const capabilities = CAPABILITIES.map(cap => {
    const count = agents.filter(a => {
      const mod = (a.module || '').toLowerCase();
      const tags = a.metadata?.tags?.map(t => t.toLowerCase()) || [];
      return mod === cap.category.toLowerCase() || mod === cap.id.toLowerCase() || tags.includes(cap.id.toLowerCase()) || tags.includes(cap.category.toLowerCase());
    }).length;
    return { ...cap, agents: count };
  });

  const filtered = capabilities.filter(s => {
    const matchCat = category === 'All' || s.category === category;
    const matchSearch = !search ||
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.desc.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  const totalAgents = agents.length;
  const avgReliability = Math.round(capabilities.reduce((sum, s) => sum + s.reliability, 0) / capabilities.length);

  return (
    <div className="dash-content">
      {/* Header */}
      <div className="cap-header">
        <div>
          <h2 className="cap-title">🧩 Capabilities</h2>
          <p className="cap-subtitle">The skills your agents can use — organized by cognitive function</p>
        </div>
        <div className="cap-header-stats">
          <div className="cap-stat-pill">
            <span className="cap-stat-value">{CAPABILITIES.length}</span>
            <span className="cap-stat-label">Skills</span>
          </div>
          <div className="cap-stat-pill">
            <span className="cap-stat-value">{totalAgents}</span>
            <span className="cap-stat-label">Connections</span>
          </div>
          <div className="cap-stat-pill">
            <span className="cap-stat-value">{avgReliability}%</span>
            <span className="cap-stat-label">Avg Reliability</span>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="cap-filters">
        <input
          className="cap-search"
          placeholder="Search capabilities..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <div className="cap-chips">
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              className={`cap-chip ${category === cat ? 'active' : ''}`}
              onClick={() => setCategory(cat)}
            >{cat === 'All' ? '📦 All' : cat === 'Perception' ? '👁️ Perception' : cat === 'Cognition' ? '🧠 Cognition' : '⚡ Action'}</button>
          ))}
        </div>
      </div>

      {/* Grid */}
      <div className="cap-grid">
        {filtered.map(skill => {
          const tier = TIER_STYLES[skill.tier];
          return (
            <div key={skill.id} className="cap-card">
              <div className="cap-card-top">
                <span className="cap-card-icon">{skill.icon}</span>
                <span className="cap-card-tier" style={{ color: tier.color, background: tier.bg }}>
                  {tier.label}
                </span>
              </div>
              <h4 className="cap-card-name">{skill.name}</h4>
              <span className="cap-card-category">{skill.category}</span>
              <p className="cap-card-desc">{skill.desc}</p>
              {/* Reliability bar */}
              <div className="cap-card-reliability">
                <div className="cap-card-reliability-header">
                  <span>Reliability</span>
                  <span className="cap-card-reliability-val">{skill.reliability}%</span>
                </div>
                <div className="cap-card-reliability-bar">
                  <div
                    className="cap-card-reliability-fill"
                    style={{
                      width: `${skill.reliability}%`,
                      background: skill.reliability >= 95 ? '#22c55e' : skill.reliability >= 90 ? '#f59e0b' : '#ef4444'
                    }}
                  />
                </div>
              </div>
              <div className="cap-card-footer">
                <span className="cap-card-agents">
                  <span className="cap-card-agent-dot" />
                  {skill.agents} agent{skill.agents !== 1 ? 's' : ''}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="cap-empty">
          <span style={{ fontSize: 48 }}>🧩</span>
          <h3>No capabilities found</h3>
          <p>Adjust your search or category filter</p>
        </div>
      )}
    </div>
  );
}
