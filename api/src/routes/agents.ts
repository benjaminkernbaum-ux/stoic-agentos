import { Router } from 'express';
import type { Response } from 'express';
import { authenticate } from '../middleware/auth.js';
import { supabase, checkLimit, PLAN_LIMITS } from '../middleware/db.js';
import type { AuthenticatedRequest } from '../types.js';

const router = Router();
const API_VERSION = 'v1';

// ── Create Agent ──
router.post(`/api/${API_VERSION}/agents`, authenticate, async (req: AuthenticatedRequest, res: Response) => {
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
    res.status(500).json({ error: (err as Error).message });
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
    res.status(500).json({ error: (err as Error).message });
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
    res.status(500).json({ error: (err as Error).message });
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
    res.status(500).json({ error: (err as Error).message });
  }
});

// ── Delete Agent ──
router.delete(`/api/${API_VERSION}/agents/:id`, authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { data, error } = await supabase!
      .from('agents')
      .delete()
      .eq('id', req.params.id)
      .eq('org_id', req.org.id)
      .select()
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Agent not found' });
    res.json({ deleted: true, id: req.params.id });
  } catch (err: unknown) {
    res.status(500).json({ error: (err as Error).message });
  }
});

export default router;
