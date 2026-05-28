/**
 * Three-Tier Memory Routes
 *
 * Working Memory  — ephemeral, session-scoped key-value store
 * Episodic Memory — time-series events with importance scoring
 * Semantic Memory — persistent knowledge triplets (subject->relation->object)
 */

import { Router } from 'express';
import type { Response } from 'express';
import { authenticate } from '../middleware/auth.js';
import { supabase } from '../middleware/db.js';
import type { AuthenticatedRequest } from '../types.js';
import { isTableMissing } from '../lib/utils.js';

const router = Router();
const V = 'v1';


// ── MEMORY STATS ──
router.get(`/api/${V}/memory/stats`, authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const counts: Record<string, number> = { working: 0, episodic: 0, semantic: 0 };
    for (const table of ['working_memory', 'episodic_memory', 'semantic_memory']) {
      const key = table.replace('_memory', '');
      try {
        const { count, error } = await supabase!
          .from(table)
          .select('*', { count: 'exact', head: true })
          .eq('org_id', req.org.id);
        if (!error) counts[key] = count ?? 0;
      } catch { /* table may not exist */ }
    }
    res.json(counts);
  } catch (err: unknown) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// ══════════════════════════════════════
// TIER 1: WORKING MEMORY
// ══════════════════════════════════════

router.get(`/api/${V}/memory/working`, authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    let query = supabase!
      .from('working_memory')
      .select('*')
      .eq('org_id', req.org.id)
      .order('created_at', { ascending: false })
      .limit(100);
    if (req.query.agent_id) query = query.eq('agent_id', req.query.agent_id as string);
    if (req.query.session_id) query = query.eq('session_id', req.query.session_id as string);
    const { data, error } = await query;
    if (error) { if (isTableMissing(error)) return res.json([]); throw error; }
    res.json(data || []);
  } catch (err: unknown) { res.status(500).json({ error: (err as Error).message }); }
});

router.post(`/api/${V}/memory/working`, authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { agent_id, session_id, key, value, ttl_seconds } = req.body;
    if (!session_id || !key) return res.status(400).json({ error: 'session_id and key required' });
    const row: Record<string, unknown> = {
      org_id: req.org.id, agent_id: agent_id || null, session_id, key, value: value ?? {},
    };
    if (ttl_seconds) row.expires_at = new Date(Date.now() + ttl_seconds * 1000).toISOString();
    const { data, error } = await supabase!
      .from('working_memory')
      .upsert(row, { onConflict: 'org_id,agent_id,session_id,key' })
      .select().single();
    if (error) throw error;
    res.status(201).json(data);
  } catch (err: unknown) { res.status(500).json({ error: (err as Error).message }); }
});

router.delete(`/api/${V}/memory/working/:id`, authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { error } = await supabase!.from('working_memory').delete()
      .eq('id', req.params.id).eq('org_id', req.org.id);
    if (error) throw error;
    res.json({ success: true });
  } catch (err: unknown) { res.status(500).json({ error: (err as Error).message }); }
});

// ══════════════════════════════════════
// TIER 2: EPISODIC MEMORY
// ══════════════════════════════════════

router.get(`/api/${V}/memory/episodic`, authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    let query = supabase!.from('episodic_memory').select('*')
      .eq('org_id', req.org.id).order('valid_from', { ascending: false }).limit(50);
    if (req.query.agent_id) query = query.eq('agent_id', req.query.agent_id as string);
    if (req.query.event_type) query = query.eq('event_type', req.query.event_type as string);
    if (req.query.min_importance) query = query.gte('importance', +(req.query.min_importance as string));
    const { data, error } = await query;
    if (error) { if (isTableMissing(error)) return res.json([]); throw error; }
    res.json(data || []);
  } catch (err: unknown) { res.status(500).json({ error: (err as Error).message }); }
});

router.post(`/api/${V}/memory/episodic`, authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { agent_id, content, event_type, importance, metadata } = req.body;
    if (!content) return res.status(400).json({ error: 'content required' });
    const { data, error } = await supabase!.from('episodic_memory').insert({
      org_id: req.org.id, agent_id: agent_id || null, content,
      event_type: event_type || 'observation', importance: importance ?? 5, metadata: metadata || {},
    }).select().single();
    if (error) throw error;
    res.status(201).json(data);
  } catch (err: unknown) { res.status(500).json({ error: (err as Error).message }); }
});

router.get(`/api/${V}/memory/episodic/timeline`, authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { data, error } = await supabase!.from('episodic_memory').select('*')
      .eq('org_id', req.org.id).order('valid_from', { ascending: false }).limit(200);
    if (error) { if (isTableMissing(error)) return res.json({ days: [] }); throw error; }
    const days: Record<string, Array<Record<string, unknown>>> = {};
    (data || []).forEach((m: Record<string, unknown>) => {
      const day = new Date(m.valid_from as string).toISOString().slice(0, 10);
      if (!days[day]) days[day] = [];
      days[day].push(m);
    });
    res.json({
      days: Object.entries(days).sort(([a], [b]) => b.localeCompare(a))
        .map(([date, memories]) => ({ date, memories, count: memories.length })),
    });
  } catch (err: unknown) { res.status(500).json({ error: (err as Error).message }); }
});

// ══════════════════════════════════════
// TIER 3: SEMANTIC MEMORY
// ══════════════════════════════════════

router.get(`/api/${V}/memory/semantic`, authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    let query = supabase!.from('semantic_memory').select('*')
      .eq('org_id', req.org.id).order('confidence', { ascending: false }).limit(100);
    if (req.query.subject) query = query.ilike('subject', `%${req.query.subject}%`);
    if (req.query.relation) query = query.eq('relation', req.query.relation as string);
    const { data, error } = await query;
    if (error) { if (isTableMissing(error)) return res.json([]); throw error; }
    res.json(data || []);
  } catch (err: unknown) { res.status(500).json({ error: (err as Error).message }); }
});

router.post(`/api/${V}/memory/semantic`, authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { subject, relation, object, confidence, source_type } = req.body;
    if (!subject || !relation || !object) return res.status(400).json({ error: 'subject, relation, and object required' });
    const { data, error } = await supabase!.from('semantic_memory').insert({
      org_id: req.org.id, subject, relation, object,
      confidence: confidence ?? 1.0, source_type: source_type || 'manual',
    }).select().single();
    if (error) throw error;
    res.status(201).json(data);
  } catch (err: unknown) { res.status(500).json({ error: (err as Error).message }); }
});

router.delete(`/api/${V}/memory/semantic/:id`, authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { error } = await supabase!.from('semantic_memory').delete()
      .eq('id', req.params.id).eq('org_id', req.org.id);
    if (error) throw error;
    res.json({ success: true });
  } catch (err: unknown) { res.status(500).json({ error: (err as Error).message }); }
});

export default router;
