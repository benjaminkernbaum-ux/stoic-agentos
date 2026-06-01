import { Router } from 'express';
import type { Response } from 'express';
import { authenticate } from '../middleware/auth.js';
import { supabase, checkLimit, PLAN_LIMITS } from '../middleware/db.js';
import type { AuthenticatedRequest } from '../types.js';

const router = Router();
const API_VERSION = 'v1';

// ── Create Observation ──
router.post(`/api/${API_VERSION}/observations`, authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { workspace, agent, type, title, content, metadata } = req.body;
    if (!type || !title) return res.status(400).json({ error: 'type and title required' });

    // Check observation limit
    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
    const { count } = await supabase!
      .from('observations')
      .select('*', { count: 'exact', head: true })
      .eq('org_id', req.org.id)
      .gte('created_at', monthStart);

    if (!checkLimit(req.org.plan, 'observations', count ?? 0)) {
      return res.status(429).json({
        error: 'Observation limit reached',
        limit: PLAN_LIMITS[req.org.plan]?.observations,
        current: count,
        upgrade_url: '/pricing',
      });
    }

    const { data, error } = await supabase!
      .from('observations')
      .insert({
        org_id: req.org.id,
        workspace_id: workspace || null,
        agent_id: agent || null,
        type: type || 'note',
        title,
        content: content || '',
        metadata: metadata || {},
        importance: type === 'architecture' ? 9 : type === 'decision' ? 8 : type === 'error' ? 7 : 6,
      })
      .select()
      .single();

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

    res.status(201).json(data);
  } catch (err: unknown) {
    res.status(500).json({ error: (err as Error).message });
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
    res.status(500).json({ error: (err as Error).message });
  }
});

// ── Delete Observation ──
router.delete(`/api/${API_VERSION}/observations/:id`, authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { error } = await supabase!
      .from('observations')
      .delete()
      .eq('id', req.params.id)
      .eq('org_id', req.org.id);
    if (error) throw error;
    res.json({ success: true });
  } catch (err: unknown) {
    res.status(500).json({ error: (err as Error).message });
  }
});

export default router;
