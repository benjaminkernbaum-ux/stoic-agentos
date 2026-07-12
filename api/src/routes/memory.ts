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
import { requireMinRole } from '../middleware/rbac.js';
import { supabase } from '../middleware/db.js';
import type { AuthenticatedRequest } from '../types.js';
import { isTableMissing } from '../lib/utils.js';
import { safeError } from '../lib/safeError.js';
import { getEmbedding } from '../lib/embeddings.js';
import { recordVectorRetrieval, getVectorRetrievalStats } from '../lib/metrics.js';

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
    safeError(res, err);
  }
});

// ── VECTOR STATS (step-4 instrumentation) ──
//    Reports hot-vector count (per-org + table-wide) and vector-retrieval
//    latency percentiles so we can see when time-range partitioning on
//    valid_from is justified (~10-20M hot vectors). Partitioning itself is
//    deferred — see migration 022 for the plan and pgvectorscale escalation.
router.get(`/api/${V}/memory/vector-stats`, authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    // Per-org hot-vector count (rows actually occupying the HNSW index)
    let hot_vector_count = 0;
    try {
      const { count, error } = await supabase!
        .from('episodic_memory')
        .select('*', { count: 'exact', head: true })
        .eq('org_id', req.org.id)
        .not('embedding', 'is', null);
      if (!error) hot_vector_count = count ?? 0;
    } catch { /* table may not exist */ }

    // Table-wide hot-vector count — the partition decision is table-level,
    // not per-org. Uses the migration-022 SQL helper (global when p_org_id is null).
    let hot_vector_count_global: number | null = null;
    try {
      const { data, error } = await supabase!.rpc('episodic_hot_vector_count', { p_org_id: null });
      if (!error) hot_vector_count_global = (data as number) ?? null;
    } catch { /* migration 022 not deployed */ }

    res.json({
      hot_vector_count,
      hot_vector_count_global,
      retrieval_latency: getVectorRetrievalStats(),
      partition_revisit_threshold: 10_000_000, // ~10-20M hot vectors — see migration 022
      note: 'Time-range partitioning on valid_from is deferred until hot_vector_count_global approaches ~10-20M and/or p95 retrieval latency degrades. pgvectorscale (StreamingDiskANN) is the escalation path. See migration 022.',
    });
  } catch (err: unknown) {
    safeError(res, err);
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
  } catch (err: unknown) { safeError(res, err); }
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
  } catch (err: unknown) { safeError(res, err); }
});

router.delete(`/api/${V}/memory/working/:id`, authenticate, requireMinRole('admin'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { error } = await supabase!.from('working_memory').delete()
      .eq('id', req.params.id).eq('org_id', req.org.id);
    if (error) throw error;
    res.json({ success: true });
  } catch (err: unknown) { safeError(res, err); }
});

// ══════════════════════════════════════
// TIER 2: EPISODIC MEMORY
// ══════════════════════════════════════

// ── GET Episodic Memory ──
router.get(`/api/${V}/memory/episodic`, authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { query: searchQuery, agent_id, event_type, min_importance, match_threshold = '0.3', limit = '50' } = req.query;

    // ── Try Semantic Vector Search if "query" parameter is present ──
    if (searchQuery) {
      const embedding = await getEmbedding(searchQuery as string);
      if (embedding) {
        const t0 = Date.now();
        const { data: matched, error: rpcErr } = await supabase!.rpc('match_episodic_memories', {
          p_org_id: req.org.id,
          p_query_embedding: embedding,
          p_match_threshold: parseFloat(match_threshold as string) || 0.3,
          p_match_count: parseInt(limit as string) || 5,
          p_agent_id: (agent_id as string) || null,
          p_event_type: (event_type as string) || null,
        });
        recordVectorRetrieval(Date.now() - t0); // step-4 retrieval-latency hook

        if (!rpcErr && matched) {
          return res.json(matched);
        }

        if (rpcErr) {
          console.warn('[memory] RPC match_episodic_memories failed or not deployed, falling back to temporal query:', rpcErr.message);
        }
      }
    }

    // ── Fallback: Temporal & Filtered Search ──
    let query = supabase!.from('episodic_memory').select('*')
      .eq('org_id', req.org.id).order('valid_from', { ascending: false }).limit(parseInt(limit as string) || 50);
    if (agent_id) query = query.eq('agent_id', agent_id as string);
    if (event_type) query = query.eq('event_type', event_type as string);
    if (min_importance) query = query.gte('importance', +(min_importance as string));
    const { data, error } = await query;
    if (error) { if (isTableMissing(error)) return res.json([]); throw error; }
    res.json(data || []);
  } catch (err: unknown) { safeError(res, err); }
});

// ── POST Episodic Memory ──
router.post(`/api/${V}/memory/episodic`, authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { agent_id, content, event_type, importance, metadata } = req.body;
    if (!content) return res.status(400).json({ error: 'content required' });

    // Generate vector embedding for the content
    const embedding = await getEmbedding(content);

    const { data, error } = await supabase!.from('episodic_memory').insert({
      org_id: req.org.id,
      agent_id: agent_id || null,
      content,
      embedding: embedding || null,
      event_type: event_type || 'observation',
      importance: importance ?? 5,
      metadata: metadata || {},
    }).select().single();
    if (error) throw error;
    res.status(201).json(data);
  } catch (err: unknown) { safeError(res, err); }
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
  } catch (err: unknown) { safeError(res, err); }
});

// ══════════════════════════════════════
// TIER 3: SEMANTIC MEMORY
// ══════════════════════════════════════

router.get(`/api/${V}/memory/semantic`, authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    let query = supabase!.from('semantic_memory').select('*')
      .eq('org_id', req.org.id).order('confidence', { ascending: false }).limit(100);
    if (req.query.subject) {
      const safeSub = (req.query.subject as string).replace(/[%_]/g, '');
      query = query.ilike('subject', `%${safeSub}%`);
    }
    if (req.query.relation) query = query.eq('relation', req.query.relation as string);
    const { data, error } = await query;
    if (error) { if (isTableMissing(error)) return res.json([]); throw error; }
    res.json(data || []);
  } catch (err: unknown) { safeError(res, err); }
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
  } catch (err: unknown) { safeError(res, err); }
});

router.delete(`/api/${V}/memory/semantic/:id`, authenticate, requireMinRole('admin'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { error } = await supabase!.from('semantic_memory').delete()
      .eq('id', req.params.id).eq('org_id', req.org.id);
    if (error) throw error;
    res.json({ success: true });
  } catch (err: unknown) { safeError(res, err); }
});

export default router;
