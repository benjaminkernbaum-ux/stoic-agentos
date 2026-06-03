# ⚡ Stoic AgentOS — Claude Code Context

> **Owner**: Benjamin Kernbaum (`benjaminkernbaum-ux`)
> **Product**: AI Agent Memory & Intelligence Platform — SaaS for persistent memory, knowledge, reflection, and compliance across AI agent fleets
> **Live URL**: https://stoicagentos.com
> **API**: https://api.stoicagentos.com
> **Repo**: https://github.com/benjaminkernbaum-ux/stoic-agentos

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    STOIC AGENTOS STACK                       │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────────┐  ┌──────────────────┐                 │
│  │  FRONTEND (Vite) │  │   API (Express)  │                 │
│  │  React 19 + RR7  │──│  TypeScript      │                 │
│  │  Vercel Deploy   │  │  Railway Docker  │                 │
│  └────────┬─────────┘  │  Port 4444       │                 │
│           │            └────────┬─────────┘                 │
│  ┌────────┴──────────────────────┴─────────┐                │
│  │           SUPABASE (Postgres + RLS)     │                │
│  │  Auth · Organizations · Agents · Traces │                │
│  │  Observations · Memory · Audit Log     │                │
│  │  Knowledge Items · Vault (BYOK)        │                │
│  └─────────────────────────────────────────┘                │
│                                                              │
│  ┌──────────────────┐  ┌──────────────────┐                 │
│  │  STRIPE BILLING  │  │  SDKs            │                 │
│  │  Pro: $29/mo     │  │  JS (npm) v3.0   │                 │
│  │  Team: $79/mo    │  │  Python (PyPI)   │                 │
│  └──────────────────┘  │  MCP Server      │                 │
│                        └──────────────────┘                 │
│  ┌──────────────────┐  ┌──────────────────┐                 │
│  │  Upstash Redis   │  │  Anthropic Claude│                 │
│  │  Rate limiting   │  │  Haiku 4.5 (fast)│                 │
│  │  (prod mode)     │  │  Sonnet 4.6(deep)│                 │
│  └──────────────────┘  └──────────────────┘                 │
└─────────────────────────────────────────────────────────────┘
```

---

## Project Structure

```
stoic-agentos/
├── src/                        # Frontend (Vite + React 19)
│   ├── App.jsx                 # Router — Landing, Auth, Dashboard, Docs
│   ├── main.jsx                # Vite entry
│   ├── index.css               # Global styles (dark purple theme)
│   ├── pages/
│   │   ├── LandingPage.jsx     # Marketing + Pricing
│   │   ├── Dashboard.jsx       # Authenticated SaaS dashboard (lazy loaded)
│   │   ├── DocsPage.jsx        # Developer documentation
│   │   ├── LoginPage.jsx       # Supabase email auth + Turnstile CAPTCHA
│   │   ├── SignupPage.jsx      # Supabase email auth + Turnstile CAPTCHA
│   │   ├── BlogArticles.jsx    # Blog article rendering
│   │   ├── StaticPages.jsx     # About, Changelog, Privacy, Terms, Security, 404
│   │   └── dashboard/
│   │       ├── index.jsx       # Dashboard shell (sidebar, topbar, tab routing)
│   │       ├── tabs/           # 17 dashboard tabs (OverviewTab, TracesTab, etc.)
│   │       ├── components/     # Sidebar, Topbar, Modals, CommandPalette
│   │       └── hooks/          # Dashboard-specific hooks
│   ├── components/             # 18 shared components (ChatAssistant, TraceTimeline, etc.)
│   ├── contexts/
│   │   └── AuthContext.jsx     # Supabase session management
│   └── lib/
│       └── supabase.js         # Supabase client init
├── api/                        # Backend API (Express.js + TypeScript)
│   ├── src/
│   │   ├── server.ts           # Express server entry (166 lines, modular)
│   │   ├── types.ts            # Shared TypeScript interfaces
│   │   ├── middleware/
│   │   │   ├── auth.ts         # Dual-mode: API key (SHA-256) + JWT
│   │   │   ├── rateLimiter.ts  # Plan-aware, Upstash Redis + in-memory fallback
│   │   │   ├── db.ts           # Supabase client + plan limits
│   │   │   ├── production.ts   # Request ID, metrics, error handler, shutdown
│   │   │   ├── security.ts     # HSTS, CSP, X-Frame-Options
│   │   │   ├── rbac.ts         # Role-based access (member/admin/owner)
│   │   │   ├── cost.ts         # LLM cost calculator (6 providers, 30+ models)
│   │   │   ├── validate.js     # Zero-dep Zod-style input validation
│   │   │   └── logger.js       # Structured JSON logging
│   │   ├── routes/             # 19 route modules (see API Endpoints below)
│   │   ├── lib/
│   │   │   ├── anthropic.ts    # Claude client factory with Vault BYOK
│   │   │   ├── counterCache.ts # Monthly count cache (60s TTL, fail-open)
│   │   │   ├── metrics.ts      # p50/p95/p99 latency tracking
│   │   │   ├── pricing.ts      # Token pricing tables
│   │   │   ├── webhookEngine.ts # Webhook delivery with HMAC signing
│   │   │   ├── safeError.ts    # Production-safe error responses
│   │   │   └── utils.ts        # Shared utilities
│   │   └── __tests__/          # Vitest test files
│   ├── migrations/             # 12 SQL migration files (002–013)
│   ├── openapi.yaml            # OpenAPI 3.0 spec
│   └── package.json
├── sdk/                        # JS SDK v3.0 (npm: stoic-agentos-sdk)
│   ├── src/
│   │   ├── index.js            # Main client: AgentOS class
│   │   ├── index.d.ts          # TypeScript type definitions
│   │   ├── cli.js              # CLI: init, test, init-hooks
│   │   ├── trace.js            # Trace class (span collection)
│   │   ├── pricing.js          # Client-side cost estimation
│   │   └── instrumentors/      # Auto-instrumentation (OpenAI, Anthropic)
│   └── package.json
├── sdk-python/                 # Python SDK (PyPI: stoicos)
│   ├── stoicos/                # Python client package
│   └── pyproject.toml
├── mcp-server/                 # MCP server for Claude Code integration
│   └── index.js                # All MCP tools (31KB)
├── Dockerfile                  # API Docker image (Railway)
├── vercel.json                 # Vercel routing config
├── CHANGELOG.md                # Version history (v1.0.0 → v2.0.0)
└── CLAUDE.md                   # ← YOU ARE HERE
```

---

## Supabase Schema

**Project**: `viiagdhtzbvkfhcjqrlz` (StoicAgentOS org)

| Table | Key Columns | Purpose |
|-------|-------------|---------|
| `organizations` | id, name, slug, plan, stripe_customer_id, stripe_subscription_id, hot_cache, hot_cache_updated_at, hot_cache_stale | Multi-tenant orgs |
| `org_members` | org_id, user_id, role (owner/admin/member) | Org membership |
| `agents` | org_id, name, module, status, last_heartbeat, total_runs, total_errors | Registered AI agents |
| `observations` | org_id, workspace_id, agent_id, type, title, content, importance | Agent activity log |
| `workspaces` | org_id, name, path, stack, git_remote, branch | Monitored codebases |
| `knowledge_items` | org_id, name, summary, content, artifacts | Persistent knowledge |
| `api_keys` | org_id, key_hash (SHA-256), name, active, last_used_at | API authentication |
| `traces` | org_id, trace_id, name, agent, status, duration_ms, total_tokens, total_cost_usd, span_count | LLM call trace groups |
| `spans` | org_id, trace_id, span_id, provider, model, prompt_tokens, completion_tokens, cost_usd, latency_ms | Individual LLM calls |
| `working_memory` | org_id, agent_id, session_id, key, value, expires_at | Ephemeral session KV |
| `episodic_memory` | org_id, agent_id, content, event_type, importance, valid_from | Time-series events |
| `semantic_memory` | org_id, subject, relation, object, confidence, source_type | Knowledge triplets |
| `audit_log` | org_id, event_type, action, verdict, reasoning, metadata | Immutable compliance |
| `chat_conversations` | org_id, title | AI chat conversation history |
| `chat_messages` | conversation_id, role, content | Chat messages |
| `anthropic_usage` | org_id, endpoint, model, input_tokens, output_tokens, cache_read_tokens | Claude usage tracking |
| `alert_rules` | org_id, name, type, config, channel, destination | User-defined alerts |
| `alert_events` | org_id, rule_id, severity, message | Triggered alerts |

**Auth**: Supabase Email Auth (magic link or password) + Cloudflare Turnstile CAPTCHA.
**RLS**: All tables have row-level security scoped by `org_id`.
**API Keys**: SHA-256 hashed at rest — plaintext keys never stored (migration 012+013).

---

## API Endpoints

**Base URL**: `https://api.stoicagentos.com/api/v1`
**Auth**: `Authorization: Bearer sk_live_xxx` (API key) or Supabase JWT.

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Liveness probe — uptime, request count (no auth, <50ms) |
| GET | `/health/ready` | Readiness probe — checks Supabase, Anthropic, Stripe |
| GET | `/health/metrics` | Full metrics — p50/p95/p99 latency, per-endpoint breakdown |
| POST | `/auth/setup-org` | Create org after signup (JWT) |
| GET | `/stats` | Dashboard stats |
| **Observations** |||
| POST | `/observations` | Capture observation |
| POST | `/observations/batch` | Batch insert up to 100 observations (single DB call) |
| GET | `/observations` | List (type, workspace, agent filters) |
| **Agents** |||
| POST | `/agents` | Register agent (module fallback to 'standalone') |
| GET | `/agents` | List agents |
| PATCH | `/agents/:id` | Update status/heartbeat |
| DELETE | `/agents/:id` | Remove agent |
| POST | `/agents/heartbeat` | Upsert by name |
| **Workspaces** |||
| POST | `/workspaces` | Register workspace |
| GET | `/workspaces` | List workspaces |
| DELETE | `/workspaces/:id` | Remove workspace |
| **Knowledge** |||
| POST | `/knowledge-items` | Create KI |
| GET | `/knowledge-items` | List KIs |
| DELETE | `/knowledge-items/:id` | Remove KI |
| **API Keys** |||
| GET | `/api-keys` | List (masked) |
| POST | `/api-keys` | Generate new key |
| DELETE | `/api-keys/:id` | Revoke key |
| **Billing** |||
| POST | `/billing/checkout` | Stripe checkout session |
| POST | `/billing/portal` | Stripe customer portal |
| **Insights (Claude)** |||
| POST | `/insights/summarize` | Summarize recent observations (Haiku 4.5) |
| POST | `/insights/analyze-agent` | Diagnose an agent (Sonnet 4.6 + adaptive thinking) |
| POST | `/insights/ask` | Free-form Q&A grounded in org data (hot-cache-first) |
| GET | `/insights/hot-cache` | Read the org's hot cache status and content |
| POST | `/insights/hot-cache/refresh` | Regenerate the org's hot cache via Haiku |
| GET | `/api-keys/anthropic` | Get Anthropic key status (masked) |
| POST | `/api-keys/anthropic` | Set per-org Anthropic key (BYOK) |
| DELETE | `/api-keys/anthropic` | Remove per-org Anthropic key |
| **Stoic AI Chat** |||
| POST | `/chat` | Full-context AI chat (Sonnet + adaptive thinking, all org data) |
| GET | `/chat/:conversationId` | Get conversation history |
| GET | `/chat/suggestions` | Suggested prompts for empty state |
| **Webhooks** |||
| POST | `/webhooks/git` | Git commit capture (uses api_key in body) |
| **Memory (Three-Tier)** |||
| GET | `/memory/stats` | Counts per tier {working, episodic, semantic} |
| GET | `/memory/working` | List working memory (?agent_id, ?session_id) |
| POST | `/memory/working` | Upsert working memory {session_id, key, value, ttl_seconds?} |
| DELETE | `/memory/working/:id` | Delete working memory entry |
| GET | `/memory/episodic` | List episodic memories (?agent_id, ?event_type, ?min_importance) |
| POST | `/memory/episodic` | Create episodic memory {content, event_type, importance} |
| GET | `/memory/episodic/timeline` | Episodic memories grouped by day |
| GET | `/memory/semantic` | List semantic triplets (?subject, ?relation) |
| POST | `/memory/semantic` | Create triplet {subject, relation, object, confidence?} |
| DELETE | `/memory/semantic/:id` | Delete semantic triplet |
| **Compliance** |||
| GET | `/compliance/audit-log` | List audit entries (?event_type, ?verdict, ?from, ?to) |
| POST | `/compliance/audit-log` | Create audit entry {event_type, action, verdict?} |
| GET | `/compliance/audit-log/stats` | Aggregate stats by type, verdict, day |
| GET | `/compliance/audit-log/export` | SIEM-compatible JSON export (?from, ?to) |
| GET | `/compliance/circuit-breaker` | Circuit breaker status per agent |
| **Reflection** |||
| POST | `/reflection/run` | AI-powered episodic→semantic extraction (Claude Haiku) |
| POST | `/reflection/decay` | Time-based memory decay across all tiers |
| GET | `/reflection/status` | Last reflection and decay timestamps |

### Plan Limits

| Resource | Free | Pro ($29) | Team ($79) | Enterprise |
|----------|------|-----------|------------|------------|
| Workspaces | 2 | 10 | ∞ | ∞ |
| Agents | 5 | 25 | 100 | ∞ |
| Observations/mo | 10K | 100K | ∞ | ∞ |
| Traces/mo | 1K | 50K | ∞ | ∞ |
| Knowledge Items | 5 | 25 | ∞ | ∞ |
| Git Hooks | 3 | 15 | ∞ | ∞ |
| Members | 1 | 5 | 15 | ∞ |
| Rate limit (rpm) | 100 | 1K | 5K | 10K |
| Ingest limit (rpm) | 200 | 2K | 10K | 50K |

---

## Deployment

### Frontend → Vercel
- **Framework**: Vite
- **Build**: `npm run build` → `dist/`
- **Env vars** (Vercel dashboard): `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_API_URL`

### API → Railway
- **Docker**: `Dockerfile` in repo root
- **Service**: `stoic-agentos-api` in Railway project `a951f3a5-e4a5-4908-a211-5a36c1e597df`
- **Env vars** (Railway): `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_PRO_PRICE_ID`, `STRIPE_TEAM_PRICE_ID`, `STRIPE_WEBHOOK_SECRET`, `ANTHROPIC_API_KEY`, `PORT=4444`

---

## Claude Integration

The platform uses Anthropic Claude for AI-powered insights across three surfaces:

| Surface | Models | Where |
|---------|--------|-------|
| **API service** | Haiku 4.5 (fast) + Sonnet 4.6 (smart, adaptive thinking) | `api/src/lib/anthropic.js`, `/insights/*` routes |
| **MCP server** | Same — Haiku for summaries, Sonnet for diagnosis | `agentos_summarize_observations`, `agentos_analyze_agent` |
| **SDK** | (calls API endpoints) | `os.summarize()`, `os.analyzeAgent(id)`, `os.ask(q)` |

**Key resolution order** (multi-tenant BYOK):
1. `organizations.anthropic_key_vault_id` → fetched via `get_org_anthropic_key()` RPC (Supabase Vault, encrypted at rest, service-role only)
2. `ANTHROPIC_API_KEY` env var — platform-wide fallback

The API caches decrypted keys in-process for 5 min to avoid an RPC per Claude call. Cache is invalidated when the key is set or cleared via `POST/DELETE /api-keys/anthropic`.

**Caching**: All Claude calls use top-level `cache_control: { type: 'ephemeral' }` so repeated system prompts hit the prefix cache (~10% of input cost).

**Migrations** (run in order in the Supabase SQL editor):
1. `api/supabase/migration_001_init.sql` — base schema
2. `api/supabase/migration_002_anthropic_keys.sql` — adds `anthropic_key_last4`, `anthropic_usage` table
3. `api/supabase/migration_003_vault_anthropic_keys.sql` — moves keys into Supabase Vault, drops plaintext column, adds `set/get/clear_org_anthropic_key()` RPCs
4. `api/migrations/002_traces_spans_alerts.sql` — traces, spans, alert_rules, alert_events
5. `api/migrations/003_production_hardening.sql` — indexes, constraints
6. `api/migrations/004_upsert_constraints.sql` — UNIQUE constraints for upserts
7. `api/migrations/005_hot_cache.sql` — hot_cache columns + AFTER INSERT trigger on observations
8. `api/migrations/006_performance_indexes.sql` — indexes for common query patterns
9. `api/migrations/007_relax_module_constraint.sql` — flexible observation types
10. `api/migrations/008_three_tier_memory.sql` — working_memory, episodic_memory, semantic_memory, audit_log
11. `api/migrations/009_memory_rls_and_indexes.sql` — RLS policies + indexes for memory tables
12. `api/migrations/010_vault_anthropic_keys.sql` — Supabase Vault RPCs for BYOK
13. `api/migrations/011_chat_conversations.sql` — chat_conversations, chat_messages
14. `api/migrations/012_api_key_hashing.sql` — SHA-256 hashed API key column
15. `api/migrations/013_drop_plaintext_keys.sql` — drop plaintext key column

**Deploy order is not load-bearing.** If the API is deployed before migrations run, all new features gracefully degrade: memory/compliance/reflection routes return empty arrays, BYOK falls back to the platform `ANTHROPIC_API_KEY`, and the API logs warnings at boot. Once migrations run, features activate automatically.

### Hot Cache (LLM Wiki pattern)

Ported from [claude-obsidian](https://github.com/AgriciDaniel/claude-obsidian). Instead of fetching 20 raw observations for every `/insights/ask` call, the platform maintains a pre-synthesized ~500-word rolling summary per org.

**How it works:**
- `POST /insights/hot-cache/refresh` → fetches up to 150 observations from the last 7 days, sends them to Haiku, and writes the result to `organizations.hot_cache`.
- An AFTER INSERT trigger on `observations` flips `hot_cache_stale = TRUE` whenever new data lands.
- `/insights/ask` reads `hot_cache` when it's fresh (stale=false), skipping all three parallel Supabase queries. When stale or empty, it falls back to the original live-fetch behavior.
- The cache is **overwritten, not appended** — bounded token cost.
- If `migration_005` hasn't run, `org.hot_cache` is `undefined` → all hot-cache paths degrade silently.

---

## SDK Usage

```bash
# Install
npm install stoic-agentos-sdk

# Initialize in a project
npx stoic-agentos-sdk init <YOUR_API_KEY>

# Test connection
npx stoic-agentos-sdk test
```

```javascript
import { AgentOS } from 'stoic-agentos-sdk';

const os = new AgentOS({ apiKey: 'sk_live_xxx', workspace: 'my-app' });

// Auto-instrument LLM providers (zero-config observability)
os.instrumentClient('openai', openaiClient);
os.instrumentClient('anthropic', anthropicClient);
// All LLM calls now auto-captured with tokens, cost, latency

// Group related calls into a trace
const trace = os.startTrace('process-email', { agent: 'email-bot' });
const result = await myAgent(email);
await trace.end();

// Wrap an agent function (auto-creates traces)
const myAgent = os.wrapAgent('data-processor', async (...args) => {
  // All instrumented LLM calls within scope auto-attach to the trace
  return await processData(...args);
});
await myAgent(data);

// Three-tier memory
os.memory.setWorking('session-1', 'context', { task: 'email' });
os.memory.recordEpisode('Processed 100 emails', { importance: 8 });
os.memory.storeTriple('service-A', 'depends_on', 'Redis');

// Claude-powered insights
const summary = await os.summarize({ limit: 50 });
const analysis = await os.analyzeAgent(agentId);
const answer = await os.ask('Which agent has the highest error rate?');

// Compliance audit
os.compliance.logEvent('tool_call', 'executed rm -rf /', { verdict: 'BLOCKED' });

// Reflection (AI knowledge extraction)
await os.reflection.run();   // episodic → semantic triplets
await os.reflection.decay(); // time-based memory aging
```

---

## Development Commands

```bash
# Frontend dev server
npm run dev

# API dev server (with auto-reload)
cd api && npm run dev

# Build for production
npm run build
```

---

## Ecosystem Context

This repo (`stoic-agentos`) is the **public-facing SaaS product**. It's part of a larger ecosystem:

| Related Repo | Purpose |
|-------------|---------|
| `stoic-github-agent` (Nouveau dossier) | Infrastructure ops hub — GitHub/Railway/Supabase CLI tools |
| `agent-ops` | Memory Engine (SQLite brain), Command Center |
| `saas-hub` | Legacy CRM SaaS (predecessor) |
| `StoicHub` | StoicBot Telegram bot + content calendar |
| `LuzDaPalavra` | Content factory — cinematic video pipeline |

### Infrastructure Agent Commands (from `stoic-github-agent`)
These are available in the infra workspace (`Nouveau dossier/`):

```bash
npm run status                 # GitHub cross-repo dashboard
npm run railway:status         # Railway overview
npm run railway:health         # Service health checks
npm run supabase:health        # Database health check
npm run supabase:audit         # Data quality audit
```

---

## MCP Server

An MCP (Model Context Protocol) server is available at `mcp-server/` for remote AI access to Stoic infrastructure operations. Configure in Claude Code settings:

```json
{
  "mcpServers": {
    "stoic-ops": {
      "command": "node",
      "args": ["<path-to-repo>/mcp-server/index.js"],
      "env": {
        "GITHUB_TOKEN": "...",
        "RAILWAY_TOKEN": "...",
        "SUPABASE_URL": "...",
        "SUPABASE_SERVICE_KEY": "...",
        "AGENTOS_API_KEY": "sk_live_..."
      }
    }
  }
}
```

---

## Key Design Decisions

1. **Multi-tenant via `org_id`** — Every table is scoped. RLS enforces isolation.
2. **API key format**: `sk_live_xxx` or `sk_test_xxx` — inspired by Stripe. SHA-256 hashed at rest.
3. **Observation types**: `file_edit`, `command`, `decision`, `error`, `discovery`, `architecture`, `dependency`, `config`, `deployment`, `note`, `git_commit`, `agent_run`
4. **Dark purple theme** — HSL-based design system, glassmorphism cards.
5. **No SSR** — Pure SPA with client-side routing (React Router 7).
6. **Dual-mode rate limiting** — Upstash Redis (production) + in-memory Map (local dev). Zero-config fallback.
7. **BYOK pattern** — Anthropic keys encrypted in Supabase Vault (pgsodium). Decrypted keys cached 5 min in-process.
8. **Counter cache** — `lib/counterCache.ts` caches monthly trace/observation counts with 60s TTL. Eliminates COUNT(*) per ingest. Fail-open design.
9. **Batch observations** — `POST /observations/batch` accepts up to 100 observations in a single DB insert. SDK `flush()` uses batch endpoint with fallback to individual sends.
10. **Reflection optimization** — Triplets inserted as single batch. Memory decay groups updates by tier (2-3 UPDATEs instead of N).
11. **Auth debouncing** — API key `last_used_at` only written to DB every 5 minutes to reduce write load.

---

## Performance Patterns

| Pattern | Where | Impact |
|---------|-------|--------|
| Counter cache (60s TTL) | `lib/counterCache.ts` → traces.ts, observations.ts | ~60× fewer COUNT queries |
| Batch observation endpoint | `POST /observations/batch` | 10× fewer HTTP calls from SDK |
| Auth debounce (5 min) | `middleware/auth.ts` | Reduces `last_used_at` writes |
| Hot cache (Haiku wiki) | `organizations.hot_cache` | Skips 3 parallel queries for `/insights/ask` |
| Anthropic client cache | `lib/anthropic.ts` | One Anthropic instance per key |
| Vault key cache (5 min) | `lib/anthropic.ts` | Avoids RPC per Claude call |
| Reflection batch insert | `routes/reflection.ts` | 1 INSERT instead of N |
| Decay tier grouping | `routes/reflection.ts` | 2-5 UPDATEs instead of N |
| SDK observation buffering | `sdk/src/index.js` | Client-side batching (10 items / 5s) |
| SDK retry + exponential backoff | `sdk/src/index.js` | 3 retries, 500ms base, jitter |

---

## Rules

- Never commit `.env` files
- Never expose `SUPABASE_SERVICE_KEY` in frontend code
- Always scope queries by `org_id`
- Use `VITE_` prefix for frontend env vars
- API key auth is checked first (faster), then JWT fallback
- Stripe webhooks must verify signature in production
- Use `counterCache.incrementCounter()` after successful inserts to traces/observations
- Use batch inserts (`.insert([...])`) instead of loops for multiple DB writes
- All new features must degrade gracefully if their migration hasn't run
