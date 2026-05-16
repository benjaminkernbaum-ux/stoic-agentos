# ⚡ Stoic AgentOS — MCP Server

Model Context Protocol server that exposes your entire Stoic infrastructure as callable tools for any MCP-compatible AI (Claude Code, Cursor, Windsurf, Cline, etc.).

## 13 Tools Available

### AgentOS API Tools
| Tool | Description |
|------|-------------|
| `agentos_health` | Check API health, uptime, DB connectivity |
| `agentos_stats` | Dashboard stats — agents, workspaces, observations, plan |
| `agentos_list_agents` | List all registered AI agents |
| `agentos_list_workspaces` | List all monitored workspaces |
| `agentos_list_observations` | List recent observations (filterable) |
| `agentos_capture_observation` | Capture new observation |
| `agentos_agent_heartbeat` | Register/update agent status |
| `agentos_list_knowledge` | List knowledge items |
| `agentos_create_knowledge` | Create persistent knowledge |

### Infrastructure Tools
| Tool | Description |
|------|-------------|
| `railway_health` | Check Railway services (API + infra agent) |
| `supabase_health` | Database health + table discovery |
| `github_status` | Cross-repo status for all 17 repos |
| `infra_command` | Run any whitelisted infra agent npm script |

## Setup

### 1. Install
```bash
cd mcp-server
npm install
```

### 2. Choose a connection mode

#### Option A — Local (stdio)

Claude Code / Cursor / Windsurf run the server as a subprocess over stdin/stdout.

Add to your MCP settings (`~/.claude/settings.json` or project `.claude/settings.json`):

```json
{
  "mcpServers": {
    "stoic-ops": {
      "command": "node",
      "args": ["c:/Users/benja/Comunidade stoic/stoic-agentos/mcp-server/index.js"],
      "env": {
        "AGENTOS_API_KEY": "sk_live_YOUR_KEY_HERE",
        "INFRA_AGENT_PATH": "c:/Users/benja/Nouveau dossier",
        "GITHUB_TOKEN": "ghp_YOUR_TOKEN"
      }
    }
  }
}
```

#### Option B — Remote (HTTP / StreamableHTTP)

Deploy the server to Railway (or any Node host) and connect any MCP client over HTTP.

**Start the server:**
```bash
# Local test
npm run start:http          # listens on :3100

# Production (set PORT in Railway env vars)
PORT=3100 node index.js
```

**Health check:**
```bash
curl http://localhost:3100/health
# {"status":"ok","mode":"http","sessions":0}
```

**Connect from Claude Code (remote URL):**
```json
{
  "mcpServers": {
    "stoic-ops-remote": {
      "url": "https://your-mcp-server.railway.app/mcp",
      "headers": {
        "Authorization": "Bearer sk_live_YOUR_KEY_HERE"
      }
    }
  }
}
```

**Deploy to Railway:**
1. Add the `mcp-server/` directory as a Railway service
2. Set env vars: `AGENTOS_API_KEY`, `PORT` (Railway sets this automatically)
3. Optionally set `AGENTOS_API_URL`, `INFRA_AGENT_PATH`, `GITHUB_TOKEN`

### 3. Test

```bash
# Stdio mode (hangs waiting for input — that's correct)
node index.js

# HTTP mode
npm run start:http
curl http://localhost:3100/health
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `AGENTOS_API_KEY` | ✅ | Your AgentOS API key (`sk_live_xxx`) |
| `AGENTOS_API_URL` | ❌ | API URL (default: production Railway) |
| `INFRA_AGENT_PATH` | ❌ | Path to `stoic-github-agent` workspace for infra commands |
| `GITHUB_TOKEN` | ❌ | GitHub PAT for repo status (used by infra agent) |
| `PORT` | ❌ | If set, starts HTTP server on this port instead of stdio |

## Security

- Infrastructure commands are **whitelisted** — only known npm scripts can run
- API calls use your `sk_live_` key — scoped to your organization
- No shell injection possible — arguments are sanitized
- Stdio mode: local only, no network exposure
- HTTP mode: sessions are isolated per connection; deploy behind a reverse proxy with TLS in production
