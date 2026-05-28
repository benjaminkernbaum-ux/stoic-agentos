/**
 * Reflection Routes — AI-Powered Knowledge Extraction + Memory Decay
 *
 * POST /reflection/run   — Extract semantic triplets from episodic memories via Claude
 * POST /reflection/decay — Apply time-based memory decay across all tiers
 * GET  /reflection/status — Last reflection and decay timestamps
 */

import { Router } from 'express';
import type { Response } from 'express';
import { authenticate } from '../middleware/auth.js';
import { supabase } from '../middleware/db.js';
import { complete, hasAnthropic } from '../lib/anthropic.js';
import type { AuthenticatedRequest } from '../types.js';
import { isTableMissing } from '../lib/utils.js';

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

    // Insert triplets into semantic_memory
    let inserted = 0;
    for (const t of triplets) {
      if (!t.subject || !t.relation || !t.object) continue;
      try {
        await supabase!.from('semantic_memory').insert({
          org_id: req.org.id,
          subject: t.subject,
          relation: t.relation,
          object: t.object,
          confidence: t.confidence ?? 0.8,
          source_type: 'reflection',
          source_episodes: episodes.map(e => e.id),
        });
        inserted++;
      } catch { /* duplicate or constraint violation — skip */ }
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
    res.status(500).json({ error: error.message });
  }
});

// ── Memory Decay ──
router.post(`/api/${V}/reflection/decay`, authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const results = { working_expired: 0, episodic_decayed: 0, semantic_decayed: 0 };

    // 1. Delete expired working memory
    try {
      const { data } = await supabase!.from('working_memory').delete()
        .eq('org_id', req.org.id).lt('expires_at', new Date().toISOString())
        .select('id');
      results.working_expired = data?.length ?? 0;
    } catch { /* table may not exist */ }

    // 2. Reduce importance of old episodic memories (>30 days, importance > 1)
    try {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const { data: oldEpisodes } = await supabase!.from('episodic_memory')
        .select('id, importance')
        .eq('org_id', req.org.id).lt('valid_from', thirtyDaysAgo).gt('importance', 1);
      if (oldEpisodes) {
        for (const ep of oldEpisodes) {
          await supabase!.from('episodic_memory')
            .update({ importance: Math.max(1, (ep.importance as number) - 1) })
            .eq('id', ep.id);
        }
        results.episodic_decayed = oldEpisodes.length;
      }
    } catch { /* table may not exist */ }

    // 3. Reduce confidence of stale semantic memories (>60 days, confidence > 0.1)
    try {
      const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString();
      const { data: staleSemantic } = await supabase!.from('semantic_memory')
        .select('id, confidence')
        .eq('org_id', req.org.id).lt('updated_at', sixtyDaysAgo).gt('confidence', 0.1);
      if (staleSemantic) {
        for (const sm of staleSemantic) {
          await supabase!.from('semantic_memory')
            .update({ confidence: Math.max(0.1, (sm.confidence as number) - 0.1), updated_at: new Date().toISOString() })
            .eq('id', sm.id);
        }
        results.semantic_decayed = staleSemantic.length;
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
  } catch (err: unknown) { res.status(500).json({ error: (err as Error).message }); }
});

// ── Reflection Status ──
router.get(`/api/${V}/reflection/status`, authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const status: Record<string, unknown> = { last_reflection: null, last_decay: null };
    try {
      const { data: lastReflect } = await supabase!.from('audit_log')
        .select('created_at, metadata').eq('org_id', req.org.id)
        .eq('event_type', 'reflection').order('created_at', { ascending: false }).limit(1).single();
      if (lastReflect) status.last_reflection = lastReflect;
    } catch { /* no reflection yet */ }
    try {
      const { data: lastDecay } = await supabase!.from('audit_log')
        .select('created_at, metadata').eq('org_id', req.org.id)
        .eq('event_type', 'decay').order('created_at', { ascending: false }).limit(1).single();
      if (lastDecay) status.last_decay = lastDecay;
    } catch { /* no decay yet */ }
    res.json(status);
  } catch (err: unknown) { res.status(500).json({ error: (err as Error).message }); }
});

export default router;
