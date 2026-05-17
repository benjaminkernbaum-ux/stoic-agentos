import { useState, useEffect } from 'react';
import './LandingPage.css';
import InfraSimulation from '../components/InfraSimulation';

const NAV_LINKS = ['Features', 'SDK', 'Pricing', 'Docs'];

const FEATURES = [
  { icon: '🤖', color: 'rgba(155,89,255,0.12)', title: 'Agent Fleet Monitoring', desc: 'Track 100+ AI agents across departments. Real-time status, execution history, and performance metrics in one dashboard.' },
  { icon: '🧠', color: 'rgba(77,124,255,0.12)', title: 'Knowledge Brain', desc: 'Persistent memory across all AI sessions. Auto-capture decisions, discoveries, and architectural changes. Never lose context again.' },
  { icon: '🕸️', color: 'rgba(0,212,255,0.12)', title: 'Knowledge Graph', desc: 'Interactive force-directed visualization of your codebase relationships. See how agents, files, and workflows connect.' },
  { icon: '📦', color: 'rgba(0,230,138,0.12)', title: 'Multi-Workspace', desc: 'Manage 50+ repos from a single pane of glass. Git status, branches, dirty files, and context routing across projects.' },
  { icon: '⚡', color: 'rgba(255,159,67,0.12)', title: 'Auto-Capture Hooks', desc: 'Git post-commit hooks auto-log every change. Scheduled brain refresh keeps knowledge items fresh without manual work.' },
  { icon: '🔧', color: 'rgba(255,107,157,0.12)', title: 'SDK & API Access', desc: 'npm install @stoic/agentos-sdk — wrap any agent in 3 lines of code. Full REST API with API key management and webhook integrations.' },
];

const PRICING = [
  { name: 'Free', desc: 'For solo developers', price: '$0', period: '', features: ['2 workspaces', '5 agents', '10,000 obs/mo', '5 knowledge items', '3 git hook repos', 'Read-only API', 'Community support'], disabled: ['Knowledge Graph', 'Trace Timeline', 'SSO/SAML'], cta: 'Get Started Free', style: 'default' },
  { name: 'Pro', desc: 'For power users', price: '$49', period: '/mo', features: ['10 workspaces', '25 agents', '100,000 obs/mo', '25 knowledge items', '15 git hook repos', '5 team members', 'Knowledge Graph', 'Trace Timeline', 'Full API access', 'Email support (48h)'], disabled: ['SSO/SAML', 'Self-hosted'], cta: 'Start 14-Day Trial', style: 'default' },
  { name: 'Team', desc: 'For growing teams', price: '$299', period: '/mo', features: ['Unlimited workspaces', '100 agents', 'Unlimited observations', 'Unlimited knowledge items', 'Unlimited git hooks', '15 team members', 'Knowledge Graph', 'Trace Timeline', 'Full API access', 'Priority support (4h)'], disabled: ['SSO/SAML', 'Self-hosted'], cta: 'Start 14-Day Trial', style: 'featured' },
  { name: 'Enterprise', desc: 'For organizations', price: 'Custom', period: '', features: ['Everything in Team', 'Unlimited agents', 'Unlimited observations', 'Unlimited members', 'SSO/SAML', 'Self-hosted (coming soon)', 'Custom integrations', 'Dedicated CSM', 'SLA guarantee', 'Audit logs'], disabled: [], cta: 'Contact Sales', style: 'default' },
];

const COMPARE = [
  { feature: 'Agent Fleet Monitoring', us: '✅', crewai: '✅', langfuse: '❌', agentops: '🟡' },
  { feature: 'Knowledge Brain + Memory', us: '✅', crewai: '❌', langfuse: '🟡', agentops: '🟡' },
  { feature: 'Knowledge Graph', us: '✅', crewai: '❌', langfuse: '❌', agentops: '❌' },
  { feature: 'Multi-Repo Workspace', us: '✅', crewai: '❌', langfuse: '❌', agentops: '❌' },
  { feature: 'Auto-Capture (Git Hooks)', us: '✅', crewai: '❌', langfuse: '🟡', agentops: '🟡' },
  { feature: 'Brand/Voice Vault', us: '✅', crewai: '❌', langfuse: '❌', agentops: '❌' },
  { feature: 'Financial AI Agents', us: '🔜', crewai: '❌', langfuse: '❌', agentops: '❌' },
  { feature: 'Visual Dashboard', us: '✅', crewai: '🟡', langfuse: '✅', agentops: '🟡' },
  { feature: 'Open-Source Core', us: '✅', crewai: '✅', langfuse: '✅', agentops: '✅' },
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

export default function LandingPage() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    document.title = 'Stoic AgentOS — AI Agent Operations Platform';
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 30);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div className="landing">
      {/* ── NAV ── */}
      <nav className={`nav ${scrolled ? 'scrolled' : ''}`}>
        <div className="nav-inner">
          <div className="nav-logo">
            <div className="nav-logo-icon">⚡</div>
            <span>Stoic <span style={{ color: 'var(--accent-purple)' }}>AgentOS</span></span>
          </div>
          <div className="nav-links">
            {NAV_LINKS.map(l => <a key={l} className="nav-link" href={l === 'Docs' ? '/docs' : `#${l.toLowerCase()}`}>{l}</a>)}
            <a className="nav-link" href="/login">Sign In</a>
            <button className="btn btn-primary btn-sm" onClick={() => window.location.href = '/signup'}>Get Started Free</button>
          </div>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className="hero">
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
            <button className="btn btn-primary btn-lg" onClick={() => window.location.href = '/signup'}>
              🚀 Start Free — No Credit Card
            </button>
            <button className="btn btn-secondary btn-lg" onClick={() => document.getElementById('sdk')?.scrollIntoView({ behavior: 'smooth' })}>
              View SDK →
            </button>
          </div>
          <div className="hero-metrics animate-in delay-4">
            <div className="hero-metric">
              <div className="hero-metric-value" style={{ color: 'var(--accent-purple)' }}>23</div>
              <div className="hero-metric-label">Agents Managed</div>
            </div>
            <div className="hero-metric">
              <div className="hero-metric-value" style={{ color: 'var(--accent-cyan)' }}>17</div>
              <div className="hero-metric-label">Repos Connected</div>
            </div>
            <div className="hero-metric">
              <div className="hero-metric-value" style={{ color: 'var(--accent-green)' }}>$184K</div>
              <div className="hero-metric-label">Annual Savings</div>
            </div>
            <div className="hero-metric">
              <div className="hero-metric-value" style={{ color: 'var(--accent-orange)' }}>324</div>
              <div className="hero-metric-label">Observations</div>
            </div>
          </div>
        </div>
      </section>

      {/* ── INFRASTRUCTURE SIMULATION (Railway-style) ── */}
      <section className="section" style={{ paddingTop: 0 }}>
        <div className="container-wide">
          <InfraSimulation />
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section className="section" id="features">
        <div className="container section-center">
          <div className="section-label">⚡ CAPABILITIES</div>
          <h2 className="section-title">Everything your AI fleet needs</h2>
          <p className="section-sub">
            One platform to monitor agents, persist knowledge, manage workspaces, and automate operations across your entire stack.
          </p>
          <div className="features-grid">
            {FEATURES.map((f, i) => (
              <div key={i} className="feature-card animate-in" style={{ animationDelay: `${i * 0.08}s` }}>
                <div className="feature-icon" style={{ background: f.color }}>{f.icon}</div>
                <h3>{f.title}</h3>
                <p>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SDK ── */}
      <section className="section" id="sdk" style={{ background: 'var(--bg-deep)' }}>
        <div className="container">
          <div className="section-center" style={{ marginBottom: 0 }}>
            <div className="section-label">🔧 DEVELOPER SDK</div>
            <h2 className="section-title">3 lines of code to instrument any agent</h2>
            <p className="section-sub">
              npm install, import, wrap. Your agents start reporting to the Command Center immediately.
            </p>
          </div>
          <div className="code-block">
            <div className="code-header">
              <span className="code-lang">JavaScript / TypeScript</span>
              <button className="code-copy" onClick={() => navigator.clipboard?.writeText('npm install @stoic/agentos-sdk')}>📋 Copy</button>
            </div>
            <div className="code-body" dangerouslySetInnerHTML={{ __html: SDK_CODE }} />
          </div>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 32 }}>
            <div className="social-badge">📦 npm install @stoic/agentos-sdk</div>
            <div className="social-badge">🐍 pip install agentos-sdk</div>
          </div>
        </div>
      </section>

      {/* ── COMPARISON ── */}
      <section className="section" id="compare">
        <div className="container section-center">
          <div className="section-label">📊 COMPARISON</div>
          <h2 className="section-title">Why teams choose AgentOS</h2>
          <p className="section-sub">We're the only platform combining agent monitoring + knowledge persistence + workspace management in one dashboard.</p>
          <table className="compare-table">
            <thead>
              <tr>
                <th>Feature</th>
                <th className="us">⚡ AgentOS</th>
                <th>CrewAI</th>
                <th>Langfuse</th>
                <th>AgentOps</th>
              </tr>
            </thead>
            <tbody>
              {COMPARE.map((row, i) => (
                <tr key={i}>
                  <td>{row.feature}</td>
                  <td className="us">{row.us}</td>
                  <td>{row.crewai}</td>
                  <td>{row.langfuse}</td>
                  <td>{row.agentops}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── PRICING ── */}
      <section className="section" id="pricing" style={{ background: 'var(--bg-deep)' }}>
        <div className="container section-center">
          <div className="section-label">💎 PRICING</div>
          <h2 className="section-title">Start free. Scale when ready.</h2>
          <p className="section-sub">No credit card required. Upgrade as your agent fleet grows.</p>
          <div className="pricing-grid">
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
                      window.location.href = '/signup';
                    }
                  }}
                >
                  {p.cta}
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="section section-center" style={{ paddingBottom: 120 }}>
        <div className="container">
          <h2 className="section-title">Ready to command your AI fleet?</h2>
          <p className="section-sub" style={{ margin: '0 auto 32px' }}>
            Join the teams using AgentOS to ship AI faster, with full observability and zero knowledge loss.
          </p>
          <div className="hero-cta">
            <button className="btn btn-primary btn-lg" onClick={() => window.location.href = '/signup'}>🚀 Get Started Free</button>
            <button className="btn btn-secondary btn-lg" onClick={() => window.location.href = 'mailto:benjamin@stoicagentos.com?subject=AgentOS Demo Request'}>📅 Book a Demo</button>
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
              <a href="/docs">Documentation</a>
              <a href="/changelog">Changelog</a>
            </div>
            <div className="footer-col">
              <h4>Company</h4>
              <a href="/about">About</a>
              <a href="/blog">Blog</a>
              <a href="https://github.com/benjaminkernbaum-ux">GitHub</a>
              <a href="https://www.linkedin.com/company/17224756/">LinkedIn</a>
            </div>
            <div className="footer-col">
              <h4>Legal</h4>
              <a href="/privacy">Privacy Policy</a>
              <a href="/terms">Terms of Service</a>
              <a href="/security">Security</a>
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
