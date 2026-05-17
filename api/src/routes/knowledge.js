import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { supabase, checkLimit, PLAN_LIMITS } from '../middleware/db.js';

const router = Router();
const API_VERSION = 'v1';

router.get(`/api/${API_VERSION}/knowledge-items`, authenticate, async (req, res) => {
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

router.post(`/api/${API_VERSION}/knowledge-items`, authenticate, async (req, res) => {
  try {
    const { name, summary, content, artifacts } = req.body;
    if (!name) return res.status(400).json({ error: 'name required' });

    const { count } = await supabase
      .from('knowledge_items')
      .select('*', { count: 'exact', head: true })
      .eq('org_id', req.org.id);

    if (!checkLimit(req.org.plan, 'knowledge_items', count)) {
      return res.status(429).json({ error: 'Knowledge item limit reached', limit: PLAN_LIMITS[req.org.plan]?.knowledge_items, current: count, upgrade_url: 'https://stoicagentos.com/#pricing' });
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

export default router;
