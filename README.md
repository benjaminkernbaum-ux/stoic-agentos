<p align="center">
  <h1 align="center">⚡ Stoic AgentOS</h1>
  <p align="center"><strong>The Operating System for AI Agent Fleets</strong></p>
  <p align="center">Monitor, orchestrate, and persist knowledge across your AI agents — from a single dashboard.</p>
</p>

<p align="center">
  <a href="https://github.com/benjaminkernbaum-ux/stoic-agentos/stargazers"><img src="https://img.shields.io/github/stars/benjaminkernbaum-ux/stoic-agentos?style=social" alt="GitHub Stars" /></a>
  <a href="https://github.com/benjaminkernbaum-ux/stoic-agentos/network/members"><img src="https://img.shields.io/github/forks/benjaminkernbaum-ux/stoic-agentos?style=social" alt="GitHub Forks" /></a>
  <a href="https://www.npmjs.com/package/stoic-agentos-sdk"><img src="https://img.shields.io/npm/v/stoic-agentos-sdk?color=blue&label=npm" alt="npm version" /></a>
  <a href="https://www.npmjs.com/package/stoic-agentos-sdk"><img src="https://img.shields.io/npm/dm/stoic-agentos-sdk?color=green" alt="npm downloads" /></a>
  <a href="https://stoic-agentos.vercel.app"><img src="https://img.shields.io/badge/dashboard-live-brightgreen" alt="Dashboard" /></a>
  <a href="https://github.com/benjaminkernbaum-ux/stoic-agentos/blob/master/LICENSE"><img src="https://img.shields.io/badge/license-MIT-purple" alt="License" /></a>
</p>

<p align="center">
  <a href="https://stoic-agentos.vercel.app">Dashboard</a> · 
  <a href="https://stoic-agentos.vercel.app/docs">Docs</a> · 
  <a href="https://stoic-agentos.vercel.app/signup">Get Started Free</a> · 
  <a href="https://www.npmjs.com/package/stoic-agentos-sdk">npm</a> · 
  <a href="#quick-start">Quick Start</a>
</p>

<p align="center">
  <strong>⭐ Love this project? Star it — every star helps us reach more developers building with AI agents!</strong><br/>
  <sub>If AgentOS saves you time debugging agents, a star is the best way to say thanks 🙏</sub>
</p>

---

## The Problem

You're running AI agents in production — coding assistants, data pipelines, customer support bots, trading bots, content generators. Each one makes autonomous decisions, but:

- **No visibility** → Agent fails at 3 AM, you find out Monday
- **No memory** → Same agent rediscovers the same bug every session
- **No coordination** → 5 agents, 5 silos, zero shared knowledge

## The Solution

AgentOS gives your AI fleet a **command center** — real-time monitoring, persistent knowledge that survives across sessions, and usage-based billing that scales with you.

```
Your Agent Fleet          →  AgentOS SDK  →  Dashboard
├── Coding Assistant           3 lines       📊 Real-time status
├── Data Pipeline              of code       🧠 Shared knowledge
├── Support Bot                              📈 Usage analytics
└── Content Generator                        🔑 API key management
```

## Quick Start

### 1. Install

```bash
npm install stoic-agentos-sdk
```

### 2. Get Your API Key

Sign up at [stoic-agentos.vercel.app](https://stoic-agentos.vercel.app/signup) → Dashboard → Settings → Generate Key

### 3. Monitor Your First Agent

```javascript
import { AgentOS } from 'stoic-agentos-sdk';

const os = new AgentOS({
  apiKey: 'sk_live_your_key_here',
  workspace: 'my-project',
});

// Wrap any function → auto-captures start, success, and errors
const myAgent = os.wrapAgent('invoice-processor', async (input) => {
  const result = await processInvoice(input);
  return result;
});

// Run it — AgentOS tracks everything
await myAgent({ invoiceId: 'INV-001' });
```

### 4. Capture Decisions & Knowledge

```javascript
// Capture important observations
os.capture({
  type: 'decision',
  title: 'Switched to GPT-4o-mini for summarization',
  content: 'Reduced cost by 40% with no quality loss on BLEU benchmark',
});

// Persist knowledge across sessions
os.capture({
  type: 'architecture',
  title: 'Payment service uses idempotency keys',
  content: 'Always include X-Idempotency-Key header to prevent double charges',
});
```

## Features

| Feature | Description |
|---------|-------------|
| 🤖 **Agent Monitoring** | Real-time status, heartbeats, error tracking for your entire fleet |
| 🧠 **Knowledge Persistence** | Agents remember decisions across sessions — no more re-learning |
| 📊 **Usage Analytics** | Observations/month, agent runs, error rates at a glance |
| 📦 **Multi-Workspace** | Group agents by project, repo, or team |
| ⚡ **Auto-Capture** | `wrapAgent()` logs start, success, and errors automatically |
| 🔑 **API Key Management** | Generate, list, and revoke keys from the dashboard |
| 💳 **Usage-Based Billing** | Free tier with real limits, upgrade when you need more |
| 🔒 **Row-Level Security** | Full RLS on Supabase — your data is isolated per org |
| 🧠 **Claude-Powered Insights** | Auto-summarize activity (Haiku 4.5) and diagnose failing agents (Sonnet 4.6 + thinking) |
| 🔐 **BYOK** | Bring your own Anthropic key — stored encrypted in Supabase Vault, never plaintext |

## Why AgentOS?

| | **Stoic AgentOS** | Langfuse | AgentOps | CrewAI |
|---|---|---|---|---|
| **Agent monitoring** | ✅ | ✅ | ✅ | ⚠️ Orchestration only |
| **Knowledge persistence** | ✅ | ❌ | ❌ | ❌ |
| **Auto-capture SDK** | ✅ 3 lines | ⚠️ Decorator-based | ✅ | ❌ |
| **Multi-workspace** | ✅ | ⚠️ Projects | ❌ | ❌ |
| **Self-serve dashboard** | ✅ | ✅ | ✅ | ❌ |
| **Usage limits + billing** | ✅ Built-in | ✅ | ❌ | ❌ |
| **Open-source core** | ✅ MIT | ✅ MIT | Partial | ✅ |
| **Setup time** | 3 min | 10 min | 5 min | 30 min |

## Pricing

| | Free | Pro — $49/mo | Team — $299/mo | Enterprise |
|---|------|-------------|----------------|------------|
| Workspaces | 2 | 10 | Unlimited | Unlimited |
| Agents | 5 | 25 | 100 | Unlimited |
| Observations/mo | 10,000 | 100,000 | Unlimited | Unlimited |
| Knowledge items | 5 | 25 | Unlimited | Unlimited |
| Members | 1 | 5 | 15 | Unlimited |

[**Start Free →**](https://stoic-agentos.vercel.app/signup)

## Architecture

```
┌────────────────────────────────┐
│  Your Application              │
│  ├── Agent 1                   │
│  ├── Agent 2                   │─── stoic-agentos-sdk (npm)
│  └── Agent N                   │         │
└────────────────────────────────┘         │
                                           ▼
┌──────────────────────────────────────────────────┐
│  AgentOS API (Railway)                            │
│  ├── Auth (Supabase JWT + API Keys)               │
│  ├── Observations → /api/v1/observations          │
│  ├── Agents → /api/v1/agents                      │
│  ├── Knowledge → /api/v1/knowledge-items          │
│  ├── Billing → /api/v1/billing (Stripe)           │
│  └── Webhooks → /webhooks/stripe, /webhooks/git   │
└──────────────────────────────────────────────────┘
         │                    │
         ▼                    ▼
┌─────────────┐    ┌─────────────────┐
│  Supabase   │    │  Stripe         │
│  (Postgres) │    │  (Billing)      │
│  8 tables   │    │  Checkout +     │
│  RLS on all │    │  Portal +       │
│             │    │  Webhooks       │
└─────────────┘    └─────────────────┘
```

## API Reference

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/api/v1/observations` | API Key | Create observation |
| `GET` | `/api/v1/observations` | API Key | List observations |
| `POST` | `/api/v1/agents` | API Key | Register agent |
| `GET` | `/api/v1/agents` | API Key | List agents |
| `POST` | `/api/v1/agents/heartbeat` | API Key | Agent heartbeat (upsert) |
| `POST` | `/api/v1/knowledge-items` | API Key | Create knowledge item |
| `POST` | `/api/v1/workspaces` | API Key | Create workspace |
| `GET` | `/api/v1/stats` | API Key | Dashboard stats |
| `POST` | `/api/v1/api-keys` | JWT | Generate API key |
| `DELETE` | `/api/v1/api-keys/:id` | JWT | Revoke API key |
| `POST` | `/api/v1/billing/checkout` | JWT | Start Stripe checkout |
| `POST` | `/api/v1/billing/portal` | JWT | Open customer portal |

## SDK Reference

```javascript
import { AgentOS } from 'stoic-agentos-sdk';

// Initialize
const os = new AgentOS({ apiKey: 'sk_live_xxx', workspace: 'my-app' });

// Core methods
os.capture({ type, title, content, metadata })     // Log observation
os.wrapAgent(name, fn)                              // Auto-monitor function
os.addKnowledge({ name, summary, content })         // Persist knowledge
os.listAgents()                                     // Get all agents
os.listObservations({ limit, type })                // Query observations

// Claude-powered insights (v2.1+)
await os.summarize({ hours: 168 })                 // AI briefing of recent activity
await os.analyzeAgent(agentId)                     // Diagnose an agent's health
await os.ask('Why did the email-agent fail?')      // Free-form Q&A
```

## Claude Integration

AgentOS uses Anthropic Claude for AI-powered insights — summarizing observations, diagnosing agent failures, answering free-form questions about your fleet.

**Models:** Haiku 4.5 for fast summaries, Sonnet 4.6 with adaptive thinking for deep diagnosis.

**Three surfaces:**
- **API**: `POST /insights/{summarize,analyze-agent,ask}` — see API Reference
- **SDK**: `os.summarize()`, `os.analyzeAgent(id)`, `os.ask(q)` (above)
- **MCP server**: `agentos_summarize_observations`, `agentos_analyze_agent`, `agentos_ask` tools

**BYOK (Bring Your Own Key):** Customers can route inference through their own Anthropic account from Settings → Anthropic API Key. Keys are stored encrypted in Supabase Vault (`vault.secrets`, pgsodium at rest) and accessed only by the API's service role. When no per-org key is set, the platform falls back to the `ANTHROPIC_API_KEY` env var.

**Cost tracking:** Every Claude call is logged to `anthropic_usage` with token counts and cache hits. The Settings tab shows call count, token usage, and estimated cost over a 7/30/90-day window.

**Caching:** All requests use `cache_control: { type: 'ephemeral' }` so repeated system prompts hit the prefix cache at ~10% of input cost.

## Contributing

We welcome contributions! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

```bash
# Clone the repo
git clone https://github.com/benjaminkernbaum-ux/stoic-agentos.git
cd stoic-agentos

# Install dependencies
npm install

# Start dev server
npm run dev
```

## License

MIT © 2026 [Benjamin Kernbaum](https://github.com/benjaminkernbaum-ux)

---

## 🌍 Community

- 💬 [Discussions](https://github.com/benjaminkernbaum-ux/stoic-agentos/discussions) — Ask questions, share ideas
- 🐛 [Issues](https://github.com/benjaminkernbaum-ux/stoic-agentos/issues) — Report bugs, request features
- ⭐ [Star this repo](https://github.com/benjaminkernbaum-ux/stoic-agentos) — Help us reach more developers

---

<p align="center">
  <strong>Built with conviction.</strong><br/>
  <a href="https://stoicagentos.com">stoicagentos.com</a><br/><br/>
  <a href="https://github.com/benjaminkernbaum-ux/stoic-agentos/stargazers"><img src="https://img.shields.io/github/stars/benjaminkernbaum-ux/stoic-agentos?style=for-the-badge&logo=github&label=Star%20on%20GitHub&color=9b59ff" alt="Star on GitHub" /></a>
</p>
