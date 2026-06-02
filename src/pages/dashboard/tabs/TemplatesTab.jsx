import { useState } from 'react';
import { supabase, API_BASE } from '../../../lib/supabase';

const BLUEPRINTS = [
  { id: 'code-reviewer', name: 'Code Reviewer', icon: '🔍', category: 'DevOps', desc: 'Automatically reviews pull requests, identifies bugs, security vulnerabilities, and suggests improvements.', tags: ['GitHub', 'Code Quality'], popularity: 94, complexity: 'intermediate', setupTime: '5 min', featured: true },
  { id: 'slack-responder', name: 'Slack Responder', icon: '💬', category: 'Communication', desc: 'Monitors Slack channels and responds to questions using your knowledge base. Handles FAQs and escalations.', tags: ['Slack', 'Support'], popularity: 88, complexity: 'beginner', setupTime: '3 min', featured: true },
  { id: 'data-pipeline', name: 'Data Pipeline', icon: '📊', category: 'Data', desc: 'Orchestrates ETL pipelines, monitors data quality, and alerts on anomalies. BigQuery, Snowflake, PostgreSQL.', tags: ['ETL', 'Analytics'], popularity: 82, complexity: 'advanced', setupTime: '15 min', featured: false },
  { id: 'research-assistant', name: 'Research Assistant', icon: '🔬', category: 'Research', desc: 'Searches the web, summarizes papers, and compiles research reports with semantic search.', tags: ['Web Search', 'Summarization'], popularity: 91, complexity: 'beginner', setupTime: '2 min', featured: true },
  { id: 'email-drafter', name: 'Email Drafter', icon: '✉️', category: 'Communication', desc: 'Drafts professional emails, handles follow-ups, and manages templates. Gmail and Outlook.', tags: ['Gmail', 'Outlook'], popularity: 76, complexity: 'beginner', setupTime: '3 min', featured: false },
  { id: 'ci-monitor', name: 'CI/CD Monitor', icon: '🚀', category: 'DevOps', desc: 'Monitors CI/CD pipelines, reports build failures, auto-retries flaky tests. GitHub Actions + Vercel.', tags: ['CI/CD', 'Deployments'], popularity: 85, complexity: 'intermediate', setupTime: '8 min', featured: false },
  { id: 'customer-support', name: 'Customer Support', icon: '🎧', category: 'Communication', desc: 'Triages support tickets, suggests responses from knowledge base, escalates complex issues.', tags: ['Tickets', 'Knowledge Base'], popularity: 79, complexity: 'intermediate', setupTime: '10 min', featured: false },
  { id: 'doc-writer', name: 'Doc Writer', icon: '📖', category: 'Research', desc: 'Generates and maintains technical documentation from code, API specs, and architecture decisions.', tags: ['Docs', 'Markdown'], popularity: 73, complexity: 'beginner', setupTime: '4 min', featured: false },
  { id: 'security-scanner', name: 'Security Scanner', icon: '🛡️', category: 'DevOps', desc: 'Scans codebases for vulnerabilities, outdated dependencies, and security misconfigs.', tags: ['Security', 'Audit'], popularity: 87, complexity: 'advanced', setupTime: '12 min', featured: true },
  { id: 'meeting-summarizer', name: 'Meeting Notes', icon: '📝', category: 'Automation', desc: 'Joins meetings, transcribes conversations, extracts action items, distributes summaries.', tags: ['Calendar', 'Notes'], popularity: 80, complexity: 'intermediate', setupTime: '5 min', featured: false },
  { id: 'competitor-tracker', name: 'Competitor Intel', icon: '📡', category: 'Research', desc: 'Monitors competitor websites, pricing changes, product launches, and social media.', tags: ['Monitoring', 'Reports'], popularity: 71, complexity: 'intermediate', setupTime: '8 min', featured: false },
  { id: 'onboarding-guide', name: 'Onboarding Agent', icon: '🎓', category: 'Automation', desc: 'Walks new team members through setup, assigns tasks, answers questions, tracks progress.', tags: ['HR', 'Onboarding'], popularity: 68, complexity: 'beginner', setupTime: '6 min', featured: false },
];

const CATEGORIES = ['All', 'DevOps', 'Communication', 'Data', 'Research', 'Automation'];

const COMPLEXITY_STYLES = {
  beginner: { color: '#22c55e', label: '● Easy' },
  intermediate: { color: '#f59e0b', label: '●● Medium' },
  advanced: { color: '#ef4444', label: '●●● Advanced' },
};

export default function TemplatesTab({ org, toast, onAgentCreated }) {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [deploying, setDeploying] = useState(null);
  const [deployed, setDeployed] = useState(new Set());

  const handleDeploy = async (bp) => {
    try {
      setDeploying(bp.id);
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      const res = await fetch(`${API_BASE}/api/v1/agents?org_id=${org?.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          name: bp.name,
          module: bp.category,
          description: bp.desc,
          status: 'idle',
          metadata: { blueprint_id: bp.id, tags: bp.tags },
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      setDeployed(prev => new Set(prev).add(bp.id));
      toast?.(`✨ ${bp.name} deployed successfully`, 'success');
      onAgentCreated?.();
    } catch (err) {
      toast?.(`Deploy failed: ${err.message}`, 'error');
    } finally {
      setDeploying(null);
    }
  };

  const filtered = BLUEPRINTS.filter(t => {
    const matchCat = category === 'All' || t.category === category;
    const matchSearch = !search ||
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.desc.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  const featured = filtered.filter(t => t.featured);
  const rest = filtered.filter(t => !t.featured);

  return (
    <div className="dash-content">
      {/* Header */}
      <div className="bp-header">
        <div>
          <h2 className="bp-title">🧬 Agent Blueprints</h2>
          <p className="bp-subtitle">Battle-tested agent configurations — deploy in minutes, customize forever</p>
        </div>
        <div className="bp-header-stats">
          <span className="bp-header-stat">{BLUEPRINTS.length} blueprints</span>
          <span className="bp-header-stat">{CATEGORIES.length - 1} categories</span>
        </div>
      </div>

      {/* Filters */}
      <div className="bp-filters">
        <input
          className="bp-search"
          placeholder="Search blueprints..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <div className="bp-chips">
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              className={`bp-chip ${category === cat ? 'active' : ''}`}
              onClick={() => setCategory(cat)}
            >{cat}</button>
          ))}
        </div>
      </div>

      {/* Featured row */}
      {featured.length > 0 && (
        <div className="bp-featured-section">
          <h3 className="bp-section-label">⭐ Featured</h3>
          <div className="bp-featured-row">
            {featured.map(bp => (
              <div key={bp.id} className="bp-card featured">
                <div className="bp-card-featured-badge">FEATURED</div>
                <div className="bp-card-top">
                  <span className="bp-card-icon">{bp.icon}</span>
                  <span className="bp-card-complexity" style={{ color: COMPLEXITY_STYLES[bp.complexity].color }}>
                    {COMPLEXITY_STYLES[bp.complexity].label}
                  </span>
                </div>
                <h4 className="bp-card-name">{bp.name}</h4>
                <p className="bp-card-desc">{bp.desc}</p>
                <div className="bp-card-meta">
                  <div className="bp-card-tags">
                    {bp.tags.map(tag => <span key={tag} className="bp-card-tag">{tag}</span>)}
                  </div>
                </div>
                <div className="bp-card-footer">
                  <span className="bp-card-setup">⏱ {bp.setupTime}</span>
                  <div className="bp-card-pop">
                    <div className="bp-card-pop-bar"><div className="bp-card-pop-fill" style={{ width: `${bp.popularity}%` }} /></div>
                    <span className="bp-card-pop-val">{bp.popularity}%</span>
                  </div>
                  <button
                    className={`bp-card-deploy${deployed.has(bp.id) ? ' deployed' : ''}`}
                    disabled={deploying === bp.id || deployed.has(bp.id)}
                    onClick={() => handleDeploy(bp)}
                  >{deployed.has(bp.id) ? '✓ Deployed' : deploying === bp.id ? '⏳ Deploying…' : 'Deploy →'}</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Rest grid */}
      {rest.length > 0 && (
        <div className="bp-grid-section">
          <h3 className="bp-section-label">📦 All Blueprints</h3>
          <div className="bp-grid">
            {rest.map(bp => (
              <div key={bp.id} className="bp-card">
                <div className="bp-card-top">
                  <span className="bp-card-icon">{bp.icon}</span>
                  <span className="bp-card-complexity" style={{ color: COMPLEXITY_STYLES[bp.complexity].color }}>
                    {COMPLEXITY_STYLES[bp.complexity].label}
                  </span>
                </div>
                <h4 className="bp-card-name">{bp.name}</h4>
                <p className="bp-card-desc">{bp.desc}</p>
                <div className="bp-card-meta">
                  <div className="bp-card-tags">
                    {bp.tags.map(tag => <span key={tag} className="bp-card-tag">{tag}</span>)}
                  </div>
                </div>
                <div className="bp-card-footer">
                  <span className="bp-card-setup">⏱ {bp.setupTime}</span>
                  <div className="bp-card-pop">
                    <div className="bp-card-pop-bar"><div className="bp-card-pop-fill" style={{ width: `${bp.popularity}%` }} /></div>
                    <span className="bp-card-pop-val">{bp.popularity}%</span>
                  </div>
                  <button
                    className={`bp-card-deploy${deployed.has(bp.id) ? ' deployed' : ''}`}
                    disabled={deploying === bp.id || deployed.has(bp.id)}
                    onClick={() => handleDeploy(bp)}
                  >{deployed.has(bp.id) ? '✓ Deployed' : deploying === bp.id ? '⏳ Deploying…' : 'Deploy →'}</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {filtered.length === 0 && (
        <div className="bp-empty">
          <span style={{ fontSize: 48 }}>🧬</span>
          <h3>No blueprints found</h3>
          <p>Adjust your search or category filter</p>
        </div>
      )}
    </div>
  );
}
