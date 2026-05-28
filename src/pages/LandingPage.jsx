import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './LandingPage.css';
import InfraSimulation from '../components/InfraSimulation';
import NeuralHeroCanvas from '../components/NeuralHeroCanvas';
import ParticleMesh from '../components/ParticleMesh';
import AnimatedCounter from '../components/AnimatedCounter';

const NAV_LINKS = ['Features', 'Ecosystem', 'SDK', 'Pricing', 'Docs'];

const FEATURES = [
  { icon: '🤖', color: 'rgba(155,89,255,0.12)', title: 'Agent Fleet Monitoring', desc: 'Track 100+ AI agents across departments. Real-time status, execution history, and performance metrics in one dashboard.' },
  { icon: '🧠', color: 'rgba(77,124,255,0.12)', title: 'Knowledge Brain', desc: 'Persistent memory across all AI sessions. Auto-capture decisions, discoveries, and architectural changes. Never lose context again.' },
  { icon: '🕸️', color: 'rgba(0,212,255,0.12)', title: 'Knowledge Graph', desc: 'Interactive force-directed visualization of your codebase relationships. See how agents, files, and workflows connect.' },
  { icon: '📦', color: 'rgba(0,230,138,0.12)', title: 'Multi-Workspace', desc: 'Manage 50+ repos from a single pane of glass. Git status, branches, dirty files, and context routing across projects.' },
  { icon: '⚡', color: 'rgba(255,159,67,0.12)', title: 'Auto-Capture Hooks', desc: 'Git post-commit hooks auto-log every change. Scheduled brain refresh keeps knowledge items fresh without manual work.' },
  { icon: '🔧', color: 'rgba(255,107,157,0.12)', title: 'SDK & API Access', desc: 'npm install @stoic/agentos-sdk — wrap any agent in 3 lines of code. Full REST API with API key management and webhook integrations.' },
];

const PRICING = [
  { name: 'Free', desc: 'For solo developers', price: '$0', period: '', features: ['2 workspaces', '5 agents', '10,000 obs/mo', '5 knowledge items', '3 git hook repos', '1 member', 'Community support'], disabled: ['Knowledge Graph', 'Trace Timeline', 'SSO/SAML'], cta: 'Get Started Free', style: 'default' },
  { name: 'Pro', desc: 'For power users', price: '$29', period: '/mo', features: ['10 workspaces', '25 agents', '100,000 obs/mo', '25 knowledge items', '15 git hook repos', '5 team members', 'Knowledge Graph', 'Trace Timeline', 'Full API access', 'Email support (48h)'], disabled: ['SSO/SAML'], cta: 'Start 14-Day Trial', style: 'featured' },
  { name: 'Team', desc: 'For growing teams', price: '$79', period: '/mo', features: ['Unlimited workspaces', '100 agents', 'Unlimited observations', 'Unlimited knowledge items', 'Unlimited git hooks', '15 team members', 'Knowledge Graph', 'Trace Timeline', 'Full API access', 'Priority support (4h)'], disabled: ['SSO/SAML'], cta: 'Start 14-Day Trial', style: 'default' },
  { name: 'Enterprise', desc: 'For organizations', price: 'Custom', period: '', features: ['Everything in Team', 'Unlimited agents', 'Unlimited observations', 'Unlimited members', 'SSO/SAML', 'Self-hosted (coming soon)', 'Custom integrations', 'Dedicated CSM', 'SLA guarantee', 'Audit logs'], disabled: [], cta: 'Contact Sales', style: 'default' },
];

const COMPARE = [
  { feature: 'Agent Fleet Monitoring', us: '✅', langsmith: '✅', langfuse: '✅', agentops: '🟡' },
  { feature: 'Three-Tier Memory System', us: '✅', langsmith: '❌', langfuse: '❌', agentops: '❌' },
  { feature: 'Knowledge Graph', us: '✅', langsmith: '❌', langfuse: '❌', agentops: '❌' },
  { feature: 'Multi-Repo Workspace', us: '✅', langsmith: '❌', langfuse: '❌', agentops: '❌' },
  { feature: 'Auto-Capture (Git Hooks)', us: '✅', langsmith: '❌', langfuse: '🟡', agentops: '🟡' },
  { feature: 'Compliance & Audit Log', us: '✅', langsmith: '❌', langfuse: '❌', agentops: '❌' },
  { feature: 'AI Chat (Claude-Powered)', us: '✅', langsmith: '❌', langfuse: '❌', agentops: '❌' },
  { feature: 'Visual Dashboard', us: '✅', langsmith: '🟡', langfuse: '✅', agentops: '🟡' },
  { feature: 'Open-Source Core', us: '✅', langsmith: '❌', langfuse: '✅', agentops: '✅' },
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

const SDK_CODE = `<span class="kw">import</span> { AgentOS } <span class="kw">from</span> <span class="str">'@stoic/agentos-sdk'</span>;

<span class="cm">// Initialize with your API key</span>
<span class="kw">const</span> os = <span class="kw">new</span> <span class="fn">AgentOS</span>({
  apiKey: <span class="str">'sk_live_xxx'</span>,
  workspace: <span class="str">'my-saas-backend'</span>,
});

<span class="cm">// Wrap any agent — auto-captures start/end/errors</span>
<span class="kw">const</span> invoiceAgent = os.<span class="fn">wrapAgent</span>(<span class="str">'invoice-processor'</span>, <span class="kw">async</span> (input) <span class="op">=></span> {
  <span class="kw">const</span> result = <span class="kw">await</span> <span class="fn">processInvoice</span>(input);
  <span class="kw">return</span> result;
});

<span class="cm">// Manual capture for decisions & discoveries</span>
os.<span class="fn">capture</span>({
  type: <span class="str">'decision'</span>,
  title: <span class="str">'Switched to GPT-4o-mini'</span>,
  content: <span class="str">'Reduced cost by 40% with no quality loss'</span>,
  agent: <span class="str">'content-writer'</span>,
});`;

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
  const [activeAgent, setActiveAgent] = useState(0);
  const [pulse, setPulse] = useState(false);

  useEffect(() => {
    const t = setInterval(() => {
      setActiveAgent(i => (i + 1) % DEMO_AGENTS.length);
      setPulse(true);
      setTimeout(() => setPulse(false), 600);
    }, 3000);
    return () => clearInterval(t);
  }, []);

  const statusColor = { running: '#00e68a', idle: 'rgba(255,255,255,0.3)', success: '#00d4ff', error: '#ff4757' };

  return (
    <div className="preview-frame">
      <div className="preview-bar">
        <div className="preview-dot red" />
        <div className="preview-dot yellow" />
        <div className="preview-dot green" />
        <div className="preview-url">stoicagentos.com/dashboard</div>
      </div>
      <div className="dashboard-preview">
        <div className="dp-sidebar">
          <div className="dp-logo">⚡ AgentOS</div>
          {['Overview', 'Agents', 'Workspaces', 'Brain', 'Graph'].map((item, i) => (
            <div key={item} className={`dp-nav-item ${i === 0 ? 'active' : ''}`}>
              {['📊', '🤖', '📦', '🧠', '🕸️'][i]} {item}
            </div>
          ))}
        </div>
        <div className="dp-main">
          <div className="dp-header">
            <div className="dp-title">Fleet Overview</div>
            <div className="dp-badges">
              <span className="dp-badge green">5 running</span>
              <span className="dp-badge purple">26 agents</span>
              <span className="dp-badge orange">40+ APIs</span>
            </div>
          </div>
          <div className="dp-stats">
            {[
              { val: '26', label: 'Agents' },
              { val: '5', label: 'Workspaces' },
              { val: '40+', label: 'API Endpoints' },
              { val: '12', label: 'Dashboard Tabs' },
            ].map(s => (
              <div key={s.label} className="dp-stat">
                <div className="dp-stat-val">{s.val}</div>
                <div className="dp-stat-label">{s.label}</div>
              </div>
            ))}
          </div>
          <div className="dp-agents-row">
            {DEMO_AGENTS.map((a, i) => (
              <div
                key={a.name}
                className={`dp-agent ${i === activeAgent ? 'dp-agent-active' : ''}`}
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
          {/* Mini activity feed */}
          <div className="dp-activity">
            {DEMO_ACTIVITY.slice(0, 3).map((a, i) => (
              <div key={i} className={`dp-activity-item ${pulse && i === 0 ? 'dp-pulse' : ''}`}>
                <span className="dp-activity-icon">{a.icon}</span>
                <span className="dp-activity-title">{a.title}</span>
                <span className="dp-activity-time">{a.time}</span>
              </div>
            ))}
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
            Your AI Agents Need<br />
            a <span className="gradient-text">Command Center</span>
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
              <code style={{ fontSize: '0.8rem', padding: '6px 12px', borderRadius: 6, background: 'rgba(155,89,255,0.1)', border: '1px solid rgba(155,89,255,0.2)', color: '#d4a5ff' }}>npm install @stoic/agentos-sdk</code>
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

      {/* ── SDK ── */}
      <section className="section" id="sdk" style={{ background: 'var(--bg-deep)' }} ref={sdkRef}>
        <div className="container">
          <div className="section-center section-reveal" style={{ marginBottom: 0 }}>
            <div className="section-label">🔧 DEVELOPER SDK</div>
            <h2 className="section-title">3 lines of code to instrument any agent</h2>
            <p className="section-sub">
              npm install, import, wrap. Your agents start reporting to the Command Center immediately.
            </p>
          </div>
          <div className="code-block section-reveal" style={{ transitionDelay: '0.2s' }}>
            <div className="code-header">
              <span className="code-lang">JavaScript / TypeScript</span>
              <button className="code-copy" onClick={() => navigator.clipboard?.writeText('npm install @stoic/agentos-sdk')}>📋 Copy</button>
            </div>
            <div className="code-body" dangerouslySetInnerHTML={{ __html: SDK_CODE }} />
          </div>
          <div className="section-reveal" style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 32, transitionDelay: '0.3s' }}>
            <div className="social-badge">📦 npm install @stoic/agentos-sdk</div>
            <div className="social-badge">🐍 pip install agentos-sdk</div>
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
