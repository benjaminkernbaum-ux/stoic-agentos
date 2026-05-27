/**
 * Stoic AgentOS — Memory API Routes
 * Three-Tier Memory Architecture (Hindsight Pattern)
 *
 * Tier 1: Working Memory  — per-session mutable JSONB
 * Tier 2: Episodic Memory — time-series events
 * Tier 3: Semantic Memory — knowledge triplets
 *
 * Plus: Hybrid recall + Reflection-as-a-Service
 */
import { Router } from 'express';
import type { Response } from 'express';
import { authenticate } from '../middleware/auth.js';
import { supabase } from '../middleware/db.js';
import type { AuthenticatedRequest } from '../types.js';
import { generateEmbedding } from '../lib/embeddings.js';
import { eventBus } from '../lib/eventBus.js';

const router = Router();
const API_VERSION = 'v1';

// ═══════════════════════════════════════════════════════
//  TIER 1: WORKING MEMORY (mutable per-session state)
// ═══════════════════════════════════════════════════════

// ── Store/Update Working Memory ──
router.post(`/api/${API_VERSION}/memory/working`, authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { agent_id, session_id, key, value, expires_in_seconds } = req.body;
    if (!session_id || !key) {
      return res.status(400).json({ error: 'session_id and key are required' });
    }

    const expires_at = expires_in_seconds
      ? new Date(Date.now() + expires_in_seconds * 1000).toISOString()
      : null;

    const { data, error } = await supabase!
      .from('working_memory')
      .upsert({
        org_id: req.org.id,
        agent_id: agent_id || null,
        session_id,
        key,
        value: value ?? {},
        expires_at,
      }, { onConflict: 'org_id,agent_id,session_id,key' })
      .select()
      .single();

    if (error) throw error;
    eventBus.emit('memory.working.set', req.org.id, { session_id, key, agent_id });
    res.status(201).json(data);
  } catch (err: unknown) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// ── Get Working Memory ──
router.get(`/api/${API_VERSION}/memory/working`, authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { session_id, agent_id, key } = req.query;
    if (!session_id) {
      return res.status(400).json({ error: 'session_id is required' });
    }

    let query = supabase!
      .from('working_memory')
      .select('*')
      .eq('org_id', req.org.id)
      .eq('session_id', session_id as string);

    if (agent_id) query = query.eq('agent_id', agent_id as string);
    if (key) query = query.eq('key', key as string);

    // Filter out expired entries
    query = query.or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`);

    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) throw error;
    res.json(data || []);
  } catch (err: unknown) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// ── Clear Working Memory ──
router.delete(`/api/${API_VERSION}/memory/working`, authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { session_id, agent_id } = req.query;
    if (!session_id) {
      return res.status(400).json({ error: 'session_id is required' });
    }

    let query = supabase!
      .from('working_memory')
      .delete()
      .eq('org_id', req.org.id)
      .eq('session_id', session_id as string);

    if (agent_id) query = query.eq('agent_id', agent_id as string);

    const { error } = await query;
    if (error) throw error;
    res.json({ success: true });
  } catch (err: unknown) {
    res.status(500).json({ error: (err as Error).message });
  }
});


// ═══════════════════════════════════════════════════════
//  TIER 2: EPISODIC MEMORY (time-series events)
// ═══════════════════════════════════════════════════════

// ── Store Episodic Memory ──
router.post(`/api/${API_VERSION}/memory/episodic`, authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { agent_id, content, event_type, importance, metadata, valid_from, valid_to } = req.body;
    if (!content) {
      return res.status(400).json({ error: 'content is required' });
    }

    // Generate embedding for semantic search
    let embedding: number[] | null = null;
    try {
      embedding = await generateEmbedding(content, {
        provider: process.env.EMBEDDING_PROVIDER || 'hash',
        apiKey: process.env.OPENAI_API_KEY,
      });
    } catch (embErr) {
      console.warn('[Memory] Embedding generation failed (non-fatal):', (embErr as Error).message);
    }

    const insertData: Record<string, unknown> = {
      org_id: req.org.id,
      agent_id: agent_id || null,
      content,
      event_type: event_type || 'observation',
      importance: Math.min(10, Math.max(1, importance || 5)),
      metadata: metadata || {},
      valid_from: valid_from || new Date().toISOString(),
      valid_to: valid_to || null,
    };

    // Only include embedding if generated
    if (embedding) {
      insertData.embedding = JSON.stringify(embedding);
    }

    const { data, error } = await supabase!
      .from('episodic_memory')
      .insert(insertData)
      .select()
      .single();

    if (error) throw error;
    eventBus.emit('memory.episode.created', req.org.id, { id: data.id, event_type: data.event_type, importance: data.importance });
    res.status(201).json(data);
  } catch (err: unknown) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// ── List Episodic Memory ──
router.get(`/api/${API_VERSION}/memory/episodic`, authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { agent_id, event_type, limit = '50', offset = '0', since, until } = req.query;

    let query = supabase!
      .from('episodic_memory')
      .select('*')
      .eq('org_id', req.org.id)
      .order('created_at', { ascending: false })
      .range(+(offset as string), +(offset as string) + +(limit as string) - 1);

    if (agent_id) query = query.eq('agent_id', agent_id as string);
    if (event_type) query = query.eq('event_type', event_type as string);
    if (since) query = query.gte('valid_from', since as string);
    if (until) query = query.lte('valid_from', until as string);

    const { data, error } = await query;
    if (error) throw error;
    res.json(data || []);
  } catch (err: unknown) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// ── Invalidate Episodic Memory (set valid_to) ──
router.patch(`/api/${API_VERSION}/memory/episodic/:id/invalidate`, authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { data, error } = await supabase!
      .from('episodic_memory')
      .update({ valid_to: new Date().toISOString() })
      .eq('id', req.params.id)
      .eq('org_id', req.org.id)
      .select()
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Not found' });
    res.json(data);
  } catch (err: unknown) {
    res.status(500).json({ error: (err as Error).message });
  }
});


// ═══════════════════════════════════════════════════════
//  TIER 3: SEMANTIC MEMORY (knowledge triplets)
// ═══════════════════════════════════════════════════════

// ── Store Semantic Triple ──
router.post(`/api/${API_VERSION}/memory/semantic`, authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { subject, relation, object, confidence, source_type, source_episodes } = req.body;
    if (!subject || !relation || !object) {
      return res.status(400).json({ error: 'subject, relation, and object are required' });
    }

    // Upsert: if same triple exists, update confidence
    const { data: existing } = await supabase!
      .from('semantic_memory')
      .select('id, confidence')
      .eq('org_id', req.org.id)
      .eq('subject', subject)
      .eq('relation', relation)
      .eq('object', object)
      .single();

    if (existing) {
      // Strengthen or update existing triple
      const newConfidence = Math.min(1.0, (existing.confidence || 0.5) + 0.1);
      const { data, error } = await supabase!
        .from('semantic_memory')
        .update({
          confidence: confidence ?? newConfidence,
          updated_at: new Date().toISOString(),
          source_episodes: source_episodes || [],
        })
        .eq('id', existing.id)
        .select()
        .single();
      if (error) throw error;
      return res.json({ ...data, action: 'strengthened' });
    }

    const { data, error } = await supabase!
      .from('semantic_memory')
      .insert({
        org_id: req.org.id,
        subject,
        relation,
        object,
        confidence: confidence ?? 0.7,
        source_type: source_type || 'observation',
        source_episodes: source_episodes || [],
      })
      .select()
      .single();

    if (error) throw error;
    res.status(201).json({ ...data, action: 'created' });
  } catch (err: unknown) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// ── Query Semantic Memory ──
router.get(`/api/${API_VERSION}/memory/semantic`, authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { subject, relation, object, min_confidence = '0.0', limit = '50' } = req.query;

    let query = supabase!
      .from('semantic_memory')
      .select('*')
      .eq('org_id', req.org.id)
      .gte('confidence', +(min_confidence as string))
      .order('confidence', { ascending: false })
      .limit(+(limit as string));

    if (subject) query = query.ilike('subject', `%${subject as string}%`);
    if (relation) query = query.eq('relation', relation as string);
    if (object) query = query.ilike('object', `%${object as string}%`);

    const { data, error } = await query;
    if (error) throw error;
    res.json(data || []);
  } catch (err: unknown) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// ── Delete Semantic Triple ──
router.delete(`/api/${API_VERSION}/memory/semantic/:id`, authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { error } = await supabase!
      .from('semantic_memory')
      .delete()
      .eq('id', req.params.id)
      .eq('org_id', req.org.id);
    if (error) throw error;
    res.json({ success: true });
  } catch (err: unknown) {
    res.status(500).json({ error: (err as Error).message });
  }
});


// ═══════════════════════════════════════════════════════
//  HYBRID RECALL — fused retrieval across all tiers
// ═══════════════════════════════════════════════════════

router.post(`/api/${API_VERSION}/memory/recall`, authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const {
      query: searchQuery,
      agent_id,
      session_id,
      mode = 'standard',          // quick | standard | deep
      temporal_window,             // e.g. '7d', '24h', '30d'
      max_results = 20,
    } = req.body;

    if (!searchQuery) {
      return res.status(400).json({ error: 'query is required' });
    }

    const results: {
      working: unknown[];
      episodic: unknown[];
      semantic: unknown[];
      total: number;
    } = { working: [], episodic: [], semantic: [], total: 0 };

    // Calculate temporal boundary
    let temporalBoundary: string | null = null;
    if (temporal_window) {
      const match = (temporal_window as string).match(/^(\d+)(h|d|w|m)$/);
      if (match) {
        const [, num, unit] = match;
        const ms = { h: 3600000, d: 86400000, w: 604800000, m: 2592000000 }[unit] || 86400000;
        temporalBoundary = new Date(Date.now() - parseInt(num) * ms).toISOString();
      }
    }

    // ── Quick Mode (~1.5K tokens): working memory + semantic only ──
    if (mode === 'quick' || mode === 'standard' || mode === 'deep') {
      // Working memory (session context)
      if (session_id) {
        let wQuery = supabase!
          .from('working_memory')
          .select('key, value, created_at')
          .eq('org_id', req.org.id)
          .eq('session_id', session_id as string)
          .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`);
        if (agent_id) wQuery = wQuery.eq('agent_id', agent_id as string);

        const { data: wData } = await wQuery.limit(10);
        results.working = wData || [];
      }

      // Semantic memory (keyword search on triples)
      let sQuery = supabase!
        .from('semantic_memory')
        .select('subject, relation, object, confidence, source_type')
        .eq('org_id', req.org.id)
        .gte('confidence', 0.5)
        .or(`subject.ilike.%${searchQuery}%,object.ilike.%${searchQuery}%`);

      const { data: sData } = await sQuery
        .order('confidence', { ascending: false })
        .limit(mode === 'quick' ? 5 : 15);
      results.semantic = sData || [];
    }

    // ── Standard Mode (~3K tokens): + episodic ──
    if (mode === 'standard' || mode === 'deep') {
      let eQuery = supabase!
        .from('episodic_memory')
        .select('content, event_type, importance, valid_from, valid_to, metadata, created_at')
        .eq('org_id', req.org.id)
        .or('valid_to.is.null,valid_to.gt.' + new Date().toISOString())  // only currently valid
        .ilike('content', `%${searchQuery}%`);

      if (agent_id) eQuery = eQuery.eq('agent_id', agent_id as string);
      if (temporalBoundary) eQuery = eQuery.gte('valid_from', temporalBoundary);

      const { data: eData } = await eQuery
        .order('importance', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(mode === 'standard' ? 10 : 30);
      results.episodic = eData || [];
    }

    // ── Deep Mode (~8K+ tokens): full scan with broader matching ──
    if (mode === 'deep') {
      // Broaden semantic search
      const words = searchQuery.split(/\s+/).filter((w: string) => w.length > 3);
      for (const word of words.slice(0, 3)) {
        const { data: extraSemantic } = await supabase!
          .from('semantic_memory')
          .select('subject, relation, object, confidence')
          .eq('org_id', req.org.id)
          .or(`subject.ilike.%${word}%,object.ilike.%${word}%,relation.ilike.%${word}%`)
          .limit(5);
        if (extraSemantic) {
          const existingIds = new Set((results.semantic as Array<{ subject: string; relation: string; object: string }>)
            .map(s => `${s.subject}:${s.relation}:${s.object}`));
          for (const item of extraSemantic) {
            if (!existingIds.has(`${item.subject}:${item.relation}:${item.object}`)) {
              results.semantic.push(item);
            }
          }
        }
      }
    }

    results.total = results.working.length + results.episodic.length + results.semantic.length;

    res.json({
      mode,
      query: searchQuery,
      temporal_window: temporal_window || null,
      ...results,
    });
  } catch (err: unknown) {
    res.status(500).json({ error: (err as Error).message });
  }
});


// ═══════════════════════════════════════════════════════
//  MEMORY STATS — dashboard metrics
// ═══════════════════════════════════════════════════════

router.get(`/api/${API_VERSION}/memory/stats`, authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const [working, episodic, semantic] = await Promise.all([
      supabase!.from('working_memory').select('*', { count: 'exact', head: true }).eq('org_id', req.org.id),
      supabase!.from('episodic_memory').select('*', { count: 'exact', head: true }).eq('org_id', req.org.id),
      supabase!.from('semantic_memory').select('*', { count: 'exact', head: true }).eq('org_id', req.org.id),
    ]);

    res.json({
      working_memory: { count: working.count || 0 },
      episodic_memory: { count: episodic.count || 0 },
      semantic_memory: { count: semantic.count || 0 },
      total: (working.count || 0) + (episodic.count || 0) + (semantic.count || 0),
    });
  } catch (err: unknown) {
    res.status(500).json({ error: (err as Error).message });
  }
});

export default router;
