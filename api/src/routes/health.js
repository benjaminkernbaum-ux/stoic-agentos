/**
 * ═══════════════════════════════════════════════════════
 *  Stoic AgentOS — Health Check Routes (Deep Probe)
 * ═══════════════════════════════════════════════════════
 *  Layer 13: Availability & Recovery
 *
 *  Endpoints:
 *    GET /health              → Quick liveness check (for load balancers)
 *    GET /api/v1/health       → Quick liveness check (versioned)
 *    GET /api/v1/health/deep  → Deep probe (DB, external services)
 */

import { Router } from 'express';

const router = Router();
const API_VERSION = 'v1';
const START_TIME = new Date().toISOString();

// ── Quick Health (for load balancers / Railway) ──
router.get('/health', (req, res) => res.json({
  status: 'ok',
  version: API_VERSION,
  uptime: Math.round(process.uptime()),
  startedAt: START_TIME,
  db: !!req.app.locals.supabase,
}));

router.get(`/api/${API_VERSION}/health`, (req, res) => res.json({
  status: 'ok',
  version: API_VERSION,
  uptime: Math.round(process.uptime()),
  startedAt: START_TIME,
  db: !!req.app.locals.supabase,
}));

// ── Deep Health Probe ──
router.get(`/api/${API_VERSION}/health/deep`, async (req, res) => {
  const checks = {};
  let overallStatus = 'healthy';

  // 1. Supabase Database
  try {
    const supabase = req.app.locals.supabase;
    if (!supabase) {
      checks.database = { status: 'unconfigured', latency_ms: 0 };
      overallStatus = 'degraded';
    } else {
      const start = Date.now();
      const { data, error } = await supabase
        .from('organizations')
        .select('id', { count: 'exact', head: true });
      const latency = Date.now() - start;

      if (error) {
        checks.database = { status: 'error', error: error.message, latency_ms: latency };
        overallStatus = 'unhealthy';
      } else {
        checks.database = { status: 'healthy', latency_ms: latency };
      }
    }
  } catch (err) {
    checks.database = { status: 'error', error: err.message };
    overallStatus = 'unhealthy';
  }

  // 2. Memory usage
  const mem = process.memoryUsage();
  const heapUsedMB = Math.round(mem.heapUsed / 1024 / 1024);
  const heapTotalMB = Math.round(mem.heapTotal / 1024 / 1024);
  const heapPercent = Math.round((mem.heapUsed / mem.heapTotal) * 100);
  checks.memory = {
    status: heapPercent > 90 ? 'warning' : 'healthy',
    heap_used_mb: heapUsedMB,
    heap_total_mb: heapTotalMB,
    heap_percent: heapPercent,
    rss_mb: Math.round(mem.rss / 1024 / 1024),
  };
  if (heapPercent > 90 && overallStatus === 'healthy') overallStatus = 'degraded';

  // 3. Event loop lag (rough approximation)
  const lagStart = Date.now();
  await new Promise(resolve => setImmediate(resolve));
  const eventLoopLag = Date.now() - lagStart;
  checks.event_loop = {
    status: eventLoopLag > 100 ? 'warning' : 'healthy',
    lag_ms: eventLoopLag,
  };

  // 4. Stripe connectivity
  if (process.env.STRIPE_SECRET_KEY) {
    checks.stripe = { status: 'configured' };
  } else {
    checks.stripe = { status: 'unconfigured' };
  }

  // 5. Anthropic / BYOK
  if (process.env.ANTHROPIC_API_KEY) {
    checks.anthropic = { status: 'configured', mode: 'platform_key' };
  } else {
    checks.anthropic = { status: 'unconfigured', mode: 'byok_only' };
  }

  // Final response
  const httpStatus = overallStatus === 'unhealthy' ? 503 : 200;
  res.status(httpStatus).json({
    status: overallStatus,
    version: API_VERSION,
    uptime_seconds: Math.round(process.uptime()),
    started_at: START_TIME,
    node_version: process.version,
    environment: process.env.NODE_ENV || 'development',
    checks,
    timestamp: new Date().toISOString(),
  });
});

export default router;
