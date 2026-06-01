import { Router } from 'express';
import type { Response } from 'express';
import { authenticate } from '../middleware/auth.js';
import { requireMinRole } from '../middleware/rbac.js';
import { supabase, checkLimit, PLAN_LIMITS } from '../middleware/db.js';
import type { AuthenticatedRequest } from '../types.js';
import { safeError } from '../lib/safeError.js';

const router = Router();
const API_VERSION = 'v1';

router.post(`/api/${API_VERSION}/workspaces`, authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { name, path, stack, git_remote, branch } = req.body;
    if (!name) return res.status(400).json({ error: 'name required' });

    const { count } = await supabase!
      .from('workspaces')
      .select('*', { count: 'exact', head: true })
      .eq('org_id', req.org.id);

    if (!checkLimit(req.org.plan, 'workspaces', count ?? 0)) {
      return res.status(429).json({ error: 'Workspace limit reached', limit: PLAN_LIMITS[req.org.plan]?.workspaces, current: count, upgrade_url: 'https://stoicagentos.com/#pricing' });
    }

    const { data, error } = await supabase!
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
  } catch (err: unknown) {
    safeError(res, err);
  }
});

router.get(`/api/${API_VERSION}/workspaces`, authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { data, error } = await supabase!
      .from('workspaces')
      .select('*')
      .eq('org_id', req.org.id)
      .order('name');
    if (error) throw error;
    res.json(data || []);
  } catch (err: unknown) {
    safeError(res, err);
  }
});

// ── Delete Workspace ──
router.delete(`/api/${API_VERSION}/workspaces/:id`, authenticate, requireMinRole('admin'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { data, error } = await supabase!
      .from('workspaces')
      .delete()
      .eq('id', req.params.id)
      .eq('org_id', req.org.id)
      .select()
      .single();
    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Workspace not found' });
    res.json({ deleted: true, id: req.params.id });
  } catch (err: unknown) {
    safeError(res, err);
  }
});

export default router;
