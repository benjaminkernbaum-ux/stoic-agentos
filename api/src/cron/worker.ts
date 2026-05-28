/**
 * Stoic AgentOS — Cron Worker (v3 — API-Delegated)
 * Scheduled tasks for memory maintenance and knowledge extraction.
 *
 * Instead of duplicating logic, this worker calls the API endpoints:
 *   POST /api/v1/reflection/decay  — memory cleanup
 *   POST /api/v1/reflection/run    — Claude-powered knowledge extraction
 *
 * Runs as a separate process or triggered via Railway's cron service.
 *
 * Jobs:
 *   1. Memory Decay — clean up expired/stale working memory (every 6h)
 *   2. Reflection   — extract semantic triples from recent episodes (daily)
 *
 * Usage:
 *   node --import=tsx api/src/cron/worker.ts             # Run all due jobs
 *   node --import=tsx api/src/cron/worker.ts --job=decay  # Run specific job
 *   node --import=tsx api/src/cron/worker.ts --job=reflect
 *
 * Environment:
 *   CRON_API_KEY       — API key with org access (required)
 *   AGENTOS_API_URL    — API base URL (default: production)
 *   ANTHROPIC_API_KEY  — Required for reflection job (set on the org)
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const CRON_API_KEY = process.env.CRON_API_KEY || '';
const API_URL = (process.env.AGENTOS_API_URL || 'https://stoic-agentos-api-production.up.railway.app').replace(/\/$/, '');

function log(job: string, ...args: unknown[]) {
  const ts = new Date().toISOString().slice(11, 19);
  console.log(`[${ts}] [${job}]`, ...args);
}

// ═══════════════════════════════════════════
// API-Delegated Calls
// ═══════════════════════════════════════════

/**
 * Call the API's reflection endpoints.
 * If CRON_API_KEY is set, we use the API layer (preferred — single source of truth).
 * If not, we fall back to raw Supabase for the decay job only.
 */
async function callApi(endpoint: string, method = 'POST'): Promise<Record<string, unknown> | null> {
  if (!CRON_API_KEY) {
    log('api', `⚠️ No CRON_API_KEY — falling back to raw Supabase for decay only`);
    return null;
  }

  try {
    const res = await fetch(`${API_URL}/api/v1${endpoint}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${CRON_API_KEY}`,
      },
    });

    if (!res.ok) {
      log('api', `❌ ${method} ${endpoint} returned ${res.status}: ${await res.text()}`);
      return null;
    }

    return await res.json() as Record<string, unknown>;
  } catch (err) {
    log('api', `❌ ${method} ${endpoint} error:`, (err as Error).message);
    return null;
  }
}

// ═══════════════════════════════════════════
// JOB 1: Memory Decay
// ═══════════════════════════════════════════

async function runDecay(): Promise<Record<string, unknown>> {
  log('decay', 'Starting memory decay...');

  // Prefer API delegation
  const apiResult = await callApi('/reflection/decay');
  if (apiResult) {
    log('decay', `✅ API decay: W:${apiResult.working_expired} E:${apiResult.episodic_decayed} S:${apiResult.semantic_decayed}`);
    return apiResult;
  }

  // Fallback: raw Supabase (only if no API key)
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    log('decay', '❌ No CRON_API_KEY and no SUPABASE credentials — skipping');
    return { working_expired: 0, error: 'no credentials' };
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  // 1. Delete expired working memory (past TTL)
  const { data: expired, error: expErr } = await supabase
    .from('working_memory')
    .delete()
    .not('expires_at', 'is', null)
    .lt('expires_at', new Date().toISOString())
    .select('id');

  if (expErr) log('decay', '❌ Error deleting expired:', expErr.message);

  // 2. Delete stale working memory (>72h without TTL)
  const cutoff = new Date(Date.now() - 72 * 3600000).toISOString();
  const { data: stale, error: staleErr } = await supabase
    .from('working_memory')
    .delete()
    .is('expires_at', null)
    .lt('created_at', cutoff)
    .select('id');

  if (staleErr) log('decay', '❌ Error deleting stale:', staleErr.message);

  const result = {
    working_expired: (expired?.length || 0) + (stale?.length || 0),
    episodic_decayed: 0,
    semantic_decayed: 0,
  };

  log('decay', `✅ Fallback decay: ${result.working_expired} entries cleaned`);
  return result;
}

// ═══════════════════════════════════════════
// JOB 2: Reflection (API-Delegated)
// ═══════════════════════════════════════════

async function runReflection(): Promise<Record<string, unknown>> {
  log('reflect', 'Starting reflection pass...');

  if (!CRON_API_KEY) {
    log('reflect', '⚠️ No CRON_API_KEY — reflection requires API delegation, skipping');
    log('reflect', '   Set CRON_API_KEY to an API key with org access');
    return { triplets_extracted: 0, error: 'no api key' };
  }

  // Note: The API's /reflection/run endpoint handles per-org scoping via the
  // API key's org_id. For multi-org reflection, run with each org's key.
  const result = await callApi('/reflection/run');
  if (result) {
    log('reflect', `✅ Reflection: ${result.triplets_extracted} triples from ${result.episodes_processed} episodes`);
    return result;
  }

  return { triplets_extracted: 0, error: 'api call failed' };
}

// ═══════════════════════════════════════════
// RUNNER
// ═══════════════════════════════════════════

async function main() {
  const jobArg = process.argv.find(a => a.startsWith('--job='));
  const specificJob = jobArg ? jobArg.split('=')[1] : null;

  console.log('═══════════════════════════════════════');
  console.log('  Stoic AgentOS — Cron Worker (v3)');
  console.log(`  ${new Date().toISOString()}`);
  console.log(`  Mode: ${CRON_API_KEY ? 'API-delegated ✅' : 'Supabase fallback ⚠️'}`);
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
