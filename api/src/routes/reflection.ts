/**
 * Reflection Routes — AI-Powered Knowledge Extraction + Memory Decay
 *
 * POST /reflection/run   — Extract semantic triplets from episodic memories via Claude
 * POST /reflection/decay — Apply time-based memory decay across all tiers
 * GET  /reflection/status — Last reflection and decay timestamps
 */

import { Router } from 'express';
import type { Response } from 'express';
import { randomUUID } from 'node:crypto';
import { authenticate } from '../middleware/auth.js';
import { supabase } from '../middleware/db.js';
import { complete, hasAnthropic } from '../lib/anthropic.js';
import type { AuthenticatedRequest } from '../types.js';
import { isTableMissing } from '../lib/utils.js';
import { safeError } from '../lib/safeError.js';

const router = Router();
const V = 'v1';


// ── Reflection: episodic -> semantic extraction via Claude ──
router.post(`/api/${V}/reflection/run`, authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!hasAnthropic(req.org)) {
      return res.status(402).json({
        error: 'Reflection requires an Anthropic API key',
        hint: 'Set ANTHROPIC_API_KEY or configure your key in Settings',
      });
    }

    // Fetch recent episodic memories
    const { data: episodes, error: epErr } = await supabase!
      .from('episodic_memory')
      .select('id, content, event_type, importance, valid_from')
      .eq('org_id', req.org.id)
      .order('valid_from', { ascending: false })
      .limit(20);

    if (epErr) {
      if (isTableMissing(epErr)) return res.json({ triplets_extracted: 0, episodes_processed: 0, hint: 'Run migration 008 first' });
      throw epErr;
    }

    if (!episodes || episodes.length === 0) {
      return res.json({ triplets_extracted: 0, episodes_processed: 0, hint: 'No episodic memories to reflect on' });
    }

    // Build reflection prompt
    const episodeText = episodes.map((e, i) =>
      `[${i + 1}] (${e.event_type}, importance:${e.importance}) ${e.content}`
    ).join('\n');

    const result = await complete(req.org, {
      model: 'fast',
      system: `You extract structured knowledge from event logs. Given episodic memories, output JSON array of knowledge triplets. Each triplet: {"subject":"...", "relation":"...", "object":"...", "confidence": 0.0-1.0}. Relations should be verbs: "uses", "depends_on", "caused", "resolved", "monitors", "produces", "failed_at", "improved". Output ONLY valid JSON array, no markdown, no explanation.`,
      messages: [{ role: 'user', content: `Extract knowledge triplets from these ${episodes.length} episodic memories:\n\n${episodeText}` }],
      maxTokens: 2048,
      endpoint: 'reflection',
    });

    // Parse triplets from Claude response
    let triplets: Array<{ subject: string; relation: string; object: string; confidence?: number }> = [];
    try {
      const cleaned = result.text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      triplets = JSON.parse(cleaned);
      if (!Array.isArray(triplets)) triplets = [];
    } catch {
      return res.json({ triplets_extracted: 0, episodes_processed: episodes.length, parse_error: 'Claude response was not valid JSON', raw: result.text.slice(0, 300) });
    }

    // ── Batch insert triplets into semantic_memory ──
    // (Previously: N individual inserts in a loop — N+1 pattern)
    const validTriplets = triplets
      .filter(t => t.subject && t.relation && t.object)
      .map(t => ({
        org_id: req.org.id,
        subject: t.subject,
        relation: t.relation,
        object: t.object,
        confidence: t.confidence ?? 0.8,
        source_type: 'reflection',
        source_episodes: episodes.map(e => e.id),
      }));

    let inserted = 0;
    if (validTriplets.length > 0) {
      try {
        const { data: insertedData, error: insertErr } = await supabase!
          .from('semantic_memory')
          .insert(validTriplets)
          .select('id');
        if (!insertErr) {
          inserted = insertedData?.length ?? 0;
        } else {
          // If batch fails (e.g. constraint violation on some rows), fall back
          // to individual upserts so partial success is still captured.
          for (const t of validTriplets) {
            try {
              await supabase!.from('semantic_memory').insert(t);
              inserted++;
            } catch { /* duplicate or constraint — skip */ }
          }
        }
      } catch { /* semantic_memory may not exist */ }
    }

    // Log reflection in audit_log
    try {
      await supabase!.from('audit_log').insert({
        org_id: req.org.id,
        event_type: 'reflection',
        action: 'extract_semantic_triplets',
        reasoning: `Processed ${episodes.length} episodes, extracted ${inserted} triplets`,
        verdict: 'PROCEED',
        metadata: { episodes_processed: episodes.length, triplets_extracted: inserted },
      });
    } catch { /* audit_log may not exist */ }

    res.json({ triplets_extracted: inserted, episodes_processed: episodes.length, model: result.model });
  } catch (err: unknown) {
    const error = err as Error & { code?: string; status?: number };
    if (error.code === 'NO_ANTHROPIC_KEY') return res.status(402).json({ error: 'Anthropic API key not configured' });
    if (error.status === 401) return res.status(402).json({ error: 'Invalid Anthropic API key' });
    safeError(res, err);
  }
});

// ── Consolidation: fold aged + low-importance episodes into semantic ──
//    triples, then MOVE the raw rows into episodic_memory_archive.
//    Non-destructive: raw episodes preserved + restorable; triples carry
//    source_episodes[] provenance. Shrinks the hot halfvec HNSW index.
router.post(`/api/${V}/reflection/consolidate`, authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!hasAnthropic(req.org)) {
      return res.status(402).json({
        error: 'Consolidation requires an Anthropic API key',
        hint: 'Set ANTHROPIC_API_KEY or configure your key in Settings',
      });
    }

    // Env-configurable thresholds (v2: per-org consolidation_policy overrides these)
    const AGE_DAYS = parseInt(process.env.CONSOLIDATION_AGE_DAYS || '90', 10);
    const MAX_IMPORTANCE = parseInt(process.env.CONSOLIDATION_MAX_IMPORTANCE || '3', 10);
    const BATCH = parseInt(process.env.CONSOLIDATION_BATCH || '500', 10);
    const ageCutoff = new Date(Date.now() - AGE_DAYS * 24 * 60 * 60 * 1000).toISOString();

    // 1. Candidate select: aged AND low-importance AND active AND embedded.
    //    High-importance episodes stay hot regardless of age; recent ones stay
    //    hot regardless of importance. Oldest first, batch-capped.
    const { data: candidates, error: selErr } = await supabase!
      .from('episodic_memory')
      .select('id, agent_id, content, event_type, importance, valid_from')
      .eq('org_id', req.org.id)
      .is('valid_to', null)
      .lte('importance', MAX_IMPORTANCE)
      .lt('valid_from', ageCutoff)
      .not('embedding', 'is', null)
      .order('valid_from', { ascending: true })
      .limit(BATCH);

    if (selErr) {
      if (isTableMissing(selErr)) return res.json({ candidates: 0, archived: 0, triplets_extracted: 0, hint: 'Run migration 008 first' });
      throw selErr;
    }
    if (!candidates || candidates.length === 0) {
      return res.json({ candidates: 0, archived: 0, triplets_extracted: 0, hint: 'No episodes meet consolidation criteria (aged + low-importance)' });
    }

    const runId = randomUUID();

    // Hot-vector count before (step-4 instrumentation)
    const { count: hotBefore } = await supabase!.from('episodic_memory')
      .select('*', { count: 'exact', head: true })
      .eq('org_id', req.org.id).not('embedding', 'is', null);

    // 2. Group by agent_id + event_type for coherent extraction, then reuse the
    //    same Haiku triplet-extraction as /reflection/run per group.
    const groups = new Map<string, typeof candidates>();
    for (const e of candidates) {
      const key = `${e.agent_id ?? 'none'}::${e.event_type}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(e);
    }

    const allTriplets: Array<Record<string, unknown>> = [];
    for (const group of groups.values()) {
      const episodeText = group.map((e, i) =>
        `[${i + 1}] (${e.event_type}, importance:${e.importance}) ${e.content}`
      ).join('\n');

      const result = await complete(req.org, {
        model: 'fast',
        system: `You extract structured knowledge from event logs. Given episodic memories, output JSON array of knowledge triplets. Each triplet: {"subject":"...", "relation":"...", "object":"...", "confidence": 0.0-1.0}. Relations should be verbs: "uses", "depends_on", "caused", "resolved", "monitors", "produces", "failed_at", "improved". Output ONLY valid JSON array, no markdown, no explanation.`,
        messages: [{ role: 'user', content: `Extract knowledge triplets from these ${group.length} episodic memories:\n\n${episodeText}` }],
        maxTokens: 2048,
        endpoint: 'reflection',
      });

      try {
        const cleaned = result.text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        const parsed = JSON.parse(cleaned);
        if (Array.isArray(parsed)) {
          const groupIds = group.map(e => e.id);
          for (const t of parsed) {
            if (t.subject && t.relation && t.object) {
              allTriplets.push({
                org_id: req.org.id,
                subject: t.subject,
                relation: t.relation,
                object: t.object,
                confidence: t.confidence ?? 0.8,
                source_type: 'consolidation',
                source_episodes: groupIds,
              });
            }
          }
        }
      } catch { /* skip a group whose response wasn't valid JSON */ }
    }

    // 3. Batch-insert triplets into semantic_memory (source_type='consolidation')
    let triplets_extracted = 0;
    if (allTriplets.length > 0) {
      try {
        const { data: ins } = await supabase!.from('semantic_memory').insert(allTriplets).select('id');
        triplets_extracted = ins?.length ?? 0;
      } catch { /* semantic_memory may not exist */ }
    }

    // 4. Atomically move the raw rows to the archive (migration 021 RPC).
    //    If 021 hasn't been deployed, degrade: leave episodes in place —
    //    the extracted triplets still landed and the rows self-heal next run.
    let archived = 0;
    const { data: movedCount, error: moveErr } = await supabase!.rpc('consolidate_episodic_batch', {
      p_org_id: req.org.id,
      p_episode_ids: candidates.map(e => e.id),
      p_run_id: runId,
      p_reason: 'age_importance_consolidation',
    });
    if (moveErr) {
      console.warn('[consolidate] archive move failed (migration 021 not deployed?):', moveErr.message);
    } else {
      archived = (movedCount as number) ?? 0;
    }

    // Hot-vector count after (step-4 instrumentation)
    const { count: hotAfter } = await supabase!.from('episodic_memory')
      .select('*', { count: 'exact', head: true })
      .eq('org_id', req.org.id).not('embedding', 'is', null);

    // Audit trail (also the step-4 hot-vector-count report)
    try {
      await supabase!.from('audit_log').insert({
        org_id: req.org.id,
        event_type: 'consolidation',
        action: 'consolidate_episodic',
        reasoning: `Consolidated ${archived} episodes into ${triplets_extracted} triplets`,
        verdict: 'PROCEED',
        metadata: {
          candidates: candidates.length,
          archived,
          triplets_extracted,
          hot_vector_count_before: hotBefore ?? null,
          hot_vector_count_after: hotAfter ?? null,
          run_id: runId,
        },
      });
    } catch { /* audit_log may not exist */ }

    res.json({
      candidates: candidates.length,
      archived,
      triplets_extracted,
      hot_vector_count_before: hotBefore ?? null,
      hot_vector_count_after: hotAfter ?? null,
      run_id: runId,
      model: 'fast',
    });
  } catch (err: unknown) {
    const error = err as Error & { code?: string; status?: number };
    if (error.code === 'NO_ANTHROPIC_KEY') return res.status(402).json({ error: 'Anthropic API key not configured' });
    if (error.status === 401) return res.status(402).json({ error: 'Invalid Anthropic API key' });
    safeError(res, err);
  }
});

// ── Memory Decay (optimized — single UPDATE statements instead of N+1) ──
router.post(`/api/${V}/reflection/decay`, authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const results = { working_expired: 0, episodic_decayed: 0, semantic_decayed: 0 };

    // 1. Delete expired working memory (already a single statement — no change needed)
    try {
      const { data } = await supabase!.from('working_memory').delete()
        .eq('org_id', req.org.id).lt('expires_at', new Date().toISOString())
        .select('id');
      results.working_expired = data?.length ?? 0;
    } catch { /* table may not exist */ }

    // 2. Reduce importance of old episodic memories (>30 days, importance > 1)
    //    Uses raw SQL via Supabase RPC to do a single UPDATE instead of N updates.
    //    Fallback: use Supabase query builder with a two-step approach.
    try {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

      // First, count how many will be affected (lightweight HEAD query)
      const { count: episodicCount } = await supabase!.from('episodic_memory')
        .select('*', { count: 'exact', head: true })
        .eq('org_id', req.org.id).lt('valid_from', thirtyDaysAgo).gt('importance', 1);

      if (episodicCount && episodicCount > 0) {
        // Fetch IDs only, then batch update them all at once
        const { data: ids } = await supabase!.from('episodic_memory')
          .select('id')
          .eq('org_id', req.org.id).lt('valid_from', thirtyDaysAgo).gt('importance', 1);

        if (ids && ids.length > 0) {
          // Single UPDATE for all matching rows: importance = GREATEST(1, importance - 1)
          // Supabase JS doesn't support SQL expressions, so we batch by importance level
          // to avoid N+1. Group IDs by importance, update each group with a single call.
          const idList = ids.map(r => r.id);
          // For simplicity, decrement by 1 with floor of 1 using a single update:
          // We can't do `importance - 1` directly, but we CAN update all at once
          // if we accept setting them all to the same value — not ideal.
          // Best approach: use .in() filter with batch update per importance tier.
          const { data: fullRows } = await supabase!.from('episodic_memory')
            .select('id, importance')
            .in('id', idList);

          if (fullRows) {
            // Group by target importance
            const groups = new Map<number, string[]>();
            for (const row of fullRows) {
              const newImportance = Math.max(1, (row.importance as number) - 1);
              if (!groups.has(newImportance)) groups.set(newImportance, []);
              groups.get(newImportance)!.push(row.id);
            }
            // One UPDATE per importance tier (typically 2-3 tiers, not N)
            for (const [newImportance, groupIds] of groups) {
              await supabase!.from('episodic_memory')
                .update({ importance: newImportance })
                .in('id', groupIds);
            }
            results.episodic_decayed = fullRows.length;
          }
        }
      }
    } catch { /* table may not exist */ }

    // 3. Reduce confidence of stale semantic memories (>60 days, confidence > 0.1)
    //    Same batch pattern as episodic decay above.
    try {
      const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString();
      const now = new Date().toISOString();

      const { data: staleRows } = await supabase!.from('semantic_memory')
        .select('id, confidence')
        .eq('org_id', req.org.id).lt('updated_at', sixtyDaysAgo).gt('confidence', 0.1);

      if (staleRows && staleRows.length > 0) {
        // Group by target confidence (rounded to 1 decimal)
        const groups = new Map<number, string[]>();
        for (const row of staleRows) {
          const newConf = Math.max(0.1, parseFloat(((row.confidence as number) - 0.1).toFixed(1)));
          if (!groups.has(newConf)) groups.set(newConf, []);
          groups.get(newConf)!.push(row.id);
        }
        // One UPDATE per confidence tier (typically 3-5 tiers, not N)
        for (const [newConf, groupIds] of groups) {
          await supabase!.from('semantic_memory')
            .update({ confidence: newConf, updated_at: now })
            .in('id', groupIds);
        }
        results.semantic_decayed = staleRows.length;
      }
    } catch { /* table may not exist */ }

    // Log decay in audit_log
    try {
      await supabase!.from('audit_log').insert({
        org_id: req.org.id, event_type: 'decay', action: 'memory_decay_cycle',
        reasoning: `W:${results.working_expired} E:${results.episodic_decayed} S:${results.semantic_decayed}`,
        verdict: 'PROCEED', metadata: results,
      });
    } catch { /* audit_log may not exist */ }

    res.json(results);
  } catch (err: unknown) { safeError(res, err); }
});

// ── Reflection Status ──
router.get(`/api/${V}/reflection/status`, authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const status: Record<string, unknown> = { last_reflection: null, last_decay: null, last_consolidation: null };
    try {
      const { data: lastReflect } = await supabase!.from('audit_log')
        .select('created_at, metadata').eq('org_id', req.org.id)
        .eq('event_type', 'reflection').order('created_at', { ascending: false }).limit(1).single();
      if (lastReflect) status.last_reflection = lastReflect;
    } catch { /* no reflection yet */ }
    try {
      const { data: lastConsolidation } = await supabase!.from('audit_log')
        .select('created_at, metadata').eq('org_id', req.org.id)
        .eq('event_type', 'consolidation').order('created_at', { ascending: false }).limit(1).single();
      if (lastConsolidation) status.last_consolidation = lastConsolidation;
    } catch { /* no consolidation yet */ }
    try {
      const { data: lastDecay } = await supabase!.from('audit_log')
        .select('created_at, metadata').eq('org_id', req.org.id)
        .eq('event_type', 'decay').order('created_at', { ascending: false }).limit(1).single();
      if (lastDecay) status.last_decay = lastDecay;
    } catch { /* no decay yet */ }
    res.json(status);
  } catch (err: unknown) { safeError(res, err); }
});

export default router;
