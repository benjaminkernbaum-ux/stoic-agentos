# ⚡ Stoic AgentOS — Claude Code Context

> **Owner**: Benjamin Kernbaum (`benjaminkernbaum-ux`)
> **Product**: AI Agent Operations Platform — SaaS for monitoring, orchestrating, and persisting knowledge across AI agent fleets
> **Live URL**: https://stoic-agentos.vercel.app
> **API**: https://stoic-agentos-api-production.up.railway.app
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
│  │  React 19 + RR7  │──│  Railway Docker  │                 │
│  │  Vercel Deploy   │  │  Port 4444       │                 │
│  └────────┬─────────┘  └────────┬─────────┘                 │
│           │                      │                           │
│  ┌────────┴──────────────────────┴─────────┐                │
│  │           SUPABASE (Postgres)           │                │
│  │  Auth · RLS · Organizations · Agents    │                │
│  │  Observations · Workspaces · API Keys   │                │
│  │  Knowledge Items · Billing              │                │
│  └─────────────────────────────────────────┘                │
│                                                              │
│  ┌──────────────────┐  ┌──────────────────┐                 │
│  │  STRIPE BILLING  │  │  SDK (npm)       │                 │
│  │  Pro: $29/mo     │  │  CLI + JS client │                 │
│  │  Team: $79/mo    │  │  Git hooks       │                 │
│  └──────────────────┘  └──────────────────┘                 │
└─────────────────────────────────────────────────────────────┘
```

---

## Project Structure

```
stoic-agentos/
├── src/                    # Frontend (Vite + React 19)
│   ├── App.jsx             # Router — Landing, Auth, Dashboard, Docs
│   ├── main.jsx            # Vite entry
│   ├── index.css           # Global styles (dark purple theme)
│   ├── pages/
│   │   ├── LandingPage.jsx + .css    # Marketing + Pricing
│   │   ├── Dashboard.jsx + .css      # Authenticated SaaS dashboard
│   │   ├── DocsPage.jsx + .css       # Developer documentation
│   │   ├── LoginPage.jsx             # Supabase email auth
│   │   └── SignupPage.jsx            # Supabase email auth
│   ├── contexts/           # Auth context (Supabase session)
│   └── lib/
│       └── supabase.js     # Supabase client init
├── api/                    # Backend API (Express.js)
│   ├── src/
│   │   ├── server.js       # Full Express server (751 lines)
│   │   ├── middleware/     # Auth middleware
│   │   └── routes/         # Route modules
│   ├── supabase/           # Migration files
│   └── package.json        # Deps: express, supabase, stripe, cors
├── sdk/                    # NPM SDK for developers
│   ├── src/
│   │   ├── cli.js          # `npx stoic-agentos-sdk init|test|init-hooks`
│   │   └── index.js        # JS client: AgentOS class
│   └── package.json
├── dist/                   # Vite build output (Vercel serves this)
├── public/                 # Static assets
├── .env                    # Frontend env (VITE_SUPABASE_*, VITE_API_URL)
├── vercel.json             # Vercel routing config
├── Dockerfile              # API Docker image
└── CLAUDE.md               # ← YOU ARE HERE
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
| `api_keys` | org_id, key (sk_live_xxx), name, active, last_used_at | API authentication |

**Auth**: Supabase Email Auth (magic link or password).
**RLS**: All tables have row-level security scoped by `org_id`.

---

## API Endpoints

**Base URL**: `https://stoic-agentos-api-production.up.railway.app/api/v1`
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
| **Webhooks** |||
| POST | `/webhooks/git` | Git commit capture (uses api_key in body) |

### Plan Limits

| Resource | Free | Pro ($29) | Team ($79) | Enterprise |
|----------|------|-----------|------------|------------|
| Workspaces | 2 | 10 | ∞ | ∞ |
| Agents | 5 | 25 | 100 | ∞ |
| Observations/mo | 10K | 100K | ∞ | ∞ |
| Knowledge Items | 5 | 25 | ∞ | ∞ |
| Git Hooks | 3 | 15 | ∞ | ∞ |
| Members | 1 | 5 | 15 | ∞ |

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
4. `api/migrations/005_hot_cache.sql` — adds `hot_cache`, `hot_cache_updated_at`, `hot_cache_stale` columns to organizations + `mark_hot_cache_stale()` trigger on observations

**Deploy order is not load-bearing.** If the API is deployed before migration_003 runs, BYOK gracefully degrades: read paths silently fall back to the platform `ANTHROPIC_API_KEY`, write paths (`POST/DELETE /api-keys/anthropic`) return `503` with a clear "migration pending" message, and the API logs `⚠️  Vault BYOK PENDING — run migration_003_vault_anthropic_keys.sql` at boot. Once the migration runs, the next call detects it and BYOK activates automatically.

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
npm install @stoic/agentos-sdk

# Initialize in a project
npx stoic-agentos-sdk init <YOUR_API_KEY>

# Test connection
npx stoic-agentos-sdk test
```

```javascript
import AgentOS from '@stoic/agentos-sdk';

const agentos = new AgentOS({ apiKey: 'sk_live_xxx' });

// Wrap an agent function
const myAgent = agentos.wrapAgent('data-processor', async (ctx) => {
  ctx.observe({ type: 'decision', title: 'Chose chunked processing' });
  // ... your agent logic
});

await myAgent();
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
2. **API key format**: `sk_live_xxx` or `sk_test_xxx` — inspired by Stripe.
3. **Observation types**: `file_edit`, `command`, `decision`, `error`, `discovery`, `architecture`, `dependency`, `config`, `deployment`, `note`, `git_commit`
4. **Dark purple theme** — HSL-based design system, glassmorphism cards.
5. **No SSR** — Pure SPA with client-side routing (React Router 7).

---

## Rules

- Never commit `.env` files
- Never expose `SUPABASE_SERVICE_KEY` in frontend code
- Always scope queries by `org_id`
- Use `VITE_` prefix for frontend env vars
- API key auth is checked first (faster), then JWT fallback
- Stripe webhooks must verify signature in production
