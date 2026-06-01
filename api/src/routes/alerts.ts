import { Router } from 'express';
import type { Response } from 'express';
import { authenticate } from '../middleware/auth.js';
import { requireMinRole } from '../middleware/rbac.js';
import { supabase, checkLimit, PLAN_LIMITS } from '../middleware/db.js';
import type { AuthenticatedRequest } from '../types.js';
import { safeError } from '../lib/safeError.js';
import { validate, alertRuleSchema } from '../middleware/validate.js';

const router = Router();
const API_VERSION = 'v1';

/**
 * Helper: check if a Supabase error means the table doesn't exist.
 * Returns true for "relation does not exist" or similar schema errors,
 * so callers can degrade gracefully instead of returning 500.
 */
function isTableMissing(error: { message?: string; code?: string }): boolean {
  const msg = (error.message || '').toLowerCase();
  return (
    msg.includes('relation') && msg.includes('does not exist') ||
    msg.includes('could not find') ||
    error.code === '42P01'   // PostgreSQL: undefined_table
  );
}

// ══════════════════════════════════════
// TOP-LEVEL ALERTS ENDPOINT
// ══════════════════════════════════════

// ── GET /alerts — summary of rules + recent events ──
router.get(`/api/${API_VERSION}/alerts`, authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    // Try to fetch rules
    const { data: rules, error: rulesErr } = await supabase!
      .from('alert_rules')
      .select('*')
      .eq('org_id', req.org.id)
      .order('created_at', { ascending: false });

    if (rulesErr && isTableMissing(rulesErr)) {
      // Tables haven't been created yet — return empty gracefully
      return res.json({
        rules: [],
        events: [],
        hint: 'Alert tables not yet created — run the alerts migration to enable this feature',
      });
    }
    if (rulesErr) throw rulesErr;

    // Try to fetch recent events
    const { data: events, error: eventsErr } = await supabase!
      .from('alert_events')
      .select('*, alert_rules(name, type)')
      .eq('org_id', req.org.id)
      .order('created_at', { ascending: false })
      .limit(20);

    if (eventsErr && isTableMissing(eventsErr)) {
      return res.json({ rules: rules || [], events: [] });
    }
    if (eventsErr) throw eventsErr;

    res.json({
      rules: rules || [],
      events: events || [],
    });
  } catch (err: unknown) {
    safeError(res, err);
  }
});

// ══════════════════════════════════════
// ALERT RULES
// ══════════════════════════════════════

// ── List Alert Rules ──
router.get(`/api/${API_VERSION}/alerts/rules`, authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { data, error } = await supabase!
      .from('alert_rules')
      .select('*')
      .eq('org_id', req.org.id)
      .order('created_at', { ascending: false });
    if (error) {
      if (isTableMissing(error)) return res.json([]);
      throw error;
    }
    res.json(data || []);
  } catch (err: unknown) {
    safeError(res, err);
  }
});

// ── Create Alert Rule ──
router.post(`/api/${API_VERSION}/alerts/rules`, authenticate, requireMinRole('admin'), validate(alertRuleSchema), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { name, type, config, channel, destination } = req.body;
    if (!name || !type) return res.status(400).json({ error: 'name and type required' });

    // Check alert rule limit
    const { count } = await supabase!
      .from('alert_rules')
      .select('*', { count: 'exact', head: true })
      .eq('org_id', req.org.id);

    if (!checkLimit(req.org.plan, 'alert_rules', count ?? 0)) {
      return res.status(429).json({
        error: 'Alert rule limit reached',
        limit: PLAN_LIMITS[req.org.plan]?.alert_rules,
        current: count,
        upgrade_url: 'https://stoicagentos.com/#pricing',
      });
    }

    const { data, error } = await supabase!
      .from('alert_rules')
      .insert({
        org_id: req.org.id,
        name,
        type,
        config: config || {},
        channel: channel || 'email',
        destination: destination || req.user?.email || '',
      })
      .select()
      .single();

    if (error) throw error;
    res.status(201).json(data);
  } catch (err: unknown) {
    safeError(res, err);
  }
});

// ── Toggle Alert Rule ──
router.patch(`/api/${API_VERSION}/alerts/rules/:id`, authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { active } = req.body;
    const { data, error } = await supabase!
      .from('alert_rules')
      .update({ active: !!active })
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

// ── Delete Alert Rule ──
router.delete(`/api/${API_VERSION}/alerts/rules/:id`, authenticate, requireMinRole('admin'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { error } = await supabase!
      .from('alert_rules')
      .delete()
      .eq('id', req.params.id)
      .eq('org_id', req.org.id);
    if (error) throw error;
    res.json({ success: true });
  } catch (err: unknown) {
    safeError(res, err);
  }
});

// ══════════════════════════════════════
// ALERT EVENTS
// ══════════════════════════════════════

// ── List Alert Events ──
router.get(`/api/${API_VERSION}/alerts/events`, authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { limit = 20, unacknowledged } = req.query;
    let query = supabase!
      .from('alert_events')
      .select('*, alert_rules(name, type)')
      .eq('org_id', req.org.id)
      .order('created_at', { ascending: false })
      .limit(Math.min(+(limit as string) || 20, 200));

    if (unacknowledged === 'true') query = query.eq('acknowledged', false);

    const { data, error } = await query;
    if (error) {
      if (isTableMissing(error)) return res.json([]);
      throw error;
    }
    res.json(data || []);
  } catch (err: unknown) {
    safeError(res, err);
  }
});

// ── Acknowledge Alert Event ──
router.patch(`/api/${API_VERSION}/alerts/events/:id`, authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { data, error } = await supabase!
      .from('alert_events')
      .update({ acknowledged: true })
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

// ── Acknowledge All ──
router.post(`/api/${API_VERSION}/alerts/events/acknowledge-all`, authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { error } = await supabase!
      .from('alert_events')
      .update({ acknowledged: true })
      .eq('org_id', req.org.id)
      .eq('acknowledged', false);

    if (error) throw error;
    res.json({ success: true });
  } catch (err: unknown) {
    safeError(res, err);
  }
});

export default router;
