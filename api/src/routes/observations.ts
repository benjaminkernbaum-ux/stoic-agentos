import { Router } from 'express';
import type { Response } from 'express';
import { authenticate } from '../middleware/auth.js';
import { requireMinRole } from '../middleware/rbac.js';
import { supabase, checkLimit, PLAN_LIMITS } from '../middleware/db.js';
import type { AuthenticatedRequest } from '../types.js';
import { safeError } from '../lib/safeError.js';
import { validate, observationCreateSchema, observationBatchSchema } from '../middleware/validate.js';
import { getMonthlyCount, incrementCounter } from '../lib/counterCache.js';

const router = Router();
const API_VERSION = 'v1';

// Sanitize a tags array: strings only, trimmed, non-empty, ≤20 chars, ≤5 items, deduped.
function sanitizeTags(input: unknown): string[] {
  if (!Array.isArray(input)) return [];
  const seen = new Set<string>();
  for (const raw of input) {
    if (typeof raw !== 'string') continue;
    const tag = raw.trim().slice(0, 20);
    if (tag) seen.add(tag);
    if (seen.size >= 5) break;
  }
  return Array.from(seen);
}

// Flipped to false once we detect migration 020 hasn't run; subsequent inserts skip tags
// to avoid a PG error per call. Re-probed on server restart.
let tagsColumnAvailable = true;
const PG_UNDEFINED_COLUMN = '42703';

// ── Create Observation ──
router.post(`/api/${API_VERSION}/observations`, authenticate, validate(observationCreateSchema), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { workspace, agent, type, title, content, metadata, tags } = req.body;
    if (!type || !title) return res.status(400).json({ error: 'type and title required' });

    // Check observation limit (cached — avoids COUNT(*) per request)
    const monthlyCount = await getMonthlyCount(supabase!, req.org.id, 'observations');
    if (monthlyCount >= 0 && !checkLimit(req.org.plan, 'observations', monthlyCount)) {
      return res.status(429).json({
        error: 'Observation limit reached',
        limit: PLAN_LIMITS[req.org.plan]?.observations,
        current: monthlyCount,
        upgrade_url: '/pricing',
      });
    }

    const sanitizedTags = sanitizeTags(tags);
    const baseRow: Record<string, unknown> = {
      org_id: req.org.id,
      workspace_id: workspace || null,
      agent_id: agent || null,
      type: type || 'note',
      title,
      content: content || '',
      metadata: metadata || {},
      importance: type === 'architecture' ? 9 : type === 'decision' ? 8 : type === 'error' ? 7 : 6,
    };
    const row = tagsColumnAvailable ? { ...baseRow, tags: sanitizedTags } : baseRow;

    let { data, error } = await supabase!
      .from('observations')
      .insert(row)
      .select()
      .single();

    // Migration 020 not yet applied — degrade gracefully and stop sending `tags`.
    if (error && (error as { code?: string }).code === PG_UNDEFINED_COLUMN && tagsColumnAvailable) {
      console.warn('⚠️  observations.tags column missing — run migration 020_observation_tags.sql to enable tags');
      tagsColumnAvailable = false;
      const retry = await supabase!.from('observations').insert(baseRow).select().single();
      data = retry.data;
      error = retry.error;
    }

    if (error) throw error;

    // ── Auto-Memory Engine (Mem0-style) ──
    // Extract entities from high-importance observations and auto-create knowledge items
    const AUTO_MEMORY_TYPES = ['architecture', 'decision', 'error', 'deployment', 'discovery'];
    if (AUTO_MEMORY_TYPES.includes(type) && data) {
      try {
        // Extract entity name from title (simple heuristic — Pro tier uses LLM)
        const entityName = title
          .replace(/^(Switched|Migrated|Deployed|Found|Fixed|Updated|Added|Removed)\s+/i, '')
          .replace(/\s+(to|from|in|on|at|for|with)\s+.+$/i, '')
          .trim()
          .slice(0, 80);

        // Escape LIKE wildcards to prevent injection via observation titles
        const safeEntityName = entityName.slice(0, 30).replace(/[%_\\]/g, '\\$&');

        // Check if entity already exists
        const { data: existing } = await supabase!
          .from('knowledge_items')
          .select('id, content')
          .eq('org_id', req.org.id)
          .ilike('name', `%${safeEntityName}%`)
          .limit(1)
          .single();

        if (existing) {
          // Append to existing knowledge item
          const updated = `${existing.content}\n\n---\n**[${new Date().toISOString().slice(0, 10)}]** ${title}\n${content || ''}`.slice(0, 5000);
          await supabase!
            .from('knowledge_items')
            .update({ content: updated, updated_at: new Date().toISOString() })
            .eq('id', existing.id);
        } else {
          // Check knowledge item limit
          const { count: kiCount } = await supabase!
            .from('knowledge_items')
            .select('*', { count: 'exact', head: true })
            .eq('org_id', req.org.id);

          if (checkLimit(req.org.plan, 'knowledge_items', kiCount || 0)) {
            await supabase!.from('knowledge_items').insert({
              org_id: req.org.id,
              name: entityName,
              summary: `Auto-extracted from ${type}: ${title.slice(0, 100)}`,
              content: `**Source:** ${type}\n**Date:** ${new Date().toISOString().slice(0, 10)}\n\n${content || title}`,
            });
            console.log(`🧠 Auto-memory: created "${entityName}" from ${type}`);
          }
        }
      } catch (memErr: unknown) {
        // Non-critical — don't fail the observation
        console.error('Auto-memory error (non-fatal):', (memErr as Error).message);
      }
    }

    // Bump cached counter
    incrementCounter(req.org.id, 'observations');

    res.status(201).json(data);
  } catch (err: unknown) {
    safeError(res, err);
  }
});

// ── Batch Create Observations ──
// Accepts up to 100 observations in a single API call.
// Reduces SDK HTTP round-trips by 10x.
router.post(`/api/${API_VERSION}/observations/batch`, authenticate, validate(observationBatchSchema), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { observations } = req.body;
    if (!Array.isArray(observations) || observations.length === 0) {
      return res.status(400).json({ error: 'observations array is required and must not be empty' });
    }
    if (observations.length > 100) {
      return res.status(400).json({ error: 'Maximum 100 observations per batch' });
    }

    // Check observation limit (cached — single check for entire batch)
    const monthlyCount = await getMonthlyCount(supabase!, req.org.id, 'observations');
    if (monthlyCount >= 0 && !checkLimit(req.org.plan, 'observations', monthlyCount + observations.length - 1)) {
      return res.status(429).json({
        error: 'Observation limit would be exceeded',
        limit: PLAN_LIMITS[req.org.plan]?.observations,
        current: monthlyCount,
        batch_size: observations.length,
        upgrade_url: '/pricing',
      });
    }

    // Build rows for batch insert
    const VALID_TYPES = ['file_edit', 'command', 'decision', 'error', 'discovery', 'architecture', 'dependency', 'config', 'deployment', 'note', 'agent_run'];
    const buildRow = (obs: Record<string, unknown>, includeTags: boolean) => {
      const type = (obs.type as string) || 'note';
      const base: Record<string, unknown> = {
        org_id: req.org.id,
        workspace_id: (obs.workspace as string) || null,
        agent_id: (obs.agent as string) || null,
        type: VALID_TYPES.includes(type) ? type : 'note',
        title: (obs.title as string) || 'Untitled',
        content: (obs.content as string) || '',
        metadata: (obs.metadata as Record<string, unknown>) || {},
        importance: type === 'architecture' ? 9 : type === 'decision' ? 8 : type === 'error' ? 7 : 6,
      };
      return includeTags ? { ...base, tags: sanitizeTags(obs.tags) } : base;
    };

    // Single batch insert (not N individual inserts)
    let { data, error } = await supabase!
      .from('observations')
      .insert(observations.map((o: Record<string, unknown>) => buildRow(o, tagsColumnAvailable)))
      .select();

    if (error && (error as { code?: string }).code === PG_UNDEFINED_COLUMN && tagsColumnAvailable) {
      console.warn('⚠️  observations.tags column missing — run migration 020_observation_tags.sql to enable tags');
      tagsColumnAvailable = false;
      const retry = await supabase!
        .from('observations')
        .insert(observations.map((o: Record<string, unknown>) => buildRow(o, false)))
        .select();
      data = retry.data;
      error = retry.error;
    }

    if (error) throw error;

    // Bump cached counter by batch size
    incrementCounter(req.org.id, 'observations', observations.length);

    console.log(`📋 Batch observation: ${observations.length} items for org ${req.org.id}`);
    res.status(201).json({
      inserted: data?.length ?? 0,
      observations: data || [],
    });
  } catch (err: unknown) {
    safeError(res, err);
  }
});

// ── List Observations ──
router.get(`/api/${API_VERSION}/observations`, authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { limit = 50, offset = 0, type, workspace, agent } = req.query;
    let query = supabase!
      .from('observations')
      .select('*')
      .eq('org_id', req.org.id)
      .order('created_at', { ascending: false })
      .range(+(offset as string), +(offset as string) + +(limit as string) - 1);

    if (type) query = query.eq('type', type as string);
    if (workspace) query = query.eq('workspace_id', workspace as string);
    if (agent) query = query.eq('agent_id', agent as string);

    const { data, error } = await query;
    if (error) throw error;
    res.json(data || []);
  } catch (err: unknown) {
    safeError(res, err);
  }
});

// ── Delete Observation ──
router.delete(`/api/${API_VERSION}/observations/:id`, authenticate, requireMinRole('admin'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { error } = await supabase!
      .from('observations')
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
