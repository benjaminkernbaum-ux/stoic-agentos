/**
 * ═══════════════════════════════════════════════════════
 *  Stoic AgentOS — Rate Limiting Middleware
 * ═══════════════════════════════════════════════════════
 *  Tier-based rate limiting per subscription plan.
 *  Uses in-memory store (swap to Redis for multi-instance).
 *
 *  Tiers:
 *    free:       100 req/min
 *    pro:        500 req/min
 *    team:       2000 req/min
 *    enterprise: 10000 req/min (effectively unlimited)
 *
 *  Separate limiters:
 *    - general:  Standard API routes
 *    - ingest:   POST /traces/ingest (higher burst)
 *    - auth:     Login/signup (strict, anti-brute-force)
 */

// ── In-memory rate limit store ──────────────────────
// Swap this for Redis (ioredis) in production multi-instance
const store = new Map();

const TIER_LIMITS = {
  free:       { windowMs: 60_000, max: 100   },
  pro:        { windowMs: 60_000, max: 500   },
  team:       { windowMs: 60_000, max: 2000  },
  enterprise: { windowMs: 60_000, max: 10000 },
};

const INGEST_LIMITS = {
  free:       { windowMs: 60_000, max: 200   },
  pro:        { windowMs: 60_000, max: 1000  },
  team:       { windowMs: 60_000, max: 5000  },
  enterprise: { windowMs: 60_000, max: 50000 },
};

const AUTH_LIMIT = { windowMs: 900_000, max: 15 }; // 15 attempts per 15 min

// ── Store helpers ───────────────────────────────────

function getEntry(key, windowMs) {
  const now = Date.now();
  let entry = store.get(key);
  if (!entry || now - entry.windowStart >= windowMs) {
    entry = { count: 0, windowStart: now };
    store.set(key, entry);
  }
  return entry;
}

// Clean expired entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (now - entry.windowStart > 900_000) {
      store.delete(key);
    }
  }
}, 300_000);

// ── Rate limiter factory ────────────────────────────

function createLimiter(getLimits) {
  return (req, res, next) => {
    const plan = req.org?.plan || 'free';
    const { windowMs, max } = getLimits(plan);

    // Key: org_id if authenticated, else IP
    const key = req.org?.id || req.ip || req.connection?.remoteAddress || 'unknown';
    const entry = getEntry(`rl:${key}`, windowMs);

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
      return res.status(429).json({
        error: 'Too Many Requests',
        message: `Rate limit exceeded. ${max} requests per ${windowMs / 1000}s allowed for "${plan}" plan.`,
        limit: max,
        remaining: 0,
        reset_in_seconds: resetSec,
        upgrade_url: '/pricing',
      });
    }

    next();
  };
}

// ── Exported Limiters ───────────────────────────────

/** General API rate limiter — tier-based */
export const apiLimiter = createLimiter(
  (plan) => TIER_LIMITS[plan] || TIER_LIMITS.free
);

/** Trace ingest rate limiter — higher burst for SDK */
export const ingestLimiter = createLimiter(
  (plan) => INGEST_LIMITS[plan] || INGEST_LIMITS.free
);

/** Auth rate limiter — strict, anti-brute-force */
export const authLimiter = createLimiter(
  () => AUTH_LIMIT
);

export default { apiLimiter, ingestLimiter, authLimiter };
