import { Router } from 'express';
import type { Response } from 'express';
import { authenticate } from '../middleware/auth.js';
import { requireMinRole } from '../middleware/rbac.js';
import { supabase } from '../middleware/db.js';
import type { AuthenticatedRequest } from '../types.js';
import { safeError } from '../lib/safeError.js';
import { validate, evaluationCreateSchema } from '../middleware/validate.js';

const router = Router();
const API_VERSION = 'v1';

// ── Create Evaluation ──
router.post(`/api/${API_VERSION}/evaluations`, authenticate, validate(evaluationCreateSchema), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { trace_id, observation_id, name, score, value, comment, source, model, metadata } = req.body;
    if (!name) return res.status(400).json({ error: 'name is required' });

    const { data, error } = await supabase!
      .from('evaluations')
      .insert({
        org_id: req.org.id,
        trace_id: trace_id || null,
        observation_id: observation_id || null,
        name,
        score: score ?? null,
        value: value || null,
        comment: comment || null,
        source: source || 'manual',
        model: model || null,
        metadata: metadata || {},
      })
      .select()
      .single();

    if (error) throw error;
    res.status(201).json(data);
  } catch (err: unknown) {
    safeError(res, err);
  }
});

// ── List Evaluations ──
router.get(`/api/${API_VERSION}/evaluations`, authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { limit = 50, offset = 0, trace_id, name, source } = req.query;
    let query = supabase!
      .from('evaluations')
      .select('*')
      .eq('org_id', req.org.id)
      .order('created_at', { ascending: false })
      .range(+(offset as string), +(offset as string) + +(limit as string) - 1);

    if (trace_id) query = query.eq('trace_id', trace_id as string);
    if (name) query = query.eq('name', name as string);
    if (source) query = query.eq('source', source as string);

    const { data, error } = await query;
    if (error) throw error;
    res.json(data || []);
  } catch (err: unknown) {
    safeError(res, err);
  }
});

// ── Evaluation Summary (aggregated scores) ──
router.get(`/api/${API_VERSION}/evaluations/summary`, authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { from, to } = req.query;

    /* table may not exist */
    let query = supabase!
      .from('evaluations')
      .select('name, score')
      .eq('org_id', req.org.id)
      .not('score', 'is', null);

    if (from) query = query.gte('created_at', from as string);
    if (to) query = query.lte('created_at', to as string);

    const { data, error } = await query;
    if (error) throw error;

    // Aggregate in application layer (Supabase JS client doesn't support GROUP BY aggregates)
    const groups: Record<string, { scores: number[] }> = {};
    for (const row of data || []) {
      if (!groups[row.name]) groups[row.name] = { scores: [] };
      groups[row.name].scores.push(Number(row.score));
    }

    const summary = Object.entries(groups).map(([name, { scores }]) => {
      const sorted = scores.slice().sort((a, b) => a - b);
      return {
        name,
        count: scores.length,
        avg: +(scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(4),
        min: sorted[0],
        max: sorted[sorted.length - 1],
      };
    });

    res.json(summary);
  } catch (err: unknown) {
    safeError(res, err);
  }
});

// ── Delete Evaluation ──
router.delete(`/api/${API_VERSION}/evaluations/:id`, authenticate, requireMinRole('admin'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { error } = await supabase!
      .from('evaluations')
      .delete()
      .eq('id', req.params.id)
      .eq('org_id', req.org.id);
    if (error) throw error;
    res.json({ success: true });
  } catch (err: unknown) {
    safeError(res, err);
  }
});

export default router;
