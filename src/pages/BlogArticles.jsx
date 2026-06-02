/**
 * Stoic AgentOS — Blog Article Pages
 * Full-length articles rendered inside the static-page dark shell.
 * Reuses StaticPages.css classes for visual consistency.
 */
import { useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import './StaticPages.css';

/* ─── Shared article shell ─── */
function ArticleShell({ title, subtitle, children }) {
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
        <Link to="/blog">← Back to Blog</Link>
        <span>© 2026 Stoic AgentOS</span>
      </footer>
    </div>
  );
}

/* ═══════════════════════════════════════ */
/*  ARTICLE 1 — Why Traditional APM Fails */
/* ═══════════════════════════════════════ */
function WhyApmFails() {
  return (
    <ArticleShell
      title="Why Traditional APM Fails for AI Agents"
      subtitle="Benjamin Kernbaum · May 2026 · 7 min read"
    >
      <section className="sp-section">
        <h2>The Problem</h2>
        <p>
          Traditional Application Performance Monitoring (APM) was built for a world of HTTP requests, database
          queries, and microservice calls. Tools like Datadog, New Relic, and Dynatrace excel at tracking latency
          percentiles, error rates, and throughput across well-defined service boundaries.
        </p>
        <p>
          But AI agents don't operate like microservices. They <strong>reason</strong>. They make multi-step decisions,
          invoke tools, consult memory, and dynamically adjust their execution paths. A single agent "request" might
          involve 15 LLM calls, 4 tool invocations, 2 memory retrievals, and a decision tree that branches based on
          intermediate results.
        </p>
        <p>
          Traditional APM sees this as one HTTP span — or worse, a disconnected soup of traces with no semantic
          relationship. You get latency numbers but zero insight into <em>why</em> the agent chose a particular path,
          <em>what</em> context it used, or <em>where</em> in its reasoning chain things went wrong.
        </p>
      </section>

      <section className="sp-section">
        <h2>What Agents Actually Need</h2>
        <p>
          Agent observability requires fundamentally different primitives than traditional APM:
        </p>
        <ul>
          <li>
            <strong>Reasoning traces, not HTTP spans.</strong> You need to see the full chain-of-thought: which tools
            were called, what the LLM considered, and how intermediate results influenced downstream decisions.
          </li>
          <li>
            <strong>Memory and context tracking.</strong> Agents pull from knowledge bases, conversation history, and
            retrieval-augmented pipelines. You need visibility into what context was retrieved and whether it was
            actually relevant.
          </li>
          <li>
            <strong>Cost attribution.</strong> A single agent run can burn through thousands of tokens across multiple
            models. You need per-agent, per-task, and per-model cost breakdowns — not just aggregate API spend.
          </li>
          <li>
            <strong>Compliance and audit trails.</strong> When an agent makes a decision that impacts production, you
            need an immutable record of its inputs, reasoning, and outputs for governance and debugging.
          </li>
        </ul>
      </section>

      <section className="sp-section">
        <h2>The Solution: Agent-Native Observability</h2>
        <p>
          Stoic AgentOS was built from the ground up for this new paradigm. Instead of retrofitting HTTP-centric
          monitoring onto AI workloads, we provide first-class primitives for agent reasoning, memory, and
          orchestration.
        </p>
        <p>
          With the Stoic SDK, instrumenting your agents takes two lines of code:
        </p>
        <pre style={{
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 10,
          padding: '20px 24px',
          fontSize: 13,
          lineHeight: 1.7,
          color: 'rgba(255,255,255,0.7)',
          overflowX: 'auto',
          fontFamily: "'JetBrains Mono', monospace",
        }}>
{`import { StoicAgent } from 'stoic-agentos-sdk';

const agent = new StoicAgent({
  name: 'code-reviewer',
  apiKey: process.env.STOIC_API_KEY,
});

// Every tool call, LLM invocation, and decision
// is automatically traced and sent to your dashboard.
const result = await agent.observe('review-pr', async (ctx) => {
  const diff = await ctx.tool('github.getPRDiff', { pr: 1234 });
  const analysis = await ctx.llm('claude-3.5', {
    prompt: \`Review this diff:\\n\${diff}\`,
  });
  return analysis;
});`}
        </pre>
        <p>
          Every observation is captured with full context: the agent's identity, the task it was performing, which
          tools and models were invoked, token counts, latencies, costs, and the complete reasoning chain. All
          searchable, filterable, and visualizable in the Stoic dashboard.
        </p>
      </section>

      <section className="sp-section">
        <h2>Ready to See Your Agents Clearly?</h2>
        <p>
          Stop guessing what your agents are doing. Stoic AgentOS gives you the full picture — from high-level fleet
          health to individual reasoning traces.
        </p>
        <p>
          <Link to="/signup" style={{ color: '#9b59ff', fontWeight: 600, textDecoration: 'none' }}>
            Get started for free →
          </Link>
        </p>
      </section>
    </ArticleShell>
  );
}

/* ═══════════════════════════════════════════ */
/*  ARTICLE 2 — Market Consolidation          */
/* ═══════════════════════════════════════════ */
function MarketConsolidation() {
  return (
    <ArticleShell
      title="The AI Observability Market Is Consolidating"
      subtitle="Benjamin Kernbaum · June 2026 · 6 min read"
    >
      <section className="sp-section">
        <h2>4 Acquisitions That Changed the Landscape</h2>
        <p>
          In the span of 18 months, four major acquisitions reshaped the AI observability and evaluation market.
          Here's what happened — and what it means for teams that depend on these tools.
        </p>

        <div className="sp-grid" style={{ marginTop: 20 }}>
          <div className="sp-card">
            <div className="sp-card-icon">🔄</div>
            <h3>Langfuse → ClickHouse</h3>
            <p>
              The popular open-source LLM observability platform was acquired by ClickHouse, the analytics database
              company. Langfuse's tracing capabilities are being absorbed into ClickHouse's data platform — raising
              questions about continued open-source investment and independent roadmap.
            </p>
          </div>
          <div className="sp-card">
            <div className="sp-card-icon">📄</div>
            <h3>Helicone → Mintlify</h3>
            <p>
              Helicone, the LLM proxy and logging platform, was acquired by Mintlify, a developer documentation
              company. The acquisition shifts Helicone's focus toward docs-integrated AI tooling rather than
              standalone observability.
            </p>
          </div>
          <div className="sp-card">
            <div className="sp-card-icon">🏋️</div>
            <h3>Weights & Biases → CoreWeave ($1.7B)</h3>
            <p>
              The $1.7 billion acquisition of W&B by GPU cloud provider CoreWeave was the largest deal in the space.
              W&B's experiment tracking and ML observability platform is now part of CoreWeave's compute
              infrastructure stack — a vertical integration play.
            </p>
          </div>
          <div className="sp-card">
            <div className="sp-card-icon">🌐</div>
            <h3>Galileo → Cisco</h3>
            <p>
              Galileo, the AI evaluation and hallucination detection platform, was acquired by networking giant
              Cisco as part of its enterprise AI push. Galileo's technology is being integrated into Cisco's
              broader AI infrastructure portfolio.
            </p>
          </div>
        </div>
      </section>

      <section className="sp-section">
        <h2>What This Means for Your Team</h2>
        <p>
          Consolidation always follows the same pattern: the acquiring company promises to maintain the product,
          then gradually shifts priorities to serve their core business. For teams that built workflows around
          these tools, the risks are real:
        </p>
        <ul>
          <li>
            <strong>Vendor lock-in deepens.</strong> When your observability tool is owned by a cloud provider or
            infrastructure company, your data becomes another lever for platform retention.
          </li>
          <li>
            <strong>Pricing increases are inevitable.</strong> Independent startups compete on price. Acquired
            products eventually adopt enterprise pricing aligned with the parent company's ASP targets.
          </li>
          <li>
            <strong>Roadmap alignment shifts.</strong> Features that served your use case get deprioritized in
            favor of integrations that serve the acquirer's ecosystem.
          </li>
          <li>
            <strong>Open-source commitments weaken.</strong> Acquisition often marks the beginning of the
            "open-core tightening" cycle, where previously free features move behind a paywall.
          </li>
        </ul>
      </section>

      <section className="sp-section">
        <h2>The Independent Alternative</h2>
        <p>
          Stoic AgentOS is purpose-built, independently funded, and laser-focused on one thing: giving engineering
          teams complete observability and control over their AI agent fleets.
        </p>
        <p>
          We're not a side project inside a database company. We're not being absorbed into a cloud provider's
          portfolio. We're not pivoting to serve an acquirer's strategic agenda.
        </p>
        <p>
          Our incentives are aligned with yours: build the best agent observability platform, period.
        </p>
      </section>

      <section className="sp-section">
        <h2>Choosing Your Stack</h2>
        <p>
          When evaluating AI observability tools in 2026, ask these questions:
        </p>
        <ul>
          <li>Is this company independent, or owned by a platform with competing priorities?</li>
          <li>Will this tool still exist as a standalone product in 2 years?</li>
          <li>Can I export my data easily if I need to switch?</li>
          <li>Is the pricing transparent and predictable?</li>
          <li>Is the roadmap driven by users or by an acquirer's strategy?</li>
        </ul>
        <p>
          <Link to="/signup" style={{ color: '#9b59ff', fontWeight: 600, textDecoration: 'none' }}>
            Try Stoic AgentOS free →
          </Link>
        </p>
      </section>
    </ArticleShell>
  );
}

/* ═══════════════════════════════════════════════ */
/*  ARTICLE 3 — Comparison Guide                   */
/* ═══════════════════════════════════════════════ */
function ComparisonArticle() {
  const tableStyle = {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: 13,
    marginTop: 16,
    marginBottom: 24,
  };
  const thStyle = {
    textAlign: 'left',
    padding: '12px 14px',
    borderBottom: '1px solid rgba(255,255,255,0.1)',
    color: '#fff',
    fontWeight: 700,
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
    whiteSpace: 'nowrap',
  };
  const tdStyle = {
    padding: '10px 14px',
    borderBottom: '1px solid rgba(255,255,255,0.04)',
    color: 'rgba(255,255,255,0.55)',
    fontSize: 13,
    lineHeight: 1.5,
  };
  const check = <span style={{ color: '#4ade80' }}>✓</span>;
  const cross = <span style={{ color: 'rgba(255,255,255,0.2)' }}>✗</span>;
  const partial = <span style={{ color: '#f59e0b' }}>◐</span>;

  return (
    <ArticleShell
      title="Langfuse vs LangSmith vs Braintrust vs Stoic AgentOS: 2026 Comparison"
      subtitle="Benjamin Kernbaum · June 2026 · 10 min read"
    >
      <section className="sp-section">
        <h2>Overview</h2>
        <p>
          Choosing the right AI observability platform in 2026 means navigating a rapidly shifting landscape.
          Langfuse has been acquired by ClickHouse, LangSmith is tightly coupled to the LangChain ecosystem,
          Braintrust is focused on evaluation-first workflows, and Stoic AgentOS is the independent,
          agent-native alternative.
        </p>
        <p>
          This guide compares the four platforms across the dimensions that matter most: feature coverage,
          pricing, independence, and developer experience.
        </p>
      </section>

      <section className="sp-section">
        <h2>Feature Comparison</h2>
        <div style={{ overflowX: 'auto' }}>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>Feature</th>
                <th style={thStyle}>Langfuse</th>
                <th style={thStyle}>LangSmith</th>
                <th style={thStyle}>Braintrust</th>
                <th style={{ ...thStyle, color: '#9b59ff' }}>Stoic AgentOS</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={{ ...tdStyle, color: '#fff', fontWeight: 600 }}>LLM Tracing</td>
                <td style={tdStyle}>{check} Full</td>
                <td style={tdStyle}>{check} Full</td>
                <td style={tdStyle}>{check} Full</td>
                <td style={tdStyle}>{check} Full</td>
              </tr>
              <tr>
                <td style={{ ...tdStyle, color: '#fff', fontWeight: 600 }}>Agent Fleet Management</td>
                <td style={tdStyle}>{cross} No</td>
                <td style={tdStyle}>{partial} Basic</td>
                <td style={tdStyle}>{cross} No</td>
                <td style={tdStyle}>{check} Full</td>
              </tr>
              <tr>
                <td style={{ ...tdStyle, color: '#fff', fontWeight: 600 }}>Persistent Knowledge / Memory</td>
                <td style={tdStyle}>{cross} No</td>
                <td style={tdStyle}>{cross} No</td>
                <td style={tdStyle}>{cross} No</td>
                <td style={tdStyle}>{check} Knowledge Brain</td>
              </tr>
              <tr>
                <td style={{ ...tdStyle, color: '#fff', fontWeight: 600 }}>Multi-Agent Orchestration</td>
                <td style={tdStyle}>{cross} No</td>
                <td style={tdStyle}>{partial} LangGraph only</td>
                <td style={tdStyle}>{cross} No</td>
                <td style={tdStyle}>{check} Framework-agnostic</td>
              </tr>
              <tr>
                <td style={{ ...tdStyle, color: '#fff', fontWeight: 600 }}>Prompt Management</td>
                <td style={tdStyle}>{check} Full</td>
                <td style={tdStyle}>{check} Hub</td>
                <td style={tdStyle}>{check} Full</td>
                <td style={tdStyle}>{partial} Roadmap</td>
              </tr>
              <tr>
                <td style={{ ...tdStyle, color: '#fff', fontWeight: 600 }}>Evals / Scoring</td>
                <td style={tdStyle}>{check} Full</td>
                <td style={tdStyle}>{check} Full</td>
                <td style={tdStyle}>{check} Full</td>
                <td style={tdStyle}>{check} Built-in</td>
              </tr>
              <tr>
                <td style={{ ...tdStyle, color: '#fff', fontWeight: 600 }}>Cost Tracking</td>
                <td style={tdStyle}>{check} Per-trace</td>
                <td style={tdStyle}>{partial} Aggregate</td>
                <td style={tdStyle}>{check} Per-trace</td>
                <td style={tdStyle}>{check} Per-agent & per-task</td>
              </tr>
              <tr>
                <td style={{ ...tdStyle, color: '#fff', fontWeight: 600 }}>Self-Host Option</td>
                <td style={tdStyle}>{check} Docker</td>
                <td style={tdStyle}>{cross} No</td>
                <td style={tdStyle}>{cross} No</td>
                <td style={tdStyle}>{check} Open-source</td>
              </tr>
              <tr>
                <td style={{ ...tdStyle, color: '#fff', fontWeight: 600 }}>Framework Lock-in</td>
                <td style={tdStyle}>{check} None</td>
                <td style={tdStyle}>{cross} LangChain-centric</td>
                <td style={tdStyle}>{check} None</td>
                <td style={tdStyle}>{check} None</td>
              </tr>
              <tr>
                <td style={{ ...tdStyle, color: '#fff', fontWeight: 600 }}>Independent Company</td>
                <td style={tdStyle}>{cross} Acquired (ClickHouse)</td>
                <td style={tdStyle}>{partial} VC-funded</td>
                <td style={tdStyle}>{partial} VC-funded</td>
                <td style={tdStyle}>{check} Independent</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section className="sp-section">
        <h2>Pricing Comparison</h2>
        <div style={{ overflowX: 'auto' }}>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>Plan</th>
                <th style={thStyle}>Langfuse</th>
                <th style={thStyle}>LangSmith</th>
                <th style={thStyle}>Braintrust</th>
                <th style={{ ...thStyle, color: '#9b59ff' }}>Stoic AgentOS</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={{ ...tdStyle, color: '#fff', fontWeight: 600 }}>Free Tier</td>
                <td style={tdStyle}>50K observations/mo</td>
                <td style={tdStyle}>5K traces/mo</td>
                <td style={tdStyle}>1K logs/mo</td>
                <td style={tdStyle}>10,000 observations/mo</td>
              </tr>
              <tr>
                <td style={{ ...tdStyle, color: '#fff', fontWeight: 600 }}>Pro / Team</td>
                <td style={tdStyle}>$59/mo</td>
                <td style={tdStyle}>$39/seat/mo</td>
                <td style={tdStyle}>$25/seat/mo + usage</td>
                <td style={tdStyle}>$29/mo flat</td>
              </tr>
              <tr>
                <td style={{ ...tdStyle, color: '#fff', fontWeight: 600 }}>Enterprise</td>
                <td style={tdStyle}>Custom</td>
                <td style={tdStyle}>Custom</td>
                <td style={tdStyle}>Custom</td>
                <td style={tdStyle}>Custom</td>
              </tr>
              <tr>
                <td style={{ ...tdStyle, color: '#fff', fontWeight: 600 }}>Per-Seat Pricing</td>
                <td style={tdStyle}>{cross} No</td>
                <td style={tdStyle}>{check} Yes</td>
                <td style={tdStyle}>{check} Yes</td>
                <td style={tdStyle}>{cross} No — flat rate</td>
              </tr>
              <tr>
                <td style={{ ...tdStyle, color: '#fff', fontWeight: 600 }}>Usage-Based Overages</td>
                <td style={tdStyle}>{check} Yes</td>
                <td style={tdStyle}>{check} Yes</td>
                <td style={tdStyle}>{check} Yes</td>
                <td style={tdStyle}>{cross} Included in plan</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section className="sp-section">
        <h2>Platform Deep Dive</h2>

        <h3 style={{ color: '#fff', fontSize: 16, fontWeight: 700, marginBottom: 8, marginTop: 24 }}>
          Langfuse (acquired by ClickHouse)
        </h3>
        <p>
          Langfuse was one of the first open-source LLM observability tools and quickly built a loyal community.
          Its acquisition by ClickHouse brings powerful analytics infrastructure but raises questions about
          long-term independence. The open-source edition may see reduced investment as resources shift to the
          ClickHouse-integrated product.
        </p>

        <h3 style={{ color: '#fff', fontSize: 16, fontWeight: 700, marginBottom: 8, marginTop: 24 }}>
          LangSmith (LangChain)
        </h3>
        <p>
          LangSmith offers excellent tracing and evaluation capabilities, but is deeply tied to the LangChain
          ecosystem. Teams using other frameworks (CrewAI, AutoGen, custom agents) face friction. Per-seat
          pricing makes it expensive for larger teams, and there's no self-host option.
        </p>

        <h3 style={{ color: '#fff', fontSize: 16, fontWeight: 700, marginBottom: 8, marginTop: 24 }}>
          Braintrust
        </h3>
        <p>
          Braintrust takes an evaluation-first approach with strong scoring and dataset management. It's less
          focused on real-time agent observability and fleet management, making it better suited for offline
          evaluation workflows than production agent monitoring.
        </p>

        <h3 style={{ color: '#fff', fontSize: 16, fontWeight: 700, marginBottom: 8, marginTop: 24 }}>
          Stoic AgentOS
        </h3>
        <p>
          Stoic AgentOS is the only platform built specifically for <strong>agent fleet management</strong> — not
          just LLM tracing. It combines observability, persistent memory (Knowledge Brain), multi-agent
          orchestration, and cost attribution in a single dashboard. No per-seat pricing, no framework lock-in,
          and fully self-hostable.
        </p>
      </section>

      <section className="sp-section">
        <h2>Our Recommendation</h2>
        <p>
          If you're running a single LLM chain in a LangChain project, LangSmith or Braintrust may be
          sufficient. But if you're operating a fleet of autonomous agents across multiple frameworks and need
          production-grade observability, persistent memory, and cost controls — Stoic AgentOS is the platform
          built for that future.
        </p>
        <p>
          <Link to="/signup" style={{ color: '#9b59ff', fontWeight: 600, textDecoration: 'none' }}>
            Start your free trial →
          </Link>
          {' · '}
          <Link to="/docs" style={{ color: 'rgba(255,255,255,0.5)', fontWeight: 500, textDecoration: 'none' }}>
            Read the docs
          </Link>
        </p>
      </section>
    </ArticleShell>
  );
}

/* ═══════════════════════════════════════ */
/*  ROUTER — default export               */
/* ═══════════════════════════════════════ */
export default function BlogArticles({ article }) {
  switch (article) {
    case 'why-apm-fails':
      return <WhyApmFails />;
    case 'market-consolidation':
      return <MarketConsolidation />;
    case 'comparison':
      return <ComparisonArticle />;
    default:
      return (
        <ArticleShell title="Article Not Found" subtitle="This blog post doesn't exist.">
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 16, marginBottom: 24 }}>
              The article you're looking for doesn't exist or has been moved.
            </p>
            <Link
              to="/blog"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '12px 28px',
                background: 'rgba(155,89,255,0.12)',
                border: '1px solid rgba(155,89,255,0.2)',
                borderRadius: 10,
                color: '#fff',
                fontSize: 14,
                fontWeight: 600,
                textDecoration: 'none',
              }}
            >
              ← Browse all posts
            </Link>
          </div>
        </ArticleShell>
      );
  }
}
