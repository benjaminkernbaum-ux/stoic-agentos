/**
 * ═══════════════════════════════════════════════════════════════
 *  Stoic AgentOS — Plan-Aware Rate Limiting (Dual-Mode)
 * ═══════════════════════════════════════════════════════════════
 *
 *  DUAL-MODE RATE LIMITER
 *  ──────────────────────
 *  1. Upstash Redis (production / multi-instance)
 *     Activated when UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN
 *     environment variables are set.  Uses @upstash/ratelimit with a
 *     sliding-window algorithm backed by Upstash Redis — fully serverless,
 *     works in Railway, Vercel Edge, and any Node runtime.
 *
 *  2. In-memory Map (local development / fallback)
 *     If the Upstash env vars are missing, the limiter falls back to the
 *     original in-memory sliding window.  Zero external dependencies,
 *     works out of the box — ideal for `npm run dev`.
 *
 *  Both modes expose the same Express middleware signature and return
 *  identical 429 responses with X-RateLimit-* headers.
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

const AI_LIMITS: Record<string, RateLimitConfig> = {
  free:       { windowMs: 60_000, max: 20   },
  pro:        { windowMs: 60_000, max: 60   },
  team:       { windowMs: 60_000, max: 200  },
  enterprise: { windowMs: 60_000, max: 500  },
};

// ═══════════════════════════════════════════════════════
//  Upstash Redis Rate Limiter (production)
// ═══════════════════════════════════════════════════════

// We dynamically import @upstash/* so the app still boots even if the
// packages aren't installed (e.g. in a minimal local-dev setup).

let upstashReady = false;
let Ratelimit: any = null;
let upstashRedis: any = null;

async function initUpstash(): Promise<boolean> {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) return false;

  try {
    const [{ Redis }, { Ratelimit: RL }] = await Promise.all([
      import('@upstash/redis'),
      import('@upstash/ratelimit'),
    ]);

    upstashRedis = new Redis({ url, token });
    Ratelimit = RL;
    console.log('✅ Rate limiter: Upstash Redis (sliding window)');
    return true;
  } catch (err) {
    console.warn(
      '⚠️  Upstash env vars set but packages not available — falling back to in-memory rate limiter.',
      (err as Error).message,
    );
    return false;
  }
}

// Boot-time initialization (non-blocking, sets `upstashReady` flag)
const upstashInitPromise = initUpstash().then((ok) => {
  upstashReady = ok;
});

// Cache of Upstash Ratelimit instances keyed by "prefix:plan"
const upstashLimiters = new Map<string, InstanceType<any>>();

function getUpstashLimiter(prefix: string, config: RateLimitConfig) {
  const cacheKey = `${prefix}:${config.max}:${config.windowMs}`;
  let limiter = upstashLimiters.get(cacheKey);
  if (!limiter) {
    const windowSec = `${Math.round(config.windowMs / 1000)} s` as any;
    limiter = new Ratelimit({
      redis: upstashRedis,
      limiter: Ratelimit.slidingWindow(config.max, windowSec),
      prefix: `stoic:${prefix}`,
    });
    upstashLimiters.set(cacheKey, limiter);
  }
  return limiter;
}

// ═══════════════════════════════════════════════════════
//  In-Memory Rate Limiter (fallback for local dev)
// ═══════════════════════════════════════════════════════

const store = new Map<string, WindowEntry>();

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
  return async (req: RateLimitRequest, res: Response, next: NextFunction): Promise<void> => {
    // Ensure Upstash init has settled before first request
    await upstashInitPromise;

    const plan = req.org?.plan || 'free';
    const { windowMs, max } = getLimits(plan);

    // Key: org_id if authenticated, else IP
    const identifier = req.org?.id || req.ip || 'unknown';

    // ── Upstash Redis path ──
    if (upstashReady) {
      try {
        const limiter = getUpstashLimiter(prefix, { windowMs, max });
        const result = await limiter.limit(`${identifier}`);

        // Map Upstash response to our standard headers
        const remaining = Math.max(0, result.remaining);
        const resetMs = result.reset - Date.now();
        const resetSec = Math.max(1, Math.ceil(resetMs / 1000));

        res.set('X-RateLimit-Limit', String(result.limit));
        res.set('X-RateLimit-Remaining', String(remaining));
        res.set('X-RateLimit-Reset', String(resetSec));
        res.set('X-RateLimit-Policy', `${result.limit};w=${Math.round(windowMs / 1000)}`);

        if (!result.success) {
          res.set('Retry-After', String(resetSec));
          logRateLimit(req, identifier, plan, max, windowMs);

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
        return;
      } catch (err) {
        // If Redis fails mid-flight, fall through to in-memory so the
        // request isn't dropped.  Log the error but don't crash.
        console.error('⚠️  Upstash rate limiter error — falling back to in-memory:', (err as Error).message);
      }
    }

    // ── In-memory fallback path ──
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
      logRateLimit(req, identifier, plan, max, windowMs);

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

// ── Shared logging helper ──────────────────────────

function logRateLimit(
  req: RateLimitRequest,
  identifier: string,
  plan: string,
  max: number,
  windowMs: number,
) {
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

/** AI endpoint rate limiter — protects against LLM cost abuse */
export const aiLimiter = createLimiter(
  (plan) => AI_LIMITS[plan] || AI_LIMITS.free,
  'rl-ai'
);

export default { apiLimiter, ingestLimiter, authLimiter, aiLimiter };
