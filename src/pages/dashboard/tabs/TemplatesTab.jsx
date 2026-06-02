import { useState } from 'react';

const TEMPLATES = [
  { id: 'code-reviewer', name: 'Code Reviewer', icon: '🔍', category: 'DevOps', desc: 'Automatically reviews pull requests, identifies bugs, security vulnerabilities, and suggests improvements. Integrates with GitHub and GitLab.', tags: ['GitHub', 'Code Quality'], popularity: 94 },
  { id: 'slack-responder', name: 'Slack Responder', icon: '💬', category: 'Communication', desc: 'Monitors Slack channels and responds to questions using your knowledge base. Handles FAQs, onboarding questions, and escalations.', tags: ['Slack', 'Support'], popularity: 88 },
  { id: 'data-pipeline', name: 'Data Pipeline Agent', icon: '📊', category: 'Data', desc: 'Orchestrates ETL pipelines, monitors data quality, and alerts on anomalies. Connects to BigQuery, Snowflake, and PostgreSQL.', tags: ['ETL', 'Analytics'], popularity: 82 },
  { id: 'research-assistant', name: 'Research Assistant', icon: '🔬', category: 'Research', desc: 'Searches the web, summarizes papers, and compiles research reports. Uses semantic search for highly relevant results.', tags: ['Web Search', 'Summarization'], popularity: 91 },
  { id: 'email-drafter', name: 'Email Drafter', icon: '✉️', category: 'Communication', desc: 'Drafts professional emails based on context, handles follow-ups, and manages email templates. Works with Gmail and Outlook.', tags: ['Gmail', 'Outlook'], popularity: 76 },
  { id: 'ci-monitor', name: 'CI/CD Monitor', icon: '🚀', category: 'DevOps', desc: 'Monitors CI/CD pipelines, reports build failures, and auto-retries flaky tests. Integrates with GitHub Actions and Vercel.', tags: ['CI/CD', 'Deployments'], popularity: 85 },
  { id: 'customer-support', name: 'Customer Support', icon: '🎧', category: 'Communication', desc: 'Triages support tickets, suggests responses from knowledge base, and escalates complex issues to human agents.', tags: ['Tickets', 'Knowledge Base'], popularity: 79 },
  { id: 'doc-writer', name: 'Documentation Writer', icon: '📖', category: 'Research', desc: 'Generates and maintains technical documentation from code, API specs, and architecture decisions. Keeps docs in sync.', tags: ['Docs', 'Markdown'], popularity: 73 },
  { id: 'security-scanner', name: 'Security Scanner', icon: '🛡️', category: 'DevOps', desc: 'Scans codebases for vulnerabilities, outdated dependencies, and security misconfigurations. Reports with severity levels.', tags: ['Security', 'Audit'], popularity: 87 },
  { id: 'meeting-summarizer', name: 'Meeting Summarizer', icon: '📝', category: 'Automation', desc: 'Joins meetings, transcribes conversations, extracts action items, and distributes summaries to attendees.', tags: ['Calendar', 'Notes'], popularity: 80 },
  { id: 'competitor-tracker', name: 'Competitor Tracker', icon: '📡', category: 'Research', desc: 'Monitors competitor websites, pricing changes, product launches, and social media activity. Weekly digest reports.', tags: ['Web Monitoring', 'Reports'], popularity: 71 },
  { id: 'onboarding-guide', name: 'Onboarding Guide', icon: '🎓', category: 'Automation', desc: 'Walks new team members through setup, assigns tasks, answers questions, and tracks onboarding progress.', tags: ['HR', 'Onboarding'], popularity: 68 },
];

const CATEGORIES = ['All', 'DevOps', 'Communication', 'Data', 'Research', 'Automation'];

export default function TemplatesTab({ setActiveTab }) {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [selectedId, setSelectedId] = useState(null);

  const filtered = TEMPLATES.filter(t => {
    const matchCat = category === 'All' || t.category === category;
    const matchSearch = !search ||
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.desc.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  const selected = TEMPLATES.find(t => t.id === selectedId);

  return (
    <div className="dash-content">
      {/* Header */}
      <div className="fleet-section-header">
        <div>
          <h2 className="fleet-section-title">📋 Agent Templates</h2>
          <p className="fleet-section-sub">Start from a proven blueprint — customize to fit your workflow</p>
        </div>
      </div>

      {/* Filters */}
      <div className="fleet-filter-bar">
        <input
          className="fleet-filter-search"
          placeholder="Search templates..."
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
      <div className="fleet-template-grid">
        {filtered.map(t => (
          <div
            key={t.id}
            className={`fleet-template-card ${selectedId === t.id ? 'selected' : ''}`}
            onClick={() => setSelectedId(t.id === selectedId ? null : t.id)}
          >
            <div className="fleet-template-card-top">
              <span className="fleet-template-icon">{t.icon}</span>
              <div className="fleet-template-popularity">
                <div className="fleet-template-pop-bar">
                  <div className="fleet-template-pop-fill" style={{ width: `${t.popularity}%` }} />
                </div>
                <span className="fleet-template-pop-val">{t.popularity}%</span>
              </div>
            </div>
            <h4 className="fleet-template-name">{t.name}</h4>
            <p className="fleet-template-desc">{t.desc}</p>
            <div className="fleet-template-tags">
              {t.tags.map(tag => (
                <span key={tag} className="fleet-template-tag">{tag}</span>
              ))}
            </div>
            <div className="fleet-template-footer">
              <span className="fleet-template-cat">{t.category}</span>
              <button className="fleet-template-use" onClick={(e) => { e.stopPropagation(); }}>
                Use Template
              </button>
            </div>
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="fleet-empty-center">
          <span style={{ fontSize: 48 }}>📋</span>
          <h3>No templates found</h3>
          <p>Try adjusting your search or category filter</p>
        </div>
      )}
    </div>
  );
}
