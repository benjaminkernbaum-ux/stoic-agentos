/**
 * Stoic AgentOS — Compliance API Routes
 * EU AI Act Article 12 + SOC 2 Ready
 *
 * Features:
 * - Immutable audit log ingestion
 * - Circuit breaker (fleet-wide agent kill switch)
 * - SIEM export (structured JSON for Splunk/Datadog)
 * - Compliance stats dashboard
 */
import { Router } from 'express';
import type { Response } from 'express';
import { authenticate } from '../middleware/auth.js';
import { supabase } from '../middleware/db.js';
import type { AuthenticatedRequest } from '../types.js';
import crypto from 'crypto';

const router = Router();
const API_VERSION = 'v1';

// ═══════════════════════════════════════════════════════
//  AUDIT LOG — immutable event recording
// ═══════════════════════════════════════════════════════

// ── Log Event ──
router.post(`/api/${API_VERSION}/audit/log`, authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { agent_id, event_type, action, reasoning, context, policy_version, verdict, metadata } = req.body;

    if (!event_type || !action) {
      return res.status(400).json({ error: 'event_type and action are required' });
    }

    // Hash the context for tamper-detection
    const context_hash = context
      ? crypto.createHash('sha256').update(JSON.stringify(context)).digest('hex')
      : null;

    const { data, error } = await supabase!
      .from('audit_log')
      .insert({
        org_id: req.org.id,
        agent_id: agent_id || null,
        event_type,
        action,
        reasoning: reasoning || null,
        context_hash,
        policy_version: policy_version || null,
        verdict: verdict || 'PROCEED',
        metadata: metadata || {},
      })
      .select()
      .single();

    if (error) throw error;
    res.status(201).json(data);
  } catch (err: unknown) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// ── Batch Log Events (for SDK bulk ingestion) ──
router.post(`/api/${API_VERSION}/audit/log/batch`, authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { events } = req.body;
    if (!Array.isArray(events) || events.length === 0) {
      return res.status(400).json({ error: 'events array is required' });
    }

    if (events.length > 100) {
      return res.status(400).json({ error: 'Maximum 100 events per batch' });
    }

    const rows = events.map((e: Record<string, unknown>) => ({
      org_id: req.org.id,
      agent_id: e.agent_id || null,
      event_type: e.event_type || 'unknown',
      action: e.action || 'unknown',
      reasoning: e.reasoning || null,
      context_hash: e.context
        ? crypto.createHash('sha256').update(JSON.stringify(e.context)).digest('hex')
        : null,
      policy_version: e.policy_version || null,
      verdict: e.verdict || 'PROCEED',
      metadata: e.metadata || {},
    }));

    const { data, error } = await supabase!
      .from('audit_log')
      .insert(rows)
      .select();

    if (error) throw error;
    res.status(201).json({ inserted: data?.length || 0 });
  } catch (err: unknown) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// ── Query Audit Log ──
router.get(`/api/${API_VERSION}/audit/log`, authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { agent_id, event_type, verdict, from, to, limit = '50', offset = '0' } = req.query;

    let query = supabase!
      .from('audit_log')
      .select('*')
      .eq('org_id', req.org.id)
      .order('created_at', { ascending: false })
      .range(+(offset as string), +(offset as string) + +(limit as string) - 1);

    if (agent_id) query = query.eq('agent_id', agent_id as string);
    if (event_type) query = query.eq('event_type', event_type as string);
    if (verdict) query = query.eq('verdict', verdict as string);
    if (from) query = query.gte('created_at', from as string);
    if (to) query = query.lte('created_at', to as string);

    const { data, error } = await query;
    if (error) throw error;
    res.json(data || []);
  } catch (err: unknown) {
    res.status(500).json({ error: (err as Error).message });
  }
});


// ═══════════════════════════════════════════════════════
//  SIEM EXPORT — structured JSON for compliance tools
// ═══════════════════════════════════════════════════════

router.get(`/api/${API_VERSION}/compliance/export`, authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    // Only team+ plans can export
    if (req.org.plan === 'free' || req.org.plan === 'pro') {
      return res.status(403).json({
        error: 'Compliance export requires Team or Enterprise plan',
        upgrade_url: '/pricing',
      });
    }

    const { from, to, format = 'json', agent_id, event_type } = req.query;

    if (!from || !to) {
      return res.status(400).json({ error: 'from and to date parameters are required (ISO 8601)' });
    }

    let query = supabase!
      .from('audit_log')
      .select('*')
      .eq('org_id', req.org.id)
      .gte('created_at', from as string)
      .lte('created_at', to as string)
      .order('created_at', { ascending: true });

    if (agent_id) query = query.eq('agent_id', agent_id as string);
    if (event_type) query = query.eq('event_type', event_type as string);

    const { data, error } = await query.limit(10000);
    if (error) throw error;

    const entries = (data || []).map(entry => ({
      id: entry.id,
      timestamp: entry.created_at,
      org_id: entry.org_id,
      agent_id: entry.agent_id,
      event_type: entry.event_type,
      action: entry.action,
      reasoning: entry.reasoning,
      context_hash: entry.context_hash,
      policy_version: entry.policy_version,
      verdict: entry.verdict,
      metadata: entry.metadata,
    }));

    if (format === 'ndjson') {
      // Newline-delimited JSON (for Splunk/Datadog ingest)
      res.setHeader('Content-Type', 'application/x-ndjson');
      res.setHeader('Content-Disposition', `attachment; filename="audit-export-${from}-${to}.ndjson"`);
      res.send(entries.map(e => JSON.stringify(e)).join('\n'));
    } else {
      res.json({
        export: {
          org_id: req.org.id,
          from,
          to,
          total_entries: entries.length,
          generated_at: new Date().toISOString(),
        },
        entries,
      });
    }
  } catch (err: unknown) {
    res.status(500).json({ error: (err as Error).message });
  }
});


// ═══════════════════════════════════════════════════════
//  CIRCUIT BREAKER — fleet-wide agent kill switch
//  EU AI Act Article 14 (Human Oversight)
// ═══════════════════════════════════════════════════════

router.post(`/api/${API_VERSION}/compliance/circuit-breaker`, authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { action, reason } = req.body;

    if (!action || !['HALT_ALL', 'RESUME_ALL'].includes(action)) {
      return res.status(400).json({ error: 'action must be HALT_ALL or RESUME_ALL' });
    }

    const newStatus = action === 'HALT_ALL' ? 'paused' : 'idle';

    // Update all agents for this org
    const { data: agents, error: agentErr } = await supabase!
      .from('agents')
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq('org_id', req.org.id)
      .neq('status', newStatus)
      .select('id, name, status');

    if (agentErr) throw agentErr;

    // Log to audit trail
    await supabase!.from('audit_log').insert({
      org_id: req.org.id,
      event_type: 'circuit_breaker',
      action,
      reasoning: reason || `Circuit breaker ${action} triggered by user`,
      verdict: action === 'HALT_ALL' ? 'HALT' : 'PROCEED',
      metadata: {
        agents_affected: agents?.length || 0,
        triggered_by: req.user?.email || req.apiKey?.name || 'unknown',
      },
    });

    res.json({
      status: 'ok',
      action,
      agents_affected: agents?.length || 0,
      agents: agents?.map(a => ({ id: a.id, name: a.name, new_status: a.status })) || [],
    });
  } catch (err: unknown) {
    res.status(500).json({ error: (err as Error).message });
  }
});


// ═══════════════════════════════════════════════════════
//  COMPLIANCE STATS — dashboard metrics
// ═══════════════════════════════════════════════════════

router.get(`/api/${API_VERSION}/compliance/stats`, authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const now = new Date();
    const last24h = new Date(now.getTime() - 86400000).toISOString();
    const last7d = new Date(now.getTime() - 604800000).toISOString();

    const [total, last24, last7, halts, escalations] = await Promise.all([
      supabase!.from('audit_log').select('*', { count: 'exact', head: true }).eq('org_id', req.org.id),
      supabase!.from('audit_log').select('*', { count: 'exact', head: true }).eq('org_id', req.org.id).gte('created_at', last24h),
      supabase!.from('audit_log').select('*', { count: 'exact', head: true }).eq('org_id', req.org.id).gte('created_at', last7d),
      supabase!.from('audit_log').select('*', { count: 'exact', head: true }).eq('org_id', req.org.id).eq('verdict', 'HALT'),
      supabase!.from('audit_log').select('*', { count: 'exact', head: true }).eq('org_id', req.org.id).eq('verdict', 'ESCALATE'),
    ]);

    res.json({
      total_events: total.count || 0,
      last_24h: last24.count || 0,
      last_7d: last7.count || 0,
      halts: halts.count || 0,
      escalations: escalations.count || 0,
      circuit_breaker_available: true,
      siem_export_available: req.org.plan === 'team' || req.org.plan === 'enterprise',
    });
  } catch (err: unknown) {
    res.status(500).json({ error: (err as Error).message });
  }
});

export default router;
