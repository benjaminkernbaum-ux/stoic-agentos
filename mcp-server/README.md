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

### 2. Configure Claude Code

Add to your Claude Code MCP settings (`~/.claude/settings.json` or project `.claude/settings.json`):

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

### 3. Test

```bash
# Test the MCP server starts (should hang waiting for stdio)
node index.js
# Ctrl+C to exit

# Or test via Claude Code — just open a session and the tools appear automatically
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `AGENTOS_API_KEY` | ✅ | Your AgentOS API key (`sk_live_xxx`) |
| `AGENTOS_API_URL` | ❌ | API URL (default: production Railway) |
| `INFRA_AGENT_PATH` | ❌ | Path to `stoic-github-agent` workspace for infra commands |
| `GITHUB_TOKEN` | ❌ | GitHub PAT for repo status (used by infra agent) |

## Security

- Infrastructure commands are **whitelisted** — only known npm scripts can run
- API calls use your `sk_live_` key — scoped to your organization
- No shell injection possible — arguments are sanitized
- MCP communicates via stdio (local only, no network exposure)
