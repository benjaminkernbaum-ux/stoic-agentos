/**
 * GDPR Routes — Data Subject Rights (Art. 15-20)
 *
 * Provides data export (portability) and data deletion (erasure)
 * endpoints for GDPR compliance.
 *
 * - GET  /api/v1/gdpr/export         — Export all org data as JSON (Art. 15/20)
 * - DELETE /api/v1/gdpr/delete-org    — Delete entire org and all data (Art. 17)
 * - DELETE /api/v1/gdpr/delete-account — Delete personal user data (Art. 17)
 */

import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { authenticate } from '../middleware/auth.js';
import { requireMinRole } from '../middleware/rbac.js';
import { supabase } from '../middleware/db.js';
import { safeError } from '../lib/safeError.js';
import type { AuthenticatedRequest } from '../types.js';

const router = Router();
const V = 'v1';

// Simple in-memory rate limiter (per-IP)
function simpleRateLimit(windowMs: number, max: number, errorMsg: string) {
  const hits = new Map<string, { count: number; resetAt: number }>();
  return (req: Request, res: Response, next: NextFunction) => {
    const ip = req.ip || 'unknown';
    const now = Date.now();
    const entry = hits.get(ip);
    if (!entry || now > entry.resetAt) {
      hits.set(ip, { count: 1, resetAt: now + windowMs });
      return next();
    }
    if (entry.count >= max) {
      return res.status(429).json({ error: errorMsg });
    }
    entry.count++;
    next();
  };
}

const exportLimiter = simpleRateLimit(60 * 60 * 1000, 2, 'Export rate limit exceeded. Try again in 1 hour.');
const deletionLimiter = simpleRateLimit(60 * 60 * 1000, 1, 'Deletion rate limit exceeded. Try again in 1 hour.');

// ══════════════════════════════════════
// HELPER: safely query a table (returns [] if table doesn't exist)
// ══════════════════════════════════════
async function safeQuery(table: string, orgId: string, select = '*', limit = 10000) {
  try {
    const { data, error } = await supabase!
      .from(table)
      .select(select)
      .eq('org_id', orgId)
      .limit(limit);
    if (error) {
      // Table doesn't exist yet — graceful degradation
      if (error.message?.includes('does not exist') || error.code === '42P01') {
        return [];
      }
      throw error;
    }
    return data || [];
  } catch {
    return [];
  }
}

// ══════════════════════════════════════
// DATA EXPORT (Art. 15 / Art. 20)
// ══════════════════════════════════════

router.get(`/api/${V}/gdpr/export`, authenticate, requireMinRole('admin'), exportLimiter, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const orgId = req.org.id;

    // Fetch all data in parallel
    const [
      organization,
      members,
      agents,
      workspaces,
      observations,
      knowledgeItems,
      knowledgeEdges,
      traces,
      spans,
      alertRules,
      alertEvents,
      workingMemory,
      episodicMemory,
      semanticMemory,
      chatConversations,
      auditLog,
      usageMonthly,
      anthropicUsage,
    ] = await Promise.all([
      // Organization
      supabase!.from('organizations').select('*').eq('id', orgId).single().then(r => r.data),
      // Members (redact user IDs to just role info)
      safeQuery('org_members', orgId, 'role, joined_at'),
      // Core data
      safeQuery('agents', orgId),
      safeQuery('workspaces', orgId),
      safeQuery('observations', orgId),
      safeQuery('knowledge_items', orgId),
      safeQuery('knowledge_edges', orgId),
      safeQuery('traces', orgId),
      // Spans need to join through traces
      (async () => {
        const traceIds = (await safeQuery('traces', orgId, 'id')).map((t: any) => t.id);
        if (traceIds.length === 0) return [];
        const { data } = await supabase!.from('spans').select('*').in('trace_id', traceIds).limit(10000);
        return data || [];
      })(),
      safeQuery('alert_rules', orgId),
      safeQuery('alert_events', orgId),
      // Memory tiers
      safeQuery('working_memory', orgId),
      safeQuery('episodic_memory', orgId),
      safeQuery('semantic_memory', orgId),
      // Chat
      safeQuery('chat_conversations', orgId),
      // Compliance
      safeQuery('audit_log', orgId),
      // Usage
      safeQuery('usage_monthly', orgId),
      safeQuery('anthropic_usage', orgId),
    ]);

    // Fetch API keys (redact actual key values)
    const apiKeys = await safeQuery('api_keys', orgId, 'id, name, prefix, created_at, last_used_at, active');

    const exportData = {
      _meta: {
        exported_at: new Date().toISOString(),
        format: 'stoic-agentos-gdpr-export-v1',
        org_id: orgId,
        org_slug: organization?.slug || null,
        tables_included: 18,
        gdpr_articles: ['Art. 15 (Right of Access)', 'Art. 20 (Data Portability)'],
      },
      organization: organization ? {
        name: organization.name,
        slug: organization.slug,
        plan: organization.plan,
        created_at: organization.created_at,
        // Redact sensitive billing fields
        stripe_customer_id: organization.stripe_customer_id ? '[PRESENT]' : null,
        anthropic_key_configured: Boolean(organization.anthropic_key_last4),
      } : null,
      members,
      agents,
      workspaces,
      observations,
      knowledge_items: knowledgeItems,
      knowledge_edges: knowledgeEdges,
      traces,
      spans,
      alert_rules: alertRules,
      alert_events: alertEvents,
      memory: {
        working: workingMemory,
        episodic: episodicMemory,
        semantic: semanticMemory,
      },
      chat_conversations: chatConversations,
      api_keys: apiKeys,
      audit_log: auditLog,
      usage: {
        monthly: usageMonthly,
        anthropic: anthropicUsage,
      },
    };

    // Set download headers
    const filename = `stoic-agentos-export-${orgId.slice(0, 8)}-${new Date().toISOString().slice(0, 10)}.json`;
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.json(exportData);

  } catch (err: unknown) {
    safeError(res, err);
  }
});

// ══════════════════════════════════════
// ORG DELETION (Art. 17 — Right to Erasure)
// ══════════════════════════════════════

router.delete(`/api/${V}/gdpr/delete-org`, authenticate, requireMinRole('owner'), deletionLimiter, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const orgId = req.org.id;
    const { confirm, org_slug } = req.body;

    // Safety: require explicit double confirmation
    if (confirm !== 'DELETE MY DATA' || org_slug !== (req.org as any).slug) {
      return res.status(400).json({
        error: 'Confirmation required',
        hint: 'Send { "confirm": "DELETE MY DATA", "org_slug": "<your-org-slug>" }',
      });
    }

    // Log the deletion event BEFORE deleting (for compliance audit trail)
    try {
      await supabase!.from('audit_log').insert({
        org_id: orgId,
        event_type: 'gdpr_deletion',
        action: `GDPR Art. 17 org deletion requested by user ${req.user?.email || 'unknown'}`,
        verdict: 'PROCEED',
        reasoning: 'Data subject exercised right to erasure',
        policy_version: '2.0',
        metadata: { requested_at: new Date().toISOString(), user_email: req.user?.email },
      });
    } catch { /* audit table might not exist */ }

    const deleted: string[] = [];
    const errors: string[] = [];

    // Deletion order: leaf tables first, respecting FK constraints
    const deletionOrder = [
      // 1. Spans (FK → traces)
      'spans',
      // 2. Traces
      'traces',
      // 3. Alert events (FK → alert_rules)
      'alert_events',
      // 4. Alert rules
      'alert_rules',
      // 5. Memory tiers
      'working_memory',
      'episodic_memory',
      'semantic_memory',
      // 6. Chat
      'chat_conversations',
      // 7. Content tables
      'observations',
      'knowledge_edges',
      'knowledge_items',
      // 8. Usage
      'anthropic_usage',
      'usage_monthly',
      // 9. Keys & workspaces
      'api_keys',
      'workspaces',
    ];

    // Delete spans via trace_id (spans don't have org_id directly)
    try {
      const traceIds = (await safeQuery('traces', orgId, 'id')).map((t: any) => t.id);
      if (traceIds.length > 0) {
        await supabase!.from('spans').delete().in('trace_id', traceIds);
        deleted.push('spans');
      }
    } catch { errors.push('spans'); }

    // Delete remaining tables by org_id
    for (const table of deletionOrder.filter(t => t !== 'spans')) {
      try {
        const { error } = await supabase!.from(table).delete().eq('org_id', orgId);
        if (error && !error.message?.includes('does not exist')) {
          errors.push(table);
        } else {
          deleted.push(table);
        }
      } catch {
        errors.push(table);
      }
    }

    // Anonymize audit_log (immutable table — can't delete, but anonymize content)
    try {
      await supabase!.from('audit_log').update({
        agent_id: null,
        action: '[REDACTED — GDPR Art. 17]',
        reasoning: '[REDACTED]',
        metadata: {},
      }).eq('org_id', orgId);
      deleted.push('audit_log (anonymized)');
    } catch {
      errors.push('audit_log');
    }

    // Delete org members
    try {
      await supabase!.from('org_members').delete().eq('org_id', orgId);
      deleted.push('org_members');
    } catch { errors.push('org_members'); }

    // Finally delete the organization itself
    try {
      await supabase!.from('organizations').delete().eq('id', orgId);
      deleted.push('organizations');
    } catch { errors.push('organizations'); }

    // Delete Stripe subscription if exists (best-effort)
    // Note: Actual Stripe cancellation should be handled by billing logic

    res.json({
      deleted: true,
      gdpr_article: 'Art. 17 — Right to Erasure',
      tables_deleted: deleted,
      tables_anonymized: ['audit_log'],
      errors: errors.length > 0 ? errors : undefined,
      note: 'Your Supabase auth account remains active. Sign out and contact support to fully remove your auth record.',
    });

  } catch (err: unknown) {
    safeError(res, err);
  }
});

// ══════════════════════════════════════
// ACCOUNT DELETION (Art. 17 — Personal Data)
// ══════════════════════════════════════

router.delete(`/api/${V}/gdpr/delete-account`, authenticate, deletionLimiter, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const orgId = req.org.id;
    const { confirm } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'User ID not found in session' });
    }

    if (confirm !== 'DELETE MY ACCOUNT') {
      return res.status(400).json({
        error: 'Confirmation required',
        hint: 'Send { "confirm": "DELETE MY ACCOUNT" }',
      });
    }

    // Check if user is the sole owner
    const { data: members } = await supabase!
      .from('org_members')
      .select('user_id, role')
      .eq('org_id', orgId);

    const owners = (members || []).filter((m: any) => m.role === 'owner');
    const isSoleOwner = owners.length === 1 && (owners[0] as any).user_id === userId;

    if (isSoleOwner && (members || []).length > 1) {
      return res.status(409).json({
        error: 'You are the sole owner of an org with other members',
        hint: 'Transfer ownership to another member first, or delete the entire organization via DELETE /api/v1/gdpr/delete-org',
      });
    }

    const deleted: string[] = [];

    // Delete user's chat conversations
    try {
      await supabase!.from('chat_conversations').delete()
        .eq('org_id', orgId)
        .eq('user_id', userId);
      deleted.push('chat_conversations');
    } catch { /* table might not exist */ }

    // Remove from org_members
    try {
      await supabase!.from('org_members').delete()
        .eq('org_id', orgId)
        .eq('user_id', userId);
      deleted.push('org_members');
    } catch { /* non-critical */ }

    // If sole owner with no other members, cascade delete the org too
    if (isSoleOwner && (members || []).length === 1) {
      // Trigger full org deletion
      try {
        const tables = ['spans', 'traces', 'alert_events', 'alert_rules',
          'working_memory', 'episodic_memory', 'semantic_memory',
          'chat_conversations', 'observations', 'knowledge_edges',
          'knowledge_items', 'anthropic_usage', 'usage_monthly',
          'api_keys', 'workspaces'];

        // Delete spans via trace_id
        const traceIds = (await safeQuery('traces', orgId, 'id')).map((t: any) => t.id);
        if (traceIds.length > 0) {
          await supabase!.from('spans').delete().in('trace_id', traceIds);
        }

        for (const table of tables.filter(t => t !== 'spans')) {
          try {
            await supabase!.from(table).delete().eq('org_id', orgId);
            deleted.push(table);
          } catch { /* skip missing tables */ }
        }

        // Anonymize audit log
        try {
          await supabase!.from('audit_log').update({
            agent_id: null, action: '[REDACTED — GDPR Art. 17]',
            reasoning: '[REDACTED]', metadata: {},
          }).eq('org_id', orgId);
          deleted.push('audit_log (anonymized)');
        } catch { /* skip */ }

        // Delete org
        await supabase!.from('organizations').delete().eq('id', orgId);
        deleted.push('organizations');
      } catch { /* best effort */ }
    }

    res.json({
      deleted: true,
      gdpr_article: 'Art. 17 — Right to Erasure',
      tables_affected: deleted,
      note: 'Your Supabase auth account can be deleted by signing out. Contact privacy@stoicagentos.com for full auth record removal.',
    });

  } catch (err: unknown) {
    safeError(res, err);
  }
});

// ══════════════════════════════════════
// DATA RETENTION INFO
// ══════════════════════════════════════

router.get(`/api/${V}/gdpr/retention`, authenticate, async (_req: AuthenticatedRequest, res: Response) => {
  res.json({
    gdpr_article: 'Art. 13(2)(a) — Data Retention Periods',
    data_controller: {
      name: 'Stoic AgentOS',
      contact: 'privacy@stoicagentos.com',
    },
    retention_periods: {
      account_data: { period: 'Duration of account + 30 days', legal_basis: 'Contract performance (Art. 6(1)(b))' },
      traces_spans: { period: '90 days', legal_basis: 'Contract performance (Art. 6(1)(b))' },
      observations: { period: '6 months', legal_basis: 'Contract performance (Art. 6(1)(b))' },
      chat_conversations: { period: '6 months', legal_basis: 'Contract performance (Art. 6(1)(b))' },
      working_memory: { period: 'Auto-expires via TTL (configurable)', legal_basis: 'Contract performance (Art. 6(1)(b))' },
      episodic_memory: { period: '6 months', legal_basis: 'Contract performance (Art. 6(1)(b))' },
      semantic_memory: { period: '6 months', legal_basis: 'Contract performance (Art. 6(1)(b))' },
      audit_log: { period: '3 years', legal_basis: 'Legitimate interest — compliance & security (Art. 6(1)(f))' },
      billing_records: { period: '7 years', legal_basis: 'Legal obligation — tax law (Art. 6(1)(c))' },
      api_keys: { period: 'Until revoked + 30 days', legal_basis: 'Contract performance (Art. 6(1)(b))' },
    },
    your_rights: {
      export: 'GET /api/v1/gdpr/export',
      delete_account: 'DELETE /api/v1/gdpr/delete-account',
      delete_organization: 'DELETE /api/v1/gdpr/delete-org',
      retention_info: 'GET /api/v1/gdpr/retention',
      contact: 'privacy@stoicagentos.com',
    },
  });
});

export default router;
