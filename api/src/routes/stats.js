import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { supabase, PLAN_LIMITS } from '../middleware/db.js';

const router = Router();
const API_VERSION = 'v1';

router.get(`/api/${API_VERSION}/stats`, authenticate, async (req, res) => {
  try {
    const orgId = req.org.id;
    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();

    const [agents, workspaces, observations, knowledgeItems, monthlyObs, monthlyTraces, monthlyCost, alertEvents] = await Promise.all([
      supabase.from('agents').select('*', { count: 'exact', head: true }).eq('org_id', orgId),
      supabase.from('workspaces').select('*', { count: 'exact', head: true }).eq('org_id', orgId),
      supabase.from('observations').select('*', { count: 'exact', head: true }).eq('org_id', orgId),
      supabase.from('knowledge_items').select('*', { count: 'exact', head: true }).eq('org_id', orgId),
      supabase.from('observations').select('*', { count: 'exact', head: true }).eq('org_id', orgId).gte('created_at', monthStart),
      // New: traces this month
      supabase.from('traces').select('*', { count: 'exact', head: true }).eq('org_id', orgId).gte('created_at', monthStart),
      // New: cost this month (sum of span costs)
      supabase.from('spans').select('cost_usd').eq('org_id', orgId).gte('created_at', monthStart),
      // New: unacknowledged alerts
      supabase.from('alert_events').select('*', { count: 'exact', head: true }).eq('org_id', orgId).eq('acknowledged', false),
    ]);

    const plan = req.org.plan || 'free';
    const limits = PLAN_LIMITS[plan];

    // Sum up costs
    const totalCostThisMonth = (monthlyCost.data || []).reduce((s, sp) => s + parseFloat(sp.cost_usd || 0), 0);

    res.json({
      plan,
      agents: agents.count || 0,
      workspaces: workspaces.count || 0,
      observations: monthlyObs.count || 0,
      knowledgeItems: knowledgeItems.count || 0,
      observationLimit: limits.observations,
      // New fields
      traces_this_month: monthlyTraces.count || 0,
      trace_limit: limits.traces,
      total_cost_this_month: Math.round(totalCostThisMonth * 1000000) / 1000000,
      unacknowledged_alerts: alertEvents.count || 0,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
