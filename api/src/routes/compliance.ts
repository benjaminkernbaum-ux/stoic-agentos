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
import {
  compilePolicySchema,
  validateToolArgs,
  isEnforcementMode,
  ENFORCEMENT_MODES,
} from '../lib/shieldPolicy.js';
import type { SchemaViolation } from '../lib/shieldPolicy.js';
import {
  validatePredicateSyntax,
  predicateUsesBudget,
  evaluatePredicate,
} from '../lib/shieldPredicate.js';
import { runSemanticValidators } from '../lib/shieldValidators.js';

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


// ══════════════════════════════════════
// ACTIVE SHIELD / HITL (HUMAN-IN-THE-LOOP)
// ══════════════════════════════════════

// ── Suspend Execution (SDK requests human approval) ──
router.post(`/api/${V}/compliance/shield/suspend`, authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { agent_id, trace_id, tool_name, tool_args } = req.body;
    if (!tool_name) {
      return res.status(400).json({ error: 'tool_name is required' });
    }

    const { data, error } = await supabase!
      .from('pending_approvals')
      .insert({
        org_id: req.org.id,
        agent_id: agent_id || null,
        trace_id: trace_id || null,
        tool_name,
        tool_args: tool_args || {},
        status: 'PENDING'
      })
      .select('id')
      .single();

    if (error) throw error;
    res.status(201).json({ success: true, approval_id: data.id });
  } catch (err: unknown) {
    safeError(res, err);
  }
});

// ── Polling Endpoint for SDK (check approval status) ──
router.get(`/api/${V}/compliance/shield/approvals/:id/status`, authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { data, error } = await supabase!
      .from('pending_approvals')
      .select('status')
      .eq('id', req.params.id)
      .eq('org_id', req.org.id)
      .maybeSingle();

    if (error) throw error;
    if (!data) {
      return res.status(404).json({ error: 'Approval request not found' });
    }

    res.json({ status: data.status });
  } catch (err: unknown) {
    safeError(res, err);
  }
});

// ── Resolve Approval (Admin approves/rejects from Dashboard) ──
router.post(`/api/${V}/compliance/shield/approvals/:id/resolve`, authenticate, requireMinRole('admin'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { verdict } = req.body; // APPROVED or REJECTED
    if (verdict !== 'APPROVED' && verdict !== 'REJECTED') {
      return res.status(400).json({ error: 'verdict must be APPROVED or REJECTED' });
    }

    // 1. Update the pending approval status atomically using Compare-and-Swap RPC
    const { data, error: updateError } = await supabase!
      .rpc('transition_approval_status', {
        p_org_id: req.org.id,
        p_approval_id: req.params.id,
        p_from_status: 'PENDING',
        p_to_status: verdict,
        p_user_id: req.user?.id || null
      });

    if (updateError) throw updateError;
    
    const approval = Array.isArray(data) ? data[0] : data;
    if (!approval) {
      return res.status(409).json({ error: 'Resolution conflict. This approval request may have already been resolved or timed out.' });
    }

    // 2. Insert into the immutable audit_log for audit trail
    try {
      await supabase!.from('audit_log').insert({
        org_id: req.org.id,
        agent_id: approval.agent_id || null,
        event_type: 'shield_evaluation',
        action: `tool_use:${approval.tool_name}`,
        verdict: verdict === 'APPROVED' ? 'PROCEED' : 'BLOCK',
        reasoning: `Human administrator resolved verdict to ${verdict}`,
        metadata: {
          approval_id: approval.id,
          trace_id: approval.trace_id,
          tool_args: approval.tool_args
        }
      });
    } catch (auditErr) {
      console.error('[compliance] Failed to write to audit_log:', auditErr);
    }

    res.json({ success: true, status: verdict });
  } catch (err: unknown) {
    safeError(res, err);
  }
});

// ── Consume Approval (SDK transitions status APPROVED -> CONSUMED to prevent double-execution) ──
router.post(`/api/${V}/compliance/shield/approvals/:id/consume`, authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { data, error } = await supabase!
      .rpc('transition_approval_status', {
        p_org_id: req.org.id,
        p_approval_id: req.params.id,
        p_from_status: 'APPROVED',
        p_to_status: 'CONSUMED',
        p_user_id: null
      });

    if (error) throw error;

    const approval = Array.isArray(data) ? data[0] : data;
    if (!approval) {
      return res.status(409).json({ error: 'Failed to claim approval. The request may have timed out, been rejected, or already consumed.' });
    }

    res.json({ success: true, status: 'CONSUMED', approval });
  } catch (err: unknown) {
    safeError(res, err);
  }
});

// ══════════════════════════════════════
// ACTIVE SHIELD LAYER 1 — SCHEMA POLICY ENGINE
// ══════════════════════════════════════

// ── List Tool Policies ──
router.get(`/api/${V}/compliance/shield/policies`, authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { data, error } = await supabase!
      .from('tool_policies')
      .select('*')
      .eq('org_id', req.org.id)
      .order('tool_name', { ascending: true });
    if (error) { if (isTableMissing(error)) return res.json([]); throw error; }
    res.json(data || []);
  } catch (err: unknown) { safeError(res, err); }
});

// ── Upsert Tool Policy (one policy per org+tool_name) ──
router.post(`/api/${V}/compliance/shield/policies`, authenticate, requireMinRole('admin'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { tool_name, schema, enforcement, active, predicate } = req.body;
    if (!tool_name || typeof tool_name !== 'string') {
      return res.status(400).json({ error: 'tool_name is required' });
    }
    const mode = enforcement ?? 'monitor';
    if (!isEnforcementMode(mode)) {
      return res.status(400).json({ error: `enforcement must be one of: ${ENFORCEMENT_MODES.join(', ')}` });
    }
    const policySchema = schema ?? {};
    // Reject schemas that Ajv can't compile — a policy that would break /evaluate must never be stored
    try {
      compilePolicySchema(policySchema);
    } catch (compileErr: unknown) {
      return res.status(400).json({ error: (compileErr as Error).message });
    }

    // Layer 2: reject CEL predicates that don't parse — same never-store-broken-rules
    // contract as the schema compile check above. predicate: null clears an existing one.
    const hasPredicate = 'predicate' in req.body;
    if (hasPredicate && predicate !== null) {
      if (typeof predicate !== 'string' || !predicate.trim()) {
        return res.status(400).json({ error: 'predicate must be a non-empty CEL expression string, or null to clear' });
      }
      const predicateError = validatePredicateSyntax(predicate);
      if (predicateError) {
        return res.status(400).json({ error: predicateError });
      }
    }

    const row: Record<string, unknown> = {
      org_id: req.org.id,
      tool_name,
      schema: policySchema,
      enforcement: mode,
      active: active !== false,
      updated_at: new Date().toISOString(),
    };
    // Only include the column when the caller sent it — keeps pre-031 databases
    // working for predicate-free policies (unknown column would fail the upsert).
    if (hasPredicate) row.predicate = predicate;

    const { data, error } = await supabase!
      .from('tool_policies')
      .upsert(row, { onConflict: 'org_id,tool_name' })
      .select()
      .single();
    if (error) {
      if (hasPredicate && (error.code === '42703' || (error.message || '').includes('predicate'))) {
        return res.status(503).json({ error: 'Predicates unavailable — run migration 031_shield_predicates_budgets.sql' });
      }
      if (isTableMissing(error)) {
        return res.status(503).json({ error: 'Tool policies unavailable — run migration 030_tool_policies.sql' });
      }
      throw error;
    }
    res.status(201).json(data);
  } catch (err: unknown) { safeError(res, err); }
});

// ── Delete Tool Policy ──
router.delete(`/api/${V}/compliance/shield/policies/:id`, authenticate, requireMinRole('admin'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { error } = await supabase!
      .from('tool_policies')
      .delete()
      .eq('id', req.params.id)
      .eq('org_id', req.org.id);
    if (error) {
      if (isTableMissing(error)) return res.status(404).json({ error: 'Policy not found' });
      throw error;
    }
    res.json({ success: true });
  } catch (err: unknown) { safeError(res, err); }
});

// ── Evaluate Tool Call (the core: graduated ALLOW / BLOCK / REQUIRE_APPROVAL) ──
// Layer 1: JSON Schema (shape) → Layer 3: semantic validators (parse dangerous
// arg types) → Layer 2: CEL predicate (cross-field / budget rules) → atomic
// budget debit. First failing layer short-circuits into the policy's
// graduated enforcement, identical to a Layer 1 schema violation.
router.post(`/api/${V}/compliance/shield/evaluate`, authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { tool_name, tool_args, agent_id, trace_id } = req.body;
    if (!tool_name || typeof tool_name !== 'string') {
      return res.status(400).json({ error: 'tool_name is required' });
    }
    const args = tool_args ?? {};

    // 1. Load the active policy for this (org, tool).
    //    Fail-open on unconfigured tools: no policy (or migration 030 not run) → ALLOW.
    const { data: policy, error: policyError } = await supabase!
      .from('tool_policies')
      .select('*')
      .eq('org_id', req.org.id)
      .eq('tool_name', tool_name)
      .eq('active', true)
      .maybeSingle();
    if (policyError) {
      if (isTableMissing(policyError)) return res.json({ verdict: 'ALLOW', reason: 'no_policy' });
      throw policyError;
    }
    if (!policy) return res.json({ verdict: 'ALLOW', reason: 'no_policy' });

    const schemaObj = (policy.schema && typeof policy.schema === 'object' ? policy.schema : {}) as Record<string, unknown>;
    const budgetKey = typeof schemaObj['x-budget-key'] === 'string' ? schemaObj['x-budget-key'] as string : tool_name;

    const violations: SchemaViolation[] = [];
    let failureReason = '';

    // 2. Layer 1 — validate tool_args against the policy's JSON Schema
    //    (validator memoized per policy id + updated_at)
    const schemaResult = validateToolArgs(policy.schema, args, `${policy.id}:${policy.updated_at}`);
    if (!schemaResult.valid) {
      violations.push(...schemaResult.errors);
      failureReason = 'schema_violation';
    }

    // 3. Layer 3 — semantic validators: PARSE args flagged x-validator (sql/shell/url)
    //    and enforce allowlists. Only reached when the shape is already valid.
    if (violations.length === 0) {
      const semanticViolations = await runSemanticValidators(policy.schema, args as Record<string, unknown>);
      if (semanticViolations.length > 0) {
        violations.push(...semanticViolations);
        failureReason = 'validator_violation';
      }
    }

    // 4. Layer 2 — CEL predicate over { args, agent_id, trace_id, budget_remaining }.
    //    Pre-031 databases never reach here (select * simply has no predicate column).
    if (violations.length === 0 && typeof policy.predicate === 'string' && policy.predicate.trim()) {
      let budgetRemaining = 0;
      let skipPredicate = false;
      if (predicateUsesBudget(policy.predicate)) {
        let budgetQuery = supabase!
          .from('budgets')
          .select('limit_cents, spent_cents')
          .eq('org_id', req.org.id)
          .eq('key', budgetKey);
        budgetQuery = agent_id
          ? budgetQuery.or(`agent_id.eq.${agent_id},agent_id.is.null`)
          : budgetQuery.is('agent_id', null);
        const { data: budgetRows, error: budgetError } = await budgetQuery
          .order('agent_id', { ascending: true, nullsFirst: false }) // prefer agent-scoped over fleet-wide
          .limit(1);
        if (budgetError) {
          if (isTableMissing(budgetError)) {
            // Migration 031 not run — skip the predicate (treat as pass), same
            // graceful-degradation philosophy as Layer 1's missing tool_policies.
            console.warn(`[shield] budgets table missing (migration 031 not run) — skipping predicate for '${tool_name}'`);
            skipPredicate = true;
          } else {
            throw budgetError;
          }
        } else if (budgetRows && budgetRows.length > 0) {
          budgetRemaining = Math.max(0, Number(budgetRows[0].limit_cents) - Number(budgetRows[0].spent_cents));
        }
        // No budget row → budget_remaining stays 0: an org that gates a tool on
        // budget gets zero spend until a budget is configured (fail-closed on
        // the org's own rule, never silently unlimited).
      }
      if (!skipPredicate) {
        const predicateResult = evaluatePredicate(policy.predicate, {
          args: args as Record<string, unknown>,
          agent_id: agent_id || null,
          trace_id: trace_id || null,
          budget_remaining: budgetRemaining,
        });
        if (!predicateResult.valid) {
          violations.push(...predicateResult.errors);
          failureReason = 'predicate_failed';
        }
      }
    }

    // 5. Spend-type tools (schema carries x-budget-arg): the decision and the
    //    debit are ONE atomic compare-and-swap UPDATE server-side — per-call
    //    checks can't see fleet-wide spend, so read-then-write would race.
    //    Only debits on an otherwise-clean pass; a blocked call never spends.
    const budgetArg = typeof schemaObj['x-budget-arg'] === 'string' ? schemaObj['x-budget-arg'] as string : null;
    if (violations.length === 0 && budgetArg) {
      const amountRaw = (args as Record<string, unknown>)[budgetArg];
      const amountCents = typeof amountRaw === 'number' && Number.isFinite(amountRaw) && amountRaw >= 0
        ? Math.ceil(amountRaw)
        : null;
      if (amountCents === null) {
        violations.push({
          path: `/${budgetArg}`,
          message: `budget arg '${budgetArg}' must be a non-negative number of cents`,
          keyword: 'budget_amount_invalid',
        });
        failureReason = 'budget_invalid_amount';
      } else {
        const { data: consumed, error: consumeError } = await supabase!.rpc('consume_budget', {
          p_org_id: req.org.id,
          p_agent_id: agent_id || null,
          p_key: budgetKey,
          p_amount_cents: amountCents,
        });
        if (consumeError) {
          if (isTableMissing(consumeError)) {
            // consume_budget() not deployed (migration 031 not run) — skip with a warning
            console.warn(`[shield] consume_budget RPC missing (migration 031 not run) — skipping budget debit for '${tool_name}'`);
          } else {
            throw consumeError;
          }
        } else {
          const consumedRows = Array.isArray(consumed) ? consumed : consumed ? [consumed] : [];
          if (consumedRows.length === 0) {
            // CAS refused: debit would exceed limit_cents (or no budget row configured)
            violations.push({
              path: `/${budgetArg}`,
              message: `budget '${budgetKey}' refused a debit of ${amountCents} cents (exhausted or not configured)`,
              keyword: 'budget_exceeded',
            });
            failureReason = 'budget_exceeded';
          }
        }
      }
    }

    const valid = violations.length === 0;
    const errors = violations;

    // 6. Graduated verdict — every layer's failure flows through the same enforcement
    let verdict: 'ALLOW' | 'BLOCK' | 'REQUIRE_APPROVAL' = 'ALLOW';
    let reason = 'schema_valid';
    let approvalId: string | null = null;

    if (!valid) {
      reason = failureReason;
      if (policy.enforcement === 'block') {
        verdict = 'BLOCK';
      } else if (policy.enforcement === 'require_approval') {
        // Suspend into the existing HITL flow — same insert as /shield/suspend
        const { data: approval, error: approvalError } = await supabase!
          .from('pending_approvals')
          .insert({
            org_id: req.org.id,
            agent_id: agent_id || null,
            trace_id: trace_id || null,
            tool_name,
            tool_args: args,
            status: 'PENDING'
          })
          .select('id')
          .single();
        if (approvalError) {
          // HITL unavailable (e.g. migration 018 missing) — fail closed: the org
          // explicitly demanded human review, so silently allowing is not an option.
          console.error('[shield] pending_approvals insert failed, downgrading REQUIRE_APPROVAL to BLOCK:', approvalError.message);
          verdict = 'BLOCK';
          reason = 'approval_unavailable';
        } else {
          verdict = 'REQUIRE_APPROVAL';
          approvalId = approval.id;
        }
      } else {
        // monitor: log but allow
        verdict = 'ALLOW';
        reason = 'monitor_only';
      }
    }

    // 7. Write the outcome to the immutable audit_log SYNCHRONOUSLY —
    //    verdict-bearing events must never be batched or fire-and-forget.
    const auditVerdict = verdict === 'BLOCK' ? 'BLOCK' : verdict === 'REQUIRE_APPROVAL' ? 'REVIEW' : 'PROCEED';
    const reasoning = valid
      ? `Shield policy '${tool_name}' passed (enforcement=${policy.enforcement})`
      : `Shield policy '${tool_name}' violated [${failureReason}] (enforcement=${policy.enforcement}): ${errors.map((e) => `${e.path} ${e.message}`).join('; ').slice(0, 500)}`;
    try {
      const { error: auditError } = await supabase!.from('audit_log').insert({
        org_id: req.org.id,
        agent_id: agent_id || null,
        event_type: 'shield_evaluation',
        action: `tool_use:${tool_name}`,
        verdict: auditVerdict,
        reasoning,
        metadata: {
          policy_id: policy.id,
          enforcement: policy.enforcement,
          approval_id: approvalId,
          trace_id: trace_id || null,
          tool_args: args,
          validation_errors: valid ? [] : errors,
          failure_reason: valid ? null : failureReason,
        }
      });
      if (auditError) console.error('[compliance] Failed to write to audit_log:', auditError.message);
    } catch (auditErr) {
      console.error('[compliance] Failed to write to audit_log:', auditErr);
    }

    const response: Record<string, unknown> = { verdict, reason, policy_id: policy.id };
    if (!valid) response.errors = errors;
    if (approvalId) response.approval_id = approvalId;
    res.json(response);
  } catch (err: unknown) {
    safeError(res, err);
  }
});

// ══════════════════════════════════════
// ACTIVE SHIELD LAYER 2 — BUDGETS
// ══════════════════════════════════════

// ── List Budgets ──
router.get(`/api/${V}/compliance/shield/budgets`, authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { data, error } = await supabase!
      .from('budgets')
      .select('*')
      .eq('org_id', req.org.id)
      .order('key', { ascending: true });
    if (error) { if (isTableMissing(error)) return res.json([]); throw error; }
    res.json(data || []);
  } catch (err: unknown) { safeError(res, err); }
});

// ── Upsert Budget (one per org+agent+key; agent_id null = fleet-wide) ──
router.post(`/api/${V}/compliance/shield/budgets`, authenticate, requireMinRole('admin'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { key, limit_cents, agent_id, period, reset_spent } = req.body;
    if (!key || typeof key !== 'string') {
      return res.status(400).json({ error: 'key is required' });
    }
    if (typeof limit_cents !== 'number' || !Number.isFinite(limit_cents) || limit_cents < 0) {
      return res.status(400).json({ error: 'limit_cents must be a non-negative number' });
    }
    const row: Record<string, unknown> = {
      org_id: req.org.id,
      agent_id: agent_id || null,
      key,
      limit_cents: Math.floor(limit_cents),
      period: typeof period === 'string' && period ? period : 'monthly',
      updated_at: new Date().toISOString(),
    };
    if (reset_spent === true) row.spent_cents = 0;

    const { data, error } = await supabase!
      .from('budgets')
      .upsert(row, { onConflict: 'org_id,agent_id,key' })
      .select()
      .single();
    if (error) {
      if (isTableMissing(error)) {
        return res.status(503).json({ error: 'Budgets unavailable — run migration 031_shield_predicates_budgets.sql' });
      }
      throw error;
    }
    res.status(201).json(data);
  } catch (err: unknown) { safeError(res, err); }
});

// ── Delete Budget ──
router.delete(`/api/${V}/compliance/shield/budgets/:id`, authenticate, requireMinRole('admin'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { error } = await supabase!
      .from('budgets')
      .delete()
      .eq('id', req.params.id)
      .eq('org_id', req.org.id);
    if (error) {
      if (isTableMissing(error)) return res.status(404).json({ error: 'Budget not found' });
      throw error;
    }
    res.json({ success: true });
  } catch (err: unknown) { safeError(res, err); }
});

// ── List Pending Approvals (Dashboard feed) ──
router.get(`/api/${V}/compliance/shield/approvals`, authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const statusFilter = req.query.status as string; // Optional filter (e.g. PENDING)
    let query = supabase!
      .from('pending_approvals')
      .select('*')
      .eq('org_id', req.org.id);

    if (statusFilter) {
      query = query.eq('status', statusFilter);
    }

    const { data, error } = await query.order('created_at', { ascending: false }).limit(100);
    if (error) throw error;

    res.json(data || []);
  } catch (err: unknown) {
    safeError(res, err);
  }
});


export default router;
