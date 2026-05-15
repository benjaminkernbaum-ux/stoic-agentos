/**
 * Stoic AgentOS — API Server
 * Express.js backend for AI Agent Operations Platform
 * Endpoints: observations, agents, workspaces, knowledge items, billing
 */

import express from 'express';
import cors from 'cors';
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

// ── Config ──
const PORT = process.env.PORT || 4444;
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://viiagdhtzbvkfhcjqrlz.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || '';
const STRIPE_SECRET = process.env.STRIPE_SECRET_KEY || '';
const API_VERSION = 'v1';

// ── Supabase Client (service role — bypasses RLS) ──
const supabase = SUPABASE_URL && SUPABASE_SERVICE_KEY
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
  : null;

const app = express();

// ── Middleware ──
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '1mb' }));

// Request logging
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const ms = Date.now() - start;
    if (!req.url.includes('/health')) {
      console.log(`${req.method} ${req.url} ${res.statusCode} ${ms}ms`);
    }
  });
  next();
});

// ── Auth Middleware ──
async function authenticate(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing authorization header' });
  }
  const token = auth.slice(7);

  // API key auth (sk_live_xxx or sk_test_xxx)
  if (token.startsWith('sk_')) {
    if (!supabase) return res.status(500).json({ error: 'Database not configured' });
    const { data: apiKey } = await supabase
      .from('agentos_api_keys')
      .select('*, agentos_organizations(*)')
      .eq('key', token)
      .eq('active', true)
      .single();
    if (!apiKey) return res.status(401).json({ error: 'Invalid API key' });
    req.org = apiKey.organizations;
    req.apiKey = apiKey;
    return next();
  }

  // JWT auth (Supabase session token)
  if (!supabase) return res.status(500).json({ error: 'Database not configured' });
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return res.status(401).json({ error: 'Invalid token' });

  // Get user's org — try org_id from query first for multi-org support
  const orgId = req.query.org_id || req.body?.org_id;
  let membership;

  if (orgId) {
    const { data } = await supabase
      .from('org_members')
      .select('*, organizations(*)')
      .eq('user_id', user.id)
      .eq('org_id', orgId)
      .single();
    membership = data;
  } else {
    const { data } = await supabase
      .from('org_members')
      .select('*, organizations(*)')
      .eq('user_id', user.id)
      .limit(1)
      .single();
    membership = data;
  }

  if (!membership) return res.status(403).json({ error: 'No organization found' });

  req.user = user;
  req.org = membership.organizations;
  req.role = membership.role;
  next();
}

// ── Plan Limits ──
const PLAN_LIMITS = {
  free:       { workspaces: 2,  agents: 5,   observations: 10000,  knowledge_items: 5,  git_hooks: 3,  members: 1  },
  pro:        { workspaces: 10, agents: 25,  observations: 100000, knowledge_items: 25, git_hooks: 15, members: 5  },
  team:       { workspaces: -1, agents: 100, observations: -1,     knowledge_items: -1, git_hooks: -1, members: 15 },
  enterprise: { workspaces: -1, agents: -1,  observations: -1,     knowledge_items: -1, git_hooks: -1, members: -1 },
};

function checkLimit(plan, resource, current) {
  const limits = PLAN_LIMITS[plan] || PLAN_LIMITS.free;
  const max = limits[resource];
  if (max === -1) return true;
  return current < max;
}

// ══════════════════════════════════
// ROUTES
// ══════════════════════════════════

// ── Health ──
app.get('/health', (req, res) => res.json({ status: 'ok', version: API_VERSION, uptime: process.uptime(), db: !!supabase }));
app.get(`/api/${API_VERSION}/health`, (req, res) => res.json({ status: 'ok', version: API_VERSION }));

// ── Auth: Setup Org (called after first signup) ──
app.post(`/api/${API_VERSION}/auth/setup-org`, async (req, res) => {
  try {
    const auth = req.headers.authorization;
    if (!auth?.startsWith('Bearer ')) return res.status(401).json({ error: 'Missing auth' });
    if (!supabase) return res.status(500).json({ error: 'Database not configured' });

    const token = auth.slice(7);
    const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
    if (authErr || !user) return res.status(401).json({ error: 'Invalid token' });

    // Check if user already has an org
    const { data: existing } = await supabase
      .from('org_members')
      .select('org_id, organizations(*)')
      .eq('user_id', user.id)
      .single();

    if (existing?.organizations) {
      return res.json(existing.organizations);
    }

    const { name, slug } = req.body;
    const orgName = name || user.user_metadata?.full_name || user.email?.split('@')[0] || 'My Organization';
    const orgSlug = slug || orgName.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').slice(0, 40) + '-' + Date.now().toString(36);

    // Create org
    const { data: org, error: orgErr } = await supabase
      .from('organizations')
      .insert({ name: orgName, slug: orgSlug, plan: 'free' })
      .select()
      .single();
    if (orgErr) throw orgErr;

    // Add user as owner
    const { error: memberErr } = await supabase
      .from('agentos_org_members')
      .insert({ org_id: org.id, user_id: user.id, role: 'owner' });
    if (memberErr) throw memberErr;

    // Generate initial API key
    const apiKey = `sk_live_${crypto.randomBytes(24).toString('hex')}`;
    await supabase.from('api_keys').insert({
      org_id: org.id,
      key: apiKey,
      name: 'Default',
    });

    res.json({ ...org, api_key: apiKey });
  } catch (err) {
    console.error('Setup org error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ── Observations ──
app.post(`/api/${API_VERSION}/observations`, authenticate, async (req, res) => {
  try {
    const { workspace, agent, type, title, content, metadata } = req.body;
    if (!type || !title) return res.status(400).json({ error: 'type and title required' });

    // Check observation limit
    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
    const { count } = await supabase
      .from('observations')
      .select('*', { count: 'exact', head: true })
      .eq('org_id', req.org.id)
      .gte('created_at', monthStart);

    if (!checkLimit(req.org.plan, 'observations', count)) {
      return res.status(429).json({
        error: 'Observation limit reached',
        limit: PLAN_LIMITS[req.org.plan]?.observations,
        current: count,
        upgrade_url: '/pricing',
      });
    }

    const { data, error } = await supabase
      .from('observations')
      .insert({
        org_id: req.org.id,
        workspace_id: workspace || null,
        agent_id: agent || null,
        type: type || 'note',
        title,
        content: content || '',
        metadata: metadata || {},
        importance: type === 'architecture' ? 9 : type === 'decision' ? 8 : type === 'error' ? 7 : 6,
      })
      .select()
      .single();

    if (error) throw error;
    res.status(201).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get(`/api/${API_VERSION}/observations`, authenticate, async (req, res) => {
  try {
    const { limit = 50, offset = 0, type, workspace, agent } = req.query;
    let query = supabase
      .from('observations')
      .select('*')
      .eq('org_id', req.org.id)
      .order('created_at', { ascending: false })
      .range(+offset, +offset + +limit - 1);

    if (type) query = query.eq('type', type);
    if (workspace) query = query.eq('workspace_id', workspace);
    if (agent) query = query.eq('agent_id', agent);

    const { data, error } = await query;
    if (error) throw error;
    res.json(data || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Agents ──
app.post(`/api/${API_VERSION}/agents`, authenticate, async (req, res) => {
  try {
    const { name, description, module, status, config } = req.body;
    if (!name) return res.status(400).json({ error: 'name required' });

    const { count } = await supabase
      .from('agents')
      .select('*', { count: 'exact', head: true })
      .eq('org_id', req.org.id);

    if (!checkLimit(req.org.plan, 'agents', count)) {
      return res.status(429).json({ error: 'Agent limit reached', limit: PLAN_LIMITS[req.org.plan]?.agents });
    }

    const { data, error } = await supabase
      .from('agents')
      .insert({
        org_id: req.org.id,
        name,
        description: description || '',
        module: module || 'standalone',
        status: status || 'idle',
        config: config || {},
      })
      .select()
      .single();

    if (error) throw error;
    res.status(201).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get(`/api/${API_VERSION}/agents`, authenticate, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('agents')
      .select('*')
      .eq('org_id', req.org.id)
      .order('name');
    if (error) throw error;
    res.json(data || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.patch(`/api/${API_VERSION}/agents/:id`, authenticate, async (req, res) => {
  try {
    const { status, last_heartbeat, config } = req.body;
    const updates = {};
    if (status) updates.status = status;
    if (last_heartbeat) updates.last_heartbeat = last_heartbeat;
    if (config) updates.config = config;
    updates.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('agents')
      .update(updates)
      .eq('id', req.params.id)
      .eq('org_id', req.org.id)
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Workspaces ──
app.post(`/api/${API_VERSION}/workspaces`, authenticate, async (req, res) => {
  try {
    const { name, path, stack, git_remote, branch } = req.body;
    if (!name) return res.status(400).json({ error: 'name required' });

    const { count } = await supabase
      .from('workspaces')
      .select('*', { count: 'exact', head: true })
      .eq('org_id', req.org.id);

    if (!checkLimit(req.org.plan, 'workspaces', count)) {
      return res.status(429).json({ error: 'Workspace limit reached' });
    }

    const { data, error } = await supabase
      .from('workspaces')
      .insert({
        org_id: req.org.id,
        name,
        path: path || '',
        stack: stack || '',
        git_remote: git_remote || '',
        branch: branch || 'main',
      })
      .select()
      .single();

    if (error) throw error;
    res.status(201).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get(`/api/${API_VERSION}/workspaces`, authenticate, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('workspaces')
      .select('*')
      .eq('org_id', req.org.id)
      .order('name');
    if (error) throw error;
    res.json(data || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Knowledge Items ──
app.get(`/api/${API_VERSION}/knowledge-items`, authenticate, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('knowledge_items')
      .select('*')
      .eq('org_id', req.org.id)
      .order('updated_at', { ascending: false });
    if (error) throw error;
    res.json(data || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post(`/api/${API_VERSION}/knowledge-items`, authenticate, async (req, res) => {
  try {
    const { name, summary, content, artifacts } = req.body;
    if (!name) return res.status(400).json({ error: 'name required' });

    const { count } = await supabase
      .from('knowledge_items')
      .select('*', { count: 'exact', head: true })
      .eq('org_id', req.org.id);

    if (!checkLimit(req.org.plan, 'knowledge_items', count)) {
      return res.status(429).json({ error: 'Knowledge item limit reached' });
    }

    const { data, error } = await supabase
      .from('knowledge_items')
      .insert({
        org_id: req.org.id,
        name,
        summary: summary || '',
        content: content || '',
        artifacts: artifacts || [],
      })
      .select()
      .single();

    if (error) throw error;
    res.status(201).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Dashboard Stats ──
app.get(`/api/${API_VERSION}/stats`, authenticate, async (req, res) => {
  try {
    const orgId = req.org.id;
    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();

    const [agents, workspaces, observations, knowledgeItems, monthlyObs] = await Promise.all([
      supabase.from('agents').select('*', { count: 'exact', head: true }).eq('org_id', orgId),
      supabase.from('workspaces').select('*', { count: 'exact', head: true }).eq('org_id', orgId),
      supabase.from('observations').select('*', { count: 'exact', head: true }).eq('org_id', orgId),
      supabase.from('knowledge_items').select('*', { count: 'exact', head: true }).eq('org_id', orgId),
      supabase.from('observations').select('*', { count: 'exact', head: true }).eq('org_id', orgId).gte('created_at', monthStart),
    ]);

    const plan = req.org.plan || 'free';
    const limits = PLAN_LIMITS[plan];

    res.json({
      plan,
      agents: agents.count || 0,
      workspaces: workspaces.count || 0,
      observations: monthlyObs.count || 0,
      knowledgeItems: knowledgeItems.count || 0,
      observationLimit: limits.observations,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── API Key Management ──
app.get(`/api/${API_VERSION}/api-keys`, authenticate, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('agentos_api_keys')
      .select('id, name, key, active, created_at, last_used_at')
      .eq('org_id', req.org.id)
      .order('created_at', { ascending: false });
    if (error) throw error;
    // Mask keys for security
    const masked = (data || []).map(k => ({
      ...k,
      key: k.key.slice(0, 12) + '...' + k.key.slice(-4),
      full_key: undefined,
    }));
    res.json(masked);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Webhooks (Git hooks, no auth required — uses API key in body) ──
app.post(`/api/${API_VERSION}/webhooks/git`, async (req, res) => {
  try {
    const { api_key, repo, branch, commit_hash, commit_message, author } = req.body;
    if (!api_key || !repo) return res.status(400).json({ error: 'api_key and repo required' });

    if (!supabase) return res.status(500).json({ error: 'Database not configured' });

    const { data: key } = await supabase
      .from('agentos_api_keys')
      .select('*, agentos_organizations(*)')
      .eq('key', api_key)
      .eq('active', true)
      .single();

    if (!key) return res.status(401).json({ error: 'Invalid API key' });

    await supabase.from('observations').insert({
      org_id: key.org_id,
      type: 'git_commit',
      title: `[${repo}] ${commit_hash?.slice(0, 7)}: ${commit_message}`,
      content: JSON.stringify({ repo, branch, commit_hash, author }),
      importance: 5,
      metadata: { source: 'git_hook', repo, branch },
    });

    res.status(201).json({ captured: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ══════════════════════════════════
// START
// ══════════════════════════════════
app.listen(PORT, () => {
  console.log(`\n⚡ Stoic AgentOS API — v${API_VERSION}`);
  console.log(`   Port: ${PORT}`);
  console.log(`   Supabase: ${supabase ? '✅ Connected' : '⚠️  No URL or Service Key (demo mode)'}`);
  console.log(`   Stripe: ${STRIPE_SECRET ? '✅ Ready' : '⚠️  Not configured'}\n`);
});
