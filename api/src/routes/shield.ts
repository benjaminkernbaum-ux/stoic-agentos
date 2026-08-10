/**
 * Active Shield Routes — Declarative Policies, Server-Side Evaluation, Governance Report
 *
 * The policy engine moves enforcement off the client: orgs declare which tool
 * patterns require human approval (or are blocked outright) in the dashboard,
 * and every SDK — or any HTTP caller — asks /shield/evaluate before executing.
 * The circuit breaker gates evaluation server-side: an agent with too many
 * recent BLOCK verdicts is denied without a human in the loop.
 *
 * Graceful degradation: if migration 020 hasn't run, evaluate fail-opens
 * (verdict ALLOW, policies_active=false) and policy CRUD returns empty/503.
 */

import { Router } from 'express';
import type { Response } from 'express';
import { authenticate } from '../middleware/auth.js';
import { requireMinRole } from '../middleware/rbac.js';
import { supabase } from '../middleware/db.js';
import { safeError } from '../lib/safeError.js';
import type { AuthenticatedRequest } from '../types.js';
import { isTableMissing } from '../lib/utils.js';
import {
  evaluatePolicies,
  validatePolicyInput,
  CIRCUIT_BREAKER_BLOCK_THRESHOLD,
  type ShieldPolicy,
} from '../lib/shieldPolicy.js';

const router = Router();
const V = 'v1';

const POLL_INTERVAL_MS = 2000;

// ── Best-effort audit trail write (never blocks the verdict) ──
async function writeAudit(orgId: string, entry: {
  agent_id?: string | null;
  action: string;
  verdict: 'PROCEED' | 'BLOCK' | 'ESCALATE';
  reasoning: string;
  metadata?: Record<string, unknown>;
}) {
  try {
    await supabase!.from('audit_log').insert({
      org_id: orgId,
      agent_id: entry.agent_id || null,
      event_type: 'shield_evaluation',
      action: entry.action,
      verdict: entry.verdict,
      reasoning: entry.reasoning,
      metadata: entry.metadata || {},
    });
  } catch (err) {
    console.error('[shield] Failed to write audit_log:', err);
  }
}

// ══════════════════════════════════════
// POLICY CRUD
// ══════════════════════════════════════

router.get(`/api/${V}/compliance/shield/policies`, authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { data, error } = await supabase!.from('shield_policies').select('*')
      .eq('org_id', req.org.id)
      .order('priority', { ascending: true })
      .order('created_at', { ascending: true });
    if (error) { if (isTableMissing(error)) return res.json([]); throw error; }
    res.json(data || []);
  } catch (err: unknown) { safeError(res, err); }
});

router.post(`/api/${V}/compliance/shield/policies`, authenticate, requireMinRole('admin'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const invalid = validatePolicyInput(req.body);
    if (invalid) return res.status(400).json({ error: invalid });

    const { name, description, tool_pattern, action, priority, timeout_seconds, enabled } = req.body;
    const { data, error } = await supabase!.from('shield_policies').insert({
      org_id: req.org.id,
      name: name.trim(),
      description: description || null,
      tool_pattern: tool_pattern.trim(),
      action: action || 'REQUIRE_APPROVAL',
      priority: priority ?? 100,
      timeout_seconds: timeout_seconds ?? 300,
      enabled: enabled ?? true,
      created_by: req.user?.id || null,
    }).select().single();
    if (error) {
      if (isTableMissing(error)) {
        return res.status(503).json({ error: 'Shield policies unavailable — run migration 020_shield_policies.sql' });
      }
      throw error;
    }
    res.status(201).json(data);
  } catch (err: unknown) { safeError(res, err); }
});

router.patch(`/api/${V}/compliance/shield/policies/:id`, authenticate, requireMinRole('admin'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const allowed = ['name', 'description', 'tool_pattern', 'action', 'priority', 'timeout_seconds', 'enabled'];
    const patch: Record<string, unknown> = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) patch[key] = req.body[key];
    }
    if (Object.keys(patch).length === 0) return res.status(400).json({ error: 'No updatable fields provided' });

    // Reuse creation validation for the merged shape (fill required fields from patch or placeholders)
    const invalid = validatePolicyInput({ name: patch.name ?? 'x', tool_pattern: patch.tool_pattern ?? 'x', ...patch });
    if (invalid) return res.status(400).json({ error: invalid });

    patch.updated_at = new Date().toISOString();
    const { data, error } = await supabase!.from('shield_policies').update(patch)
      .eq('id', req.params.id).eq('org_id', req.org.id).select().maybeSingle();
    if (error) { if (isTableMissing(error)) return res.status(503).json({ error: 'Shield policies unavailable — run migration 020_shield_policies.sql' }); throw error; }
    if (!data) return res.status(404).json({ error: 'Policy not found' });
    res.json(data);
  } catch (err: unknown) { safeError(res, err); }
});

router.delete(`/api/${V}/compliance/shield/policies/:id`, authenticate, requireMinRole('admin'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { data, error } = await supabase!.from('shield_policies').delete()
      .eq('id', req.params.id).eq('org_id', req.org.id).select('id').maybeSingle();
    if (error) { if (isTableMissing(error)) return res.status(404).json({ error: 'Policy not found' }); throw error; }
    if (!data) return res.status(404).json({ error: 'Policy not found' });
    res.json({ success: true });
  } catch (err: unknown) { safeError(res, err); }
});

// ══════════════════════════════════════
// SERVER-SIDE EVALUATION
// ══════════════════════════════════════
//
// POST /compliance/shield/evaluate
// The SDK calls this before executing any tool. The server decides:
//   1. Circuit breaker: agent with >= threshold BLOCKs in the last hour → BLOCK.
//   2. First matching enabled policy (priority ASC) → ALLOW | BLOCK | REQUIRE_APPROVAL.
//   3. No match / no policies table → ALLOW (fail-open, policies_active=false).
// REQUIRE_APPROVAL creates a pending_approvals row with a per-policy timeout_at
// and returns the approval_id for the SDK to poll (then consume, see 019 CAS).

router.post(`/api/${V}/compliance/shield/evaluate`, authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { tool_name, agent_id, agent_name, trace_id, tool_args } = req.body;
    if (!tool_name || typeof tool_name !== 'string') {
      return res.status(400).json({ error: 'tool_name is required' });
    }

    // ── Resolve agent (best-effort, by id or name) ──
    let resolvedAgentId: string | null = (agent_id as string) || null;
    if (!resolvedAgentId && agent_name) {
      const { data: agentRow } = await supabase!.from('agents').select('id')
        .eq('org_id', req.org.id).eq('name', agent_name as string).maybeSingle();
      if (agentRow) resolvedAgentId = agentRow.id;
    }

    // ── 1. Circuit breaker gate (server-side enforcement) ──
    if (resolvedAgentId) {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      const { count, error: cbError } = await supabase!.from('audit_log')
        .select('*', { count: 'exact', head: true })
        .eq('org_id', req.org.id).eq('agent_id', resolvedAgentId)
        .eq('verdict', 'BLOCK').gte('created_at', oneHourAgo);
      // Fail-open if audit_log is missing; a broken breaker must not take down agents.
      if (!cbError && (count || 0) >= CIRCUIT_BREAKER_BLOCK_THRESHOLD) {
        await writeAudit(req.org.id, {
          agent_id: resolvedAgentId,
          action: `tool_use:${tool_name}`,
          verdict: 'BLOCK',
          reasoning: `Circuit breaker open: agent accrued ${count} BLOCK verdicts in the last hour (threshold ${CIRCUIT_BREAKER_BLOCK_THRESHOLD})`,
          metadata: { trace_id: trace_id || null, source: 'circuit_breaker' },
        });
        return res.json({
          verdict: 'BLOCK',
          reason: 'circuit_breaker_open',
          block_count: count,
          policies_active: true,
        });
      }
    }

    // ── 2. Load and evaluate declarative policies ──
    const { data: policies, error: polError } = await supabase!.from('shield_policies')
      .select('id, name, tool_pattern, action, priority, timeout_seconds, enabled, created_at')
      .eq('org_id', req.org.id).eq('enabled', true);

    if (polError) {
      if (isTableMissing(polError)) {
        // Migration 020 not applied — fail open, tell the SDK policies are inactive.
        return res.json({ verdict: 'ALLOW', reason: 'no_policies_configured', policies_active: false });
      }
      throw polError;
    }

    const { action, policy } = evaluatePolicies((policies || []) as ShieldPolicy[], tool_name);

    // ── 3a. Default allow (no policy matched): no audit write to avoid flooding ──
    if (!policy) {
      return res.json({ verdict: 'ALLOW', reason: 'no_policy_matched', policies_active: true });
    }

    const policyRef = { id: policy.id, name: policy.name, tool_pattern: policy.tool_pattern };

    // ── 3b. Explicit ALLOW ──
    if (action === 'ALLOW') {
      await writeAudit(req.org.id, {
        agent_id: resolvedAgentId,
        action: `tool_use:${tool_name}`,
        verdict: 'PROCEED',
        reasoning: `Allowed by policy "${policy.name}" (${policy.tool_pattern})`,
        metadata: { trace_id: trace_id || null, policy_id: policy.id },
      });
      return res.json({ verdict: 'ALLOW', reason: 'policy_allow', policy: policyRef, policies_active: true });
    }

    // ── 3c. BLOCK ──
    if (action === 'BLOCK') {
      await writeAudit(req.org.id, {
        agent_id: resolvedAgentId,
        action: `tool_use:${tool_name}`,
        verdict: 'BLOCK',
        reasoning: `Blocked by policy "${policy.name}" (${policy.tool_pattern})`,
        metadata: { trace_id: trace_id || null, policy_id: policy.id, tool_args: tool_args || {} },
      });
      return res.json({ verdict: 'BLOCK', reason: 'policy_block', policy: policyRef, policies_active: true });
    }

    // ── 3d. REQUIRE_APPROVAL: create the pending approval with per-policy timeout ──
    const timeoutSeconds = policy.timeout_seconds || 300;
    const timeoutAt = new Date(Date.now() + timeoutSeconds * 1000).toISOString();
    let approvalId: string | null = null;
    try {
      const { data: approval, error: insError } = await supabase!.from('pending_approvals').insert({
        org_id: req.org.id,
        agent_id: resolvedAgentId,
        trace_id: trace_id || null,
        tool_name,
        tool_args: tool_args || {},
        status: 'PENDING',
        timeout_at: timeoutAt,
        policy_id: policy.id,
      }).select('id').single();
      if (insError) throw insError;
      approvalId = approval.id;
    } catch (insErr: unknown) {
      // Column timeout_at may not exist (020 partially applied) — retry legacy shape
      try {
        const { data: approval, error: retryError } = await supabase!.from('pending_approvals').insert({
          org_id: req.org.id,
          agent_id: resolvedAgentId,
          trace_id: trace_id || null,
          tool_name,
          tool_args: tool_args || {},
          status: 'PENDING',
        }).select('id').single();
        if (retryError) throw retryError;
        approvalId = approval.id;
      } catch {
        // pending_approvals missing entirely (018 not run): fail open with a warning flag
        console.error('[shield] evaluate could not create approval:', insErr);
        return res.json({ verdict: 'ALLOW', reason: 'approvals_unavailable', policies_active: false });
      }
    }

    await writeAudit(req.org.id, {
      agent_id: resolvedAgentId,
      action: `tool_use:${tool_name}`,
      verdict: 'ESCALATE',
      reasoning: `Escalated to human approval by policy "${policy.name}" (${policy.tool_pattern})`,
      metadata: { trace_id: trace_id || null, policy_id: policy.id, approval_id: approvalId },
    });

    res.status(201).json({
      verdict: 'REQUIRE_APPROVAL',
      approval_id: approvalId,
      timeout_at: timeoutAt,
      timeout_seconds: timeoutSeconds,
      poll_interval_ms: POLL_INTERVAL_MS,
      policy: policyRef,
      policies_active: true,
    });
  } catch (err: unknown) { safeError(res, err); }
});

// ══════════════════════════════════════
// GOVERNANCE REPORT
// ══════════════════════════════════════
//
// GET /compliance/report?from=&to=
// The client-facing deliverable: "X actions, Y required approval, Z blocked,
// median resolution time" — the artifact an agency hands its client monthly.

router.get(`/api/${V}/compliance/report`, authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const to = (req.query.to as string) || new Date().toISOString();
    const from = (req.query.from as string) || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    const [auditQ, approvalsQ, agentsQ, policiesQ] = await Promise.all([
      supabase!.from('audit_log')
        .select('verdict, event_type, agent_id, created_at')
        .eq('org_id', req.org.id).gte('created_at', from).lte('created_at', to)
        .order('created_at', { ascending: false }).limit(10000),
      supabase!.from('pending_approvals')
        .select('status, tool_name, created_at, resolved_at')
        .eq('org_id', req.org.id).gte('created_at', from).lte('created_at', to)
        .order('created_at', { ascending: false }).limit(10000),
      supabase!.from('agents').select('id, name').eq('org_id', req.org.id),
      supabase!.from('shield_policies').select('id, enabled').eq('org_id', req.org.id),
    ]);

    const audit = auditQ.error ? [] : (auditQ.data || []);
    const approvals = approvalsQ.error ? [] : (approvalsQ.data || []);
    const agents = agentsQ.error ? [] : (agentsQ.data || []);
    const policies = policiesQ.error ? [] : (policiesQ.data || []);

    // ── Audit rollup ──
    const byVerdict: Record<string, number> = {};
    const byType: Record<string, number> = {};
    const perAgent: Record<string, { events: number; blocks: number }> = {};
    audit.forEach((r: Record<string, unknown>) => {
      const verdict = (r.verdict as string) || 'UNKNOWN';
      byVerdict[verdict] = (byVerdict[verdict] || 0) + 1;
      const type = (r.event_type as string) || 'unknown';
      byType[type] = (byType[type] || 0) + 1;
      const aid = (r.agent_id as string) || 'unattributed';
      if (!perAgent[aid]) perAgent[aid] = { events: 0, blocks: 0 };
      perAgent[aid].events += 1;
      if (verdict === 'BLOCK') perAgent[aid].blocks += 1;
    });

    // ── Approvals rollup ──
    const approvalsByStatus: Record<string, number> = {};
    const resolutionSeconds: number[] = [];
    const byTool: Record<string, number> = {};
    approvals.forEach((a: Record<string, unknown>) => {
      const status = (a.status as string) || 'UNKNOWN';
      approvalsByStatus[status] = (approvalsByStatus[status] || 0) + 1;
      byTool[a.tool_name as string] = (byTool[a.tool_name as string] || 0) + 1;
      if (a.resolved_at && a.created_at && ['APPROVED', 'REJECTED', 'CONSUMED'].includes(status)) {
        const secs = (new Date(a.resolved_at as string).getTime() - new Date(a.created_at as string).getTime()) / 1000;
        if (secs >= 0) resolutionSeconds.push(secs);
      }
    });
    resolutionSeconds.sort((a, b) => a - b);
    const median = resolutionSeconds.length
      ? resolutionSeconds[Math.floor(resolutionSeconds.length / 2)] : null;

    const agentNames: Record<string, string> = {};
    agents.forEach((a: Record<string, unknown>) => { agentNames[a.id as string] = a.name as string; });

    res.json({
      period: { from, to },
      generated_at: new Date().toISOString(),
      audit: {
        total_events: audit.length,
        by_verdict: byVerdict,
        by_event_type: byType,
      },
      approvals: {
        total_requested: approvals.length,
        by_status: approvalsByStatus,
        by_tool: byTool,
        median_resolution_seconds: median,
      },
      agents: Object.entries(perAgent).map(([id, stats]) => ({
        agent_id: id,
        agent_name: agentNames[id] || (id === 'unattributed' ? null : id),
        ...stats,
      })).sort((a, b) => b.events - a.events),
      policies: {
        total: policies.length,
        enabled: policies.filter((p: Record<string, unknown>) => p.enabled).length,
      },
    });
  } catch (err: unknown) { safeError(res, err); }
});

export default router;
