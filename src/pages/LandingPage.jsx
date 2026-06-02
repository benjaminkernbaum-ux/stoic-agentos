import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './LandingPage.css';
import InfraSimulation from '../components/InfraSimulation';
import NeuralHeroCanvas from '../components/NeuralHeroCanvas';
import ParticleMesh from '../components/ParticleMesh';
import AnimatedCounter from '../components/AnimatedCounter';
import MarketConsolidation from '../components/MarketConsolidation';
import PricingCalculator from '../components/PricingCalculator';
import WaitlistCapture from '../components/WaitlistCapture';

const NAV_LINKS = ['Features', 'Ecosystem', 'SDK', 'Pricing', 'Docs'];

const FEATURES = [
  { icon: '🤖', color: 'rgba(155,89,255,0.12)', title: 'Agent Fleet Monitoring', desc: 'Track 100+ AI agents across departments. Real-time status, execution history, and performance metrics in one dashboard.' },
  { icon: '🧠', color: 'rgba(77,124,255,0.12)', title: 'Knowledge Brain', desc: 'Persistent memory across all AI sessions. Auto-capture decisions, discoveries, and architectural changes. Never lose context again.' },
  { icon: '🕸️', color: 'rgba(0,212,255,0.12)', title: 'Knowledge Graph', desc: 'Interactive force-directed visualization of your codebase relationships. See how agents, files, and workflows connect.' },
  { icon: '📦', color: 'rgba(0,230,138,0.12)', title: 'Multi-Workspace', desc: 'Manage 50+ repos from a single pane of glass. Git status, branches, dirty files, and context routing across projects.' },
  { icon: '⚡', color: 'rgba(255,159,67,0.12)', title: 'Auto-Capture Hooks', desc: 'Git post-commit hooks auto-log every change. Scheduled brain refresh keeps knowledge items fresh without manual work.' },
  { icon: '🔧', color: 'rgba(255,107,157,0.12)', title: 'SDK & API Access', desc: 'npm install stoic-agentos-sdk — wrap any agent in 3 lines of code. Full REST API with API key management and webhook integrations.' },
];

const PRICING = [
  { name: 'Free', desc: 'For solo developers', price: '$0', period: '', features: ['2 workspaces', '5 agents', '10,000 obs/mo', '5 knowledge items', '3 git hook repos', '1 member', 'Community support'], disabled: ['Knowledge Graph', 'Trace Timeline', 'SSO/SAML'], cta: 'Get Started Free', style: 'default' },
  { name: 'Pro', desc: 'For power users', price: '$29', period: '/mo', features: ['10 workspaces', '25 agents', '100,000 obs/mo', '25 knowledge items', '15 git hook repos', '5 team members', 'Knowledge Graph', 'Trace Timeline', 'Full API access', 'Email support (48h)'], disabled: ['SSO/SAML'], cta: 'Start 14-Day Trial', style: 'featured' },
  { name: 'Team', desc: 'For growing teams', price: '$79', period: '/mo', features: ['Unlimited workspaces', '100 agents', 'Unlimited observations', 'Unlimited knowledge items', 'Unlimited git hooks', '15 team members', 'Knowledge Graph', 'Trace Timeline', 'Full API access', 'Priority support (4h)'], disabled: ['SSO/SAML'], cta: 'Start 14-Day Trial', style: 'default' },
  { name: 'Enterprise', desc: 'For organizations', price: 'Custom', period: '', features: ['Everything in Team', 'Unlimited agents', 'Unlimited observations', 'Unlimited members', 'SSO/SAML', 'Self-hosted (coming soon)', 'Custom integrations', 'Dedicated CSM', 'SLA guarantee', 'Audit logs'], disabled: [], cta: 'Contact Sales', style: 'default' },
];

const COMPARE = [
  { feature: 'Agent Fleet Monitoring', us: '✅', langsmith: '✅', langfuse: '✅', braintrust: '✅', agentops: '🟡' },
  { feature: 'Three-Tier Memory System', us: '✅', langsmith: '❌', langfuse: '❌', braintrust: '❌', agentops: '❌' },
  { feature: 'Knowledge Graph', us: '✅', langsmith: '❌', langfuse: '❌', braintrust: '❌', agentops: '❌' },
  { feature: 'Multi-Repo Workspace', us: '✅', langsmith: '❌', langfuse: '❌', braintrust: '❌', agentops: '❌' },
  { feature: 'Eval Framework', us: '🟡', langsmith: '✅', langfuse: '✅', braintrust: '✅', agentops: '🟡' },
  { feature: 'Compliance & Audit Log', us: '✅', langsmith: '❌', langfuse: '❌', braintrust: '❌', agentops: '❌' },
  { feature: 'AI Chat (Claude-Powered)', us: '✅', langsmith: '❌', langfuse: '❌', braintrust: '❌', agentops: '❌' },
  { feature: 'Circuit Breakers', us: '✅', langsmith: '❌', langfuse: '❌', braintrust: '❌', agentops: '❌' },
  { feature: 'Open-Source Core', us: '✅', langsmith: '❌', langfuse: '✅', braintrust: '❌', agentops: '✅' },
];

const ECOSYSTEM = [
  {
    icon: '📊', name: 'StoicCRM Growth', tagline: 'AI-Powered Sales Command Center',
    desc: 'Autonomous sales agents running lead scoring, outreach sequences, and pipeline analytics. The first fleet built on AgentOS.',
    url: 'https://stoicagentos.com/dashboard', badge: 'Live',
    gradient: 'linear-gradient(135deg, rgba(155,89,255,0.15), rgba(77,124,255,0.08))', border: 'rgba(155,89,255,0.25)',
  },
  {
    icon: '🧠', name: 'Command Center', tagline: 'Second Brain for Agent Fleets',
    desc: '26 agents, 5 workspaces, knowledge graph, three-tier memory engine, compliance audit. The orchestration hub that connects everything.',
    url: 'https://stoicagentos.com/dashboard', badge: 'Live',
    gradient: 'linear-gradient(135deg, rgba(0,212,255,0.15), rgba(0,230,138,0.08))', border: 'rgba(0,212,255,0.25)',
  },
  {
    icon: '🎬', name: 'Fetok Autoposter', tagline: 'Cinematic Content Automation',
    desc: 'Autonomous TikTok pipeline: FFmpeg rendering + TTS narration + OBS streaming. 100K+ views generated by AI agents.',
    url: 'https://github.com/benjaminkernbaum-ux', badge: 'Open Source',
    gradient: 'linear-gradient(135deg, rgba(255,107,157,0.15), rgba(255,159,67,0.08))', border: 'rgba(255,107,157,0.25)',
  },
];


/* ─── TECHNICAL FEATURE GRID (ENTERPRISE) ─── */
const TECH_FEATURES = [
  { icon: '🧠', title: 'RC-TCF Cognitive Architecture', desc: 'Proprietary context window management preventing hallucination cascades. Deterministic routing for complex agentic workflows.' },
  { icon: '🗄️', title: 'Three-Tier Memory System', desc: 'Working, Episodic, and Semantic memory persistence. Agents retrieve past learnings seamlessly across independent sessions.' },
  { icon: '🛡️', title: 'Enterprise Compliance Module', desc: 'Immutable audit logs, token circuit breakers, and RBAC governance. SOC 2 Type II and HIPAA ready architecture.' },
];

/* ─── WHY I BUILT THIS ─── */
const FOUNDER_STORY = [
  {
    icon: '🚀',
    color: '#9b59ff',
    title: 'The Origin',
    text: 'I was managing 26 AI agents across 5 workspaces — content writers, code reviewers, data pipelines — with zero visibility into what they were doing, deciding, or breaking.',
  },
  {
    icon: '🧠',
    color: '#4d7cff',
    title: 'The Problem',
    text: 'Every time an agent made a decision, that context was lost. Every error was a surprise. Switching between dashboards, logs, and Slack alerts was killing my productivity.',
  },
  {
    icon: '⚡',
    color: '#00e68a',
    title: 'The Solution',
    text: 'So I built AgentOS — one command center for the entire fleet. Three-tier memory, compliance audit logs, Claude-powered AI chat, and a real-time dashboard. Now shipping it for every team that runs AI agents.',
  },
];

const LOGOS = [
  { name: 'Anthropic', icon: '◆' },
  { name: 'Claude AI', icon: '🧠' },
  { name: 'Vercel', icon: '▲' },
  { name: 'Supabase', icon: '⚡' },
  { name: 'Railway', icon: '🚂' },
  { name: 'Stripe', icon: '💳' },
  { name: 'React 19', icon: '⚛️' },
  { name: 'TypeScript', icon: '📘' },
];

/* ─── REAL PRODUCTION AGENTS ─── */
const DEMO_AGENTS = [
  { name: 'production-monitor', status: 'running', module: 'infra', runs: 1243 },
  { name: 'content-writer', status: 'running', module: 'content', runs: 892 },
  { name: 'code-reviewer', status: 'running', module: 'devtools', runs: 567 },
  { name: 'data-pipeline', status: 'running', module: 'pipeline', runs: 334 },
  { name: 'customer-support', status: 'running', module: 'support', runs: 201 },
  { name: 'lead-scorer', status: 'running', module: 'sales', runs: 1087 },
];

const DEMO_ACTIVITY = [
  { type: 'decision', title: 'Switched to batch processing for large datasets', time: '2m ago', icon: '🧭' },
  { type: 'deployment', title: 'Deployed v2.4.1 to production', time: '5m ago', icon: '🚀' },
  { type: 'discovery', title: 'Found 23% cost reduction in token usage', time: '12m ago', icon: '💡' },
  { type: 'git_commit', title: 'feat: add webhook retry logic', time: '18m ago', icon: '📝' },
  { type: 'architecture', title: 'Migrated to event-driven pipeline', time: '24m ago', icon: '🏗️' },
];

/* ═══════════════════════════════════════════
   SCROLL REVEAL HOOK
   ═══════════════════════════════════════════ */
function useScrollReveal() {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            // Reveal all children with .section-reveal
            e.target.querySelectorAll('.section-reveal').forEach((child, i) => {
              setTimeout(() => child.classList.add('visible'), i * 100);
            });
            // Also reveal self if it has the class
            if (e.target.classList.contains('section-reveal')) {
              e.target.classList.add('visible');
            }
          }
        });
      },
      { threshold: 0.1 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return ref;
}

/* ═══════════════════════════════════════════
   LIVE DASHBOARD PREVIEW COMPONENT
   ═══════════════════════════════════════════ */
function LiveDashboardPreview() {
  const [activeTab, setActiveTab] = useState('Overview');
  const [userInteracted, setUserInteracted] = useState(false);
  const [activeAgentIndex, setActiveAgentIndex] = useState(0);
  const [pulse, setPulse] = useState(false);
  const [tickTime, setTickTime] = useState(0);
  const [brainSearch, setBrainSearch] = useState('');
  const [selectedGraphNode, setSelectedGraphNode] = useState('lead-scorer');

  // React state for agents to allow dynamic pausing & ticking runs!
  const [agentsList, setAgentsList] = useState([
    { name: 'production-monitor', status: 'running', module: 'infra', runs: 1243, role: 'Infrastructure SRE', queue: '0 pending', sla: '99.98%' },
    { name: 'content-writer', status: 'running', module: 'content', runs: 892, role: 'Launch Content Engine', queue: '1 generating', sla: '99.5%' },
    { name: 'code-reviewer', status: 'running', module: 'devtools', runs: 567, role: 'Auto PR Auditor', queue: '0 pending', sla: '99.9%' },
    { name: 'data-pipeline', status: 'running', module: 'pipeline', runs: 334, role: 'Vector DB Aggregator', queue: '12 batching', sla: '98.8%' },
    { name: 'customer-support', status: 'running', module: 'support', runs: 201, role: 'L1 Helpdesk Agent', queue: '2 in queue', sla: '97.2%' },
    { name: 'lead-scorer', status: 'running', module: 'sales', runs: 1087, role: 'Sales Intent Scorer', queue: '4 scoring', sla: '99.1%' },
  ]);

  // React state for scrollable logs feed
  const [logsList, setLogsList] = useState([
    { type: 'decision', title: 'Switched to batch processing for large datasets', time: 'Just now', icon: '🧭' },
    { type: 'deployment', title: 'Deployed v2.4.1 to production', time: '3m ago', icon: '🚀' },
    { type: 'discovery', title: 'Found 23% cost reduction in token usage', time: '8m ago', icon: '💡' },
    { type: 'git_commit', title: 'feat: add webhook retry logic', time: '15m ago', icon: '📝' },
  ]);

  // Brain Tab - Live Scrolling Memories
  const [brainMemories, setBrainMemories] = useState([
    { agent: 'code-reviewer', action: 'analyse_pr', decision: 'Approved PR #412 after security check', confidence: 0.98, time: 'Just now' },
    { agent: 'production-monitor', action: 'ping_check', decision: 'All health pings returned 200 OK within 12ms', confidence: 0.99, time: '4s ago' },
    { agent: 'content-writer', action: 'generate_draft', decision: 'Created draft for Twitter launch campaign', confidence: 0.95, time: '12s ago' },
    { agent: 'data-pipeline', action: 'sync_supabase', decision: 'Sync completed: 124 records updated', confidence: 1.00, time: '20s ago' },
    { agent: 'customer-support', action: 'reply_query', decision: 'Resolved billing query via refunds auxiliary agent', confidence: 0.94, time: '45s ago' }
  ]);

  // Autoplay cycle tabs every 8 seconds unless user clicks
  useEffect(() => {
    if (userInteracted) return;
    const tabInterval = setInterval(() => {
      const tabs = ['Overview', 'Agents', 'Workspaces', 'Brain', 'Graph'];
      setActiveTab(current => {
        const nextIndex = (tabs.indexOf(current) + 1) % tabs.length;
        return tabs[nextIndex];
      });
    }, 8000);
    return () => clearInterval(tabInterval);
  }, [userInteracted]);

  // Active agent highlight cycle (Overview tab only)
  useEffect(() => {
    const cycleAgent = setInterval(() => {
      setActiveAgentIndex(i => (i + 1) % agentsList.length);
      setPulse(true);
      setTimeout(() => setPulse(false), 500);
    }, 3000);
    return () => clearInterval(cycleAgent);
  }, [agentsList.length]);

  // Ticks runs & CPU/RAM values dynamically
  useEffect(() => {
    // Fast tick to animate meters
    const animationFrame = setInterval(() => {
      setTickTime(t => t + 0.1);
    }, 150);

    // Runs counter tick
    const runsInterval = setInterval(() => {
      setAgentsList(prev =>
        prev.map(a =>
          a.status === 'running' && Math.random() > 0.4
            ? { ...a, runs: a.runs + Math.floor(Math.random() * 2) }
            : a
        )
      );
    }, 2500);

    // Dynamic log generator to make feed scroll live!
    const logInterval = setInterval(() => {
      const mockLogs = [
        { type: 'decision', title: 'Optimized routing logic to avoid high latency nodes', icon: '🧭' },
        { type: 'decision', title: 'Switched LLM provider to Claude 3.5 Sonnet to save 40% tokens', icon: '🧠' },
        { type: 'decision', title: 'Throttled requests to Stripe API after hitting rate-limit', icon: '🚦' },
        { type: 'deployment', title: 'Automatic rollback to stable workspace v2.4.0 successful', icon: '🚀' },
        { type: 'discovery', title: 'Aggregated 15 customer feedback vectors into Vector DB', icon: '💡' },
        { type: 'discovery', title: 'Identified 3 dead-loop states in scraper agent queue', icon: '🔍' },
      ];
      const selected = mockLogs[Math.floor(Math.random() * mockLogs.length)];
      setLogsList(prev => [
        { type: selected.type, title: selected.title, time: 'Just now', icon: selected.icon },
        ...prev.map(log => {
          if (log.time === 'Just now') return { ...log, time: '1m ago' };
          if (log.time === '1m ago') return { ...log, time: '4m ago' };
          if (log.time === '3m ago') return { ...log, time: '8m ago' };
          if (log.time === '4m ago') return { ...log, time: '12m ago' };
          if (log.time === '8m ago') return { ...log, time: '15m ago' };
          return { ...log, time: '20m ago' };
        }).slice(0, 5)
      ]);
    }, 5000);

    // Dynamic brain thought generator
    const brainInterval = setInterval(() => {
      const mockMemories = [
        { agent: 'lead-scorer', action: 'score_lead', decision: 'Flagged high-intent lead from enterprise.com', confidence: 0.97 },
        { agent: 'customer-support', action: 'answer_chat', decision: 'Dispatched automated webhook status report', confidence: 0.96 },
        { agent: 'code-reviewer', action: 'audit_git', decision: 'Clean build verified across master branch', confidence: 0.99 },
        { agent: 'data-pipeline', action: 'flush_queue', decision: 'Sync completed: 124 records verified in index', confidence: 1.00 },
      ];
      const selected = mockMemories[Math.floor(Math.random() * mockMemories.length)];
      setBrainMemories(prev => [
        { ...selected, time: 'Just now' },
        ...prev.map(mem => {
          if (mem.time === 'Just now') return { ...mem, time: '5s ago' };
          if (mem.time === '4s ago' || mem.time === '5s ago') return { ...mem, time: '15s ago' };
          if (mem.time === '12s ago' || mem.time === '15s ago') return { ...mem, time: '35s ago' };
          return { ...mem, time: '1m ago' };
        }).slice(0, 7)
      ]);
    }, 4000);

    return () => {
      clearInterval(animationFrame);
      clearInterval(runsInterval);
      clearInterval(logInterval);
      clearInterval(brainInterval);
    };
  }, []);

  const toggleAgentStatus = (index) => {
    setUserInteracted(true);
    setAgentsList(prev =>
      prev.map((a, i) =>
        i === index ? { ...a, status: a.status === 'running' ? 'idle' : 'running' } : a
      )
    );
  };

  const addManualMemory = () => {
    setUserInteracted(true);
    const userMemories = [
      { agent: 'user-override', action: 'manual_trigger', decision: 'Triggered diagnostic check on API gateways', confidence: 1.00 },
      { agent: 'user-override', action: 'kill_process', decision: 'Forced restart of content-writer agent sub-pool', confidence: 0.99 },
      { agent: 'user-override', action: 'inject_cache', decision: 'Pre-warmed observation prefix cache globally', confidence: 0.98 },
    ];
    const selected = userMemories[Math.floor(Math.random() * userMemories.length)];
    setBrainMemories(prev => [
      { ...selected, time: 'Just now' },
      ...prev
    ]);
  };

  const statusColor = { running: '#00e68a', idle: 'rgba(255,255,255,0.25)', success: '#00d4ff', error: '#ff4757' };

  return (
    <div className="preview-frame premium-preview-frame">
      <div className="preview-bar">
        <div className="preview-dot red" />
        <div className="preview-dot yellow" />
        <div className="preview-dot green" />
        <div className="preview-url">
          <span style={{ color: 'var(--accent-purple)', opacity: 0.6 }}>https://</span>
          stoicagentos.com/dashboard
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
          {!userInteracted ? (
            <span className="dp-autoplay-badge">⏱️ Autoplay Mode</span>
          ) : (
            <button className="dp-autoplay-reset" onClick={() => setUserInteracted(false)}>▶ Autoplay</button>
          )}
        </div>
      </div>
      <div className="dashboard-preview">
        {/* Navigation Sidebar */}
        <div className="dp-sidebar">
          <div className="dp-logo">⚡ Stoic OS</div>
          {['Overview', 'Agents', 'Workspaces', 'Brain', 'Graph'].map((item, i) => (
            <button
              key={item}
              className={`dp-nav-item-btn ${activeTab === item ? 'active' : ''}`}
              onClick={() => {
                setActiveTab(item);
                setUserInteracted(true);
              }}
              style={{
                width: '100%',
                textAlign: 'left',
                border: 'none',
                background: 'transparent',
                fontFamily: 'inherit',
                fontSize: '13px',
                padding: '8px 10px',
                borderRadius: '6px',
                color: activeTab === item ? 'var(--text-primary)' : 'var(--text-dim)',
                background: activeTab === item ? 'rgba(155, 89, 255, 0.12)' : 'transparent',
                cursor: 'pointer',
                transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontWeight: activeTab === item ? '600' : '500',
              }}
              onMouseEnter={(e) => {
                if (activeTab !== item) e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
              }}
              onMouseLeave={(e) => {
                if (activeTab !== item) e.currentTarget.style.background = 'transparent';
              }}
            >
              <span style={{ fontSize: '14px' }}>{['📊', '🤖', '📦', '🧠', '🕸️'][i]}</span>
              {item}
            </button>
          ))}
        </div>

        {/* Main Content Area */}
        <div className="dp-main">
          {/* TAB 1: OVERVIEW */}
          {activeTab === 'Overview' && (
            <div className="dp-tab-fade">
              <div className="dp-header">
                <div className="dp-title">Fleet Overview</div>
                <div className="dp-badges">
                  <span className="dp-badge green">{agentsList.filter(a => a.status === 'running').length} running</span>
                  <span className="dp-badge purple">{agentsList.length} agents</span>
                  <span className="dp-badge orange">40+ APIs</span>
                </div>
              </div>
              
              <div className="dp-stats">
                {[
                  { val: agentsList.length, label: 'Agents' },
                  { val: '5', label: 'Workspaces' },
                  { val: '40+', label: 'API Endpoints' },
                  { val: '12', label: 'Dashboard Tabs' },
                ].map(s => (
                  <div key={s.label} className="dp-stat premium-dp-stat">
                    <div className="dp-stat-val">{s.val}</div>
                    <div className="dp-stat-label">{s.label}</div>
                  </div>
                ))}
              </div>

              <div className="dp-agents-row">
                {agentsList.map((a, i) => (
                  <div
                    key={a.name}
                    className={`dp-agent ${i === activeAgentIndex ? 'dp-agent-active' : ''}`}
                    style={{ cursor: 'pointer' }}
                    onClick={() => {
                      setActiveTab('Agents');
                      setUserInteracted(true);
                    }}
                  >
                    <div
                      className="dp-agent-dot"
                      style={{
                        background: statusColor[a.status],
                        boxShadow: a.status === 'running' ? `0 0 6px ${statusColor[a.status]}` : 'none',
                      }}
                    />
                    {a.name}
                    <span style={{ marginLeft: 'auto', fontSize: 10, opacity: 0.4 }}>{a.runs}r</span>
                  </div>
                ))}
              </div>

              <div className="dp-activity">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <span style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)' }}>Recent Activity Feed</span>
                  <span className="dp-live-indicator"><span className="dp-live-dot" /> LIVE</span>
                </div>
                {logsList.slice(0, 3).map((a, i) => (
                  <div key={i} className={`dp-activity-item ${pulse && i === 0 ? 'dp-pulse' : ''}`}>
                    <span className="dp-activity-icon">{a.icon}</span>
                    <span className="dp-activity-title">{a.title}</span>
                    <span className="dp-activity-time">{a.time}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 2: AGENTS */}
          {activeTab === 'Agents' && (
            <div className="dp-tab-fade">
              <div className="dp-header">
                <div className="dp-title">Agent Controllers</div>
                <div style={{ fontSize: '11px', color: 'var(--text-dim)' }}>Click pause/resume to control agent execution</div>
              </div>
              <div className="dp-agents-interactive-list">
                {agentsList.map((agent, index) => {
                  const cpuVal = agent.status === 'running'
                    ? Math.floor(35 + Math.sin(tickTime + index) * 20)
                    : 0;
                  const ramVal = agent.status === 'running'
                    ? Math.floor(55 + Math.cos(tickTime / 1.5 + index) * 12)
                    : 0;
                  return (
                    <div key={agent.name} className="dp-agent-controller-card">
                      <div className="dp-acc-left">
                        <div
                          className="dp-acc-dot"
                          style={{
                            background: statusColor[agent.status],
                            boxShadow: agent.status === 'running' ? `0 0 8px ${statusColor[agent.status]}` : 'none',
                            animation: agent.status === 'running' ? 'breathe 1.5s ease-in-out infinite' : 'none'
                          }}
                        />
                        <div>
                          <div className="dp-acc-name">{agent.name}</div>
                          <div className="dp-acc-role">{agent.role}</div>
                        </div>
                      </div>
                      
                      <div className="dp-acc-meters">
                        <div className="dp-acc-meter">
                          <span className="dp-acc-meter-label">CPU: {cpuVal}%</span>
                          <div className="dp-acc-meter-bar"><div className="dp-acc-meter-fill-cpu" style={{ width: `${cpuVal}%` }} /></div>
                        </div>
                        <div className="dp-acc-meter">
                          <span className="dp-acc-meter-label">MEM: {ramVal}%</span>
                          <div className="dp-acc-meter-bar"><div className="dp-acc-meter-fill-mem" style={{ width: `${ramVal}%` }} /></div>
                        </div>
                      </div>

                      <div className="dp-acc-actions">
                        <div className="dp-acc-runs-text">{agent.runs} runs</div>
                        <button
                          className={`dp-acc-btn ${agent.status === 'running' ? 'btn-pause' : 'btn-resume'}`}
                          onClick={() => toggleAgentStatus(index)}
                        >
                          {agent.status === 'running' ? '⏸' : '▶'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 3: WORKSPACES */}
          {activeTab === 'Workspaces' && (
            <div className="dp-tab-fade">
              <div className="dp-header">
                <div className="dp-title">Isolated Workspaces</div>
                <span className="dp-badge purple">Active Isolation Mode</span>
              </div>
              <div className="dp-workspaces-grid">
                {[
                  { name: 'prod-infra', agents: '7 active', SLA: '99.98%', events: '4.2k/hr', usage: 68, color: 'var(--accent-blue)' },
                  { name: 'content-funnel', agents: '12 active', SLA: '99.50%', events: '12.8k/hr', usage: 84, color: 'var(--accent-purple)' },
                  { name: 'dev-sandbox', agents: '7 active', SLA: '98.85%', events: '342/hr', usage: 22, color: 'var(--accent-cyan)' },
                ].map((ws, i) => {
                  const dynLoad = ws.usage + Math.floor(Math.sin(tickTime + i) * 6);
                  return (
                    <div key={ws.name} className="dp-workspace-card">
                      <div className="dp-ws-header">
                        <div className="dp-ws-title">📦 {ws.name}</div>
                        <div className="dp-ws-uptime" style={{ color: ws.color }}>{ws.SLA}</div>
                      </div>
                      <div className="dp-ws-row">
                        <div>
                          <div className="dp-ws-label">DEPLOYED AGENTS</div>
                          <div className="dp-ws-val">{ws.agents}</div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div className="dp-ws-label">EVENT FREQUENCY</div>
                          <div className="dp-ws-val">{ws.events}</div>
                        </div>
                      </div>
                      <div style={{ marginTop: '12px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'var(--text-dim)', marginBottom: '4px' }}>
                          <span>BANDWIDTH ALLOCATION</span>
                          <span>{dynLoad}%</span>
                        </div>
                        <div className="dp-ws-bandwidth-bar">
                          <div className="dp-ws-bandwidth-fill" style={{ width: `${dynLoad}%`, background: `linear-gradient(90deg, ${ws.color}, var(--accent-pink))` }} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 4: BRAIN MEMORY PLANE */}
          {activeTab === 'Brain' && (
            <div className="dp-tab-fade">
              <div className="dp-header">
                <div className="dp-title">🧠 Decision Memory Stream</div>
                <button className="dp-memory-trigger-btn" onClick={addManualMemory}>⚡ Inject Memory</button>
              </div>

              {/* Memory search filter */}
              <div className="dp-brain-search-wrap">
                <span className="dp-brain-search-icon">🔍</span>
                <input
                  type="text"
                  placeholder="Filter real-time thought memories..."
                  value={brainSearch}
                  onChange={(e) => {
                    setBrainSearch(e.target.value);
                    setUserInteracted(true);
                  }}
                  className="dp-brain-search"
                />
              </div>

              {/* JSON console logs */}
              <div className="dp-brain-console">
                {brainMemories
                  .filter(m =>
                    m.agent.toLowerCase().includes(brainSearch.toLowerCase()) ||
                    m.decision.toLowerCase().includes(brainSearch.toLowerCase()) ||
                    m.action.toLowerCase().includes(brainSearch.toLowerCase())
                  )
                  .map((mem, i) => (
                    <div key={i} className="dp-console-log-item animate-in">
                      <div className="dp-cli-meta">
                        <span className="dp-cli-agent">@{mem.agent}</span>
                        <span className="dp-cli-action">{mem.action}</span>
                        <span className="dp-cli-confidence">conf: {(mem.confidence * 100).toFixed(0)}%</span>
                        <span style={{ marginLeft: 'auto', color: 'var(--text-dim)' }}>{mem.time}</span>
                      </div>
                      <div className="dp-cli-json">
                        <span className="json-key">"decision":</span> <span className="json-val">"{mem.decision}"</span>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* TAB 5: GRAPH */}
          {activeTab === 'Graph' && (
            <div className="dp-tab-fade">
              <div className="dp-header">
                <div className="dp-title">🕸️ Agent Dependency Topology</div>
                <span className="dp-live-indicator"><span className="dp-live-dot" /> REAL-TIME PACKETS</span>
              </div>
              <div className="dp-graph-split">
                {/* SVG Graph rendering */}
                <div className="dp-graph-canvas-wrap">
                  <svg viewBox="0 0 450 350" className="dp-graph-svg">
                    {/* Define gradients */}
                    <defs>
                      <linearGradient id="cyan-purple" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="var(--accent-cyan)" />
                        <stop offset="100%" stopColor="var(--accent-purple)" />
                      </linearGradient>
                      <filter id="glow-effect" x="-20%" y="-20%" width="140%" height="140%">
                        <feGaussianBlur stdDeviation="5" result="blur" />
                        <feComposite in="SourceGraphic" in2="blur" operator="over" />
                      </filter>
                    </defs>

                    {/* Network Lines */}
                    {[
                      { from: [80, 150], to: [320, 120] }, // code-reviewer -> content-writer
                      { from: [320, 120], to: [180, 220] }, // content-writer -> data-pipeline
                      { from: [180, 220], to: [360, 250] }, // data-pipeline -> customer-support
                      { from: [200, 40], to: [180, 220] },  // production-monitor -> data-pipeline
                      { from: [80, 150], to: [180, 220] },  // code-reviewer -> data-pipeline
                      { from: [80, 300], to: [180, 220] },  // lead-scorer -> data-pipeline
                    ].map((line, i) => (
                      <line
                        key={i}
                        x1={line.from[0]}
                        y1={line.from[1]}
                        x2={line.to[0]}
                        y2={line.to[1]}
                        stroke="rgba(255,255,255,0.06)"
                        strokeWidth="1.5"
                      />
                    ))}

                    {/* Telemetry pulsing particles traveling along links */}
                    <path id="path-cr-cw" d="M 80 150 L 320 120" fill="none" />
                    <path id="path-cw-dp" d="M 320 120 L 180 220" fill="none" />
                    <path id="path-dp-cs" d="M 180 220 L 360 250" fill="none" />
                    <path id="path-pm-dp" d="M 200 40 L 180 220" fill="none" />
                    <path id="path-ls-dp" d="M 80 300 L 180 220" fill="none" />

                    <circle r="3.5" fill="var(--accent-cyan)">
                      <animateMotion dur="2.8s" repeatCount="indefinite">
                        <mpath href="#path-cr-cw" />
                      </animateMotion>
                    </circle>

                    <circle r="3" fill="var(--accent-purple)">
                      <animateMotion dur="3.5s" repeatCount="indefinite">
                        <mpath href="#path-cw-dp" />
                      </animateMotion>
                    </circle>

                    <circle r="3.5" fill="var(--accent-green)">
                      <animateMotion dur="2.2s" repeatCount="indefinite">
                        <mpath href="#path-dp-cs" />
                      </animateMotion>
                    </circle>

                    <circle r="3" fill="var(--accent-pink)">
                      <animateMotion dur="4.2s" repeatCount="indefinite">
                        <mpath href="#path-pm-dp" />
                      </animateMotion>
                    </circle>

                    <circle r="3" fill="var(--accent-orange)">
                      <animateMotion dur="3.0s" repeatCount="indefinite">
                        <mpath href="#path-ls-dp" />
                      </animateMotion>
                    </circle>

                    {/* Nodes */}
                    {[
                      { x: 200, y: 40, name: 'production-monitor', icon: '🖥️' },
                      { x: 80, y: 150, name: 'code-reviewer', icon: '🛡️' },
                      { x: 320, y: 120, name: 'content-writer', icon: '📝' },
                      { x: 180, y: 220, name: 'data-pipeline', icon: '🔌' },
                      { x: 360, y: 250, name: 'customer-support', icon: '💬' },
                      { x: 80, y: 300, name: 'lead-scorer', icon: '🎯' },
                    ].map((node) => {
                      const isSelected = selectedGraphNode === node.name;
                      return (
                        <g
                          key={node.name}
                          transform={`translate(${node.x},${node.y})`}
                          style={{ cursor: 'pointer' }}
                          onClick={() => {
                            setSelectedGraphNode(node.name);
                            setUserInteracted(true);
                          }}
                        >
                          {/* Glow background on selected */}
                          {isSelected && (
                            <circle r="22" fill="none" stroke="var(--accent-cyan)" strokeWidth="1.5" strokeDasharray="3 3" style={{ animation: 'spin 12s linear infinite' }} />
                          )}
                          
                          {/* Standard node body */}
                          <circle
                            r="16"
                            fill="var(--bg-card)"
                            stroke={isSelected ? 'var(--accent-cyan)' : 'var(--border-glow)'}
                            strokeWidth="2"
                            filter={isSelected ? 'url(#glow-effect)' : 'none'}
                          />
                          <text
                            textAnchor="middle"
                            dy="5"
                            fontSize="13"
                            style={{ userSelect: 'none' }}
                          >
                            {node.icon}
                          </text>
                          {/* Hover tag label */}
                          <text
                            textAnchor="middle"
                            y="-22"
                            fontSize="8"
                            fill={isSelected ? '#fff' : 'var(--text-dim)'}
                            fontFamily="var(--font-mono)"
                            fontWeight={isSelected ? '700' : '400'}
                          >
                            {node.name}
                          </text>
                        </g>
                      );
                    })}
                  </svg>
                </div>

                {/* Node details panel */}
                <div className="dp-graph-details-panel">
                  {(() => {
                    const agent = agentsList.find(a => a.name === selectedGraphNode);
                    if (!agent) return null;
                    return (
                      <div className="dp-gdp-card animate-in">
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                          <span style={{ fontSize: '16px' }}>🤖</span>
                          <span style={{ fontWeight: '700', fontSize: '13px', color: 'var(--text-primary)' }}>{agent.name}</span>
                        </div>
                        <div className="dp-gdp-row">
                          <span className="dp-gdp-lbl">ROLE:</span>
                          <span className="dp-gdp-val">{agent.role}</span>
                        </div>
                        <div className="dp-gdp-row">
                          <span className="dp-gdp-lbl">STATUS:</span>
                          <span
                            className="dp-gdp-val"
                            style={{
                              color: agent.status === 'running' ? 'var(--accent-green)' : 'var(--text-dim)',
                              fontWeight: '600',
                            }}
                          >
                            ● {agent.status.toUpperCase()}
                          </span>
                        </div>
                        <div className="dp-gdp-row">
                          <span className="dp-gdp-lbl">ACC SLA:</span>
                          <span className="dp-gdp-val" style={{ color: 'var(--accent-cyan)' }}>{agent.sla}</span>
                        </div>
                        <div className="dp-gdp-row">
                          <span className="dp-gdp-lbl">QUEUE:</span>
                          <span className="dp-gdp-val" style={{ fontFamily: 'var(--font-mono)' }}>{agent.queue}</span>
                        </div>
                        <div style={{ marginTop: 10, display: 'flex', gap: 8 }}>
                          <button
                            className="dp-gdp-btn"
                            style={{ flex: 1, padding: '6px', fontSize: '10px', background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)', borderRadius: '4px', cursor: 'pointer', color: 'var(--text-secondary)', transition: 'all 0.2s' }}
                            onClick={() => {
                              setActiveTab('Agents');
                            }}
                            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
                            onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}
                          >
                            Inspect Telemetry
                          </button>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   INTERACTIVE CODE PLAYGROUND
   ═══════════════════════════════════════════ */
function InteractiveCodePlayground() {
  const [lang, setLang] = useState('python');
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    const sequence = [
      { t: 500, log: '{"level":"info","msg":"Initializing AgentOS client...","timestamp":"2026-05-30T10:00:00Z"}' },
      { t: 1200, log: '{"level":"info","msg":"Connected to workspace: my-saas-backend","workspace_id":"ws_7x9q"}' },
      { t: 2500, log: '{"level":"debug","msg":"Agent run wrapped","agent":"invoice-processor","run_id":"run_abc123"}' },
      { t: 3800, log: '{"level":"info","msg":"Telemetry synced to dashboard. Latency: 12ms.","status":"success"}' },
    ];
    let timeouts = [];
    const runSequence = () => {
      setLogs([]);
      sequence.forEach((item) => {
        timeouts.push(setTimeout(() => {
          setLogs(prev => [...prev, item.log]);
        }, item.t));
      });
    };
    runSequence();
    const interval = setInterval(runSequence, 6000);
    return () => {
      timeouts.forEach(clearTimeout);
      clearInterval(interval);
    };
  }, []);

  const pythonCode = `import stoicos

os = stoicos.Client(
    api_key="sk_live_xxx",
    workspace="my-saas-backend"
)

@os.wrap_agent(name="invoice-processor")
def process_invoice(file_path):
    result = extract_data(file_path)
    return result

# Telemetry is auto-captured in background`;

  const nodeCode = `import { AgentOS } from 'stoic-agentos-sdk';

const os = new AgentOS({
  apiKey: 'sk_live_xxx',
  workspace: 'my-saas-backend',
});

const invoiceAgent = os.wrapAgent(
  'invoice-processor', 
  async (input) => {
    return await processInvoice(input);
  }
);`;

  return (
    <div className="playground-container">
      <div className="playground-tabs">
        <button className={lang === 'python' ? 'active' : ''} onClick={() => setLang('python')}>Python SDK</button>
        <button className={lang === 'node' ? 'active' : ''} onClick={() => setLang('node')}>Node.js SDK</button>
      </div>
      <div className="playground-split">
        <div className="playground-editor">
          <pre><code>{lang === 'python' ? pythonCode : nodeCode}</code></pre>
        </div>
        <div className="playground-terminal">
          <div className="term-header">Terminal — Live Traces</div>
          <div className="term-body">
            {logs.map((l, i) => {
              // Parse quoted strings into React elements instead of using dangerouslySetInnerHTML
              const parts = l.split(/(".*?")/g);
              return (
                <div key={i} className="term-line">
                  {parts.map((part, j) =>
                    part.startsWith('"') && part.endsWith('"')
                      ? <span key={j} className="str">{part}</span>
                      : part
                  )}
                </div>
              );
            })}
            <div className="term-cursor"></div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   LANDING PAGE
   ═══════════════════════════════════════════ */
export default function LandingPage() {
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  // Section refs for scroll reveal
  const infraRef = useScrollReveal();
  const metricsRef = useScrollReveal();
  const socialRef = useScrollReveal();
  const consolidationRef = useScrollReveal();
  const featuresRef = useScrollReveal();
  const previewRef = useScrollReveal();
  const sdkRef = useScrollReveal();
  const compareRef = useScrollReveal();
  const ecoRef = useScrollReveal();
  const testimonialsRef = useScrollReveal();
  const pricingRef = useScrollReveal();
  const ctaRef = useScrollReveal();

  useEffect(() => {
    document.title = 'Stoic AgentOS — AI Agent Operations Platform';
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 30);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Mobile detection for performance optimization
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (!mobile) setMobileMenuOpen(false);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Close mobile menu on navigation
  const handleMobileNav = (target) => {
    setMobileMenuOpen(false);
    if (target.startsWith('/')) {
      navigate(target);
    } else {
      document.getElementById(target)?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="landing">
      {/* ── NAV ── */}
      <nav className={`nav ${scrolled ? 'scrolled' : ''}`}>
        <div className="nav-inner">
          <div className="nav-logo" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} style={{ cursor: 'pointer' }}>
            <div className="nav-logo-icon">⚡</div>
            <span>Stoic <span style={{ color: 'var(--accent-purple)' }}>AgentOS</span></span>
          </div>
          <button
            className="nav-mobile-toggle"
            onClick={() => setMobileMenuOpen(o => !o)}
            aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
          >
            {mobileMenuOpen ? '✕' : '☰'}
          </button>
          <div className={`nav-links${mobileMenuOpen ? ' mobile-open' : ''}`}>
            {NAV_LINKS.map(l => l === 'Docs'
              ? <Link key={l} className="nav-link" to="/docs" onClick={() => setMobileMenuOpen(false)}>{l}</Link>
              : <a key={l} className="nav-link" href={`#${l.toLowerCase()}`} onClick={(e) => { if (isMobile) { e.preventDefault(); handleMobileNav(l.toLowerCase()); } }}>{l}</a>
            )}
            <a
              href="https://github.com/benjaminkernbaum-ux/stoic-agentos"
              target="_blank"
              rel="noopener noreferrer"
              className="nav-link"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#ffb900', fontWeight: 600 }}
            >
              ⭐ Star on GitHub
            </a>
            <Link className="nav-link" to="/login" onClick={() => setMobileMenuOpen(false)}>Sign In</Link>
            <button className="btn btn-primary btn-sm" onClick={() => { setMobileMenuOpen(false); navigate('/signup'); }}>Get Started Free</button>
          </div>
        </div>
      </nav>

      {/* ══════════════════════════════════
           HERO — Neural Network Canvas
         ══════════════════════════════════ */}
      <section className="hero">
        <NeuralHeroCanvas />
        <div className="container">
          <div className="hero-badge animate-in">
            <span className="hero-badge-dot" />
            $11.6B market · Backed by real production use
          </div>
          <h1 className="animate-in delay-1">
            Deploy Autonomous Agent Workflows<br />
            in <span className="gradient-text">Under 5 Minutes</span>
          </h1>
          <p className="hero-sub animate-in delay-2">
            Monitor, orchestrate, and scale your AI agent fleet from a single premium dashboard. 
            Knowledge persistence, auto-capture, and multi-workspace management — built for teams shipping AI.
          </p>
          <div className="hero-cta animate-in delay-3">
            <button className="btn btn-primary btn-lg" onClick={() => navigate('/signup')}>
              🚀 Start Free — No Credit Card
            </button>
            <button className="btn btn-secondary btn-lg" onClick={() => document.getElementById('preview')?.scrollIntoView({ behavior: 'smooth' })}>
              See It Live →
            </button>
          </div>
          <div className="hero-metrics animate-in delay-4">
            <div className="hero-metric">
              <div className="hero-metric-value" style={{ color: 'var(--accent-purple)' }}>21,683</div>
              <div className="hero-metric-label">Lines of Code</div>
            </div>
            <div className="hero-metric">
              <div className="hero-metric-value" style={{ color: 'var(--accent-cyan)' }}>40+</div>
              <div className="hero-metric-label">API Endpoints</div>
            </div>
            <div className="hero-metric">
              <div className="hero-metric-value" style={{ color: 'var(--accent-green)' }}>12</div>
              <div className="hero-metric-label">Dashboard Tabs</div>
            </div>
            <div className="hero-metric">
              <div className="hero-metric-value" style={{ color: 'var(--accent-orange)' }}>MIT</div>
              <div className="hero-metric-label">Open Source</div>
            </div>
          </div>
        </div>
        {/* Scroll indicator */}
        <div className="scroll-indicator">
          <span>Scroll to explore</span>
          <svg viewBox="0 0 24 24"><polyline points="7 13 12 18 17 13" /><polyline points="7 6 12 11 17 6" /></svg>
        </div>
      </section>

      {/* ══════════════════════════════════
           SOCIAL PROOF — Logo Bar
         ══════════════════════════════════ */}
      <section className="section social-proof-section" ref={socialRef} style={{ paddingTop: 40, paddingBottom: 40 }}>
        <div className="container section-center">
          <div className="social-proof-label section-reveal">Built With</div>
          <div className="logo-bar section-reveal" style={{ transitionDelay: '0.1s' }}>
            {LOGOS.map(logo => (
              <div key={logo.name} className="logo-item">
                <span className="logo-icon">{logo.icon}</span>
                <span className="logo-text">{logo.name}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════
           MARKET CONSOLIDATION — Competitive Moat
         ══════════════════════════════════ */}
      <section className="section" ref={consolidationRef}>
        <div className="container section-reveal">
          <MarketConsolidation />
        </div>
      </section>

      {/* ══════════════════════════════════
           INFRASTRUCTURE SIMULATION
         ══════════════════════════════════ */}
      <section className="section" style={{ paddingTop: 0 }} ref={infraRef}>
        <div className="container-wide section-reveal">
          <InfraSimulation />
        </div>
      </section>

      {/* ══════════════════════════════════
           PERFORMANCE METRICS — Animated Counters
         ══════════════════════════════════ */}
      <section className="section metrics-section" ref={metricsRef}>
        <ParticleMesh particleCount={isMobile ? 12 : 30} color="#00f0ff" speed={0.15} connectionDistance={isMobile ? 60 : 100} />
        <div className="container" style={{ position: 'relative', zIndex: 1 }}>
          <div className="section-center section-reveal">
            <div className="section-label">⚡ RAW POWER</div>
            <h2 className="section-title">Built for Production Scale</h2>
            <p className="section-sub">Numbers that speak for themselves.</p>
          </div>
          <div className="metrics-grid section-reveal" style={{ transitionDelay: '0.2s' }}>
            <AnimatedCounter end={26} suffix="" color="#00f0ff" label="Production Agents" />
            <AnimatedCounter end={40} prefix="" suffix="+" color="#00ff88" label="API Endpoints" />
            <AnimatedCounter end={21683} suffix="" color="#ff00aa" label="Lines of Code" />
            <AnimatedCounter end={12} suffix="" color="#ffaa00" label="Dashboard Tabs" />
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════
           LIVE DASHBOARD PREVIEW
         ══════════════════════════════════ */}
      <section className="section" id="preview" style={{ background: 'var(--bg-deep)' }} ref={previewRef}>
        <div className="container section-center">
          <div className="section-label section-reveal">👁️ LIVE PREVIEW</div>
          <h2 className="section-title section-reveal">See your command center in action</h2>
          <p className="section-sub section-reveal">
            Real-time agent monitoring, observation feeds, and fleet metrics — all in one premium dashboard.
          </p>
          <div className="section-reveal" style={{ transitionDelay: '0.2s' }}>
            <LiveDashboardPreview />
          </div>
          <div className="section-reveal" style={{ transitionDelay: '0.3s', marginTop: 32 }}>
            <button className="btn btn-primary btn-lg" onClick={() => navigate('/signup')}>
              🚀 Get Your Own Dashboard — Free
            </button>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════
           FEATURES
         ══════════════════════════════════ */}
      <section className="section" id="features" ref={featuresRef}>
        <div className="container section-center">
          <div className="section-label section-reveal">⚡ CAPABILITIES</div>
          <h2 className="section-title section-reveal">Everything your AI fleet needs</h2>
          <p className="section-sub section-reveal">
            One platform to monitor agents, persist knowledge, manage workspaces, and automate operations across your entire stack.
          </p>
          <div className="features-grid">
            {FEATURES.map((f, i) => (
              <div key={i} className="feature-card section-reveal" style={{ transitionDelay: `${i * 0.08}s` }}>
                <div className="feature-icon" style={{ background: f.color }}>{f.icon}</div>
                <h3>{f.title}</h3>
                <p>{f.desc}</p>
              </div>
            ))}
          </div>

          <div className="section-label section-reveal" style={{ marginTop: 80 }}>🛡️ ENTERPRISE GOVERNANCE</div>
          <h2 className="section-title section-reveal">Built for Mission-Critical Scale</h2>
          <div className="features-grid tech-grid section-reveal" style={{ transitionDelay: '0.2s', marginTop: 32 }}>
            {TECH_FEATURES.map((f, i) => (
              <div key={i} className="feature-card tech-card">
                <div className="feature-icon" style={{ background: 'rgba(255,255,255,0.05)', color: '#fff' }}>{f.icon}</div>
                <h3>{f.title}</h3>
                <p>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════
           HOW IT WORKS — 3 Steps
         ══════════════════════════════════ */}
      <section className="section" style={{ background: 'var(--bg-deep)' }}>
        <div className="container section-center">
          <div className="section-label section-reveal">🛠️ GET STARTED</div>
          <h2 className="section-title section-reveal">Up and running in 3 minutes</h2>
          <p className="section-sub section-reveal">No complex setup. No infrastructure to manage.</p>
          <div className="how-it-works-grid section-reveal" style={{ transitionDelay: '0.2s' }}>
            <div className="how-step">
              <div className="how-step-number">1</div>
              <div className="how-step-icon">📦</div>
              <h3>Install the SDK</h3>
              <code style={{ fontSize: '0.8rem', padding: '6px 12px', borderRadius: 6, background: 'rgba(155,89,255,0.1)', border: '1px solid rgba(155,89,255,0.2)', color: '#d4a5ff' }}>npm install stoic-agentos-sdk</code>
              <p>One dependency. Works with any JavaScript/TypeScript agent framework.</p>
            </div>
            <div className="how-step-arrow section-reveal" style={{ transitionDelay: '0.3s' }}>→</div>
            <div className="how-step">
              <div className="how-step-number">2</div>
              <div className="how-step-icon">🔌</div>
              <h3>Wrap Your Agents</h3>
              <code style={{ fontSize: '0.8rem', padding: '6px 12px', borderRadius: 6, background: 'rgba(0,212,255,0.1)', border: '1px solid rgba(0,212,255,0.2)', color: '#80e8ff' }}>os.wrapAgent('my-agent', fn)</code>
              <p>3 lines of code. Auto-captures runs, errors, decisions, and heartbeats.</p>
            </div>
            <div className="how-step-arrow section-reveal" style={{ transitionDelay: '0.4s' }}>→</div>
            <div className="how-step">
              <div className="how-step-number">3</div>
              <div className="how-step-icon">🎯</div>
              <h3>See Everything</h3>
              <code style={{ fontSize: '0.8rem', padding: '6px 12px', borderRadius: 6, background: 'rgba(0,230,138,0.1)', border: '1px solid rgba(0,230,138,0.2)', color: '#80ffbb' }}>stoicagentos.com/dashboard</code>
              <p>Real-time fleet monitoring, AI-powered insights, and knowledge persistence — live.</p>
            </div>
          </div>
          <div className="section-reveal" style={{ transitionDelay: '0.5s', marginTop: 40, textAlign: 'center' }}>
            <button className="btn btn-primary btn-lg" onClick={() => navigate('/signup')}>🚀 Start Free — No Credit Card</button>
          </div>
        </div>
      </section>

      {/* ── INTERACTIVE PLAYGROUND ── */}
      <section className="section" id="sdk" style={{ background: 'var(--bg-deep)' }} ref={sdkRef}>
        <div className="container">
          <div className="section-center section-reveal" style={{ marginBottom: 40 }}>
            <div className="section-label">🔧 DEVELOPER EXPERIENCE</div>
            <h2 className="section-title">One SDK. Zero Configuration.</h2>
            <p className="section-sub">
              Drop the SDK into your codebase. Telemetry, latency, and agent decisions are instantly routed to your Command Center.
            </p>
          </div>
          <div className="section-reveal" style={{ transitionDelay: '0.2s' }}>
            <InteractiveCodePlayground />
          </div>
          <div className="section-reveal" style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 32, transitionDelay: '0.3s' }}>
            <div className="social-badge" onClick={() => navigator.clipboard?.writeText('npm install stoic-agentos-sdk')} style={{ cursor: 'pointer' }}>📦 npm install stoic-agentos-sdk</div>
            <div className="social-badge" onClick={() => navigator.clipboard?.writeText('pip install stoicos')} style={{ cursor: 'pointer' }}>🐍 pip install stoicos</div>
          </div>
        </div>
      </section>

      {/* ── COMPARISON ── */}
      <section className="section" id="compare" ref={compareRef}>
        <div className="container section-center">
          <div className="section-label section-reveal">📊 COMPARISON</div>
          <h2 className="section-title section-reveal">Why teams choose AgentOS</h2>
          <p className="section-sub section-reveal">We&apos;re the only platform combining agent monitoring + knowledge persistence + workspace management in one dashboard.</p>
          <div className="compare-table-wrap section-reveal" style={{ transitionDelay: '0.2s' }}>
            <table className="compare-table">
              <thead>
                <tr>
                  <th>Feature</th>
                  <th className="us">⚡ AgentOS</th>
                  <th>LangSmith</th>
                  <th>Langfuse</th>
                  <th>Braintrust</th>
                  <th>AgentOps</th>
                </tr>
              </thead>
              <tbody>
                {COMPARE.map((row, i) => (
                  <tr key={i}>
                    <td>{row.feature}</td>
                    <td className="us">{row.us}</td>
                    <td>{row.langsmith}</td>
                    <td>{row.langfuse}</td>
                    <td>{row.braintrust}</td>
                    <td>{row.agentops}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════
           TESTIMONIALS
         ══════════════════════════════════ */}
      <section className="section" style={{ background: 'var(--bg-deep)' }} ref={testimonialsRef}>
        <div className="container section-center">
          <div className="section-label section-reveal">🧭 WHY I BUILT THIS</div>
          <h2 className="section-title section-reveal">From 26 agents with zero visibility to a command center</h2>
          <p className="section-sub section-reveal">
            Built by a founder who runs AI agents in production every day.
          </p>
          <div className="testimonials-grid section-reveal" style={{ transitionDelay: '0.2s' }}>
            {FOUNDER_STORY.map((s, i) => (
              <div key={i} className="testimonial-card" style={{ borderTop: `3px solid ${s.color}` }}>
                <div style={{ fontSize: '2rem', marginBottom: 12 }}>{s.icon}</div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fff', marginBottom: 8 }}>{s.title}</h3>
                <p style={{ fontSize: '0.9rem', lineHeight: 1.7, opacity: 0.8 }}>{s.text}</p>
              </div>
            ))}
          </div>
          {/* Beta CTA */}
          <div className="section-reveal" style={{ transitionDelay: '0.4s', marginTop: 40, textAlign: 'center' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 12, padding: '14px 28px', borderRadius: 12, background: 'rgba(155,89,255,0.1)', border: '1px solid rgba(155,89,255,0.3)' }}>
              <span style={{ fontSize: '1.4rem' }}>🎯</span>
              <span style={{ fontSize: '0.95rem', color: 'rgba(255,255,255,0.9)' }}>
                <strong>Early access open</strong> — Join the beta and get lifetime Pro access
              </span>
              <button className="btn btn-primary btn-sm" onClick={() => navigate('/signup')} style={{ marginLeft: 8 }}>Join Beta</button>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════
           ECOSYSTEM — with Particle Background
         ══════════════════════════════════ */}
      <section className="section section-particles" id="ecosystem" ref={ecoRef}>
        <ParticleMesh particleCount={isMobile ? 10 : 25} color="#9b59ff" speed={0.2} connectionDistance={isMobile ? 60 : 100} />
        <div className="container section-center" style={{ position: 'relative', zIndex: 1 }}>
          <div className="section-label section-reveal">🌐 ECOSYSTEM</div>
          <h2 className="section-title section-reveal">Built on AgentOS. Deployed on Vercel.</h2>
          <p className="section-sub section-reveal">
            Every product in our ecosystem runs on AgentOS. Real production fleets, not demos.
          </p>
          <div className="features-grid section-reveal" style={{ transitionDelay: '0.2s' }}>
            {ECOSYSTEM.map((e, i) => (
              <a
                key={i}
                href={e.url}
                target="_blank"
                rel="noopener noreferrer"
                className="feature-card"
                style={{
                  animationDelay: `${i * 0.12}s`,
                  background: e.gradient,
                  border: `1px solid ${e.border}`,
                  cursor: 'pointer',
                  textDecoration: 'none',
                  transition: 'transform 0.3s, box-shadow 0.3s',
                }}
                onMouseOver={ev => { ev.currentTarget.style.transform = 'translateY(-6px)'; ev.currentTarget.style.boxShadow = `0 12px 40px ${e.border}`; }}
                onMouseOut={ev => { ev.currentTarget.style.transform = 'translateY(0)'; ev.currentTarget.style.boxShadow = 'none'; }}
              >
                <div style={{ fontSize: '2.2rem', marginBottom: 8 }}>{e.icon}</div>
                <h3 style={{ marginBottom: 2 }}>{e.name}</h3>
                <div style={{ fontSize: '0.75rem', opacity: 0.5, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 12 }}>{e.tagline}</div>
                {e.badge && <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 4, fontSize: '0.65rem', fontWeight: 600, background: 'rgba(0,230,138,0.15)', color: '#00e68a', border: '1px solid rgba(0,230,138,0.25)', marginBottom: 8, letterSpacing: 1, textTransform: 'uppercase' }}>{e.badge}</span>}
                <p>{e.desc}</p>
                <div style={{ marginTop: 16, fontSize: '0.75rem', fontFamily: "'JetBrains Mono', monospace", opacity: 0.4 }}>
                  {e.url.replace('https://', '')} →
                </div>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRICING ── */}
      <section className="section" id="pricing" style={{ background: 'var(--bg-deep)' }} ref={pricingRef}>
        <div className="container section-center">
          <div className="section-label section-reveal">💎 PRICING</div>
          <h2 className="section-title section-reveal">Start free. Scale when ready.</h2>
          <p className="section-sub section-reveal">No credit card required. Upgrade as your agent fleet grows.</p>
          <div className="section-reveal" style={{ transitionDelay: '0.1s', marginBottom: 48 }}>
            <PricingCalculator />
          </div>
          <div className="pricing-grid section-reveal" style={{ transitionDelay: '0.2s' }}>
            {PRICING.map((p, i) => (
              <div key={i} className={`pricing-card ${p.style}`}>
                <div className="pricing-name">{p.name}</div>
                <div className="pricing-desc">{p.desc}</div>
                <div className="pricing-price">
                  <span className="pricing-amount">{p.price}</span>
                  <span className="pricing-period">{p.period}</span>
                </div>
                <ul className="pricing-features">
                  {p.features.map((f, j) => <li key={j}>{f}</li>)}
                  {p.disabled.map((f, j) => <li key={`d-${j}`} className="disabled">{f}</li>)}
                </ul>
                <button
                  className={`btn ${p.style === 'featured' ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ width: '100%', justifyContent: 'center' }}
                  onClick={() => {
                    if (p.name === 'Enterprise') {
                      window.location.href = 'mailto:benjamin@stoicagentos.com?subject=AgentOS Enterprise Inquiry';
                    } else {
                      navigate('/signup');
                    }
                  }}
                >
                  {p.cta}
                </button>
              </div>
            ))}
          </div>
          {/* Urgency badge */}
          <div className="pricing-urgency section-reveal" style={{ transitionDelay: '0.4s' }}>
            <span className="pricing-urgency-dot" />
            <span>Start free today — upgrade anytime, cancel anytime. No contracts.</span>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════
           CTA — with Particle Background
         ══════════════════════════════════ */}
      <section className="section section-center section-particles" style={{ paddingBottom: 120 }} ref={ctaRef}>
        <ParticleMesh particleCount={isMobile ? 14 : 35} color="#00ff88" speed={0.25} connectionDistance={isMobile ? 65 : 110} />
        <div className="container" style={{ position: 'relative', zIndex: 1 }}>
          <h2 className="section-title section-reveal">Ready to command your AI fleet?</h2>
          <p className="section-sub section-reveal" style={{ margin: '0 auto 32px', transitionDelay: '0.1s' }}>
            Join the first wave of teams using AgentOS to ship AI faster, with full observability and zero knowledge loss.
          </p>
          <div className="hero-cta section-reveal" style={{ transitionDelay: '0.2s' }}>
            <button className="btn btn-primary btn-lg" onClick={() => navigate('/signup')}>🚀 Get Started Free</button>
            <button className="btn btn-secondary btn-lg" onClick={() => window.location.href = 'mailto:benjamin@stoicagentos.com?subject=AgentOS Demo Request'}>📅 Book a Demo</button>
          </div>
          <div className="cta-trust section-reveal" style={{ transitionDelay: '0.3s' }}>
            <span>✓ No credit card required</span>
            <span>✓ 14-day Pro trial</span>
            <span>✓ Cancel anytime</span>
          </div>
          <div className="section-reveal" style={{ transitionDelay: '0.4s', marginTop: 48 }}>
            <WaitlistCapture />
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="footer">
        <div className="container">
          <div className="footer-grid">
            <div className="footer-brand">
              <h3>⚡ Stoic AgentOS</h3>
              <p>The operating system for AI agent fleets. Monitor, orchestrate, and scale with confidence.</p>
            </div>
            <div className="footer-col">
              <h4>Product</h4>
              <a href="#features">Features</a>
              <a href="#pricing">Pricing</a>
              <a href="#sdk">SDK</a>
              <Link to="/docs">Documentation</Link>
              <Link to="/changelog">Changelog</Link>
            </div>
            <div className="footer-col">
              <h4>Company</h4>
              <Link to="/about">About</Link>
              <Link to="/blog">Blog</Link>
              <a href="https://github.com/benjaminkernbaum-ux" target="_blank" rel="noopener noreferrer">GitHub</a>
              <a href="https://www.linkedin.com/company/17224756/" target="_blank" rel="noopener noreferrer">LinkedIn</a>
            </div>
            <div className="footer-col">
              <h4>Legal</h4>
              <Link to="/privacy">Privacy Policy</Link>
              <Link to="/terms">Terms of Service</Link>
              <Link to="/security">Security</Link>
            </div>
          </div>
          <div className="footer-bottom">
            <span>© 2026 Stoic AgentOS. All rights reserved.</span>
            <span>Built with ⚡ by Benjamin Kernbaum</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
