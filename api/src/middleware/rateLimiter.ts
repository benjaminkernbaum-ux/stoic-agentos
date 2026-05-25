/**
 * ═══════════════════════════════════════════════════════
 *  Stoic AgentOS — Plan-Aware Rate Limiting (TypeScript)
 * ═══════════════════════════════════════════════════════
 *  Tier-based rate limiting per subscription plan.
 *  Uses in-memory sliding window (swap to Redis for multi-instance).
 *
 *  Plan limits (req/min):
 *    free:       100
 *    pro:        1000
 *    team:       5000
 *    enterprise: 10000 (effectively unlimited)
 *
 *  Separate limiters:
 *    - general:  Standard API routes
 *    - ingest:   POST /traces/ingest (higher burst)
 *    - auth:     Login/signup (strict, anti-brute-force)
 *
 *  Returns standardized 429 response with Retry-After header.
 */

import type { Request, Response, NextFunction } from 'express';

// ── Types ──

interface RateLimitConfig {
  windowMs: number;
  max: number;
}

interface WindowEntry {
  count: number;
  windowStart: number;
}

// Extend Express Request to carry org data
interface RateLimitRequest extends Request {
  org?: { id: string; plan: string };
  requestId?: string;
}

// ── In-memory rate limit store ──────────────────────
// Swap this for Redis (ioredis) in production multi-instance
const store = new Map<string, WindowEntry>();

// ── Plan limits ────────────────────────────────────

const TIER_LIMITS: Record<string, RateLimitConfig> = {
  free:       { windowMs: 60_000, max: 100   },
  pro:        { windowMs: 60_000, max: 1000  },
  team:       { windowMs: 60_000, max: 5000  },
  enterprise: { windowMs: 60_000, max: 10000 },
};

const INGEST_LIMITS: Record<string, RateLimitConfig> = {
  free:       { windowMs: 60_000, max: 200   },
  pro:        { windowMs: 60_000, max: 2000  },
  team:       { windowMs: 60_000, max: 10000 },
  enterprise: { windowMs: 60_000, max: 50000 },
};

const AUTH_LIMIT: RateLimitConfig = { windowMs: 900_000, max: 15 }; // 15 attempts per 15 min

// ── Store helpers ───────────────────────────────────

function getEntry(key: string, windowMs: number): WindowEntry {
  const now = Date.now();
  let entry = store.get(key);
  if (!entry || now - entry.windowStart >= windowMs) {
    entry = { count: 0, windowStart: now };
    store.set(key, entry);
  }
  return entry;
}

// Clean expired entries every 5 minutes to prevent memory leak
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (now - entry.windowStart > 900_000) {
      store.delete(key);
    }
  }
}, 300_000);

// ── Rate limiter factory ────────────────────────────

function createLimiter(getLimits: (plan: string) => RateLimitConfig, prefix: string) {
  return (req: RateLimitRequest, res: Response, next: NextFunction): void => {
    const plan = req.org?.plan || 'free';
    const { windowMs, max } = getLimits(plan);

    // Key: org_id if authenticated, else IP
    const identifier = req.org?.id || req.ip || 'unknown';
    const key = `${prefix}:${identifier}`;
    const entry = getEntry(key, windowMs);

    entry.count++;

    // Set rate limit headers (RFC 6585 / draft-ietf-httpapi-ratelimit-headers)
    const remaining = Math.max(0, max - entry.count);
    const resetMs = entry.windowStart + windowMs - Date.now();
    const resetSec = Math.ceil(resetMs / 1000);

    res.set('X-RateLimit-Limit', String(max));
    res.set('X-RateLimit-Remaining', String(remaining));
    res.set('X-RateLimit-Reset', String(resetSec));
    res.set('X-RateLimit-Policy', `${max};w=${Math.round(windowMs / 1000)}`);

    if (entry.count > max) {
      res.set('Retry-After', String(resetSec));

      // Structured log for rate limit hits
      const logEntry = {
        level: 'warn',
        time: new Date().toISOString(),
        service: 'stoic-agentos-api',
        event: 'rate_limit_exceeded',
        requestId: req.requestId,
        org_id: req.org?.id,
        plan,
        limit: max,
        window_seconds: windowMs / 1000,
        ip: req.ip,
      };

      if (process.env.NODE_ENV === 'production') {
        process.stdout.write(JSON.stringify(logEntry) + '\n');
      } else {
        console.warn(`⚠️  Rate limit exceeded for ${identifier} (${plan} plan: ${max}/min)`);
      }

      res.status(429).json({
        error: 'Too Many Requests',
        code: 'RATE_LIMIT_EXCEEDED',
        message: `Rate limit exceeded. ${max} requests per ${windowMs / 1000}s allowed for "${plan}" plan.`,
        request_id: req.requestId,
        limit: max,
        remaining: 0,
        retry_after_seconds: resetSec,
        upgrade_url: 'https://stoicagentos.com/#pricing',
      });
      return;
    }

    next();
  };
}

// ── Exported Limiters ───────────────────────────────

/** General API rate limiter — tier-based */
export const apiLimiter = createLimiter(
  (plan) => TIER_LIMITS[plan] || TIER_LIMITS.free,
  'rl'
);

/** Trace ingest rate limiter — higher burst for SDK */
export const ingestLimiter = createLimiter(
  (plan) => INGEST_LIMITS[plan] || INGEST_LIMITS.free,
  'rl-ingest'
);

/** Auth rate limiter — strict, anti-brute-force */
export const authLimiter = createLimiter(
  () => AUTH_LIMIT,
  'rl-auth'
);

export default { apiLimiter, ingestLimiter, authLimiter };
