import type { Request, Response, NextFunction } from 'express';
import { createHash } from 'crypto';
import type { AuthenticatedRequest } from '../types.js';
import { supabase } from './db.js';

/** Hash an API key using SHA-256 for secure storage comparison */
export function hashApiKey(key: string): string {
  return createHash('sha256').update(key).digest('hex');
}

/** Debounce last_used_at updates — only write to DB once every 5 minutes per key */
const LAST_USED_DEBOUNCE_MS = 5 * 60 * 1000;
const lastUsedCache = new Map<string, number>();

// ── API Key Cache ──
// Eliminates a Postgres SELECT per SDK request on the hot path.
// TTL of 60s means a revoked key stays valid for at most 1 minute.
const API_KEY_CACHE_TTL_MS = 60_000;
interface CachedApiKey {
  data: Record<string, unknown>;
  expiresAt: number;
}
const apiKeyCache = new Map<string, CachedApiKey>();

/** Invalidate a cached API key (call when key is deleted/deactivated) */
export function invalidateApiKeyCache(keyHash: string): void {
  apiKeyCache.delete(keyHash);
}

// Periodic cleanup of expired API key cache entries (every 5 minutes)
setInterval(() => {
  const now = Date.now();
  for (const [hash, entry] of apiKeyCache) {
    if (entry.expiresAt <= now) {
      apiKeyCache.delete(hash);
    }
  }
}, 5 * 60_000);

export async function authenticate(req: Request, res: Response, next: NextFunction): Promise<void> {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing authorization header' });
    return;
  }
  const token = auth.slice(7);

  // API key auth (sk_live_xxx or sk_test_xxx)
  if (token.startsWith('sk_')) {
    if (!supabase) { res.status(500).json({ error: 'Database not configured' }); return; }
    // Compare by SHA-256 hash — keys are stored hashed, not in plaintext
    const tokenHash = hashApiKey(token);

    // ── Cache check: skip DB query if we have a fresh cached entry ──
    const cached = apiKeyCache.get(tokenHash);
    if (cached && cached.expiresAt > Date.now()) {
      const apiKey = cached.data;
      (req as AuthenticatedRequest).org = apiKey.organizations as AuthenticatedRequest['org'];
      (req as AuthenticatedRequest).apiKey = apiKey;
      // Debounced last_used_at
      const now = Date.now();
      const lastUpdated = lastUsedCache.get(apiKey.id as string);
      if (!lastUpdated || now - lastUpdated > LAST_USED_DEBOUNCE_MS) {
        lastUsedCache.set(apiKey.id as string, now);
        supabase.from('api_keys').update({ last_used_at: new Date().toISOString() }).eq('id', apiKey.id as string).then(() => {});
      }
      return next();
    }

    // ── Cache miss: query DB ──
    const { data: apiKey } = await supabase
      .from('api_keys')
      .select('*, organizations(*)')
      .eq('key_hash', tokenHash)
      .eq('active', true)
      .single();
    if (!apiKey) {
      res.status(401).json({ error: 'Invalid API key' });
      return;
    }

    // Store in cache for subsequent requests
    apiKeyCache.set(tokenHash, { data: apiKey, expiresAt: Date.now() + API_KEY_CACHE_TTL_MS });

    (req as AuthenticatedRequest).org = apiKey.organizations;
    (req as AuthenticatedRequest).apiKey = apiKey;
    // Debounced last_used_at — skip DB write if updated within 5 minutes
    const now = Date.now();
    const lastUpdated = lastUsedCache.get(apiKey.id);
    if (!lastUpdated || now - lastUpdated > LAST_USED_DEBOUNCE_MS) {
      lastUsedCache.set(apiKey.id, now);
      supabase.from('api_keys').update({ last_used_at: new Date().toISOString() }).eq('id', apiKey.id).then(() => {});
    }
    return next();
  }

  // JWT auth (Supabase session token)
  if (!supabase) { res.status(500).json({ error: 'Database not configured' }); return; }
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) { res.status(401).json({ error: 'Invalid token' }); return; }

  // Get user's org — try org_id from query first for multi-org support
  const orgId = req.query.org_id || req.body?.org_id;
  let membership: Record<string, unknown> | null = null;

  if (orgId) {
    const { data } = await supabase
      .from('org_members')
      .select('*, organizations(*)')
      .eq('user_id', user.id)
      .eq('org_id', orgId as string)
      .single();
    membership = data;
  } else {
    const { data } = await supabase
      .from('org_members')
      .select('*, organizations(*)')
      .eq('user_id', user.id)
      .limit(1)
      .single();
    membership = data;
  }

  if (!membership) { res.status(403).json({ error: 'No organization found' }); return; }

  (req as AuthenticatedRequest).user = user as { id: string; email: string };
  (req as AuthenticatedRequest).org = (membership as Record<string, unknown>).organizations as AuthenticatedRequest['org'];
  (req as AuthenticatedRequest).role = (membership as Record<string, unknown>).role as string;
  next();
}
