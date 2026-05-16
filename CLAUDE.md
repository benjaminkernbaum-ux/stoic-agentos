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
| `organizations` | id, name, slug, plan, stripe_customer_id, stripe_subscription_id | Multi-tenant orgs |
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
| GET | `/health` | Health check (no auth) |
| POST | `/auth/setup-org` | Create org after signup (JWT) |
| GET | `/stats` | Dashboard stats |
| **Observations** |||
| POST | `/observations` | Capture observation |
| GET | `/observations` | List (type, workspace, agent filters) |
| **Agents** |||
| POST | `/agents` | Register agent |
| GET | `/agents` | List agents |
| PATCH | `/agents/:id` | Update status/heartbeat |
| POST | `/agents/heartbeat` | Upsert by name |
| **Workspaces** |||
| POST | `/workspaces` | Register workspace |
| GET | `/workspaces` | List workspaces |
| **Knowledge** |||
| POST | `/knowledge-items` | Create KI |
| GET | `/knowledge-items` | List KIs |
| **API Keys** |||
| GET | `/api-keys` | List (masked) |
| POST | `/api-keys` | Generate new key |
| DELETE | `/api-keys/:id` | Revoke key |
| **Billing** |||
| POST | `/billing/checkout` | Stripe checkout session |
| POST | `/billing/portal` | Stripe customer portal |
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
- **Env vars** (Railway): `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_PRO_PRICE_ID`, `STRIPE_TEAM_PRICE_ID`, `STRIPE_WEBHOOK_SECRET`, `PORT=4444`

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

An MCP (Model Context Protocol) server is available at `mcp-server/` for remote AI access to Stoic infrastructure operations.

**Two modes — both configured in `.claude/settings.json`:**

### Local (stdio)
Runs as a subprocess. Requires the repo cloned locally.
```json
{
  "mcpServers": {
    "stoic-ops": {
      "command": "node",
      "args": ["c:/Users/benja/Comunidade stoic/stoic-agentos/mcp-server/index.js"],
      "env": {
        "AGENTOS_API_KEY": "sk_live_...",
        "INFRA_AGENT_PATH": "c:/Users/benja/Nouveau dossier",
        "GITHUB_TOKEN": "ghp_..."
      }
    }
  }
}
```

### Remote (HTTP — Railway deployed)
Connect from anywhere — no local repo needed. Works in Claude Code on the web.
```json
{
  "mcpServers": {
    "stoic-ops-remote": {
      "url": "https://stoic-agentos-mcp.up.railway.app/mcp"
    }
  }
}
```

**Deploy MCP server to Railway:**
1. New service → "Deploy from GitHub repo" → root: `stoic-agentos`, Dockerfile: `mcp-server/Dockerfile`
2. Set env vars: `AGENTOS_API_KEY=sk_live_...`, `GITHUB_TOKEN=ghp_...`
3. Railway auto-sets `PORT` — server starts in HTTP mode automatically
4. Health check: `GET https://stoic-agentos-mcp.up.railway.app/health`

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
