/**
 * Stoic AgentOS — Cron Worker
 * Scheduled tasks for memory maintenance and knowledge extraction.
 *
 * Runs as a separate process or triggered via Railway's cron service.
 *
 * Jobs:
 *   1. Memory Decay — clean up expired working memory (every 6h)
 *   2. Reflection   — extract semantic triples from recent episodes (daily)
 *   3. Stats Sync   — refresh materialized metrics (every 15m)
 *
 * Usage:
 *   node --import=tsx api/src/cron/worker.ts             # Run all due jobs
 *   node --import=tsx api/src/cron/worker.ts --job=decay  # Run specific job
 *   node --import=tsx api/src/cron/worker.ts --job=reflect
 *
 * Environment:
 *   CRON_MODE=true      — Enable cron logging
 *   ANTHROPIC_API_KEY   — Required for reflection job
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY || '';
const API_URL = process.env.AGENTOS_API_URL || 'https://stoic-agentos-api-production.up.railway.app';

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

function log(job: string, ...args: unknown[]) {
  const ts = new Date().toISOString().slice(11, 19);
  console.log(`[${ts}] [${job}]`, ...args);
}

// ═══════════════════════════════════════════
// JOB 1: Memory Decay
// ═══════════════════════════════════════════

async function runDecay(): Promise<number> {
  log('decay', 'Starting memory decay...');

  // 1. Delete expired working memory (past TTL)
  const { data: expired, error: expErr } = await supabase
    .from('working_memory')
    .delete()
    .not('expires_at', 'is', null)
    .lt('expires_at', new Date().toISOString())
    .select('id');

  if (expErr) {
    log('decay', '❌ Error deleting expired:', expErr.message);
  }

  // 2. Delete stale working memory (>72h without TTL)
  const cutoff = new Date(Date.now() - 72 * 3600000).toISOString();
  const { data: stale, error: staleErr } = await supabase
    .from('working_memory')
    .delete()
    .is('expires_at', null)
    .lt('created_at', cutoff)
    .select('id');

  if (staleErr) {
    log('decay', '❌ Error deleting stale:', staleErr.message);
  }

  const totalRemoved = (expired?.length || 0) + (stale?.length || 0);
  log('decay', `✅ Removed ${expired?.length || 0} expired, ${stale?.length || 0} stale (${totalRemoved} total)`);
  return totalRemoved;
}

// ═══════════════════════════════════════════
// JOB 2: Reflection (per-org)
// ═══════════════════════════════════════════

async function runReflection(): Promise<number> {
  log('reflect', 'Starting reflection pass...');

  if (!ANTHROPIC_KEY) {
    log('reflect', '⚠️ ANTHROPIC_API_KEY not set — skipping reflection');
    return 0;
  }

  // Get all orgs with recent episodic memories
  const since = new Date(Date.now() - 24 * 3600000).toISOString();
  const { data: orgs } = await supabase
    .from('episodic_memory')
    .select('org_id')
    .gte('created_at', since)
    .limit(100);

  if (!orgs || orgs.length === 0) {
    log('reflect', 'No orgs with recent episodes — skipping');
    return 0;
  }

  // Deduplicate org_ids
  const uniqueOrgIds = [...new Set(orgs.map(o => o.org_id))];
  log('reflect', `Found ${uniqueOrgIds.length} orgs with recent episodes`);

  let totalTriples = 0;

  for (const orgId of uniqueOrgIds) {
    try {
      // Get recent episodes for this org
      const { data: episodes } = await supabase
        .from('episodic_memory')
        .select('id, content, event_type, importance, metadata')
        .eq('org_id', orgId)
        .or('valid_to.is.null,valid_to.gt.' + new Date().toISOString())
        .gte('created_at', since)
        .order('importance', { ascending: false })
        .limit(30);

      if (!episodes || episodes.length < 3) continue; // Need minimum data

      // Get existing triples for dedup
      const { data: existing } = await supabase
        .from('semantic_memory')
        .select('subject, relation, object')
        .eq('org_id', orgId)
        .order('confidence', { ascending: false })
        .limit(30);

      const existingContext = (existing || [])
        .map(t => `${t.subject} → ${t.relation} → ${t.object}`)
        .join('\n');

      const episodeText = episodes
        .map((e, i) => `[${i + 1}] (${e.event_type}, imp:${e.importance}) ${e.content}`)
        .join('\n');

      // Call Claude Haiku
      const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': ANTHROPIC_KEY,
          'content-type': 'application/json',
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-haiku-4-5',
          max_tokens: 1024,
          messages: [{
            role: 'user',
            content: `Extract knowledge triples from these agent events. Return only a JSON array.
Existing knowledge:\n${existingContext || '(none)'}
Episodes:\n${episodeText}
Return: [{"subject":"...","relation":"uses|depends_on|deployed_to|configured_with|prefers","object":"...","confidence":0.0-1.0,"source_type":"reflection"}]
Max 10 triples. Only durable facts, not transient events. JSON only.`,
          }],
        }),
      });

      if (!claudeRes.ok) {
        log('reflect', `⚠️ Claude error for org ${orgId.slice(0, 8)}: ${claudeRes.status}`);
        continue;
      }

      const claudeData = await claudeRes.json() as { content: Array<{ text: string }> };
      const responseText = claudeData.content?.[0]?.text || '[]';

      let triples: Array<{ subject: string; relation: string; object: string; confidence: number; source_type: string }> = [];
      try {
        const jsonMatch = responseText.match(/\[[\s\S]*\]/);
        if (jsonMatch) triples = JSON.parse(jsonMatch[0]);
      } catch {
        log('reflect', `⚠️ Parse error for org ${orgId.slice(0, 8)}`);
        continue;
      }

      // Store triples
      for (const t of triples.slice(0, 10)) {
        if (!t.subject || !t.relation || !t.object) continue;

        const { data: ex } = await supabase
          .from('semantic_memory')
          .select('id, confidence')
          .eq('org_id', orgId)
          .eq('subject', t.subject)
          .eq('relation', t.relation)
          .eq('object', t.object)
          .single();

        if (ex) {
          await supabase.from('semantic_memory')
            .update({ confidence: Math.min(1.0, Math.max(ex.confidence, t.confidence || 0.7)), updated_at: new Date().toISOString() })
            .eq('id', ex.id);
        } else {
          await supabase.from('semantic_memory').insert({
            org_id: orgId,
            subject: t.subject,
            relation: t.relation,
            object: t.object,
            confidence: t.confidence || 0.7,
            source_type: 'reflection',
            source_episodes: episodes.map(e => e.id),
          });
          totalTriples++;
        }
      }

      log('reflect', `✅ Org ${orgId.slice(0, 8)}: ${triples.length} triples processed`);
    } catch (err) {
      log('reflect', `❌ Org ${orgId.slice(0, 8)} error:`, (err as Error).message);
    }
  }

  log('reflect', `✅ Reflection complete: ${totalTriples} new triples across ${uniqueOrgIds.length} orgs`);
  return totalTriples;
}

// ═══════════════════════════════════════════
// RUNNER
// ═══════════════════════════════════════════

async function main() {
  const jobArg = process.argv.find(a => a.startsWith('--job='));
  const specificJob = jobArg ? jobArg.split('=')[1] : null;

  console.log('═══════════════════════════════════════');
  console.log('  Stoic AgentOS — Cron Worker');
  console.log(`  ${new Date().toISOString()}`);
  console.log('═══════════════════════════════════════');

  const results: Record<string, unknown> = {};

  if (!specificJob || specificJob === 'decay') {
    results.decay = await runDecay();
  }

  if (!specificJob || specificJob === 'reflect') {
    results.reflect = await runReflection();
  }

  console.log('\n📊 Results:', JSON.stringify(results));
  console.log('✅ Cron worker complete.\n');
}

main().catch(err => {
  console.error('❌ Cron worker failed:', err.message);
  process.exit(1);
});
