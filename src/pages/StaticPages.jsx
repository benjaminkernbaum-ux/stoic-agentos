/**
 * Stoic AgentOS — Static Content Pages
 * About, Blog, Changelog, Privacy, Terms, Security, 404
 * All share the same dark monochromatic layout
 */
import { useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import './StaticPages.css';

function PageShell({ title, subtitle, children }) {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  useEffect(() => { document.title = `${title} — Stoic AgentOS`; }, [title]);

  return (
    <div className="sp">
      <nav className="sp-nav">
        <Link to="/" className="sp-logo">⚡ <span>Stoic AgentOS</span></Link>
        <div className="sp-nav-links">
          <Link to="/docs">Docs</Link>
          <Link to="/#pricing">Pricing</Link>
          <a href="https://github.com/benjaminkernbaum-ux/stoic-agentos" target="_blank" rel="noreferrer">GitHub</a>
        </div>
      </nav>
      <header className="sp-hero">
        <h1>{title}</h1>
        {subtitle && <p className="sp-subtitle">{subtitle}</p>}
      </header>
      <main className="sp-body">{children}</main>
      <footer className="sp-footer">
        <Link to="/">← Back to Home</Link>
        <span>© 2026 Stoic AgentOS</span>
      </footer>
    </div>
  );
}

/* ═══════════════════════════════════════ */
/*  ABOUT                                  */
/* ═══════════════════════════════════════ */
export function AboutPage() {
  return (
    <PageShell title="About" subtitle="The team behind AgentOS">
      <section className="sp-section">
        <h2>Our Mission</h2>
        <p>
          Stoic AgentOS was born from a simple observation: AI agents are proliferating across every 
          organization, yet there's no unified operating system to manage them. We're building the 
          infrastructure layer that lets engineering teams <strong>monitor, orchestrate, and scale</strong> their 
          entire AI agent fleet from a single dashboard.
        </p>
      </section>

      <section className="sp-section">
        <h2>The Problem</h2>
        <div className="sp-grid">
          <div className="sp-card">
            <div className="sp-card-icon">🔍</div>
            <h3>No Visibility</h3>
            <p>Teams run 10–50+ agents with zero centralized observability. When something breaks, it's a guessing game.</p>
          </div>
          <div className="sp-card">
            <div className="sp-card-icon">🧠</div>
            <h3>Lost Context</h3>
            <p>Every agent conversation is ephemeral. Architectural decisions, code patterns, and domain knowledge vanish after each session.</p>
          </div>
          <div className="sp-card">
            <div className="sp-card-icon">📊</div>
            <h3>No Orchestration</h3>
            <p>Agents operate independently with no coordination layer. There's no way to route tasks, enforce policies, or manage dependencies.</p>
          </div>
        </div>
      </section>

      <section className="sp-section">
        <h2>The Founder</h2>
        <div className="sp-founder">
          <div className="sp-founder-avatar">BK</div>
          <div>
            <h3>Benjamin Kernbaum</h3>
            <p className="sp-founder-role">Founder & CEO</p>
            <p>
              Full-stack engineer and serial builder with deep experience in AI automation, SaaS infrastructure, 
              and fintech. Previously built autonomous trading systems and multi-agent content pipelines.
            </p>
            <div className="sp-founder-links">
              <a href="https://github.com/benjaminkernbaum-ux" target="_blank" rel="noreferrer">GitHub</a>
              <a href="https://www.linkedin.com/company/17224756/" target="_blank" rel="noreferrer">LinkedIn</a>
            </div>
          </div>
        </div>
      </section>

      <section className="sp-section">
        <h2>Tech Stack</h2>
        <div className="sp-stack">
          {[
            { name: 'React', desc: 'Frontend SPA' },
            { name: 'Express.js', desc: 'API Server' },
            { name: 'Supabase', desc: 'Auth + PostgreSQL' },
            { name: 'Railway', desc: 'API Hosting' },
            { name: 'Vercel', desc: 'Frontend CDN' },
            { name: 'Stripe', desc: 'Billing & Subscriptions' },
          ].map(t => (
            <div key={t.name} className="sp-stack-item">
              <strong>{t.name}</strong>
              <span>{t.desc}</span>
            </div>
          ))}
        </div>
      </section>
    </PageShell>
  );
}

/* ═══════════════════════════════════════ */
/*  BLOG                                   */
/* ═══════════════════════════════════════ */
export function BlogPage() {
  const posts = [
    {
      date: 'May 15, 2026',
      title: 'Introducing Stoic AgentOS — The Operating System for AI Agent Fleets',
      excerpt: 'Today we\'re publicly launching Stoic AgentOS, a platform that gives engineering teams full visibility and control over their AI agents. Here\'s why we built it and what\'s next.',
      tag: 'Launch',
    },
    {
      date: 'May 12, 2026',
      title: 'Why Every AI Team Needs an Agent Observability Layer',
      excerpt: 'Your AI agents are making decisions, writing code, and interacting with production systems — but can you see what they\'re doing? We explore why agent observability is the next critical infrastructure gap.',
      tag: 'Engineering',
    },
    {
      date: 'May 8, 2026',
      title: 'Building a Knowledge Brain for Persistent AI Context',
      excerpt: 'How we designed the Knowledge Items system to give AI agents persistent memory across sessions, eliminating the cold-start problem that plagues every multi-agent setup.',
      tag: 'Architecture',
    },
  ];

  return (
    <PageShell title="Blog" subtitle="Engineering insights, product updates, and AI agent best practices">
      <div className="sp-blog-list">
        {posts.map((p, i) => (
          <article key={i} className="sp-blog-card">
            <div className="sp-blog-meta">
              <span className="sp-blog-date">{p.date}</span>
              <span className="sp-blog-tag">{p.tag}</span>
            </div>
            <h2>{p.title}</h2>
            <p>{p.excerpt}</p>
            <span className="sp-blog-cta">Read more →</span>
          </article>
        ))}
      </div>
    </PageShell>
  );
}

/* ═══════════════════════════════════════ */
/*  CHANGELOG                              */
/* ═══════════════════════════════════════ */
export function ChangelogPage() {
  const releases = [
    {
      version: 'v1.4.0',
      date: 'May 17, 2026',
      items: [
        { type: 'feat', text: 'Railway-style interactive infrastructure simulation (5 views)' },
        { type: 'feat', text: 'Smooth cubic bezier chart curves with glow effects' },
        { type: 'fix', text: 'Monitor view layout overlap with tab bar' },
        { type: 'feat', text: 'Error logs table in Monitor view' },
      ],
    },
    {
      version: 'v1.3.0',
      date: 'May 15, 2026',
      items: [
        { type: 'feat', text: 'Documentation page with sidebar navigation' },
        { type: 'feat', text: 'Hacker News Show HN launch post' },
        { type: 'fix', text: 'Security audit — removed supabase/.temp/ from git tracking' },
        { type: 'feat', text: 'GitHub star badges and CTA in README' },
      ],
    },
    {
      version: 'v1.2.0',
      date: 'May 14, 2026',
      items: [
        { type: 'feat', text: 'Interactive Onboarding Tour component' },
        { type: 'feat', text: 'Monochromatic Apple-inspired Dashboard redesign' },
        { type: 'fix', text: 'Mobile Google OAuth infinite loading loop' },
        { type: 'feat', text: 'Responsive sidebar with mobile toggle' },
      ],
    },
    {
      version: 'v1.1.0',
      date: 'May 14, 2026',
      items: [
        { type: 'feat', text: 'Supabase Auth integration (Email + Google OAuth)' },
        { type: 'feat', text: 'Stripe billing with checkout + customer portal' },
        { type: 'feat', text: 'API key management (masked display, revocation)' },
        { type: 'feat', text: 'Plan-based rate limiting (Free/Pro/Team/Enterprise)' },
      ],
    },
    {
      version: 'v1.0.0',
      date: 'May 13, 2026',
      items: [
        { type: 'feat', text: 'Initial release — Landing page, API server, SDK' },
        { type: 'feat', text: '15 REST API endpoints for agent fleet management' },
        { type: 'feat', text: 'Node.js SDK with wrapAgent() and observe()' },
        { type: 'feat', text: 'Vercel + Railway + Supabase deployment' },
      ],
    },
  ];

  const typeColors = { feat: '#4ade80', fix: '#f59e0b', breaking: '#ef4444' };
  const typeLabels = { feat: 'NEW', fix: 'FIX', breaking: 'BREAKING' };

  return (
    <PageShell title="Changelog" subtitle="What's new in Stoic AgentOS">
      <div className="sp-changelog">
        {releases.map((r, i) => (
          <div key={i} className="sp-release">
            <div className="sp-release-header">
              <span className="sp-version">{r.version}</span>
              <span className="sp-release-date">{r.date}</span>
            </div>
            <ul className="sp-release-items">
              {r.items.map((item, j) => (
                <li key={j}>
                  <span className="sp-release-tag" style={{ background: `${typeColors[item.type]}22`, color: typeColors[item.type] }}>
                    {typeLabels[item.type]}
                  </span>
                  {item.text}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </PageShell>
  );
}

/* ═══════════════════════════════════════ */
/*  PRIVACY POLICY                         */
/* ═══════════════════════════════════════ */
export function PrivacyPage() {
  return (
    <PageShell title="Privacy Policy" subtitle="Last updated: May 28, 2026">
      <section className="sp-section sp-legal">
        <h2>1. Information We Collect</h2>
        <p>We collect information you provide directly when you create an account or use the Service:</p>
        <ul>
          <li><strong>Account information:</strong> Email address, full name, and organization name, collected via Supabase Auth (email/password and Google OAuth).</li>
          <li><strong>Billing information:</strong> Payment method details (credit/debit card) are collected and processed exclusively by Stripe. Stoic AgentOS never stores your full card number, CVV, or expiration date on our servers.</li>
          <li><strong>Usage data:</strong> Agent observation payloads, metadata, knowledge items, and workspace configurations you send to our API endpoints.</li>
          <li><strong>AI interaction data:</strong> Prompts and content you submit through AI-powered features (e.g., agent analysis, knowledge summarization) are processed by Anthropic Claude. We transmit only the minimum data necessary to provide the feature.</li>
          <li><strong>Technical data:</strong> IP address, browser type, device information, and access timestamps collected automatically when you visit our site.</li>
        </ul>

        <h2>2. How We Use Your Data</h2>
        <p>We use your data to provide, maintain, and improve the Stoic AgentOS platform. Specifically:</p>
        <ul>
          <li>Authenticate your identity and manage your account via Supabase Auth</li>
          <li>Store and display your agent observations, knowledge items, and workspace data</li>
          <li>Process subscription billing and invoicing through Stripe</li>
          <li>Power AI features using Anthropic Claude (e.g., agent analysis, anomaly detection, natural-language queries)</li>
          <li>Send transactional emails related to your account (e.g., password resets, billing receipts)</li>
          <li>Monitor service performance, detect abuse, and improve platform reliability</li>
        </ul>

        <h2>3. Cookies &amp; Session Management</h2>
        <p>Stoic AgentOS uses cookies strictly for authentication and session management. When you sign in, a secure, HTTP-only session cookie is set to maintain your authenticated state. We do <strong>not</strong> use advertising cookies, tracking pixels, or third-party analytics cookies. By using the Service, you consent to the use of these essential cookies.</p>

        <h2>4. Data Storage &amp; Security</h2>
        <p>Your data is stored in Supabase (PostgreSQL), hosted on Amazon Web Services (AWS) infrastructure. We employ the following security measures:</p>
        <ul>
          <li>Row Level Security (RLS) policies on every table ensuring complete tenant isolation</li>
          <li>Encryption in transit via TLS 1.3 for all connections</li>
          <li>Encryption at rest via AES-256 for all stored data</li>
          <li>API keys hashed with SHA-256 before storage — we cannot recover your raw key</li>
          <li>Regular automated backups with point-in-time recovery</li>
        </ul>

        <h2>5. Third-Party Services</h2>
        <p>We share data with the following third-party processors only as necessary to operate the Service:</p>
        <ul>
          <li><strong>Supabase</strong> (hosted on AWS) — Authentication, database, and file storage</li>
          <li><strong>Stripe</strong> — Payment processing and subscription management. Stripe's privacy policy: <a href="https://stripe.com/privacy" target="_blank" rel="noreferrer">stripe.com/privacy</a></li>
          <li><strong>Anthropic</strong> — AI model provider (Claude) for intelligent features. Data sent to Anthropic is not used to train their models. Anthropic's privacy policy: <a href="https://www.anthropic.com/privacy" target="_blank" rel="noreferrer">anthropic.com/privacy</a></li>
          <li><strong>Vercel</strong> — Frontend hosting and CDN</li>
          <li><strong>Railway</strong> — API server hosting</li>
        </ul>

        <h2>6. Your Rights</h2>
        <p>Depending on your location, you may have the following rights regarding your personal data:</p>
        <ul>
          <li><strong>Access:</strong> Request a copy of the personal data we hold about you</li>
          <li><strong>Deletion:</strong> Request deletion of your account and associated data</li>
          <li><strong>Correction:</strong> Request correction of inaccurate personal data</li>
          <li><strong>Export:</strong> Request a machine-readable export of your data</li>
          <li><strong>Objection:</strong> Object to certain processing of your data</li>
        </ul>
        <p>To exercise any of these rights, contact us at <strong>privacy@stoicagentos.com</strong>. We will respond within 30 days.</p>

        <h2>7. Contact</h2>
        <p>For privacy-related inquiries: <strong>privacy@stoicagentos.com</strong></p>
      </section>
    </PageShell>
  );
}

/* ═══════════════════════════════════════ */
/*  TERMS OF SERVICE                       */
/* ═══════════════════════════════════════ */
export function TermsPage() {
  return (
    <PageShell title="Terms of Service" subtitle="Last updated: May 15, 2026">
      <section className="sp-section sp-legal">
        <h2>1. Acceptance of Terms</h2>
        <p>By accessing or using Stoic AgentOS ("the Service"), you agree to be bound by these Terms of Service. If you do not agree, do not use the Service.</p>

        <h2>2. Description of Service</h2>
        <p>Stoic AgentOS is a SaaS platform that provides AI agent fleet management, observability, and orchestration tools. The Service includes a web dashboard, REST API, and SDK.</p>

        <h2>3. Account Responsibilities</h2>
        <ul>
          <li>You must provide accurate information when creating an account</li>
          <li>You are responsible for maintaining the security of your API keys</li>
          <li>You must not share your account credentials</li>
          <li>You are responsible for all activity under your account</li>
        </ul>

        <h2>4. Acceptable Use</h2>
        <p>You may not use the Service to:</p>
        <ul>
          <li>Violate any applicable laws or regulations</li>
          <li>Transmit malicious code or attempt to compromise the Service</li>
          <li>Exceed your plan's rate limits through circumvention</li>
          <li>Resell access to the Service without authorization</li>
        </ul>

        <h2>5. Billing & Subscriptions</h2>
        <p>Paid plans are billed monthly. You may upgrade, downgrade, or cancel at any time through the billing portal. Refunds are handled on a case-by-case basis.</p>

        <h2>6. Data Ownership</h2>
        <p>You retain ownership of all data you submit to the Service. We do not claim any intellectual property rights over your observations, agents, or knowledge items.</p>

        <h2>7. Service Availability</h2>
        <p>We target 99.9% uptime but do not guarantee uninterrupted service. Scheduled maintenance will be communicated in advance.</p>

        <h2>8. Limitation of Liability</h2>
        <p>The Service is provided "as is" without warranties. Stoic AgentOS shall not be liable for any indirect, incidental, or consequential damages arising from your use of the Service.</p>

        <h2>9. Contact</h2>
        <p>Questions about these terms: <strong>legal@stoicagentos.com</strong></p>
      </section>
    </PageShell>
  );
}

/* ═══════════════════════════════════════ */
/*  SECURITY                               */
/* ═══════════════════════════════════════ */
export function SecurityPage() {
  return (
    <PageShell title="Security" subtitle="How we protect your data">
      <section className="sp-section">
        <h2>Infrastructure Security</h2>
        <div className="sp-grid">
          <div className="sp-card">
            <div className="sp-card-icon">🔐</div>
            <h3>Encryption</h3>
            <p>All data encrypted in transit (TLS 1.3) and at rest (AES-256). API keys are hashed with SHA-256 before storage.</p>
          </div>
          <div className="sp-card">
            <div className="sp-card-icon">🛡️</div>
            <h3>Tenant Isolation</h3>
            <p>Row Level Security (RLS) policies on every table ensure complete data isolation between organizations.</p>
          </div>
          <div className="sp-card">
            <div className="sp-card-icon">🔑</div>
            <h3>Authentication</h3>
            <p>Supabase Auth with JWT tokens, OAuth 2.0 (Google), and API key authentication with automatic rotation support.</p>
          </div>
        </div>
      </section>

      <section className="sp-section">
        <h2>Application Security</h2>
        <ul className="sp-security-list">
          <li>✅ No secrets committed to version control (verified via automated scanning)</li>
          <li>✅ Service role keys are server-side only, never exposed to the frontend</li>
          <li>✅ API keys masked in responses (only first 12 + last 4 characters shown)</li>
          <li>✅ CORS configured to accept only verified origins</li>
          <li>✅ Security headers: X-Frame-Options: DENY, X-Content-Type-Options: nosniff</li>
          <li>✅ Plan-based rate limiting prevents abuse</li>
          <li>✅ Stripe webhook signature verification for billing events</li>
        </ul>
      </section>

      <section className="sp-section">
        <h2>Responsible Disclosure</h2>
        <p>
          If you discover a security vulnerability, please report it responsibly to 
          <strong> security@stoicagentos.com</strong>. We will acknowledge receipt within 24 hours 
          and provide a detailed response within 72 hours.
        </p>
      </section>
    </PageShell>
  );
}

/* ═══════════════════════════════════════ */
/*  404                                    */
/* ═══════════════════════════════════════ */
export function NotFoundPage() {
  return (
    <PageShell title="404" subtitle="Page not found">
      <div className="sp-404">
        <div className="sp-404-code">404</div>
        <p>The page you're looking for doesn't exist or has been moved.</p>
        <Link to="/" className="sp-404-btn">← Back to Home</Link>
      </div>
    </PageShell>
  );
}
