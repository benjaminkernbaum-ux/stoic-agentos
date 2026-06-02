/**
 * ═══════════════════════════════════════════════════════
 *  Stoic AgentOS — Monthly Counter Cache
 * ═══════════════════════════════════════════════════════
 *
 *  Eliminates expensive COUNT(*) queries on every trace/observation
 *  ingest call.  Instead:
 *
 *    1. On first call → COUNT(*) from Postgres → cache result
 *    2. On subsequent inserts → increment cached counter in-memory
 *    3. TTL-based expiry (60s) → re-syncs with DB periodically
 *
 *  This turns O(rows) per-request into O(1), with a small drift
 *  window (~60s) where the counter may be slightly stale — acceptable
 *  for plan-limit enforcement (off-by-one on limits is fine).
 *
 *  Fallback: if anything goes wrong, returns -1 which signals the
 *  caller to skip the limit check (fail-open for availability).
 */

import type { SupabaseClient } from '@supabase/supabase-js';

interface CachedCount {
  count: number;
  expiresAt: number;
}

const DEFAULT_TTL_MS = 60_000; // 60 seconds
const cache = new Map<string, CachedCount>();

/**
 * Build a cache key scoped to org + resource + current month.
 * Key rotates automatically on month boundaries.
 */
function buildKey(orgId: string, resource: string): string {
  const now = new Date();
  const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  return `${orgId}:${resource}:${monthKey}`;
}

/**
 * Get the start of the current month as ISO string (for DB queries).
 */
function monthStartISO(): string {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
}

/**
 * Get the current monthly count for a resource, using cache when available.
 *
 * @param supabase  - Supabase client (service role)
 * @param orgId     - Organization ID
 * @param table     - Table name ('traces' | 'observations')
 * @param ttlMs     - Cache TTL in milliseconds (default: 60s)
 * @returns Current count, or -1 if DB query fails (fail-open)
 */
export async function getMonthlyCount(
  supabase: SupabaseClient,
  orgId: string,
  table: 'traces' | 'observations',
  ttlMs: number = DEFAULT_TTL_MS,
): Promise<number> {
  const key = buildKey(orgId, table);
  const cached = cache.get(key);

  // Cache hit — return immediately (O(1))
  if (cached && cached.expiresAt > Date.now()) {
    return cached.count;
  }

  // Cache miss — query DB and populate cache
  try {
    const { count, error } = await supabase
      .from(table)
      .select('*', { count: 'exact', head: true })
      .eq('org_id', orgId)
      .gte('created_at', monthStartISO());

    if (error) {
      console.warn(`[counterCache] COUNT query failed for ${table}:`, error.message);
      return -1; // fail-open
    }

    const result = count ?? 0;
    cache.set(key, { count: result, expiresAt: Date.now() + ttlMs });
    return result;
  } catch (err) {
    console.warn(`[counterCache] Unexpected error for ${table}:`, (err as Error).message);
    return -1; // fail-open
  }
}

/**
 * Increment the cached counter after a successful insert.
 * If no cached entry exists, this is a no-op (the next getMonthlyCount
 * call will do a fresh DB query).
 *
 * @param orgId    - Organization ID
 * @param table    - Table name ('traces' | 'observations')
 * @param delta    - Amount to increment (default: 1)
 */
export function incrementCounter(orgId: string, table: 'traces' | 'observations', delta: number = 1): void {
  const key = buildKey(orgId, table);
  const cached = cache.get(key);
  if (cached) {
    cached.count += delta;
  }
}

/**
 * Invalidate the cached counter for an org+resource.
 * Use after bulk deletes or admin operations.
 */
export function invalidateCounter(orgId: string, table: 'traces' | 'observations'): void {
  const key = buildKey(orgId, table);
  cache.delete(key);
}

/**
 * Clear all cached counters. Useful for testing.
 */
export function clearAllCounters(): void {
  cache.clear();
}

// ── Periodic cleanup of expired entries (every 5 minutes) ──
// Prevents unbounded memory growth if many orgs hit the API.
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of cache) {
    if (entry.expiresAt <= now) {
      cache.delete(key);
    }
  }
}, 5 * 60_000);
