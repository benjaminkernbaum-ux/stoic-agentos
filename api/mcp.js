import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { z } from 'zod';

const API_URL = process.env.AGENTOS_API_URL || 'https://stoic-agentos-api-production.up.railway.app';

// API key read per-request from Authorization header (passed by MCP client config)
// Falls back to server env var if set
function getApiKey(req) {
  const header = req?.headers?.authorization || '';
  if (header.startsWith('Bearer ')) return header.slice(7);
  return process.env.AGENTOS_API_KEY || '';
}

async function apiCall(method, path, body = null, apiKey = '') {
  const url = `${API_URL}/api/v1${path}`;
  const opts = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
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

function createServer(apiKey = '') {
  const call = (method, path, body = null) => apiCall(method, path, body, apiKey);
  const server = new McpServer({ name: 'stoic-agentos-ops', version: '1.1.0' });

  server.tool('agentos_health', 'Check AgentOS API health — status, version, uptime, DB connectivity', {}, async () => {
    const { status, data } = await call('GET', '/health');
    return { content: [{ type: 'text', text: JSON.stringify({ http_status: status, ...data }, null, 2) }] };
  });

  server.tool('agentos_stats', 'Get AgentOS dashboard stats — agents, workspaces, observations, plan info', {}, async () => {
    const { status, data } = await call('GET', '/stats');
    return { content: [{ type: 'text', text: JSON.stringify({ http_status: status, ...data }, null, 2) }] };
  });

  server.tool('agentos_list_agents', 'List all registered AI agents in the organization', {}, async () => {
    const { data } = await call('GET', '/agents');
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
  });

  server.tool('agentos_list_workspaces', 'List all registered workspaces (monitored codebases)', {}, async () => {
    const { data } = await call('GET', '/workspaces');
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
  });

  server.tool('agentos_list_observations', 'List recent agent observations with optional filtering', {
    limit: z.number().optional().default(20).describe('Max results'),
    type: z.string().optional().describe('Filter by type: decision, error, deployment, git_commit, etc.'),
    agent: z.string().optional().describe('Filter by agent UUID'),
    workspace: z.string().optional().describe('Filter by workspace UUID'),
  }, async ({ limit, type, agent, workspace }) => {
    const params = new URLSearchParams({ limit: String(limit) });
    if (type) params.set('type', type);
    if (agent) params.set('agent', agent);
    if (workspace) params.set('workspace', workspace);
    const { data } = await call('GET', `/observations?${params}`);
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
  });

  server.tool('agentos_capture_observation', 'Capture a new observation (decision, error, architecture change, etc.)', {
    type: z.enum(['file_edit', 'command', 'decision', 'error', 'discovery', 'architecture', 'dependency', 'config', 'deployment', 'note', 'git_commit']),
    title: z.string().describe('Short observation title'),
    content: z.string().optional().default('').describe('Detailed content'),
    agent: z.string().optional().describe('Agent UUID'),
    workspace: z.string().optional().describe('Workspace UUID'),
    metadata: z.record(z.any()).optional().describe('Additional metadata'),
  }, async ({ type, title, content, agent, workspace, metadata }) => {
    const { status, data } = await call('POST', '/observations', { type, title, content, agent, workspace, metadata });
    return { content: [{ type: 'text', text: JSON.stringify({ http_status: status, ...data }, null, 2) }] };
  });

  server.tool('agentos_agent_heartbeat', 'Register/update agent status', {
    name: z.string().describe('Agent name (unique within org)'),
    status: z.enum(['idle', 'running', 'success', 'error', 'paused']).optional().default('running'),
    description: z.string().optional(),
    module: z.string().optional().describe('content, gtm, crm, financial, standalone'),
  }, async ({ name, status, description, module }) => {
    const { status: httpStatus, data } = await call('POST', '/agents/heartbeat', { name, status, description, module });
    return { content: [{ type: 'text', text: JSON.stringify({ http_status: httpStatus, ...data }, null, 2) }] };
  });

  server.tool('agentos_list_knowledge', 'List all knowledge items in the organization', {}, async () => {
    const { data } = await call('GET', '/knowledge-items');
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
  });

  server.tool('agentos_create_knowledge', 'Create a persistent knowledge item', {
    name: z.string().describe('Title'),
    summary: z.string().optional().default('').describe('Short summary'),
    content: z.string().describe('Full content (markdown)'),
  }, async ({ name, summary, content }) => {
    const { status, data } = await call('POST', '/knowledge-items', { name, summary, content });
    return { content: [{ type: 'text', text: JSON.stringify({ http_status: status, ...data }, null, 2) }] };
  });

  server.tool('railway_health', 'Check Railway AgentOS API health', {}, async () => {
    const { status, data } = await call('GET', '/health');
    return { content: [{ type: 'text', text: JSON.stringify({ api_endpoint: `${API_URL}/health`, http_status: status, ...data }, null, 2) }] };
  });

  return server;
}

export default async function handler(req, res) {
  if (req.method === 'GET') {
    res.status(200).json({ status: 'ok', service: 'stoic-agentos-mcp', mode: 'vercel-stateless' });
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const apiKey = getApiKey(req);
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
    const server = createServer(apiKey);
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  } catch (err) {
    if (!res.headersSent) res.status(500).json({ error: err.message });
  }
}
