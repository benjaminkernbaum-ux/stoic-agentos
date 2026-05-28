#!/usr/bin/env node
/**
 * ⚡ Stoic AgentOS — MCP Server
 * Model Context Protocol server exposing Stoic infrastructure operations
 * as callable tools for Claude Code, Cursor, Windsurf, etc.
 *
 * Tools:
 *   agentos_health        — Check AgentOS API health
 *   agentos_stats          — Get dashboard stats
 *   agentos_list_agents    — List registered agents
 *   agentos_list_workspaces — List workspaces
 *   agentos_list_observations — List recent observations
 *   agentos_capture_observation — Capture new observation
 *   agentos_agent_heartbeat — Send agent heartbeat
 *   agentos_list_knowledge  — List knowledge items
 *   agentos_create_knowledge — Create knowledge item
 *   agentos_memory_stats    — Memory tier statistics
 *   agentos_memory_store_episode — Record episodic memory
 *   agentos_memory_timeline — Episodic memory timeline by day
 *   agentos_memory_store_triple — Store semantic knowledge triple
 *   agentos_memory_query_triples — Query knowledge graph
 *   agentos_memory_get_working — Get working memory entries
 *   agentos_memory_set_working — Store/update working memory
 *   agentos_memory_delete_working — Delete working memory entry
 *   agentos_reflection_run  — Claude-powered knowledge extraction
 *   agentos_reflection_decay — Memory cleanup/decay
 *   agentos_reflection_status — Last reflection/decay timestamps
 *   agentos_audit_log       — Log audit event
 *   agentos_circuit_breaker — Circuit breaker status (read-only)
 *   agentos_compliance_stats — Audit log statistics
 *   railway_health         — Check Railway services
 *   supabase_health        — Check Supabase database
 *   github_status          — Cross-repo GitHub status
 *   infra_command          — Run infrastructure agent command
 *
 * Config env vars:
 *   AGENTOS_API_KEY     — API key (sk_live_xxx)
 *   AGENTOS_API_URL     — API base URL (default: production)
 *   INFRA_AGENT_PATH    — Path to stoic-github-agent workspace
 *   GITHUB_TOKEN        — GitHub PAT for status checks
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { execSync } from 'child_process';
import Anthropic from '@anthropic-ai/sdk';

// ── Config ──
const API_URL = process.env.AGENTOS_API_URL || 'https://stoic-agentos-api-production.up.railway.app';
const API_KEY = process.env.AGENTOS_API_KEY || '';
const INFRA_PATH = process.env.INFRA_AGENT_PATH || '';
const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY || '';

const MODELS = { fast: 'claude-haiku-4-5', smart: 'claude-sonnet-4-6' };
const anthropic = ANTHROPIC_KEY ? new Anthropic({ apiKey: ANTHROPIC_KEY }) : null;

async function claudeCall({ model = 'fast', system, prompt, maxTokens = 1024 }) {
  if (!anthropic) {
    return { error: 'ANTHROPIC_API_KEY not configured for MCP server' };
  }
  const resp = await anthropic.messages.create({
    model: MODELS[model] || model,
    max_tokens: maxTokens,
    system,
    messages: [{ role: 'user', content: prompt }],
    cache_control: { type: 'ephemeral' },
  });
  const text = resp.content.filter((b) => b.type === 'text').map((b) => b.text).join('\n');
  return { text, model: resp.model, usage: resp.usage };
}

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

// ── MCP Server ──
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
    // First try the live API health
    const { status, data } = await apiCall('GET', '/health');
    const apiHealth = { api_endpoint: `${API_URL}/health`, http_status: status, ...data };

    // Then try the infra agent if available
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

    // Security: only allow known scripts
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
          text: `❌ Script "${script}" not allowed. Available: ${allowed.join(', ')}`,
        }],
      };
    }

    const fullScript = args ? `${script} -- ${args}` : script;
    const result = runInfraCommand(fullScript, timeout);
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
  }
);

// ════════════════════════════════════════
// TOOLS: Claude-powered insight
// ════════════════════════════════════════

server.tool(
  'agentos_summarize_observations',
  'Use Claude to summarize recent agent observations into an executive briefing. Uses Haiku 4.5 by default for speed.',
  {
    hours: z.number().optional().default(24).describe('Window in hours (default 24)'),
    model: z.enum(['fast', 'smart']).optional().default('fast').describe('fast=Haiku 4.5, smart=Sonnet 4.6'),
  },
  async ({ hours, model }) => {
    if (!anthropic) {
      return { content: [{ type: 'text', text: 'ANTHROPIC_API_KEY not set for MCP server.' }] };
    }
    const { data: observations } = await apiCall('GET', `/observations?limit=200`);
    if (!Array.isArray(observations) || observations.length === 0) {
      return { content: [{ type: 'text', text: 'No observations found.' }] };
    }
    const cutoff = Date.now() - hours * 3600 * 1000;
    const recent = observations.filter((o) => new Date(o.created_at).getTime() >= cutoff);
    if (recent.length === 0) {
      return { content: [{ type: 'text', text: `No observations in the last ${hours}h.` }] };
    }
    const formatted = recent
      .map((o) => `[${o.type}|imp:${o.importance}] ${o.title}${o.content ? `\n  ${o.content.slice(0, 300)}` : ''}`)
      .join('\n');
    const result = await claudeCall({
      model,
      maxTokens: 1024,
      system:
        'You are an AI agent operations analyst. Summarize agent activity logs into a concise executive briefing. ' +
        'Lead with architectural decisions, errors, and deployments. Be specific — cite observation titles.',
      prompt: `Summarize these ${recent.length} observations from the last ${hours}h:\n\n${formatted}`,
    });
    return { content: [{ type: 'text', text: result.text || JSON.stringify(result) }] };
  }
);

server.tool(
  'agentos_analyze_agent',
  'Use Claude (Sonnet 4.6 with adaptive thinking) to diagnose an agent\'s reliability from its observation log.',
  {
    agent_name: z.string().describe('Agent name (as known to AgentOS)'),
  },
  async ({ agent_name }) => {
    if (!anthropic) {
      return { content: [{ type: 'text', text: 'ANTHROPIC_API_KEY not set for MCP server.' }] };
    }
    const { data: agents } = await apiCall('GET', '/agents');
    const agent = (Array.isArray(agents) ? agents : []).find((a) => a.name === agent_name);
    if (!agent) {
      return { content: [{ type: 'text', text: `Agent "${agent_name}" not found.` }] };
    }
    const { data: observations } = await apiCall('GET', `/observations?agent=${agent.id}&limit=50`);
    const errorRate = agent.total_runs > 0 ? (agent.total_errors / agent.total_runs) : 0;
    const formatted = (Array.isArray(observations) ? observations : [])
      .map((o) => `[${o.type}] ${o.title}${o.content ? ` — ${o.content.slice(0, 200)}` : ''}`)
      .join('\n');
    const resp = await anthropic.messages.create({
      model: MODELS.smart,
      max_tokens: 2048,
      thinking: { type: 'adaptive' },
      system:
        'You are a senior SRE diagnosing AI agent reliability. Output: (1) Health verdict (healthy/degraded/failing), ' +
        '(2) Top 3 issues with evidence, (3) Recommended actions. Be direct.',
      messages: [
        {
          role: 'user',
          content:
            `Agent: ${agent.name} (${agent.module})\n` +
            `Status: ${agent.status}\n` +
            `Total runs: ${agent.total_runs}, errors: ${agent.total_errors} (${(errorRate * 100).toFixed(1)}%)\n` +
            `Last heartbeat: ${agent.last_heartbeat || 'never'}\n\n` +
            `Recent observations:\n${formatted || '(none)'}`,
        },
      ],
      cache_control: { type: 'ephemeral' },
    });
    const text = resp.content.filter((b) => b.type === 'text').map((b) => b.text).join('\n');
    return { content: [{ type: 'text', text }] };
  }
);

server.tool(
  'agentos_ask',
  'Free-form Q&A about the org\'s agent fleet, grounded in recent observations and registered agents/workspaces. Defaults to Haiku 4.5; pass model="smart" for Sonnet 4.6.',
  {
    question: z.string().describe('The question to answer'),
    model: z.enum(['fast', 'smart']).optional().default('fast').describe('fast=Haiku 4.5, smart=Sonnet 4.6'),
  },
  async ({ question, model }) => {
    if (!anthropic) {
      return { content: [{ type: 'text', text: 'ANTHROPIC_API_KEY not set for MCP server.' }] };
    }
    const [agentsResp, wsResp, obsResp] = await Promise.all([
      apiCall('GET', '/agents'),
      apiCall('GET', '/workspaces'),
      apiCall('GET', '/observations?limit=20'),
    ]);
    const agentCount = Array.isArray(agentsResp.data) ? agentsResp.data.length : 0;
    const wsCount = Array.isArray(wsResp.data) ? wsResp.data.length : 0;
    const recent = Array.isArray(obsResp.data) ? obsResp.data : [];
    const context =
      `Agents: ${agentCount}, Workspaces: ${wsCount}\n\n` +
      `Last 20 observations:\n` +
      recent.map((o) => `- [${o.type}] ${o.title}`).join('\n');

    const result = await claudeCall({
      model,
      maxTokens: 1024,
      system:
        'You are the Stoic AgentOS assistant. Answer questions about the user\'s AI agent fleet ' +
        'based on the observation log provided. If the answer isn\'t in the data, say so.',
      prompt: `Context:\n${context}\n\nQuestion: ${question}`,
    });
    return { content: [{ type: 'text', text: result.text || JSON.stringify(result) }] };
  }
);

// ════════════════════════════════════════
// TOOLS: Three-Tier Memory
// ════════════════════════════════════════

server.tool(
  'agentos_memory_stats',
  'Get memory statistics — counts across all 3 tiers (working, episodic, semantic)',
  {},
  async () => {
    const { status, data } = await apiCall('GET', '/memory/stats');
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
  }
);

server.tool(
  'agentos_memory_store_episode',
  'Record an episodic memory — timestamped event with importance scoring.',
  {
    content: z.string().describe('Episode content (what happened)'),
    event_type: z.string().optional().default('observation').describe('Event type: observation, decision, error, deployment, discovery'),
    importance: z.number().optional().default(5).describe('Importance 1-10 (10 = critical)'),
    agent_id: z.string().optional().describe('Agent UUID'),
    metadata: z.record(z.any()).optional().describe('Additional metadata'),
  },
  async ({ content, event_type, importance, agent_id, metadata }) => {
    const { status, data } = await apiCall('POST', '/memory/episodic', {
      content, event_type, importance, agent_id, metadata,
    });
    return { content: [{ type: 'text', text: JSON.stringify({ http_status: status, ...data }, null, 2) }] };
  }
);

server.tool(
  'agentos_memory_timeline',
  'Get episodic memory as a timeline grouped by day — useful for reviewing recent agent activity',
  {},
  async () => {
    const { status, data } = await apiCall('GET', '/memory/episodic/timeline');
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
  }
);

server.tool(
  'agentos_memory_store_triple',
  'Store a knowledge triple in semantic memory: subject → relation → object',
  {
    subject: z.string().describe('Subject entity (e.g. "email-agent")'),
    relation: z.string().describe('Relation: uses, depends_on, deployed_to, configured_with, replaced, caused, resolved, prefers, avoids, handles'),
    object: z.string().describe('Object entity (e.g. "GPT-4o")'),
    confidence: z.number().optional().describe('Confidence 0.0-1.0 (default: 1.0)'),
    source_type: z.string().optional().default('manual').describe('Source: manual, observation, reflection'),
  },
  async ({ subject, relation, object, confidence, source_type }) => {
    const { status, data } = await apiCall('POST', '/memory/semantic', {
      subject, relation, object, confidence, source_type,
    });
    return { content: [{ type: 'text', text: JSON.stringify({ http_status: status, ...data }, null, 2) }] };
  }
);

server.tool(
  'agentos_memory_query_triples',
  'Query the semantic knowledge graph — find knowledge triples by subject or relation',
  {
    subject: z.string().optional().describe('Filter by subject (fuzzy match)'),
    relation: z.string().optional().describe('Filter by relation (exact match)'),
  },
  async ({ subject, relation }) => {
    const params = new URLSearchParams();
    if (subject) params.set('subject', subject);
    if (relation) params.set('relation', relation);
    const qs = params.toString();
    const { status, data } = await apiCall('GET', `/memory/semantic${qs ? `?${qs}` : ''}`);
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
  }
);

// ════════════════════════════════════════
// TOOLS: Working Memory
// ════════════════════════════════════════

server.tool(
  'agentos_memory_get_working',
  'Get working memory entries — ephemeral session-scoped key-value state',
  {
    session_id: z.string().optional().describe('Filter by session ID'),
    agent_id: z.string().optional().describe('Filter by agent UUID'),
  },
  async ({ session_id, agent_id }) => {
    const params = new URLSearchParams();
    if (session_id) params.set('session_id', session_id);
    if (agent_id) params.set('agent_id', agent_id);
    const qs = params.toString();
    const { status, data } = await apiCall('GET', `/memory/working${qs ? `?${qs}` : ''}`);
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
  }
);

server.tool(
  'agentos_memory_set_working',
  'Store or update a working memory entry — ephemeral key-value for a session',
  {
    session_id: z.string().describe('Session ID to scope the memory to'),
    key: z.string().describe('Key name (e.g. "current_task", "user_context")'),
    value: z.any().describe('Value to store (any JSON)'),
    agent_id: z.string().optional().describe('Agent UUID'),
    ttl_seconds: z.number().optional().describe('Time-to-live in seconds (auto-expires)'),
  },
  async ({ session_id, key, value, agent_id, ttl_seconds }) => {
    const { status, data } = await apiCall('POST', '/memory/working', {
      session_id, key, value, agent_id, ttl_seconds,
    });
    return { content: [{ type: 'text', text: JSON.stringify({ http_status: status, ...data }, null, 2) }] };
  }
);

server.tool(
  'agentos_memory_delete_working',
  'Delete a working memory entry by ID',
  {
    id: z.string().describe('Working memory entry UUID to delete'),
  },
  async ({ id }) => {
    const { status, data } = await apiCall('DELETE', `/memory/working/${id}`);
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
  }
);

// ════════════════════════════════════════
// TOOLS: Reflection
// ════════════════════════════════════════

server.tool(
  'agentos_reflection_run',
  'Trigger Claude-powered reflection — extract knowledge triples from recent episodic memories into semantic memory',
  {},
  async () => {
    const { status, data } = await apiCall('POST', '/reflection/run', {});
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
  }
);

server.tool(
  'agentos_reflection_decay',
  'Trigger memory decay — clean up expired working memory, reduce importance of old episodes, reduce confidence of stale triples',
  {},
  async () => {
    const { status, data } = await apiCall('POST', '/reflection/decay', {});
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
  }
);

server.tool(
  'agentos_reflection_status',
  'Get last reflection and decay timestamps',
  {},
  async () => {
    const { status, data } = await apiCall('GET', '/reflection/status');
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
  }
);

// ════════════════════════════════════════
// TOOLS: Compliance & Audit
// ════════════════════════════════════════

server.tool(
  'agentos_audit_log',
  'Log an immutable audit event for compliance tracking.',
  {
    event_type: z.string().describe('Event type: tool_call, decision, escalation, circuit_breaker, reflection'),
    action: z.string().describe('What action was taken'),
    agent_id: z.string().optional().describe('Agent UUID'),
    reasoning: z.string().optional().describe('Why this action was taken'),
    verdict: z.enum(['PROCEED', 'HALT', 'ESCALATE', 'MONITOR', 'BLOCK']).optional().default('PROCEED').describe('Decision verdict'),
    metadata: z.record(z.any()).optional().describe('Additional metadata'),
  },
  async ({ event_type, action, agent_id, reasoning, verdict, metadata }) => {
    const { status, data } = await apiCall('POST', '/compliance/audit-log', {
      event_type, action, agent_id, reasoning, verdict, metadata,
    });
    return { content: [{ type: 'text', text: JSON.stringify({ http_status: status, ...data }, null, 2) }] };
  }
);

server.tool(
  'agentos_circuit_breaker',
  'Get circuit breaker status for all agents — shows open/half-open/closed based on recent BLOCK verdicts',
  {},
  async () => {
    const { status, data } = await apiCall('GET', '/compliance/circuit-breaker');
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
  }
);

server.tool(
  'agentos_compliance_stats',
  'Get audit log statistics — total events, breakdown by type, verdict, and day',
  {},
  async () => {
    const { status, data } = await apiCall('GET', '/compliance/audit-log/stats');
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
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
- **SDK**: npm @stoic/agentos-sdk (CLI + JS client) + Python SDK (stoicos)

## Key Tables
organizations, org_members, agents, observations, workspaces, knowledge_items, api_keys,
working_memory, episodic_memory, semantic_memory, audit_log (immutable)

## Memory System (Three-Tier)
- Tier 1: Working Memory — ephemeral, session-scoped key-value store with TTL
- Tier 2: Episodic Memory — time-series events with importance scoring
- Tier 3: Semantic Memory — persistent knowledge triples (subject → relation → object)
- Timeline: episodic memories grouped by day for review
- Reflection: Claude-powered episodic→semantic extraction (POST /reflection/run)
- Decay: time-based cleanup of expired/stale memories (POST /reflection/decay)

## Compliance
- Immutable audit log (event_type, action, verdict, reasoning)
- Circuit breaker — read-only agent health status from BLOCK verdicts
- Export — downloadable JSON audit trail

## Observation Types
file_edit, command, decision, error, discovery, architecture, dependency, config, deployment, note, git_commit

## Plan Limits
- Free: 5 agents, 2 workspaces, 10K obs/mo
- Pro: 25 agents, 10 workspaces, 100K obs/mo
- Team: 100 agents, unlimited workspaces, unlimited obs

## Ecosystem
17 GitHub repos under benjaminkernbaum-ux
23 AI agents across 5 modules
Railway (3 services), Vercel (6 projects), Supabase (3 databases)
`,
    }],
  })
);

// ════════════════════════════════════════
// START
// ════════════════════════════════════════

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  // MCP servers communicate via stdio — no console.log allowed
}

main().catch((err) => {
  process.stderr.write(`MCP Server error: ${err.message}\n`);
  process.exit(1);
});
