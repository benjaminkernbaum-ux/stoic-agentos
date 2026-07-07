import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './DocsPage.css';

const API_BASE = 'https://api.stoicagentos.com';

const SECTIONS = [
  { id: 'getting-started', icon: '🚀', label: 'Getting Started', group: 'Overview' },
  { id: 'authentication', icon: '🔑', label: 'Authentication', group: 'Overview' },
  { id: 'shield', icon: '🛡️', label: 'Shield & Firewall', group: 'Overview', badge: 'new' },
  { id: 'sdk', icon: '📦', label: 'SDK Reference', group: 'SDK', badge: 'new' },
  { id: 'agents', icon: '🤖', label: 'Agents API', group: 'API Reference' },
  { id: 'observations', icon: '👁', label: 'Observations API', group: 'API Reference' },
  { id: 'workspaces', icon: '📂', label: 'Workspaces API', group: 'API Reference' },
  { id: 'knowledge', icon: '🧠', label: 'Memory & Knowledge API', group: 'API Reference' },
  { id: 'billing', icon: '💳', label: 'Billing & Plans', group: 'API Reference' },
  { id: 'webhooks', icon: '🔔', label: 'Webhooks', group: 'Integrations' },
  { id: 'git-hooks', icon: '🔗', label: 'Git Hooks', group: 'Integrations' },
  { id: 'errors', icon: '⚠️', label: 'Error Codes', group: 'Reference' },
  { id: 'limits', icon: '📊', label: 'Rate Limits', group: 'Reference' },
];

function CodeBlock({ lang, file, children }) {
  const [copied, setCopied] = useState(false);
  const copy = () => { navigator.clipboard?.writeText(children); setCopied(true); setTimeout(() => setCopied(false), 2000); };
  return (
    <div className="docs-codeblock">
      <div className="docs-codeblock-header">
        <span className="docs-codeblock-lang">{lang}</span>
        {file && <span className="docs-codeblock-file">{file}</span>}
        <button className="docs-codeblock-copy" onClick={copy}>{copied ? '✓ Copied' : '📋 Copy'}</button>
      </div>
      <div className="docs-codeblock-body">{children}</div>
    </div>
  );
}

function Endpoint({ method, path, desc, params, children }) {
  return (
    <div className="docs-endpoint">
      <div className="docs-endpoint-header">
        <span className={`docs-endpoint-method ${method.toLowerCase()}`}>{method}</span>
        <span className="docs-endpoint-path">{path}</span>
      </div>
      <div className="docs-endpoint-body">
        <div className="docs-endpoint-desc">{desc}</div>
        {params && (
          <table className="docs-params">
            <thead><tr><th>Parameter</th><th>Type</th><th>Description</th></tr></thead>
            <tbody>{params.map((p, i) => (
              <tr key={i}>
                <td>{p.name} {p.required ? <span className="docs-param-required">required</span> : <span className="docs-param-optional">optional</span>}</td>
                <td><span className="docs-param-type">{p.type}</span></td>
                <td>{p.desc}</td>
              </tr>
            ))}</tbody>
          </table>
        )}
        {children}
      </div>
    </div>
  );
}

function Callout({ type = 'info', icon, title, children }) {
  const icons = { info: '💡', success: '✅', warning: '⚠️', danger: '🚫' };
  return (
    <div className={`docs-callout ${type}`}>
      <span className="docs-callout-icon">{icon || icons[type]}</span>
      <div className="docs-callout-content">
        {title && <strong>{title}</strong>}
        {children}
      </div>
    </div>
  );
}

// ── Section Content Components ──

function GettingStarted() {
  return (<>
    <h1 className="docs-page-title">Getting Started</h1>
    <p className="docs-page-desc">Get up and running with Stoic AgentOS in under 5 minutes. Monitor your AI agents, persist knowledge, and manage workspaces.</p>

    <Callout type="success" title="Free Tier Available">No credit card required. Start with 5 agents, 10K observations/month, and 2 workspaces for free.</Callout>

    <div className="docs-step"><div className="docs-step-number">1</div><div className="docs-step-content"><div className="docs-step-title">Create an Account</div><div className="docs-step-desc">Sign up at <a href="https://stoicagentos.com/signup">stoicagentos.com/signup</a></div></div></div>
    <div className="docs-step"><div className="docs-step-number">2</div><div className="docs-step-content"><div className="docs-step-title">Get Your API Key</div><div className="docs-step-desc">After signup, go to Dashboard → Settings → API Keys → Generate Key. Your key starts with <code>sk_live_</code>.</div></div></div>
    <div className="docs-step"><div className="docs-step-number">3</div><div className="docs-step-content"><div className="docs-step-title">Install the SDK</div><div className="docs-step-desc">Install via npm or use the REST API directly.</div></div></div>

    <CodeBlock lang="bash">{`npm install stoic-agentos-sdk`}</CodeBlock>

    <div className="docs-step"><div className="docs-step-number">4</div><div className="docs-step-content"><div className="docs-step-title">Initialize & Capture</div><div className="docs-step-desc">Start capturing observations from your AI agents with 3 lines of code.</div></div></div>

    <CodeBlock lang="javascript" file="index.js">{`import { AgentOS } from 'stoic-agentos-sdk';

const os = new AgentOS({ apiKey: 'sk_live_your_key_here' });

// Register an agent
await os.registerAgent({
  name: 'invoice-processor',
  type: 'financial',
  capabilities: ['ocr', 'extraction', 'validation']
});

// Capture observations
await os.capture({
  type: 'decision',
  title: 'Switched to GPT-4o-mini',
  content: 'Reduced cost by 40% with no quality loss',
  agent: 'content-writer'
});`}</CodeBlock>

    <h2 id="base-url">Base URL</h2>
    <p>All API requests go to:</p>
    <CodeBlock lang="text">{API_BASE}/api/v1/</CodeBlock>

    <h2 id="next-steps">Next Steps</h2>
    <ul>
      <li><strong>SDK Reference</strong> — Full TypeScript SDK documentation</li>
      <li><strong>Agents API</strong> — Create and manage your AI agent fleet</li>
      <li><strong>Observations API</strong> — Capture decisions, errors, and discoveries</li>
      <li><strong>Webhooks</strong> — React to events in real-time</li>
    </ul>
  </>);
}

function Authentication() {
  return (<>
    <h1 className="docs-page-title">Authentication</h1>
    <p className="docs-page-desc">All API requests require authentication via an API key or JWT token.</p>

    <h2 id="api-keys">API Key Authentication</h2>
    <p>Pass your API key in the <code>x-api-key</code> header:</p>
    <CodeBlock lang="bash">{`curl ${API_BASE}/api/v1/agents \\
  -H "x-api-key: sk_live_your_key_here"`}</CodeBlock>

    <h2 id="jwt">JWT Authentication</h2>
    <p>For frontend apps, use Supabase JWT tokens in the <code>Authorization</code> header:</p>
    <CodeBlock lang="bash">{`curl ${API_BASE}/api/v1/agents \\
  -H "Authorization: Bearer eyJhbGciOi..."`}</CodeBlock>

    <Callout type="warning" title="Keep Keys Secret">Never expose your <code>sk_live_</code> API key in client-side code. Use JWT auth for browser apps and API keys for server-to-server communication.</Callout>

    <h2 id="generating-keys">Generating API Keys</h2>
    <p>Generate keys from the Dashboard or via the API:</p>
    <Endpoint method="POST" path="/api/v1/auth/api-keys" desc="Create a new API key for your organization."
      params={[{ name: 'name', type: 'string', required: true, desc: 'A descriptive name for the key' }]} />
  </>);
}

function SDKRef() {
  return (<>
    <h1 className="docs-page-title">SDK Reference</h1>
    <p className="docs-page-desc">The official Node.js/TypeScript SDK for Stoic AgentOS. Wraps all API endpoints with type-safe methods.</p>

    <CodeBlock lang="bash">{`npm install stoic-agentos-sdk`}</CodeBlock>

    <h2 id="init">Initialization</h2>
    <CodeBlock lang="javascript">{`import { AgentOS } from 'stoic-agentos-sdk';

const os = new AgentOS({
  apiKey: process.env.AGENTOS_API_KEY,
  baseUrl: '${API_BASE}',  // optional, defaults to production
});`}</CodeBlock>

    <h2 id="sdk-agents">Agent Management</h2>
    <CodeBlock lang="javascript">{`// Register a new agent
const agent = await os.registerAgent({
  name: 'data-pipeline',
  type: 'etl',
  capabilities: ['extract', 'transform', 'load'],
  config: { schedule: '0 * * * *' }
});

// List all agents
const agents = await os.listAgents();

// Send heartbeat
await os.heartbeat('data-pipeline');`}</CodeBlock>

    <h2 id="sdk-observations">Capturing Observations</h2>
    <CodeBlock lang="javascript">{`// Capture a decision
await os.capture({
  type: 'decision',
  title: 'Switched DB provider',
  content: 'Moved from MySQL to PostgreSQL for JSON support',
  agent: 'migration-bot',
  importance: 8
});

// Capture an error
await os.capture({
  type: 'error',
  title: 'API rate limit hit',
  content: 'OpenAI returned 429, backing off 60s',
  agent: 'content-writer',
  importance: 9
});`}</CodeBlock>

    <h2 id="sdk-knowledge">Memory & autoRecall</h2>
    <p>Stoic AgentOS features a three-tier memory architecture (Working, Episodic, Semantic). Setting <code>autoRecall: true</code> during initialization automatically injects past episodic context matching the prompt into the system prompt of OpenAI/Anthropic calls.</p>
    <CodeBlock lang="javascript">{`import { AgentOS } from 'stoic-agentos-sdk';

const os = new AgentOS({
  apiKey: 'sk_live_xxx',
  autoRecall: true, // Enables transparent vector memory injection
});

// Auto-recall will automatically grab past episodes similar to the user prompt.
// You can also write episodes manually:
await os.memory.recordEpisode('User loves dark mode interface', {
  eventType: 'preference',
  importance: 8,
});

// Search episodic memories manually via cosine vector similarity (pgvector + HNSW):
const pastRuns = await os.memory.searchEpisodes('What are the user UI preferences?', {
  limit: 3,
  matchThreshold: 0.3
});

// Store semantic triples (knowledge graph):
await os.memory.storeTriple('user-123', 'prefers', 'dark mode');

// Query semantic triples:
const triples = await os.memory.queryTriples({ subject: 'user-123' });`}</CodeBlock>

    <h2 id="cli">CLI Tool</h2>
    <CodeBlock lang="bash">{`# Initialize a new project
npx stoic-agentos-sdk init

# Check connection
npx stoic-agentos-sdk status

# List agents
npx stoic-agentos-sdk agents list`}</CodeBlock>
  </>);
}

function AgentsAPI() {
  return (<>
    <h1 className="docs-page-title">Agents API</h1>
    <p className="docs-page-desc">Create, manage, and monitor your AI agent fleet. Each agent represents an autonomous AI worker in your system.</p>

    <Endpoint method="GET" path="/api/v1/agents" desc="List all agents in your organization." />
    <Endpoint method="POST" path="/api/v1/agents" desc="Register a new agent."
      params={[
        { name: 'name', type: 'string', required: true, desc: 'Unique agent name (e.g. invoice-processor)' },
        { name: 'type', type: 'string', required: false, desc: 'Agent type: financial, content, scraper, etc.' },
        { name: 'capabilities', type: 'string[]', required: false, desc: 'List of agent capabilities' },
        { name: 'config', type: 'object', required: false, desc: 'Agent-specific configuration' },
      ]} />
    <Endpoint method="POST" path="/api/v1/agents/:id/heartbeat" desc="Send a heartbeat to indicate agent is alive. Updates last_active timestamp." />

    <Callout type="info" title="Plan Limits">Free: 5 agents · Pro: 25 agents · Team: 100 agents · Enterprise: Unlimited</Callout>
  </>);
}

function ObservationsAPI() {
  return (<>
    <h1 className="docs-page-title">Observations API</h1>
    <p className="docs-page-desc">Capture everything your agents do — decisions, errors, discoveries, and architectural changes. The foundation of your AI memory.</p>

    <Endpoint method="GET" path="/api/v1/observations" desc="List observations for your organization. Supports pagination and filtering."
      params={[
        { name: 'agent_id', type: 'uuid', required: false, desc: 'Filter by agent' },
        { name: 'type', type: 'string', required: false, desc: 'Filter by type: decision, error, discovery, metric' },
        { name: 'limit', type: 'integer', required: false, desc: 'Max results (default 50, max 200)' },
      ]} />
    <Endpoint method="POST" path="/api/v1/observations" desc="Create a new observation."
      params={[
        { name: 'type', type: 'string', required: true, desc: 'One of: decision, error, discovery, metric, heartbeat' },
        { name: 'title', type: 'string', required: true, desc: 'Short description of the observation' },
        { name: 'content', type: 'string', required: false, desc: 'Detailed content/body' },
        { name: 'agent_id', type: 'uuid', required: false, desc: 'ID of the agent that generated this' },
        { name: 'importance', type: 'integer', required: false, desc: 'Priority 1-10 (default 5)' },
        { name: 'metadata', type: 'object', required: false, desc: 'Arbitrary JSON metadata' },
      ]} />
  </>);
}

function WorkspacesAPI() {
  return (<>
    <h1 className="docs-page-title">Workspaces API</h1>
    <p className="docs-page-desc">Manage multiple repositories and projects from a single pane of glass. Connect repos, track branches, and route context.</p>

    <Endpoint method="GET" path="/api/v1/workspaces" desc="List all workspaces in your organization." />
    <Endpoint method="POST" path="/api/v1/workspaces" desc="Create a new workspace."
      params={[
        { name: 'name', type: 'string', required: true, desc: 'Workspace name' },
        { name: 'repo_url', type: 'string', required: false, desc: 'Git repository URL' },
        { name: 'branch', type: 'string', required: false, desc: 'Default branch (e.g. main)' },
        { name: 'stack', type: 'string', required: false, desc: 'Tech stack: node, python, rust, etc.' },
      ]} />
  </>);
}

function KnowledgeAPI() {
  return (<>
    <h1 className="docs-page-title">Memory & Knowledge API</h1>
    <p className="docs-page-desc">Endpoints for the three-tier memory layer (Working, Episodic, Semantic). Exposes vector search and semantic triple storage.</p>

    <h2 id="working-memory-api">Working Memory (Tier 1)</h2>
    <p>Session-scoped, fast key-value store with automatic TTL decay.</p>
    <Endpoint method="POST" path="/api/v1/memory/working" desc="Set a working memory key-value pair for a session."
      params={[
        { name: 'session_id', type: 'string', required: true, desc: 'Unique session identifier' },
        { name: 'key', type: 'string', required: true, desc: 'Memory key name' },
        { name: 'value', type: 'any', required: true, desc: 'Value to persist' },
        { name: 'ttl_seconds', type: 'integer', required: false, desc: 'Custom TTL duration' },
      ]} />
    <Endpoint method="GET" path="/api/v1/memory/working" desc="Fetch all active working memory entries for a session." />

    <h2 id="episodic-memory-api">Episodic Memory (Tier 2)</h2>
    <p>Chronological logging with cosine similarity vector search.</p>
    <Endpoint method="POST" path="/api/v1/memory/episodic" desc="Create a new episodic memory log (automatically vectorized)."
      params={[
        { name: 'content', type: 'string', required: true, desc: 'Episode description text' },
        { name: 'importance', type: 'integer', required: false, desc: 'Priority rating 1-10' },
        { name: 'event_type', type: 'string', required: false, desc: 'Action type tag' },
      ]} />
    <Endpoint method="GET" path="/api/v1/memory/episodic" desc="Search episodes using semantic vector search."
      params={[
        { name: 'query', type: 'string', required: true, desc: 'Text query to embed and match against' },
        { name: 'match_threshold', type: 'float', required: false, desc: 'Cosine similarity threshold (default 0.3)' },
        { name: 'limit', type: 'integer', required: false, desc: 'Max matches (default 3)' },
      ]} />

    <h2 id="semantic-memory-api">Semantic Memory (Tier 3)</h2>
    <p>Fact triples extracted from logs to build a knowledge graph.</p>
    <Endpoint method="POST" path="/api/v1/memory/semantic" desc="Store a subject-relation-object triple."
      params={[
        { name: 'subject', type: 'string', required: true, desc: 'Entity subject' },
        { name: 'relation', type: 'string', required: true, desc: 'Connection relationship' },
        { name: 'object', type: 'string', required: true, desc: 'Target object' },
        { name: 'confidence', type: 'float', required: false, desc: 'Starting confidence score 0.0-1.0' },
      ]} />
    <Endpoint method="GET" path="/api/v1/memory/semantic" desc="Query matching triples." />
  </>);
}

function BillingDocs() {
  return (<>
    <h1 className="docs-page-title">Billing & Plans</h1>
    <p className="docs-page-desc">AgentOS offers a generous free tier and usage-based Pro plans for scaling teams.</p>

    <h2 id="plans">Plans</h2>
    <table className="docs-params" style={{ marginTop: 16 }}>
      <thead><tr><th>Feature</th><th>Free</th><th>Pro ($29/mo)</th><th>Team ($79/mo)</th></tr></thead>
      <tbody>
        <tr><td>Agents</td><td>5</td><td>25</td><td>100</td></tr>
        <tr><td>Observations/mo</td><td>10,000</td><td>100,000</td><td>Unlimited</td></tr>
        <tr><td>Workspaces</td><td>2</td><td>10</td><td>Unlimited</td></tr>
        <tr><td>Knowledge Items</td><td>5</td><td>25</td><td>Unlimited</td></tr>
        <tr><td>Team Members</td><td>1</td><td>5</td><td>15</td></tr>
        <tr><td>Knowledge Graph</td><td>—</td><td>✓</td><td>✓</td></tr>
      </tbody>
    </table>

    <h2 id="checkout">Upgrading</h2>
    <Endpoint method="POST" path="/api/v1/billing/checkout" desc="Create a Stripe Checkout session to upgrade to Pro or Team."
      params={[{ name: 'plan', type: 'string', required: false, desc: "Plan to upgrade to: 'pro' or 'team' (default: pro)" }]} />
    <p>Returns a <code>url</code> field — redirect the user to this URL to complete payment.</p>

    <Endpoint method="POST" path="/api/v1/billing/portal" desc="Create a Stripe Customer Portal session for managing subscriptions." />
  </>);
}

function WebhooksDocs() {
  return (<>
    <h1 className="docs-page-title">Webhooks</h1>
    <p className="docs-page-desc">Receive real-time notifications when events happen in your AgentOS account.</p>

    <h2 id="stripe-webhooks">Stripe Webhooks</h2>
    <p>AgentOS processes the following Stripe webhook events automatically:</p>
    <ul>
      <li><code>checkout.session.completed</code> — Upgrades org plan to Pro</li>
      <li><code>customer.subscription.updated</code> — Syncs plan changes</li>
      <li><code>customer.subscription.deleted</code> — Downgrades to Free</li>
      <li><code>invoice.payment_succeeded</code> — Confirms payment</li>
      <li><code>invoice.payment_failed</code> — Flags payment issues</li>
    </ul>

    <h2 id="git-webhook">Git Post-Commit Hook</h2>
    <Endpoint method="POST" path="/api/v1/hooks/git" desc="Auto-capture git commits as observations."
      params={[
        { name: 'repo', type: 'string', required: true, desc: 'Repository name' },
        { name: 'branch', type: 'string', required: true, desc: 'Branch name' },
        { name: 'commit_hash', type: 'string', required: true, desc: 'Commit SHA' },
        { name: 'author', type: 'string', required: true, desc: 'Commit author' },
        { name: 'message', type: 'string', required: true, desc: 'Commit message' },
      ]} />
  </>);
}

function GitHooksDocs() {
  return (<>
    <h1 className="docs-page-title">Git Hooks Integration</h1>
    <p className="docs-page-desc">Automatically capture every git commit as an observation. Set up once, get passive intelligence forever.</p>

    <h2 id="setup-hook">Setup</h2>
    <p>Add this to your <code>.git/hooks/post-commit</code>:</p>
    <CodeBlock lang="bash" file=".git/hooks/post-commit">{`#!/bin/sh
curl -s -X POST ${API_BASE}/api/v1/hooks/git \\
  -H "x-api-key: $AGENTOS_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "repo": "'$(basename $(git rev-parse --show-toplevel))'",
    "branch": "'$(git rev-parse --abbrev-ref HEAD)'",
    "commit_hash": "'$(git rev-parse HEAD)'",
    "author": "'$(git log -1 --format=%an)'",
    "message": "'$(git log -1 --format=%s)'"
  }'`}</CodeBlock>
    <p>Make it executable: <code>chmod +x .git/hooks/post-commit</code></p>
  </>);
}

function ErrorCodes() {
  return (<>
    <h1 className="docs-page-title">Error Codes</h1>
    <p className="docs-page-desc">Standard HTTP error codes with descriptive error messages.</p>
    <table className="docs-params">
      <thead><tr><th>Code</th><th>Meaning</th><th>Action</th></tr></thead>
      <tbody>
        <tr><td>400</td><td>Bad Request — Missing required fields</td><td>Check request body</td></tr>
        <tr><td>401</td><td>Unauthorized — Invalid or missing API key/token</td><td>Check authentication</td></tr>
        <tr><td>403</td><td>Forbidden — No organization membership</td><td>Run setup-org first</td></tr>
        <tr><td>404</td><td>Not Found — Resource doesn't exist</td><td>Check the ID</td></tr>
        <tr><td>429</td><td>Rate Limited — Plan quota exceeded</td><td>Upgrade your plan</td></tr>
        <tr><td>500</td><td>Server Error — Something went wrong</td><td>Retry or contact support</td></tr>
      </tbody>
    </table>

    <Callout type="info" title="429 Responses Include upgrade_url">When you hit a plan limit, the response includes an <code>upgrade_url</code> you can redirect users to for seamless upgrade.</Callout>
  </>);
}

function RateLimits() {
  return (<>
    <h1 className="docs-page-title">Rate Limits & Quotas</h1>
    <p className="docs-page-desc">Resource limits by plan tier. All limits reset monthly.</p>
    <table className="docs-params">
      <thead><tr><th>Resource</th><th>Free</th><th>Pro</th><th>Team</th></tr></thead>
      <tbody>
        <tr><td>Agents</td><td>5</td><td>25</td><td>100</td></tr>
        <tr><td>Observations / month</td><td>10,000</td><td>100,000</td><td>Unlimited</td></tr>
        <tr><td>Workspaces</td><td>2</td><td>10</td><td>Unlimited</td></tr>
        <tr><td>Knowledge Items</td><td>5</td><td>25</td><td>Unlimited</td></tr>
        <tr><td>API requests / min</td><td>60</td><td>300</td><td>1,000</td></tr>
      </tbody>
    </table>
    <Callout type="warning" title="Exceeding Limits">When you exceed a quota, the API returns <code>429 Too Many Requests</code> with your current usage count and an upgrade URL.</Callout>
  </>);
}

function ShieldDocs() {
  return (<>
    <h1 className="docs-page-title">🛡️ Shield & Active Firewall</h1>
    <p className="docs-page-desc">Protect your infrastructure and control costs by intercepting AI agent actions in real-time. Block infinite loops and enforce human approvals.</p>

    <Callout type="danger" title="Active Governance">
      Unlike passive logging tools (like Langfuse), Stoic AgentOS acts as a <strong>circuit breaker</strong> and <strong>active proxy</strong>. It suspends execution before dangerous tools run, requesting human intervention.
    </Callout>

    <h2 id="setup-shield">Enabling the Firewall</h2>
    <p>Activate the firewall by passing the shield options when instantiating the SDK. Instrument your LLM client as usual:</p>

    <CodeBlock lang="javascript" file="agent.js">{`import { AgentOS } from 'stoic-agentos-sdk';
import OpenAI from 'openai';

const os = new AgentOS({
  apiKey: 'sk_live_your_key_here',
  activeShield: true,
  criticalTools: ['delete_database', 'send_wire_transfer'],
  rejectionBehavior: 'refuse', // 'refuse' (simulates polite refusal) or 'throw' (throws AgentOSPolicyBlockError)
  failClosed: true,            // Strict security: blocks action if Stoic AgentOS API is offline
  circuitBreaker: {
    enabled: true,
    maxRpm: 60,                // Local Rate Limit: 60 requests per minute max
    maxTpm: 100000             // Local Rate Limit: 100,000 tokens per minute max
  }
});

const openai = new OpenAI();
os.instrumentClient('openai', openai);`}</CodeBlock>

    <h2 id="how-hitl-works">How Human-in-the-Loop (HITL) Works</h2>
    <div className="docs-step">
      <div className="docs-step-number">1</div>
      <div className="docs-step-content">
        <div className="docs-step-title">Action Interception</div>
        <div className="docs-step-desc">When the LLM decides to call a tool listed in <code>criticalTools</code>, the SDK intercepts the call before it goes to your application logic.</div>
      </div>
    </div>
    <div className="docs-step">
      <div className="docs-step-number">2</div>
      <div className="docs-step-content">
        <div className="docs-step-title">Execution Freeze & Polling</div>
        <div className="docs-step-desc">The SDK registers a pending approval with the Stoic AgentOS API and suspends the execution thread. It starts a secure polling loop.</div>
      </div>
    </div>
    <div className="docs-step">
      <div className="docs-step-number">3</div>
      <div className="docs-step-content">
        <div className="docs-step-title">Dashboard Action</div>
        <div className="docs-step-desc">The pending request pops up in the <strong>Settings</strong> tab of the Stoic AgentOS Dashboard. You can click <strong>Approve</strong> or <strong>Reject</strong>.</div>
      </div>
    </div>
    <div className="docs-step">
      <div className="docs-step-number">4</div>
      <div className="docs-step-content">
        <div className="docs-step-title">Resume or Block</div>
        <div className="docs-step-desc">Once resolved, the SDK either resumes execution transparently (if approved) or simulates a refusal/throws an error (if rejected).</div>
      </div>
    </div>

    <h2 id="circuit-breaker-ref">Local Circuit Breakers</h2>
    <p>Local rate limits are computed client-side using a sliding window algorithm. This adds zero latency to your LLM requests. If the limit is reached, it trips the breaker immediately, preventing infinite loops from burning your API credits.</p>

    <h2 id="fail-safe-ref">Fail-Safe Options</h2>
    <p>Choose your governance level:</p>
    <ul>
      <li><strong>Fail-Open (Default):</strong> If the network drops or the Stoic AgentOS gateway is unreachable, the SDK allows the tool call to proceed so your agent remains online.</li>
      <li><strong>Fail-Closed (Recommended for Enterprise):</strong> Set <code>failClosed: true</code>. If the Stoic AgentOS API cannot be reached, the SDK blocks the action, guaranteeing no critical tools run without safety checks.</li>
    </ul>
  </>);
}

const CONTENT_MAP = {
  'getting-started': GettingStarted,
  'authentication': Authentication,
  'shield': ShieldDocs,
  'sdk': SDKRef,
  'agents': AgentsAPI,
  'observations': ObservationsAPI,
  'workspaces': WorkspacesAPI,
  'knowledge': KnowledgeAPI,
  'billing': BillingDocs,
  'webhooks': WebhooksDocs,
  'git-hooks': GitHooksDocs,
  'errors': ErrorCodes,
  'limits': RateLimits,
};

export default function DocsPage() {
  const [activeSection, setActiveSection] = useState('getting-started');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();

  const ContentComponent = CONTENT_MAP[activeSection] || GettingStarted;
  const groups = [...new Set(SECTIONS.map(s => s.group))];

  return (
    <div className="docs-page">
      {/* Top Bar */}
      <div className="docs-topbar">
        <div className="docs-topbar-left">
          <button className="docs-mobile-toggle" onClick={() => setSidebarOpen(!sidebarOpen)} aria-label={sidebarOpen ? 'Close menu' : 'Open menu'}>
            {sidebarOpen ? '✕' : '☰'}
          </button>
          <a className="docs-topbar-logo" href="/" onClick={e => { e.preventDefault(); navigate('/'); }}>
            <span className="logo-icon">⚡</span>
            <span>Stoic <span style={{ color: 'var(--accent-purple)' }}>AgentOS</span></span>
          </a>
          <div className="docs-topbar-divider" />
          <span className="docs-topbar-title">Documentation</span>
        </div>
        <div className="docs-topbar-right">
          <span className="docs-version-badge">v1.0.1</span>
          <a className="docs-topbar-link" href="https://github.com/benjaminkernbaum-ux/stoic-agentos" target="_blank" rel="noopener">GitHub</a>
          <a className="docs-topbar-link" href="https://www.npmjs.com/package/stoic-agentos-sdk" target="_blank" rel="noopener">npm</a>
          <a className="docs-topbar-link" href="/dashboard" onClick={e => { e.preventDefault(); navigate('/dashboard'); }}>Dashboard →</a>
        </div>
      </div>

      {/* Sidebar */}
      <aside className={`docs-sidebar ${sidebarOpen ? 'open' : ''}`}>
        {groups.map(group => (
          <div key={group} className="docs-nav-group">
            <div className="docs-nav-label">{group}</div>
            {SECTIONS.filter(s => s.group === group).map(s => (
              <div key={s.id}
                className={`docs-nav-item ${activeSection === s.id ? 'active' : ''}`}
                onClick={() => { setActiveSection(s.id); setSidebarOpen(false); window.scrollTo(0, 0); }}>
                <span className="docs-nav-icon">{s.icon}</span>
                {s.label}
                {s.badge && <span className={`docs-nav-badge ${s.badge}`}>{s.badge}</span>}
              </div>
            ))}
          </div>
        ))}
      </aside>
      {sidebarOpen && <div className="docs-sidebar-backdrop" onClick={() => setSidebarOpen(false)} />}

      {/* Content */}
      <main className="docs-content">
        <div className="docs-breadcrumb">
          <a href="/" onClick={e => { e.preventDefault(); navigate('/'); }}>Home</a>
          <span className="sep">›</span>
          <a href="/docs" onClick={e => e.preventDefault()}>Docs</a>
          <span className="sep">›</span>
          <span>{SECTIONS.find(s => s.id === activeSection)?.label}</span>
        </div>
        <ContentComponent />
      </main>
    </div>
  );
}
