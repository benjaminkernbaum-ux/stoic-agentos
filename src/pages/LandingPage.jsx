import { useState, useEffect } from 'react';
import './LandingPage.css';

const NAV_LINKS = ['Features', 'SDK', 'Pricing', 'Docs'];

const FEATURES = [
  { icon: '🔌', color: 'rgba(155,89,255,0.12)', title: 'MCP-Native Capture', desc: 'Wrap any MCP client and every tool call is captured automatically — server, tool, args, latency, success/error. The post-MCP observability layer Langfuse and AgentOps were not built for.' },
  { icon: '🛑', color: 'rgba(239,68,68,0.12)', title: 'Containment & Kill Switch', desc: '60% of orgs cannot stop a misbehaving agent. We can. Pause an API key or every key in your org in one click — SDKs receive 401 within seconds and the action is logged to your audit feed.' },
  { icon: '📜', color: 'rgba(0,230,138,0.12)', title: 'EU-AI-Act Audit Trail', desc: 'Every observation is timestamped and immutable. Export the full execution ledger to satisfy high-risk system documentation obligations under the EU AI Act (Aug 2026 deadline).' },
  { icon: '🧠', color: 'rgba(77,124,255,0.12)', title: 'Knowledge Brain', desc: 'Sovereign context layer: decisions, architectures, deployments, and discoveries stored as queryable observations. Agents read their own history instead of re-deriving it every run.' },
  { icon: '📦', color: 'rgba(0,212,255,0.12)', title: 'Multi-Workspace', desc: 'Route observations across multiple repos and environments from one org. Git status, branches, and per-workspace agent fleets in a single pane.' },
  { icon: '⚡', color: 'rgba(255,159,67,0.12)', title: 'Auto-Capture Hooks', desc: 'Git post-commit and CI hooks log every change without instrumentation code. Three lines and your stack starts reporting.' },
];

const PRICING = [
  { name: 'Free', desc: 'For solo developers', price: '$0', period: '', features: ['2 workspaces', '5 agents', '10,000 obs/mo', '5 knowledge items', '3 git hook repos', 'Read-only API', 'Community support'], disabled: ['Knowledge Graph', 'Brand Vault', 'SSO/SAML'], cta: 'Get Started Free', style: 'default' },
  { name: 'Pro', desc: 'For power users', price: '$49', period: '/mo', features: ['10 workspaces', '25 agents', '100,000 obs/mo', '25 knowledge items', '15 git hook repos', '5 team members', 'Knowledge Graph', 'Brand Vault', 'Full API access', 'Email support (48h)'], disabled: ['SSO/SAML', 'Self-hosted'], cta: 'Start 14-Day Trial', style: 'default' },
  { name: 'Team', desc: 'For growing teams', price: '$299', period: '/mo', features: ['Unlimited workspaces', '100 agents', 'Unlimited observations', 'Unlimited knowledge items', 'Unlimited git hooks', '15 team members', 'Knowledge Graph', 'Brand Vault', 'Full API access', 'Priority support (4h)'], disabled: ['SSO/SAML', 'Self-hosted'], cta: 'Start 14-Day Trial', style: 'featured' },
  { name: 'Enterprise', desc: 'For organizations', price: 'Custom', period: '', features: ['Everything in Team', 'Unlimited agents', 'Unlimited observations', 'Unlimited members', 'SSO/SAML', 'Self-hosted (coming soon)', 'Custom integrations', 'Dedicated CSM', 'SLA guarantee', 'Audit logs'], disabled: [], cta: 'Contact Sales', style: 'default' },
];

const COMPARE = [
  { feature: 'Agent Fleet Monitoring', us: '✅', crewai: '✅', langfuse: '❌', agentops: '🟡' },
  { feature: 'Knowledge Brain + Memory', us: '✅', crewai: '❌', langfuse: '🟡', agentops: '🟡' },
  { feature: 'Multi-Repo Workspace', us: '✅', crewai: '❌', langfuse: '❌', agentops: '❌' },
  { feature: 'Auto-Capture (Git Hooks)', us: '✅', crewai: '❌', langfuse: '🟡', agentops: '🟡' },
  { feature: 'MCP-Native Auto-Capture', us: '✅', crewai: '❌', langfuse: '❌', agentops: '❌' },
  { feature: 'One-Click Kill Switch', us: '✅', crewai: '❌', langfuse: '❌', agentops: '❌' },
  { feature: 'EU-AI-Act Audit Export', us: '✅', crewai: '❌', langfuse: '❌', agentops: '❌' },
  { feature: 'Visual Dashboard', us: '✅', crewai: '🟡', langfuse: '✅', agentops: '🟡' },
  { feature: 'Open-Source Core', us: '✅', crewai: '✅', langfuse: '✅', agentops: '✅' },
];

const SDK_CODE = `<span class="kw">import</span> { AgentOS } <span class="kw">from</span> <span class="str">'@stoic/agentos-sdk'</span>;
<span class="kw">import</span> { Client } <span class="kw">from</span> <span class="str">'@modelcontextprotocol/sdk/client/index.js'</span>;

<span class="kw">const</span> os = <span class="kw">new</span> <span class="fn">AgentOS</span>({ apiKey: <span class="str">'sk_live_xxx'</span> });

<span class="cm">// 🔌 MCP-native: wrap any MCP client, every tool call is captured</span>
<span class="kw">const</span> github = os.<span class="fn">wrapMcpClient</span>(<span class="kw">new</span> <span class="fn">Client</span>(...), { serverName: <span class="str">'github'</span> });
<span class="kw">await</span> github.<span class="fn">callTool</span>({ name: <span class="str">'create_issue'</span>, arguments: { ... } });
<span class="cm">// → captured: latency, args, result, success/error, full audit trail</span>

<span class="cm">// 🤖 Or wrap any agent function — auto-captures runs + errors</span>
<span class="kw">const</span> summarize = os.<span class="fn">wrapAgent</span>(<span class="str">'summarizer'</span>, <span class="kw">async</span> (text) <span class="op">=></span> {
  <span class="kw">return</span> <span class="kw">await</span> <span class="fn">model</span>.<span class="fn">complete</span>(text);
});

<span class="cm">// 🛑 Misbehaving agent? Hit the kill switch from the dashboard.</span>
<span class="cm">//    Every SDK gets 401 within seconds. Action logged to audit feed.</span>`;

export default function LandingPage() {
  const [scrolled, setScrolled] = useState(false);

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
            {NAV_LINKS.map(l => <a key={l} className="nav-link" href={`#${l.toLowerCase()}`}>{l}</a>)}
            <a className="nav-link" href="/login">Sign In</a>
            <button className="btn btn-primary btn-sm" onClick={() => window.location.href = '/signup'}>Get API key →</button>
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
            The <span className="gradient-text">MCP-native</span><br />
            observability layer for AI agents
          </h1>
          <p className="hero-sub animate-in delay-2">
            Capture every tool call. Kill misbehaving agents in one click. Ship an EU-AI-Act-ready audit trail.
            Built for the post-MCP agent stack — not retrofitted from the LLM era.
          </p>
          <div className="hero-cta animate-in delay-3">
            <button className="btn btn-primary btn-lg" onClick={() => window.location.href = '/signup'}>
              ⚡ Get API key in 30s
            </button>
            <button className="btn btn-secondary btn-lg" onClick={() => document.getElementById('sdk')?.scrollIntoView({ behavior: 'smooth' })}>
              View SDK →
            </button>
          </div>
          <div className="hero-metrics animate-in delay-4">
            <div className="hero-metric">
              <div className="hero-metric-value" style={{ color: 'var(--accent-purple)', fontSize: 28 }}>🔌</div>
              <div className="hero-metric-label">MCP-native capture</div>
            </div>
            <div className="hero-metric">
              <div className="hero-metric-value" style={{ color: 'var(--accent-red)', fontSize: 28 }}>🛑</div>
              <div className="hero-metric-label">One-click kill switch</div>
            </div>
            <div className="hero-metric">
              <div className="hero-metric-value" style={{ color: 'var(--accent-green)', fontSize: 28 }}>📜</div>
              <div className="hero-metric-label">EU AI Act audit trail</div>
            </div>
            <div className="hero-metric">
              <div className="hero-metric-value" style={{ color: 'var(--accent-orange)', fontSize: 28 }}>⚡</div>
              <div className="hero-metric-label">3 lines to install</div>
            </div>
          </div>
        </div>
      </section>

      {/* ── DASHBOARD PREVIEW ── */}
      <section className="section" style={{ paddingTop: 0 }}>
        <div className="container-wide">
          <div className="preview-frame animate-in">
            <div className="preview-bar">
              <div className="preview-dot red" /><div className="preview-dot yellow" /><div className="preview-dot green" />
              <div className="preview-url">app.stoicagentos.com/dashboard</div>
            </div>
            <div className="preview-content">
              <div className="dashboard-preview">
                <div className="dp-sidebar">
                  <div className="dp-logo">⚡ AgentOS</div>
                  <div className="dp-nav-item active">📊 Overview</div>
                  <div className="dp-nav-item">🤖 Agents</div>
                  <div className="dp-nav-item">📦 Workspaces</div>
                  <div className="dp-nav-item">🧠 Brain</div>
                  <div className="dp-nav-item">🕸️ Graph</div>
                  <div className="dp-nav-item">⚙️ Settings</div>
                </div>
                <div className="dp-main">
                  <div className="dp-header">
                    <div className="dp-title">Agent Fleet Overview</div>
                    <div className="dp-badges">
                      <span className="dp-badge green">15 Live</span>
                      <span className="dp-badge purple">5 Deployed</span>
                      <span className="dp-badge orange">3 Pending</span>
                    </div>
                  </div>
                  <div className="dp-stats">
                    <div className="dp-stat"><div className="dp-stat-val">23</div><div className="dp-stat-label">Total Agents</div></div>
                    <div className="dp-stat"><div className="dp-stat-val">17</div><div className="dp-stat-label">Repos</div></div>
                    <div className="dp-stat"><div className="dp-stat-val">324</div><div className="dp-stat-label">Observations</div></div>
                    <div className="dp-stat"><div className="dp-stat-val">7</div><div className="dp-stat-label">Knowledge Items</div></div>
                  </div>
                  <div className="dp-agents-row">
                    {['AUTO', 'WIRE', 'STOICBOT', 'FINCFO', 'LEDGER', 'SCRAPE', 'ADGEN', 'REPLY'].map((a, i) => (
                      <div key={a} className="dp-agent">
                        <div className="dp-agent-dot" style={{ background: i < 5 ? 'var(--accent-green)' : 'var(--accent-orange)' }} />
                        <span>{a}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
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
                <button className={`btn ${p.style === 'featured' ? 'btn-primary' : 'btn-secondary'}`} style={{ width: '100%', justifyContent: 'center' }}>
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
            <button className="btn btn-primary btn-lg">🚀 Get Started Free</button>
            <button className="btn btn-secondary btn-lg">📅 Book a Demo</button>
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
              <a href="https://linkedin.com/company/stoic-crm">LinkedIn</a>
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
