/**
 * Compliance Routes — Audit Log + Circuit Breaker
 *
 * Immutable audit trail for all agent decisions and policy evaluations.
 * Circuit breaker calculates agent health from recent BLOCK verdicts.
 */

import { Router } from 'express';
import type { Response } from 'express';
import { authenticate } from '../middleware/auth.js';
import { requireMinRole } from '../middleware/rbac.js';
import { supabase } from '../middleware/db.js';
import { safeError } from '../lib/safeError.js';
import type { AuthenticatedRequest } from '../types.js';
import { isTableMissing } from '../lib/utils.js';

const router = Router();
const V = 'v1';


// ══════════════════════════════════════
// AUDIT LOG
// ══════════════════════════════════════

router.get(`/api/${V}/compliance/audit-log`, authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    let query = supabase!.from('audit_log').select('*')
      .eq('org_id', req.org.id).order('created_at', { ascending: false }).limit(100);
    if (req.query.event_type) query = query.eq('event_type', req.query.event_type as string);
    if (req.query.agent_id) query = query.eq('agent_id', req.query.agent_id as string);
    if (req.query.verdict) query = query.eq('verdict', req.query.verdict as string);
    if (req.query.from) query = query.gte('created_at', req.query.from as string);
    if (req.query.to) query = query.lte('created_at', req.query.to as string);
    const { data, error } = await query;
    if (error) { if (isTableMissing(error)) return res.json([]); throw error; }
    res.json(data || []);
  } catch (err: unknown) { safeError(res, err); }
});

router.post(`/api/${V}/compliance/audit-log`, authenticate, requireMinRole('admin'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { event_type, action, agent_id, reasoning, verdict, metadata, policy_version, context_hash } = req.body;
    if (!event_type || !action) return res.status(400).json({ error: 'event_type and action required' });
    const { data, error } = await supabase!.from('audit_log').insert({
      org_id: req.org.id, agent_id: agent_id || null, event_type, action,
      reasoning: reasoning || null, verdict: verdict || 'PROCEED',
      metadata: metadata || {}, policy_version: policy_version || '1.0',
      context_hash: context_hash || null,
    }).select().single();
    if (error) throw error;
    res.status(201).json(data);
  } catch (err: unknown) { safeError(res, err); }
});

router.get(`/api/${V}/compliance/audit-log/stats`, authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { data, error } = await supabase!.from('audit_log').select('event_type, verdict, created_at')
      .eq('org_id', req.org.id).order('created_at', { ascending: false }).limit(1000);
    if (error) { if (isTableMissing(error)) return res.json({ total: 0, by_type: {}, by_verdict: {}, by_day: {} }); throw error; }
    const rows = data || [];
    const by_type: Record<string, number> = {};
    const by_verdict: Record<string, number> = {};
    const by_day: Record<string, number> = {};
    rows.forEach((r: Record<string, unknown>) => {
      by_type[r.event_type as string] = (by_type[r.event_type as string] || 0) + 1;
      by_verdict[r.verdict as string] = (by_verdict[r.verdict as string] || 0) + 1;
      const day = new Date(r.created_at as string).toISOString().slice(0, 10);
      by_day[day] = (by_day[day] || 0) + 1;
    });
    res.json({ total: rows.length, by_type, by_verdict, by_day });
  } catch (err: unknown) { safeError(res, err); }
});

router.get(`/api/${V}/compliance/audit-log/export`, authenticate, requireMinRole('admin'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    let query = supabase!.from('audit_log').select('*')
      .eq('org_id', req.org.id).order('created_at', { ascending: false });
    if (req.query.from) query = query.gte('created_at', req.query.from as string);
    if (req.query.to) query = query.lte('created_at', req.query.to as string);
    const { data, error } = await query;
    if (error) { if (isTableMissing(error)) return res.json([]); throw error; }
    res.setHeader('Content-Disposition', 'attachment; filename=audit_log_export.json');
    res.json(data || []);
  } catch (err: unknown) { safeError(res, err); }
});

// ══════════════════════════════════════
// CIRCUIT BREAKER
// ══════════════════════════════════════

router.get(`/api/${V}/compliance/circuit-breaker`, authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    // Get recent audit entries with BLOCK verdict
    const { data: blocks, error } = await supabase!.from('audit_log')
      .select('agent_id, verdict')
      .eq('org_id', req.org.id).eq('verdict', 'BLOCK')
      .gte('created_at', oneHourAgo);
    if (error) { if (isTableMissing(error)) return res.json([]); throw error; }

    // Get all agents for this org
    const { data: agents } = await supabase!.from('agents').select('id, name, status')
      .eq('org_id', req.org.id);

    // Count blocks per agent
    const blockCounts: Record<string, number> = {};
    (blocks || []).forEach((b: Record<string, unknown>) => {
      const aid = (b.agent_id as string) || 'unknown';
      blockCounts[aid] = (blockCounts[aid] || 0) + 1;
    });

    const breakers = (agents || []).map((a: Record<string, unknown>) => {
      const count = blockCounts[a.id as string] || 0;
      let status: string;
      if (count > 5) status = 'open';
      else if (count > 0) status = 'half-open';
      else status = 'closed';
      return { agent_id: a.id, agent_name: a.name, agent_status: a.status, circuit_status: status, blocks_last_hour: count };
    });

    res.json(breakers);
  } catch (err: unknown) { safeError(res, err); }
});

// ── Circuit Breaker Status (individual agent) ──
router.get(`/api/${V}/compliance/circuit-breaker/status`, authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { agent_id, agent_name } = req.query;

    if (!agent_id && !agent_name) {
      return res.status(400).json({ error: 'agent_id or agent_name query parameter required' });
    }

    const { data, error } = await supabase!.rpc('check_agent_circuit_status', {
      p_org_id: req.org.id,
      p_agent_id: agent_id || null,
      p_agent_name: agent_name || null,
    });

    if (error) {
      // Fallback in case migration 016 has not been applied yet
      console.warn('check_agent_circuit_status RPC failed, falling back to manual query:', error.message);

      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      let resolvedAgentId = agent_id as string;

      if (!resolvedAgentId && agent_name) {
        const { data: agentData } = await supabase!
          .from('agents')
          .select('id')
          .eq('org_id', req.org.id)
          .eq('name', agent_name as string)
          .maybeSingle();
        if (agentData) resolvedAgentId = agentData.id;
      }

      if (!resolvedAgentId) {
        return res.json({ tripped: false, block_count: 0, status: 'closed', agent_id: null });
      }

      const { count, error: countError } = await supabase!
        .from('audit_log')
        .select('*', { count: 'exact', head: true })
        .eq('org_id', req.org.id)
        .eq('agent_id', resolvedAgentId)
        .eq('verdict', 'BLOCK')
        .gte('created_at', oneHourAgo);

      if (countError) throw countError;

      const blocks = count || 0;
      return res.json({
        tripped: blocks >= 5,
        block_count: blocks,
        status: blocks >= 5 ? 'open' : blocks > 0 ? 'half-open' : 'closed',
        agent_id: resolvedAgentId,
      });
    }

    // Success response from RPC function
    const result = Array.isArray(data) ? data[0] : data;
    if (!result || !result.resolved_agent_id) {
      return res.json({ tripped: false, block_count: 0, status: 'closed', agent_id: null });
    }

    res.json({
      tripped: result.tripped,
      block_count: result.block_count,
      status: result.tripped ? 'open' : result.block_count > 0 ? 'half-open' : 'closed',
      agent_id: result.resolved_agent_id,
    });
  } catch (err: unknown) {
    safeError(res, err);
  }
});

export default router;
