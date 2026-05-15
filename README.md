# ⚡ Stoic AgentOS

**The MCP-native observability layer for autonomous AI agents.**

Capture every tool call. Kill misbehaving agents in one click. Ship an EU-AI-Act-ready
audit trail. Built for the post-MCP agent stack — not retrofitted from the LLM era.

![License](https://img.shields.io/badge/license-MIT-purple)
![Status](https://img.shields.io/badge/status-public%20beta-orange)

## Why Stoic

Langfuse traced LLM calls. AgentOps logged agent runs. Both shipped before MCP went
from spec to **9,400+ servers in production**. Stoic captures the *tool-call*
surface — the place where modern agents actually fail — and the *containment*
surface — the place where ops actually need control:

| | Langfuse | AgentOps | **Stoic** |
| --- | :---: | :---: | :---: |
| MCP-native tool capture | ❌ | ❌ | ✅ |
| One-click kill switch (org-wide) | ❌ | ❌ | ✅ |
| EU-AI-Act audit export | ❌ | ❌ | ✅ |
| LLM trace visualization | ✅ | 🟡 | 🟡 |
| Open-source core | ✅ | ✅ | ✅ |

## Quick start

```bash
npm install @stoic/agentos-sdk
```

```js
import { AgentOS } from '@stoic/agentos-sdk';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';

const os = new AgentOS({ apiKey: process.env.AGENTOS_API_KEY });

// MCP-native — every tool call captured automatically
const github = os.wrapMcpClient(new Client(...), { serverName: 'github' });
await github.callTool({ name: 'create_issue', arguments: { ... } });

// Or wrap any agent function
const summarize = os.wrapAgent('summarizer', async (text) => model.complete(text));
```

Get an API key at [stoic-agentos.vercel.app](https://stoic-agentos.vercel.app).

## Architecture

Three components, three layers:

```
┌─────────────────────────────────────────────────────┐
│  Dashboard (React + Vite, deployed on Vercel)       │
│  Auth, agent fleet, observations, kill switch        │
├─────────────────────────────────────────────────────┤
│  API (Express + Supabase, deployed on Railway)       │
│  Multi-tenant REST, JWT + API-key auth, plan limits  │
├─────────────────────────────────────────────────────┤
│  SDK (@stoic/agentos-sdk on npm)                     │
│  MCP wrapper, agent wrapper, batched capture         │
└─────────────────────────────────────────────────────┘
```

Schema: `organizations`, `org_members`, `api_keys`, `workspaces`, `agents`,
`observations`, `knowledge_items`, `usage_monthly`. Row-level security
enforces org isolation; the API uses the service role with explicit org
scoping in every query.

## Repo layout

```
src/         Frontend (React + Vite)
api/src/     Backend (Express + Supabase)
api/supabase/  SQL migrations
sdk/         Published npm package (@stoic/agentos-sdk)
```

## Local development

```bash
# Frontend
npm install
npm run dev      # http://localhost:5173

# Backend
cd api && npm install && npm start
# Requires SUPABASE_URL and SUPABASE_SERVICE_KEY env vars
```

## Status

Public beta. Self-hosted is not yet supported — managed cloud only.
Pricing and limits are evolving; see the in-app Settings tab for current plan.

## License

MIT © Benjamin Kernbaum
