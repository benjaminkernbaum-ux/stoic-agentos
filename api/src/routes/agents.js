import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { supabase, checkLimit, PLAN_LIMITS } from '../middleware/db.js';

const router = Router();
const API_VERSION = 'v1';

// ── Create Agent ──
router.post(`/api/${API_VERSION}/agents`, authenticate, async (req, res) => {
  try {
    const { name, description, module, status, config } = req.body;
    if (!name) return res.status(400).json({ error: 'name required' });

    const { count } = await supabase
      .from('agents')
      .select('*', { count: 'exact', head: true })
      .eq('org_id', req.org.id);

    if (!checkLimit(req.org.plan, 'agents', count)) {
      return res.status(429).json({ error: 'Agent limit reached', limit: PLAN_LIMITS[req.org.plan]?.agents, current: count, upgrade_url: 'https://stoicagentos.com/#pricing' });
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

// ── List Agents ──
router.get(`/api/${API_VERSION}/agents`, authenticate, async (req, res) => {
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

// ── Update Agent ──
router.patch(`/api/${API_VERSION}/agents/:id`, authenticate, async (req, res) => {
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

// ── Agent Heartbeat (upsert by name — used by SDK wrapAgent) ──
router.post(`/api/${API_VERSION}/agents/heartbeat`, authenticate, async (req, res) => {
  try {
    const { name, status, description, module } = req.body;
    if (!name) return res.status(400).json({ error: 'name required' });

    const { data: existing } = await supabase
      .from('agents')
      .select('id, total_runs, total_errors')
      .eq('org_id', req.org.id)
      .eq('name', name)
      .single();

    if (existing) {
      const updates = {
        status: status || 'running',
        last_heartbeat: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        total_runs: (existing.total_runs || 0) + (status === 'success' ? 1 : 0),
        total_errors: (existing.total_errors || 0) + (status === 'error' ? 1 : 0),
      };
      const { data, error } = await supabase
        .from('agents')
        .update(updates)
        .eq('id', existing.id)
        .select()
        .single();
      if (error) throw error;
      return res.json(data);
    }

    // Create new agent
    const { data, error } = await supabase
      .from('agents')
      .insert({
        org_id: req.org.id,
        name,
        description: description || '',
        module: module || 'standalone',
        status: status || 'idle',
        last_heartbeat: new Date().toISOString(),
      })
      .select()
      .single();
    if (error) throw error;
    res.status(201).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
