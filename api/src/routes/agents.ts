import { Router } from 'express';
import type { Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { authenticate } from '../middleware/auth.js';
import { requireMinRole } from '../middleware/rbac.js';
import { supabase, checkLimit, PLAN_LIMITS } from '../middleware/db.js';
import type { AuthenticatedRequest } from '../types.js';
import { safeError } from '../lib/safeError.js';
import { validate, agentCreateSchema } from '../middleware/validate.js';
import { complete } from '../lib/anthropic.js';
import { calculateCost } from '../middleware/cost.js';
import { getMonthlyCount, incrementCounter } from '../lib/counterCache.js';

const router = Router();
const API_VERSION = 'v1';

// ── Create Agent ──
router.post(`/api/${API_VERSION}/agents`, authenticate, validate(agentCreateSchema), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { name, description, module, status, config } = req.body;
    if (!name) return res.status(400).json({ error: 'name required' });

    const { count } = await supabase!
      .from('agents')
      .select('*', { count: 'exact', head: true })
      .eq('org_id', req.org.id);

    if (!checkLimit(req.org.plan, 'agents', count ?? 0)) {
      return res.status(429).json({ error: 'Agent limit reached', limit: PLAN_LIMITS[req.org.plan]?.agents, current: count, upgrade_url: 'https://stoicagentos.com/#pricing' });
    }

    const agentData = {
      org_id: req.org.id,
      name,
      description: description || '',
      module: module || 'standalone',
      status: status || 'idle',
      config: config || {},
    };

    let { data, error } = await supabase!
      .from('agents')
      .insert(agentData)
      .select()
      .single();

    // Fallback: if module constraint fails, retry with 'standalone'
    if (error && error.message?.includes('module_check')) {
      agentData.module = 'standalone';
      const retry = await supabase!
        .from('agents')
        .insert(agentData)
        .select()
        .single();
      data = retry.data;
      error = retry.error;
    }

    if (error) throw error;
    res.status(201).json(data);
  } catch (err: unknown) {
    safeError(res, err);
  }
});

// ── List Agents ──
router.get(`/api/${API_VERSION}/agents`, authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { data, error } = await supabase!
      .from('agents')
      .select('*')
      .eq('org_id', req.org.id)
      .order('name');
    if (error) throw error;
    res.json(data || []);
  } catch (err: unknown) {
    safeError(res, err);
  }
});

// ── Update Agent ──
router.patch(`/api/${API_VERSION}/agents/:id`, authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { status, last_heartbeat, config } = req.body;
    const updates: Record<string, unknown> = {};
    if (status) updates.status = status;
    if (last_heartbeat) updates.last_heartbeat = last_heartbeat;
    if (config) updates.config = config;
    updates.updated_at = new Date().toISOString();

    const { data, error } = await supabase!
      .from('agents')
      .update(updates)
      .eq('id', req.params.id)
      .eq('org_id', req.org.id)
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (err: unknown) {
    safeError(res, err);
  }
});

// ── Agent Heartbeat (upsert by name — used by SDK wrapAgent) ──
router.post(`/api/${API_VERSION}/agents/heartbeat`, authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { name, status, description, module } = req.body;
    if (!name) return res.status(400).json({ error: 'name required' });

    const now = new Date().toISOString();

    // First try to find and update existing agent (for run/error counting)
    const { data: existing } = await supabase!
      .from('agents')
      .select('id, total_runs, total_errors')
      .eq('org_id', req.org.id)
      .eq('name', name)
      .single();

    if (existing) {
      // Update existing agent with incremented counters
      const { data, error } = await supabase!
        .from('agents')
        .update({
          status: status || 'running',
          last_heartbeat: now,
          updated_at: now,
          total_runs: (existing.total_runs || 0) + (status === 'success' ? 1 : 0),
          total_errors: (existing.total_errors || 0) + (status === 'error' ? 1 : 0),
        })
        .eq('id', existing.id)
        .select()
        .single();
      if (error) throw error;
      return res.json(data);
    }

    // Check plan limit before creating new agent
    const { count: agentCount } = await supabase!
      .from('agents')
      .select('*', { count: 'exact', head: true })
      .eq('org_id', req.org.id);

    if (!checkLimit(req.org.plan, 'agents', agentCount ?? 0)) {
      return res.status(429).json({
        error: 'Agent limit reached for your plan',
        limit: PLAN_LIMITS[req.org.plan]?.agents,
        current: agentCount,
        upgrade_url: 'https://stoicagentos.com/#pricing',
      });
    }

    // Upsert new agent — uses UNIQUE(org_id, name) to handle concurrent requests atomically
    const { data, error } = await supabase!
      .from('agents')
      .upsert({
        org_id: req.org.id,
        name,
        description: description || '',
        module: module || 'standalone',
        status: status || 'idle',
        last_heartbeat: now,
        updated_at: now,
      }, { onConflict: 'org_id,name' })
      .select()
      .single();
    if (error) throw error;
    res.status(201).json(data);
  } catch (err: unknown) {
    safeError(res, err);
  }
});

// ── Run Agent ──
// POST /api/v1/agents/:id/run
// Runs the agent using Claude grounded in the workspace context
router.post(`/api/${API_VERSION}/agents/:id/run`, authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { task, workspace_id } = req.body;

    // 1. Fetch the agent
    const { data: agent, error: agentError } = await supabase!
      .from('agents')
      .select('*')
      .eq('id', id)
      .eq('org_id', req.org.id)
      .single();

    if (agentError || !agent) {
      return res.status(404).json({ error: 'Agent not found' });
    }

    // Check monthly trace limit (cached — avoids COUNT(*) per request)
    const monthlyCount = await getMonthlyCount(supabase!, req.org.id, 'traces');
    if (monthlyCount >= 0 && !checkLimit(req.org.plan, 'traces', monthlyCount)) {
      return res.status(429).json({
        error: 'Monthly trace limit reached',
        limit: PLAN_LIMITS[req.org.plan]?.traces,
        current: monthlyCount,
        upgrade_url: '/pricing',
      });
    }

    // Update agent status to 'running'
    await supabase!
      .from('agents')
      .update({ status: 'running', last_heartbeat: new Date().toISOString() })
      .eq('id', agent.id);

    // 2. Fetch workspaces to ground the context
    let workspaceQuery = supabase!
      .from('workspaces')
      .select('*')
      .eq('org_id', req.org.id);

    if (workspace_id) {
      workspaceQuery = workspaceQuery.eq('id', workspace_id);
    }
    const { data: workspaces } = await workspaceQuery;

    const runTask = task || `Execute standard agent execution pipeline for "${agent.name}" (${agent.module}).`;

    // 3. Build system prompt grounded in the workspace context
    const workspaceCtx = workspaces && workspaces.length > 0
      ? workspaces.map(w => 
          `- Workspace: ${w.name}\n  Stack: ${w.stack || 'unknown'}\n  Path: ${w.path || '/'}\n  Branch: ${w.branch || 'main'}\n  Git: ${w.git_remote || 'none'}`
        ).join('\n\n')
      : 'No workspaces registered yet.';

    const systemPrompt = `You are "${agent.name}", a live autonomous AI agent on the Stoic AgentOS Sales & Dev platform.
Your identity and parameters:
- Name: ${agent.name}
- Module type: ${agent.module}
- Description: ${agent.description || 'No description provided.'}
- Custom Config: ${JSON.stringify(agent.config || {})}

GROUNDING WORKSPACE CONTEXT:
The user has registered the following workspace environment(s) with our OS. Use this context to frame your execution plan, commands, suggestions, and output findings:

${workspaceCtx}

OPERATIONAL OBJECTIVE:
Execute the requested task or command, analyzing the context above, and return a clear, structured Markdown response showing your findings, code modifications, scraped leads, outreach templates, or compliance alerts, depending on your module.
Keep the output extremely professional, premium, and actionable. Do not use placeholders.`;

    const startTime = Date.now();
    const traceId = `tr_${uuidv4().replace(/-/g, '').slice(0, 16)}`;

    let result;
    try {
      // 4. Run Claude (via anthropic.ts complete helper)
      result = await complete(req.org, {
        model: 'smart', // claude-3-5-sonnet-20241022
        system: systemPrompt,
        messages: [{ role: 'user', content: runTask }],
        maxTokens: 4096,
        thinking: true,
        endpoint: `agent_run:${agent.name}`,
      });
    } catch (err: any) {
      // Revert agent status to 'error' and increment total errors
      await supabase!
        .from('agents')
        .update({ 
          status: 'error', 
          total_errors: (agent.total_errors || 0) + 1,
          last_heartbeat: new Date().toISOString() 
        })
        .eq('id', agent.id);
      throw err;
    }

    const durationMs = Date.now() - startTime;
    const usage = result.usage || {};
    const inputTokens = (usage.input_tokens as number) || 0;
    const outputTokens = (usage.output_tokens as number) || 0;
    const totalTokens = inputTokens + outputTokens;
    const costUsd = calculateCost('anthropic', result.model, inputTokens, outputTokens);

    // 5. Create a Trace record in the database
    let traceDbId = null;
    try {
      const { data: traceData, error: traceErr } = await supabase!
        .from('traces')
        .insert({
          org_id: req.org.id,
          trace_id: traceId,
          name: `Run Agent: ${agent.name}`,
          agent: agent.name,
          status: 'success',
          duration_ms: durationMs,
          total_tokens: totalTokens,
          total_cost_usd: costUsd,
          span_count: 1,
          started_at: new Date(startTime).toISOString(),
          ended_at: new Date().toISOString(),
          metadata: { task: runTask, agent_id: agent.id, workspace_id: workspace_id || (workspaces?.[0]?.id || null) },
        })
        .select('id')
        .single();
      
      if (!traceErr && traceData) {
        traceDbId = traceData.id;
        incrementCounter(req.org.id, 'traces');

        // Insert Span
        await supabase!
          .from('spans')
          .insert({
            org_id: req.org.id,
            trace_id: traceDbId,
            span_id: `sp_${uuidv4().replace(/-/g, '').slice(0, 16)}`,
            provider: 'anthropic',
            model: result.model,
            type: 'agent_run',
            prompt_tokens: inputTokens,
            completion_tokens: outputTokens,
            total_tokens: totalTokens,
            latency_ms: durationMs,
            cost_usd: costUsd,
            status: 'success',
            started_at: new Date(startTime).toISOString(),
            ended_at: new Date().toISOString(),
            agent: agent.name,
            trace_name: `Run Agent: ${agent.name}`,
            workspace_id: workspace_id || (workspaces?.[0]?.id || null),
            metadata: { result: result.text.slice(0, 1000) },
          });
      }
    } catch (traceLogErr: any) {
      console.warn('Trace/Span logging failed (non-fatal):', traceLogErr.message);
    }

    // 6. Write a new Observation
    const selectedWorkspaceId = workspace_id || (workspaces?.[0]?.id || null);
    const obsType = agent.module === 'compliance' ? 'architecture' : agent.module === 'discovery' ? 'discovery' : 'agent_run';
    const obsTitle = `${agent.name} Execution: ${runTask.slice(0, 45)}${runTask.length > 45 ? '...' : ''}`;
    
    await supabase!
      .from('observations')
      .insert({
        org_id: req.org.id,
        workspace_id: selectedWorkspaceId,
        agent_id: agent.id,
        type: obsType,
        title: obsTitle,
        content: result.text,
        metadata: { trace_id: traceId, model: result.model, cost_usd: costUsd },
        importance: agent.module === 'compliance' ? 9 : 7,
      });

    incrementCounter(req.org.id, 'observations');

    // 7. Update agent run count and status
    const { data: updatedAgent } = await supabase!
      .from('agents')
      .update({
        status: 'success',
        total_runs: (agent.total_runs || 0) + 1,
        last_heartbeat: new Date().toISOString(),
      })
      .eq('id', agent.id)
      .select()
      .single();

    res.json({
      success: true,
      response: result.text,
      agent: updatedAgent || agent,
      trace_id: traceId,
      usage,
    });
  } catch (err: unknown) {
    safeError(res, err);
  }
});

export default router;
