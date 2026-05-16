#!/usr/bin/env node
/**
 * ⚡ Stoic AgentOS — MCP Server
 * Model Context Protocol server exposing Stoic infrastructure operations
 * as callable tools for Claude Code, Cursor, Windsurf, etc.
 *
 * Modes:
 *   stdio (default)  — local use via Claude Code / Cursor / Windsurf MCP config
 *   HTTP (PORT set)  — remote use via StreamableHTTP transport
 *
 * Tools:
 *   agentos_health           — Check AgentOS API health
 *   agentos_stats            — Get dashboard stats
 *   agentos_list_agents      — List registered agents
 *   agentos_list_workspaces  — List workspaces
 *   agentos_list_observations — List recent observations
 *   agentos_capture_observation — Capture new observation
 *   agentos_agent_heartbeat  — Send agent heartbeat
 *   agentos_list_knowledge   — List knowledge items
 *   agentos_create_knowledge — Create knowledge item
 *   railway_health           — Check Railway services
 *   supabase_health          — Check Supabase database
 *   github_status            — Cross-repo GitHub status
 *   infra_command            — Run infrastructure agent command
 *
 * Config env vars:
 *   AGENTOS_API_KEY     — API key (sk_live_xxx)
 *   AGENTOS_API_URL     — API base URL (default: production)
 *   INFRA_AGENT_PATH    — Path to stoic-github-agent workspace
 *   GITHUB_TOKEN        — GitHub PAT for status checks
 *   PORT                — If set, starts HTTP server instead of stdio
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { z } from 'zod';
import { execSync } from 'child_process';
import { randomUUID } from 'crypto';
import express from 'express';

// ── Config ──
const API_URL = process.env.AGENTOS_API_URL || 'https://stoic-agentos-api-production.up.railway.app';
const API_KEY = process.env.AGENTOS_API_KEY || '';
const INFRA_PATH = process.env.INFRA_AGENT_PATH || '';
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : null;

// ── HTTP Helper ──
async function apiCall(method, path, body = null) {
  const url = `${API_URL}/api/v1${path}`;
  const opts = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(API_KEY ? { 'Authorization': `Bearer ${API_KEY}` } : {}),
    },
  };
  if (body) opts.body = JSON.stringify(body);

  try {
    const res = await fetch(url, opts);
    const data = await res.json();
    return { status: res.status, data };
  } catch (err) {
    return { status: 0, data: { error: err.message } };
  }
}

// ── Shell Helper (for infra commands) ──
function runInfraCommand(npmScript, timeout = 30000) {
  if (!INFRA_PATH) {
    return { error: 'INFRA_AGENT_PATH not set — cannot run infra commands' };
  }
  try {
    const output = execSync(`npm run ${npmScript}`, {
      cwd: INFRA_PATH,
      timeout,
      encoding: 'utf-8',
      env: { ...process.env, FORCE_COLOR: '0' },
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    return { output: output.trim() };
  } catch (err) {
    return {
      error: err.message,
      stdout: err.stdout?.trim() || '',
      stderr: err.stderr?.trim() || '',
    };
  }
}

// ── Server Factory ──
// Creates a fully configured McpServer instance with all tools registered.
// Called once for stdio mode; called per-session for HTTP mode.
function createServer() {
  const server = new McpServer({
    name: 'stoic-agentos-ops',
    version: '1.0.0',
  });

  // ════════════════════════════════════════
  // TOOLS: AgentOS API
  // ════════════════════════════════════════

  server.tool(
    'agentos_health',
    'Check Stoic AgentOS API health — returns status, version, uptime, and database connectivity',
    {},
    async () => {
      const { status, data } = await apiCall('GET', '/health');
      return { content: [{ type: 'text', text: JSON.stringify({ http_status: status, ...data }, null, 2) }] };
    }
  );

  server.tool(
    'agentos_stats',
    'Get AgentOS dashboard stats — agent count, workspace count, monthly observations, knowledge items, plan info',
    {},
    async () => {
      const { status, data } = await apiCall('GET', '/stats');
      return { content: [{ type: 'text', text: JSON.stringify({ http_status: status, ...data }, null, 2) }] };
    }
  );

  server.tool(
    'agentos_list_agents',
    'List all registered AI agents in the organization',
    {},
    async () => {
      const { status, data } = await apiCall('GET', '/agents');
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.tool(
    'agentos_list_workspaces',
    'List all registered workspaces (monitored codebases)',
    {},
    async () => {
      const { status, data } = await apiCall('GET', '/workspaces');
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.tool(
    'agentos_list_observations',
    'List recent agent observations — activity feed with optional filtering',
    {
      limit: z.number().optional().default(20).describe('Max results (default 20)'),
      type: z.string().optional().describe('Filter by type: decision, error, architecture, deployment, git_commit, note, etc.'),
      agent: z.string().optional().describe('Filter by agent UUID'),
      workspace: z.string().optional().describe('Filter by workspace UUID'),
    },
    async ({ limit, type, agent, workspace }) => {
      const params = new URLSearchParams({ limit: String(limit) });
      if (type) params.set('type', type);
      if (agent) params.set('agent', agent);
      if (workspace) params.set('workspace', workspace);
      const { status, data } = await apiCall('GET', `/observations?${params}`);
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.tool(
    'agentos_capture_observation',
    'Capture a new observation (agent activity, decision, error, architecture change, etc.)',
    {
      type: z.enum(['file_edit', 'command', 'decision', 'error', 'discovery', 'architecture', 'dependency', 'config', 'deployment', 'note', 'git_commit']).describe('Observation type'),
      title: z.string().describe('Short observation title'),
      content: z.string().optional().default('').describe('Detailed content or context'),
      agent: z.string().optional().describe('Agent UUID'),
      workspace: z.string().optional().describe('Workspace UUID'),
      metadata: z.record(z.any()).optional().describe('Additional metadata object'),
    },
    async ({ type, title, content, agent, workspace, metadata }) => {
      const { status, data } = await apiCall('POST', '/observations', {
        type, title, content, agent, workspace, metadata,
      });
      return { content: [{ type: 'text', text: JSON.stringify({ http_status: status, ...data }, null, 2) }] };
    }
  );

  server.tool(
    'agentos_agent_heartbeat',
    'Send agent heartbeat — registers agent if new, updates status and run counts if existing',
    {
      name: z.string().describe('Agent name (used as unique identifier within org)'),
      status: z.enum(['idle', 'running', 'success', 'error', 'paused']).optional().default('running').describe('Agent status'),
      description: z.string().optional().describe('Agent description (used on first registration)'),
      module: z.string().optional().describe('Agent module: content, gtm, crm, financial, standalone'),
    },
    async ({ name, status, description, module }) => {
      const { status: httpStatus, data } = await apiCall('POST', '/agents/heartbeat', {
        name, status, description, module,
      });
      return { content: [{ type: 'text', text: JSON.stringify({ http_status: httpStatus, ...data }, null, 2) }] };
    }
  );

  server.tool(
    'agentos_list_knowledge',
    'List all knowledge items in the organization',
    {},
    async () => {
      const { status, data } = await apiCall('GET', '/knowledge-items');
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.tool(
    'agentos_create_knowledge',
    'Create a new knowledge item — persistent memory across AI sessions',
    {
      name: z.string().describe('Knowledge item title'),
      summary: z.string().optional().default('').describe('Short summary'),
      content: z.string().describe('Full knowledge content (markdown)'),
    },
    async ({ name, summary, content }) => {
      const { status, data } = await apiCall('POST', '/knowledge-items', { name, summary, content });
      return { content: [{ type: 'text', text: JSON.stringify({ http_status: status, ...data }, null, 2) }] };
    }
  );

  // ════════════════════════════════════════
  // TOOLS: Infrastructure Operations
  // ════════════════════════════════════════

  server.tool(
    'railway_health',
    'Check Railway service health — stoic-agentos-api, stoic-factory, n8n',
    {},
    async () => {
      const { status, data } = await apiCall('GET', '/health');
      const apiHealth = { api_endpoint: `${API_URL}/health`, http_status: status, ...data };

      let infraResult = null;
      if (INFRA_PATH) {
        infraResult = runInfraCommand('railway:check', 20000);
      }

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            api_health: apiHealth,
            ...(infraResult ? { infra_check: infraResult } : { infra_check: 'INFRA_AGENT_PATH not configured' }),
          }, null, 2),
        }],
      };
    }
  );

  server.tool(
    'supabase_health',
    'Check Supabase database health — connectivity, table discovery, row counts',
    {},
    async () => {
      if (!INFRA_PATH) {
        return { content: [{ type: 'text', text: 'INFRA_AGENT_PATH not configured — set it to the stoic-github-agent workspace path' }] };
      }
      const result = runInfraCommand('supabase:health', 20000);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    }
  );

  server.tool(
    'github_status',
    'Get cross-repo GitHub status for all 17 Stoic repositories — branches, commits, PRs',
    {
      repo: z.string().optional().describe('Optional: deep-dive into a specific repo name'),
    },
    async ({ repo }) => {
      if (!INFRA_PATH) {
        return { content: [{ type: 'text', text: 'INFRA_AGENT_PATH not configured' }] };
      }
      const cmd = repo ? `status -- --repo=${repo}` : 'status';
      const result = runInfraCommand(cmd, 30000);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    }
  );

  server.tool(
    'infra_command',
    'Run an infrastructure agent command — npm scripts from the stoic-github-agent workspace. Available: status, ci, webhooks, guard, sync, railway:status, railway:health, railway:optimize, railway:costs, railway:env, supabase, supabase:health, supabase:audit, supabase:indexes, supabase:rls',
    {
      script: z.string().describe('npm script name to run (e.g. "railway:status", "supabase:audit")'),
      args: z.string().optional().default('').describe('Additional CLI arguments'),
      timeout: z.number().optional().default(30000).describe('Timeout in ms (default 30s)'),
    },
    async ({ script, args, timeout }) => {
      if (!INFRA_PATH) {
        return { content: [{ type: 'text', text: 'INFRA_AGENT_PATH not configured' }] };
      }

      const allowed = [
        'status', 'ci', 'webhooks', 'guard', 'sync', 'hub',
        'railway', 'railway:status', 'railway:health', 'railway:optimize',
        'railway:benchmark', 'railway:env', 'railway:costs', 'railway:check',
        'supabase', 'supabase:health', 'supabase:audit', 'supabase:indexes', 'supabase:rls',
      ];

      if (!allowed.includes(script)) {
        return {
          content: [{
            type: 'text',
            text: `Script "${script}" not allowed. Available: ${allowed.join(', ')}`,
          }],
        };
      }

      const fullScript = args ? `${script} -- ${args}` : script;
      const result = runInfraCommand(fullScript, timeout);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    }
  );

  // ════════════════════════════════════════
  // RESOURCES: Project Context
  // ════════════════════════════════════════

  server.resource(
    'project-context',
    'stoic://context/overview',
    async (uri) => ({
      contents: [{
        uri: uri.href,
        mimeType: 'text/markdown',
        text: `# Stoic AgentOS — Project Context

## Quick Facts
- **Product**: AI Agent Operations Platform (SaaS)
- **Frontend**: Vite + React 19 → Vercel (stoic-agentos.vercel.app)
- **API**: Express.js → Railway (stoic-agentos-api-production.up.railway.app)
- **Database**: Supabase (viiagdhtzbvkfhcjqrlz)
- **Billing**: Stripe (Pro $29/mo, Team $79/mo)
- **SDK**: npm @stoic/agentos-sdk (CLI + JS client)

## Key Tables
organizations, org_members, agents, observations, workspaces, knowledge_items, api_keys

## Observation Types
file_edit, command, decision, error, discovery, architecture, dependency, config, deployment, note, git_commit

## Plan Limits
- Free: 5 agents, 2 workspaces, 10K obs/mo
- Pro: 25 agents, 10 workspaces, 100K obs/mo
- Team: 100 agents, unlimited workspaces, unlimited obs
`,
      }],
    })
  );

  return server;
}

// ════════════════════════════════════════
// START — stdio or HTTP based on PORT
// ════════════════════════════════════════

async function startStdio() {
  const server = createServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

async function startHttp(port) {
  const app = express();
  app.use(express.json());

  // Active sessions: sessionId → StreamableHTTPServerTransport
  const sessions = new Map();

  // Health check (no auth, useful for Railway/Vercel uptime probes)
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', mode: 'http', sessions: sessions.size });
  });

  // MCP endpoint — handles POST (requests), GET (SSE stream), DELETE (close)
  app.all('/mcp', async (req, res) => {
    try {
      const sessionId = req.headers['mcp-session-id'];

      if (req.method === 'POST' && !sessionId) {
        // New session — create transport + server pair
        const transport = new StreamableHTTPServerTransport({
          sessionIdGenerator: () => randomUUID(),
          onsessioninitialized: (id) => {
            sessions.set(id, transport);
          },
        });

        transport.onclose = () => {
          if (transport.sessionId) sessions.delete(transport.sessionId);
        };

        const server = createServer();
        await server.connect(transport);
        await transport.handleRequest(req, res, req.body);
        return;
      }

      const transport = sessions.get(sessionId);
      if (!transport) {
        res.status(404).json({ error: 'Session not found', sessionId });
        return;
      }

      await transport.handleRequest(req, res, req.body);

      if (req.method === 'DELETE') {
        sessions.delete(sessionId);
      }
    } catch (err) {
      if (!res.headersSent) {
        res.status(500).json({ error: err.message });
      }
    }
  });

  app.listen(port, () => {
    process.stderr.write(`MCP server listening on port ${port} (HTTP/StreamableHTTP)\n`);
    process.stderr.write(`Endpoint: http://localhost:${port}/mcp\n`);
  });
}

async function main() {
  if (PORT) {
    await startHttp(PORT);
  } else {
    await startStdio();
  }
}

main().catch((err) => {
  process.stderr.write(`MCP Server error: ${err.message}\n`);
  process.exit(1);
});
