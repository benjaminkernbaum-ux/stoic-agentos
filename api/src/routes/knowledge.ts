import { Router } from 'express';
import type { Response } from 'express';
import { authenticate } from '../middleware/auth.js';
import { requireMinRole } from '../middleware/rbac.js';
import { supabase, checkLimit, PLAN_LIMITS } from '../middleware/db.js';
import type { AuthenticatedRequest } from '../types.js';
import { safeError } from '../lib/safeError.js';

const router = Router();
const API_VERSION = 'v1';

router.get(`/api/${API_VERSION}/knowledge-items`, authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { data, error } = await supabase!
      .from('knowledge_items')
      .select('*')
      .eq('org_id', req.org.id)
      .order('updated_at', { ascending: false });
    if (error) throw error;
    res.json(data || []);
  } catch (err: unknown) {
    safeError(res, err);
  }
});

router.post(`/api/${API_VERSION}/knowledge-items`, authenticate, requireMinRole('member'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { name, summary, content, artifacts } = req.body;
    if (!name) return res.status(400).json({ error: 'name required' });

    const { count } = await supabase!
      .from('knowledge_items')
      .select('*', { count: 'exact', head: true })
      .eq('org_id', req.org.id);

    if (!checkLimit(req.org.plan, 'knowledge_items', count ?? 0)) {
      return res.status(429).json({ error: 'Knowledge item limit reached', limit: PLAN_LIMITS[req.org.plan]?.knowledge_items, current: count, upgrade_url: 'https://stoicagentos.com/#pricing' });
    }

    const { data, error } = await supabase!
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
  } catch (err: unknown) {
    safeError(res, err);
  }
});

// ── Delete Knowledge Item ──
router.delete(`/api/${API_VERSION}/knowledge-items/:id`, authenticate, requireMinRole('admin'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { data, error } = await supabase!
      .from('knowledge_items')
      .delete()
      .eq('id', req.params.id)
      .eq('org_id', req.org.id)
      .select()
      .single();
    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Knowledge item not found' });
    res.json({ deleted: true, id: req.params.id });
  } catch (err: unknown) {
    safeError(res, err);
  }
});

export default router;
