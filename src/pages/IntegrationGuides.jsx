/**
 * Stoic AgentOS — Integration Guide Pages
 * SEO-targeted guides using the ACTUAL SDK v3.0.0 API.
 * 
 * Guide 1: "How to Add Persistent Memory to Your AI Agents"
 *   → targets: "ai agent memory", "persistent agent context", "agent knowledge graph"
 * 
 * Guide 2: "How to Monitor AI Agent Costs in Production"
 *   → targets: "ai agent cost tracking", "llm cost monitoring", "openai cost per agent"
 */
import { useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import './StaticPages.css';

/* ─── Shared guide shell ─── */
function GuideShell({ title, subtitle, children }) {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  useEffect(() => { document.title = `${title} — Stoic AgentOS`; }, [title]);

  return (
    <div className="sp">
      <nav className="sp-nav">
        <Link to="/" className="sp-logo">⚡ <span>Stoic AgentOS</span></Link>
        <div className="sp-nav-links">
          <Link to="/docs">Docs</Link>
          <Link to="/blog">Blog</Link>
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

/* Reusable code block */
function Code({ children }) {
  return (
    <pre style={{
      background: 'rgba(255,255,255,0.03)',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: 10,
      padding: '20px 24px',
      fontSize: 13,
      lineHeight: 1.7,
      color: 'rgba(255,255,255,0.75)',
      overflowX: 'auto',
      fontFamily: "'JetBrains Mono', monospace",
      marginBottom: 20,
    }}>
      {children}
    </pre>
  );
}

/* Reusable callout box */
function Callout({ emoji, title, children }) {
  return (
    <div style={{
      background: 'rgba(155,89,255,0.06)',
      border: '1px solid rgba(155,89,255,0.15)',
      borderRadius: 12,
      padding: '20px 24px',
      marginBottom: 24,
    }}>
      <div style={{ fontSize: 14, fontWeight: 700, color: '#b87aff', marginBottom: 8 }}>
        {emoji} {title}
      </div>
      <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.55)', lineHeight: 1.7 }}>
        {children}
      </div>
    </div>
  );
}

/* Reusable comparison table */
function CompareTable({ headers, rows }) {
  const thStyle = {
    textAlign: 'left', padding: '12px 14px',
    borderBottom: '1px solid rgba(255,255,255,0.1)',
    color: '#fff', fontWeight: 700, fontSize: 12,
    textTransform: 'uppercase', letterSpacing: '0.04em',
  };
  const tdStyle = {
    padding: '10px 14px',
    borderBottom: '1px solid rgba(255,255,255,0.04)',
    color: 'rgba(255,255,255,0.55)', fontSize: 13, lineHeight: 1.5,
  };
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, marginBottom: 24 }}>
        <thead>
          <tr>
            {headers.map((h, i) => (
              <th key={i} style={{ ...thStyle, ...(i === headers.length - 1 ? { color: '#9b59ff' } : {}) }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i}>
              {row.map((cell, j) => (
                <td key={j} style={{ ...tdStyle, ...(j === 0 ? { color: '#fff', fontWeight: 600 } : {}) }}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}


/* ═══════════════════════════════════════════════════════════ */
/*  GUIDE 1 — How to Add Persistent Memory to AI Agents      */
/* ═══════════════════════════════════════════════════════════ */
function AgentMemoryGuide() {
  return (
    <GuideShell
      title="How to Add Persistent Memory to Your AI Agents"
      subtitle="Benjamin Kernbaum · June 2026 · 8 min read · Guide"
    >
      <section className="sp-section">
        <h2>The Problem: Your Agents Are Goldfish</h2>
        <p>
          Every AI agent you deploy today is stateless. When the process ends — whether it's a restart,
          a deployment, or a scaling event — everything the agent learned disappears.
        </p>
        <p>
          That means your agent will ask the same clarifying questions tomorrow. It will re-discover the
          same error patterns. It will make the same wrong decision it made yesterday — because it has
          zero memory of yesterday.
        </p>
        <p>
          The common hack? Copy-paste summaries into system prompts. But that doesn't scale. By week 3,
          your system prompt is 14,000 tokens of pasted context, and you're paying for it on every single run.
        </p>

        <Callout emoji="💡" title="The Real Cost of Statelessness">
          Without persistent memory, agents spend 20-40% of their context window re-establishing
          knowledge that should already be known. That's wasted tokens, wasted latency, and wasted money
          on every single invocation.
        </Callout>
      </section>

      <section className="sp-section">
        <h2>The Solution: Three-Tier Agent Memory</h2>
        <p>
          Stoic AgentOS provides a memory architecture with three tiers that mirror how effective
          knowledge management actually works:
        </p>
        <div className="sp-grid" style={{ marginTop: 16 }}>
          <div className="sp-card">
            <div className="sp-card-icon">⚡</div>
            <h3>Tier 1: Working Memory</h3>
            <p>
              Short-term, session-scoped key-value store with TTL. What the agent needs right now.
              Auto-expires when the session ends.
            </p>
          </div>
          <div className="sp-card">
            <div className="sp-card-icon">📖</div>
            <h3>Tier 2: Episodic Memory</h3>
            <p>
              Timestamped timeline of what happened. Importance-scored (1-10).
              Searchable across all sessions, all agents.
            </p>
          </div>
          <div className="sp-card">
            <div className="sp-card-icon">🧠</div>
            <h3>Tier 3: Semantic Memory</h3>
            <p>
              Structured knowledge graph. Entity-relationship triples extracted by the AI Reflection
              Engine. "What does the agent know to be true?"
            </p>
          </div>
        </div>
      </section>

      <section className="sp-section">
        <h2>Step 1: Install the SDK</h2>
        <Code>{`# Node.js / TypeScript
npm install stoic-agentos-sdk

# Python
pip install stoicos`}</Code>
      </section>

      <section className="sp-section">
        <h2>Step 2: Initialize and Instrument</h2>
        <Code>{`import { AgentOS } from 'stoic-agentos-sdk';
import OpenAI from 'openai';

const os = new AgentOS({
  apiKey: process.env.AGENTOS_API_KEY,
  workspace: 'my-app',
});

// Auto-capture every LLM call (tokens, cost, latency)
const openai = new OpenAI();
os.instrumentClient('openai', openai);

// Works with Anthropic too:
// import Anthropic from '@anthropic-ai/sdk';
// const claude = new Anthropic();
// os.instrumentClient('anthropic', claude);`}</Code>

        <Callout emoji="🎯" title="Zero Behavior Change">
          <code style={{ color: '#b87aff' }}>instrumentClient()</code> monkey-patches the client's methods.
          Your existing code runs exactly the same — but every call is now auto-captured in your
          Stoic dashboard with model, tokens, cost, and latency.
        </Callout>
      </section>

      <section className="sp-section">
        <h2>Step 3: Record What the Agent Learns (Episodic Memory)</h2>
        <p>
          After your agent completes a task, store what it learned as an episode:
        </p>
        <Code>{`// Wrap your agent function with auto-tracing
const processInvoice = os.wrapAgent('invoice-processor', async (invoice) => {
  const result = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [{ role: 'user', content: \`Process this invoice: \${JSON.stringify(invoice)}\` }],
  });

  // Store what the agent learned
  await os.memory.recordEpisode(
    \`Processed invoice #\${invoice.id}: vendor=\${invoice.vendor}, amount=$\${invoice.amount}. Vendor prefers net-30 payment terms.\`,
    {
      importance: 7,        // 1-10 scale
      agentId: 'invoice-processor',
      eventType: 'task_complete',
      metadata: { invoiceId: invoice.id, vendor: invoice.vendor },
    }
  );

  return result;
});

// Run it — trace + episode auto-captured
await processInvoice({ id: 'INV-1234', vendor: 'Acme Corp', amount: 2400 });`}</Code>
      </section>

      <section className="sp-section">
        <h2>Step 4: Extract Structured Knowledge (Reflection Engine)</h2>
        <p>
          The Reflection Engine uses Claude to read raw episodic logs and extract structured
          entity-relationship triples into a queryable knowledge graph:
        </p>
        <Code>{`// Run reflection — Claude processes recent episodes
// and extracts knowledge triples automatically
const result = await os.reflection.run();

console.log(result);
// {
//   triplets_extracted: 4,
//   episodes_processed: 12,
//   model: 'claude-haiku-4-5'
// }

// The engine extracted triples like:
//   subject: "Acme Corp"  →  relation: "prefers"  →  object: "net-30 payment terms"
//   subject: "Acme Corp"  →  relation: "typical_amount"  →  object: "$2000-$3000"
//   subject: "invoice-processor"  →  relation: "error_pattern"  →  object: "fails on PDF invoices without headers"`}</Code>
      </section>

      <section className="sp-section">
        <h2>Step 5: Auto-Recall Memory with autoRecall</h2>
        <p>
          Instead of manually querying and formatting memory context, you can enable transparent prompt injection. When <code>autoRecall</code> is enabled, the SDK searches episodic memory using cosine vector similarity on the user's prompt and injects matching historical context directly into system instructions:
        </p>
        <Code>{`const os = new AgentOS({
  apiKey: process.env.AGENTOS_API_KEY,
  autoRecall: true, // Transparent memory injection
});

// Auto-instrument LLM client
os.instrumentClient('openai', openai);

// Next session — just write your prompt as usual:
const result = await openai.chat.completions.create({
  model: 'gpt-4o',
  messages: [
    { role: 'user', content: 'Process this invoice from Acme Corp.' }
  ]
});

// The SDK automatically runs pgvector cosine similarity, matches the
// vendor preference episode, and prefixes the system prompt:
// "[Recall context from past sessions: - Processed invoice #INV-1234: vendor=Acme Corp...]"
// The agent now knows Acme Corp prefers net-30 terms without manual work.`}</Code>

        <Callout emoji="🔥" title="Active Memory Layer">
          This is the conversion point. The agent recalls past context automatically across sessions and deployments, using vector similarity queries on pgvector + HNSW, keeping prompt sizes slim.
        </Callout>
      </section>

      <section className="sp-section">
        <h2>Step 6: Enable Memory Decay</h2>
        <p>
          Stale knowledge degrades automatically so your context window stays lean:
        </p>
        <Code>{`// Trigger memory decay cycle
const decay = await os.reflection.decay();

console.log(decay);
// {
//   working_expired: 3,        // TTL-expired working memory entries deleted
//   episodic_decayed: 8,       // Episodes older than 30 days: importance reduced
//   semantic_decayed: 2,       // Triples older than 60 days: confidence reduced
// }

// Low-confidence triples are automatically deprioritized
// when loaded via queryTriples() — keeping prompts sharp.`}</Code>
      </section>

      <section className="sp-section">
        <h2>Working Memory for Session-Scoped State</h2>
        <p>
          For short-term, session-scoped data (what the agent needs right now, not permanently):
        </p>
        <Code>{`// Store session state with TTL
await os.memory.setWorking('session-abc', 'current_task', 'processing-batch-7', {
  agentId: 'invoice-processor',
  ttlSeconds: 3600, // Auto-expires in 1 hour
});

// Retrieve later in the same session
const working = await os.memory.getWorking({
  sessionId: 'session-abc',
  agentId: 'invoice-processor',
});

// Clean up
await os.memory.deleteWorking(working[0].id);`}</Code>
      </section>

      <section className="sp-section">
        <h2>The Full Picture</h2>
        <CompareTable
          headers={['Capability', 'Without Stoic', 'With Stoic AgentOS']}
          rows={[
            ['Cross-session memory', 'Copy-paste into system prompt', 'os.memory.queryTriples()'],
            ['Knowledge extraction', 'Manual, error-prone', 'os.reflection.run() — AI-powered'],
            ['Stale fact management', 'Never cleaned up', 'os.reflection.decay() — automatic'],
            ['Session state', 'In-memory variables (lost on crash)', 'os.memory.setWorking() with TTL'],
            ['Cost per run', 'Growing (prompt bloat)', 'Stable (lean semantic queries)'],
            ['Multi-agent sharing', 'Not possible', 'All agents query same knowledge graph'],
            ['Audit trail', 'None', 'Every memory operation logged + hash-verified'],
          ]}
        />
      </section>

      <section className="sp-section">
        <h2>Give Your Agents a Brain</h2>
        <p>
          Stop building agents that forget. Three-tier memory persists knowledge across sessions,
          deployments, and scaling events. Free tier includes 5 agents and 10,000 observations/month.
        </p>
        <p style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginTop: 16 }}>
          <Link to="/signup" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '12px 28px', background: 'rgba(155,89,255,0.15)', border: '1px solid rgba(155,89,255,0.3)', borderRadius: 10, color: '#fff', fontSize: 14, fontWeight: 600, textDecoration: 'none' }}>
            Start free →
          </Link>
          <a href="https://github.com/benjaminkernbaum-ux/stoic-agentos" target="_blank" rel="noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '12px 28px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, color: 'rgba(255,255,255,0.7)', fontSize: 14, fontWeight: 600, textDecoration: 'none' }}>
            View on GitHub ⭐
          </a>
        </p>
      </section>
    </GuideShell>
  );
}


/* ═══════════════════════════════════════════════════════════ */
/*  GUIDE 2 — How to Monitor AI Agent Costs in Production     */
/* ═══════════════════════════════════════════════════════════ */
function AgentCostGuide() {
  return (
    <GuideShell
      title="How to Monitor AI Agent Costs in Production"
      subtitle="Benjamin Kernbaum · June 2026 · 6 min read · Guide"
    >
      <section className="sp-section">
        <h2>The Problem: You Don't Know What Your Agents Cost</h2>
        <p>
          You have 5 agents in production. Last month's OpenAI bill was $1,800. Which agent is responsible
          for how much? Which model is burning the most tokens? Which task is 10x more expensive than it
          should be?
        </p>
        <p>
          You don't know. Nobody does. The OpenAI dashboard shows total spend. Your bank statement shows
          total spend. But you have zero per-agent, per-task, per-model cost attribution.
        </p>
        <p>
          Until you instrument your agents.
        </p>

        <Callout emoji="💸" title="The $800 Wake-Up Call">
          One agent entering a retry loop at 3 AM can burn $800 in 12 minutes. By the time you
          see the charge, the damage is done. You need real-time cost tracking with automatic
          circuit breakers — not a monthly invoice.
        </Callout>
      </section>

      <section className="sp-section">
        <h2>The Solution: One-Line Auto-Instrumentation</h2>
        <Code>{`import { AgentOS } from 'stoic-agentos-sdk';
import OpenAI from 'openai';

const os = new AgentOS({ apiKey: process.env.AGENTOS_API_KEY });

const openai = new OpenAI();
os.instrumentClient('openai', openai);

// That's it. Every openai.chat.completions.create() call is now
// auto-captured with:
//   - model name
//   - prompt_tokens + completion_tokens
//   - cost in USD (using built-in pricing table)
//   - latency in ms
//   - success/error status
//   - error message (if any)
//   - attributed to the active trace and agent`}</Code>
      </section>

      <section className="sp-section">
        <h2>Step 1: Attribute Costs to Agents</h2>
        <p>
          Use <code style={{ color: '#b87aff' }}>wrapAgent()</code> to attribute every LLM call
          to a named agent:
        </p>
        <Code>{`// Define your agents
const emailAgent = os.wrapAgent('email-processor', async (email) => {
  const classification = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: \`Classify this email: \${email.subject}\` }],
  });
  
  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [{ role: 'user', content: \`Draft a reply to: \${email.body}\` }],
  });
  
  return { classification, response };
});

const researchAgent = os.wrapAgent('research-analyst', async (topic) => {
  // ... multiple LLM calls
});

// Every LLM call inside these functions is automatically:
// 1. Grouped into a trace (one per agent run)
// 2. Attributed to the agent name
// 3. Tracked with per-model cost breakdown`}</Code>
      </section>

      <section className="sp-section">
        <h2>Step 2: Group Related Calls into Traces</h2>
        <p>
          For more complex workflows, use explicit traces to group multi-step operations:
        </p>
        <Code>{`// Manual trace for a multi-agent pipeline
const trace = os.startTrace('daily-report-pipeline', {
  agent: 'report-orchestrator',
  metadata: { date: '2026-06-05' },
});

// All LLM calls between startTrace() and trace.end()
// are grouped under this trace
const data = await researchAgent('Q2 revenue trends');
const report = await emailAgent({ subject: 'Q2 Report', body: data });

await trace.end('success');

// In the dashboard, you'll see:
//   Trace: "daily-report-pipeline"
//     └─ Span 1: gpt-4o-mini (classify) — $0.003
//     └─ Span 2: gpt-4o (draft reply) — $0.021
//     └─ Span 3: gpt-4o (research) — $0.045
//   Total: $0.069 | 3 spans | 1,847 tokens | 2.3s`}</Code>
      </section>

      <section className="sp-section">
        <h2>Step 3: Set Up Circuit Breakers</h2>
        <p>
          Circuit breakers are server-side — they run on the Stoic API, not in your code.
          When an agent's error rate or cost exceeds a threshold, the circuit opens and blocks
          further API calls:
        </p>
        <Code>{`// Check circuit breaker status programmatically
const breakers = await os.compliance.circuitBreaker();

console.log(breakers);
// [
//   {
//     agent_id: 'abc-123',
//     agent_name: 'email-processor',
//     agent_status: 'running',
//     circuit_status: 'closed',     // healthy
//     blocks_last_hour: 0
//   },
//   {
//     agent_id: 'def-456',
//     agent_name: 'research-analyst',
//     agent_status: 'error',
//     circuit_status: 'open',       // BLOCKED — too many errors
//     blocks_last_hour: 47
//   }
// ]`}</Code>

        <Callout emoji="🚨" title="How Circuit Breakers Work">
          <strong>Closed</strong> → Agent is healthy. All requests pass through.<br/>
          <strong>Half-Open</strong> → Agent had issues. Limited requests allowed to test recovery.<br/>
          <strong>Open</strong> → Agent is blocked. All requests return 429 until manually reset or auto-recovered.
          Every circuit breaker event is logged in the immutable audit trail.
        </Callout>
      </section>

      <section className="sp-section">
        <h2>Step 4: Log Compliance Events</h2>
        <p>
          For regulated environments, log immutable audit events for every significant agent decision:
        </p>
        <Code>{`await os.compliance.logEvent('data_access', 'read_customer_pii', {
  agentId: 'support-agent',
  reasoning: 'Customer requested their account details via chat',
  verdict: 'PROCEED',
  policyVersion: '2.1',
  contextHash: 'sha256:a3f2b1c4...',  // Hash of the prompt context
  metadata: { customerId: 'cust-789', dataFields: ['email', 'phone'] },
});

// Export audit trail for SOC 2 / compliance review
const trail = await os.compliance.export({
  from: '2026-05-01',
  to: '2026-05-31',
});
// Returns: SIEM-compatible JSON with every logged event`}</Code>
      </section>

      <section className="sp-section">
        <h2>What You See in the Dashboard</h2>
        <div className="sp-grid">
          <div className="sp-card">
            <div className="sp-card-icon">💰</div>
            <h3>Cost per Agent</h3>
            <p>Real-time USD cost attributed to each named agent. See which agent burns the most.</p>
          </div>
          <div className="sp-card">
            <div className="sp-card-icon">📊</div>
            <h3>Cost per Model</h3>
            <p>Breakdown by model (gpt-4o vs gpt-4o-mini vs claude-3.5). Find the model arbitrage opportunities.</p>
          </div>
          <div className="sp-card">
            <div className="sp-card-icon">🔍</div>
            <h3>Trace Explorer</h3>
            <p>Click into any trace to see every span: model, tokens, cost, latency, status.</p>
          </div>
          <div className="sp-card">
            <div className="sp-card-icon">🚨</div>
            <h3>Circuit Breaker Status</h3>
            <p>Real-time view of all agent circuit states. Open breakers show cost saved.</p>
          </div>
        </div>
      </section>

      <section className="sp-section">
        <h2>Also Works with Anthropic</h2>
        <Code>{`import Anthropic from '@anthropic-ai/sdk';

const claude = new Anthropic();
os.instrumentClient('anthropic', claude);

// Now every claude.messages.create() call is auto-captured
// with the same per-agent cost attribution.

// Mix providers in the same trace:
const trace = os.startTrace('mixed-provider-task');
const analysis = await openai.chat.completions.create({ /* ... */ });
const summary = await claude.messages.create({ /* ... */ });
await trace.end();

// Dashboard shows: OpenAI cost + Anthropic cost, side by side`}</Code>
      </section>

      <section className="sp-section">
        <h2>Python SDK</h2>
        <Code>{`from stoicos import AgentOS
import openai

os = AgentOS(api_key="sk_live_xxx")

# Same API in Python
os.instrument_client("openai", openai)

# Wrap agents
@os.wrap_agent("email-processor")
def process_email(email):
    response = openai.chat.completions.create(
        model="gpt-4o",
        messages=[{"role": "user", "content": f"Process: {email}"}]
    )
    return response

# Everything auto-captured: cost, tokens, latency, traces`}</Code>
      </section>

      <section className="sp-section">
        <h2>Stop Guessing What Your Agents Cost</h2>
        <p>
          One line of code gives you full cost attribution per agent, per model, per trace.
          Circuit breakers prevent runaway costs. Compliance audit trails keep Legal happy.
          Free tier includes 5 agents and 10,000 observations/month.
        </p>
        <p style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginTop: 16 }}>
          <Link to="/signup" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '12px 28px', background: 'rgba(155,89,255,0.15)', border: '1px solid rgba(155,89,255,0.3)', borderRadius: 10, color: '#fff', fontSize: 14, fontWeight: 600, textDecoration: 'none' }}>
            Start free →
          </Link>
          <Link to="/docs" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '12px 28px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, color: 'rgba(255,255,255,0.7)', fontSize: 14, fontWeight: 600, textDecoration: 'none' }}>
            Read full SDK docs →
          </Link>
        </p>
      </section>
    </GuideShell>
  );
}


/* ═══════════════════════════════════════ */
/*  ROUTER — default export               */
/* ═══════════════════════════════════════ */
export default function IntegrationGuides({ guide }) {
  switch (guide) {
    case 'langchain-memory':
      return <AgentMemoryGuide />;
    case 'crewai-monitoring':
      return <AgentCostGuide />;
    default:
      return (
        <GuideShell title="Guide Not Found" subtitle="This guide doesn't exist.">
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 16, marginBottom: 24 }}>
              The guide you're looking for doesn't exist or has been moved.
            </p>
            <Link
              to="/blog"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6, padding: '12px 28px',
                background: 'rgba(155,89,255,0.12)', border: '1px solid rgba(155,89,255,0.2)',
                borderRadius: 10, color: '#fff', fontSize: 14, fontWeight: 600, textDecoration: 'none',
              }}
            >
              ← Browse all posts
            </Link>
          </div>
        </GuideShell>
      );
  }
}
