/**
 * Stoic AgentOS — Reflection Worker
 * Background process that scans episodic memory → extracts semantic triples
 *
 * Uses Claude Haiku for pattern extraction from recent episodes.
 * Runs as a periodic cron job or triggered via API.
 *
 * Flow:
 *   1. Fetch recent episodic memories (last N hours)
 *   2. Batch them into context windows
 *   3. Claude Haiku extracts knowledge triples
 *   4. Store new/strengthen existing semantic triples
 *   5. Log the reflection to audit trail
 */
import { Router } from 'express';
import type { Response } from 'express';
import { authenticate } from '../middleware/auth.js';
import { supabase } from '../middleware/db.js';
import type { AuthenticatedRequest } from '../types.js';

const router = Router();
const API_VERSION = 'v1';

// ── Reflection endpoint (trigger manually or via cron) ──
router.post(`/api/${API_VERSION}/memory/reflect`, authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const {
      hours = 24,           // Look back N hours
      max_episodes = 50,    // Max episodes to process
      agent_id,
      model = 'claude-haiku-4-5',
      dry_run = false,      // If true, return triples without storing
    } = req.body;

    // 1. Fetch recent episodic memories
    const since = new Date(Date.now() - (hours as number) * 3600000).toISOString();

    let query = supabase!
      .from('episodic_memory')
      .select('id, content, event_type, importance, metadata, created_at')
      .eq('org_id', req.org.id)
      .or('valid_to.is.null,valid_to.gt.' + new Date().toISOString())
      .gte('created_at', since)
      .order('importance', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(max_episodes as number);

    if (agent_id) query = query.eq('agent_id', agent_id as string);

    const { data: episodes, error: epError } = await query;
    if (epError) throw epError;

    if (!episodes || episodes.length === 0) {
      return res.json({ status: 'ok', message: 'No recent episodes to reflect on', triples_extracted: 0 });
    }

    // 2. Fetch existing semantic memory for deduplication context
    const { data: existingTriples } = await supabase!
      .from('semantic_memory')
      .select('subject, relation, object')
      .eq('org_id', req.org.id)
      .order('confidence', { ascending: false })
      .limit(50);

    const existingContext = (existingTriples || [])
      .map(t => `${t.subject} → ${t.relation} → ${t.object}`)
      .join('\n');

    // 3. Build the reflection prompt
    const episodeText = episodes
      .map((e, i) => `[${i + 1}] (${e.event_type}, importance:${e.importance}) ${e.content}`)
      .join('\n');

    const reflectionPrompt = `You are a knowledge extraction system for an AI agent operations platform.

Analyze these recent agent events and extract structured knowledge triples (subject → relation → object).

## Existing Knowledge (avoid duplicates):
${existingContext || '(none yet)'}

## Recent Episodes:
${episodeText}

## Instructions:
- Extract factual, durable knowledge (not transient events)
- Focus on: architecture decisions, tool preferences, error patterns, deployment configs, agent behaviors
- Each triple must have: subject, relation, object, confidence (0.0-1.0), source_type
- Valid relations: uses, depends_on, deployed_to, configured_with, replaced, caused, resolved, prefers, avoids, handles
- Confidence: 0.9+ for explicit statements, 0.6-0.8 for inferred, 0.4-0.6 for speculative
- Return JSON array of triples, max 15

## Output Format:
\`\`\`json
[
  {"subject": "email-agent", "relation": "uses", "object": "GPT-4o", "confidence": 0.9, "source_type": "observation"},
  {"subject": "API gateway", "relation": "deployed_to", "object": "Railway", "confidence": 0.95, "source_type": "deployment"}
]
\`\`\`

Return ONLY the JSON array, no explanation.`;

    // 4. Call Claude (use org's Anthropic key if available, else platform key)
    const anthropicKey = req.org.anthropic_api_key || process.env.ANTHROPIC_API_KEY;
    if (!anthropicKey) {
      return res.status(503).json({
        error: 'No Anthropic API key configured. Set org key or platform ANTHROPIC_API_KEY.',
      });
    }

    const claudeResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': anthropicKey,
        'content-type': 'application/json',
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model,
        max_tokens: 2048,
        messages: [{ role: 'user', content: reflectionPrompt }],
      }),
    });

    if (!claudeResponse.ok) {
      const errBody = await claudeResponse.text();
      throw new Error(`Claude API error ${claudeResponse.status}: ${errBody}`);
    }

    const claudeData = await claudeResponse.json() as {
      content: Array<{ text: string }>;
      usage: { input_tokens: number; output_tokens: number };
    };
    const responseText = claudeData.content?.[0]?.text || '[]';

    // 5. Parse triples from Claude's response
    let triples: Array<{
      subject: string;
      relation: string;
      object: string;
      confidence: number;
      source_type: string;
    }> = [];

    try {
      // Extract JSON from potential markdown code blocks
      const jsonMatch = responseText.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        triples = JSON.parse(jsonMatch[0]);
      }
    } catch (parseErr) {
      console.error('[Reflection] Failed to parse Claude response:', responseText.slice(0, 200));
      return res.json({
        status: 'partial',
        message: 'Claude response could not be parsed',
        raw_response: responseText.slice(0, 500),
        triples_extracted: 0,
      });
    }

    // 6. Validate and filter triples
    const validTriples = triples.filter(t =>
      t.subject && t.relation && t.object &&
      typeof t.confidence === 'number' &&
      t.confidence >= 0 && t.confidence <= 1
    ).slice(0, 15);

    // 7. Store triples (unless dry_run)
    const results: Array<{ triple: string; action: string }> = [];

    if (!dry_run) {
      for (const t of validTriples) {
        // Check for existing triple
        const { data: existing } = await supabase!
          .from('semantic_memory')
          .select('id, confidence')
          .eq('org_id', req.org.id)
          .eq('subject', t.subject)
          .eq('relation', t.relation)
          .eq('object', t.object)
          .single();

        if (existing) {
          // Strengthen confidence
          const newConf = Math.min(1.0, Math.max(existing.confidence, t.confidence));
          await supabase!
            .from('semantic_memory')
            .update({ confidence: newConf, updated_at: new Date().toISOString() })
            .eq('id', existing.id);
          results.push({ triple: `${t.subject} → ${t.relation} → ${t.object}`, action: 'strengthened' });
        } else {
          await supabase!
            .from('semantic_memory')
            .insert({
              org_id: req.org.id,
              subject: t.subject,
              relation: t.relation,
              object: t.object,
              confidence: t.confidence,
              source_type: t.source_type || 'reflection',
              source_episodes: episodes.map(e => e.id),
            });
          results.push({ triple: `${t.subject} → ${t.relation} → ${t.object}`, action: 'created' });
        }
      }

      // 8. Log to audit trail
      await supabase!.from('audit_log').insert({
        org_id: req.org.id,
        event_type: 'reflection',
        action: 'extract_knowledge',
        reasoning: `Reflected on ${episodes.length} episodes, extracted ${validTriples.length} triples`,
        verdict: 'PROCEED',
        metadata: {
          episodes_processed: episodes.length,
          triples_extracted: validTriples.length,
          triples_created: results.filter(r => r.action === 'created').length,
          triples_strengthened: results.filter(r => r.action === 'strengthened').length,
          model,
          usage: claudeData.usage,
        },
      });
    }

    res.json({
      status: 'ok',
      episodes_processed: episodes.length,
      triples_extracted: validTriples.length,
      triples: dry_run ? validTriples : results,
      usage: claudeData.usage,
      dry_run,
    });
  } catch (err: unknown) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// ── Auto-Decay: mark old working memory as expired ──
router.post(`/api/${API_VERSION}/memory/decay`, authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { max_age_hours = 72 } = req.body;
    const cutoff = new Date(Date.now() - (max_age_hours as number) * 3600000).toISOString();

    // Delete expired working memory
    const { data: expired, error: expErr } = await supabase!
      .from('working_memory')
      .delete()
      .eq('org_id', req.org.id)
      .not('expires_at', 'is', null)
      .lt('expires_at', new Date().toISOString())
      .select('id');

    if (expErr) throw expErr;

    // Also clean up very old working memory without TTL
    const { data: stale, error: staleErr } = await supabase!
      .from('working_memory')
      .delete()
      .eq('org_id', req.org.id)
      .is('expires_at', null)
      .lt('created_at', cutoff)
      .select('id');

    if (staleErr) throw staleErr;

    res.json({
      status: 'ok',
      expired_removed: expired?.length || 0,
      stale_removed: stale?.length || 0,
    });
  } catch (err: unknown) {
    res.status(500).json({ error: (err as Error).message });
  }
});

export default router;
