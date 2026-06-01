/**
 * ═══════════════════════════════════════════════════════
 *  Stoic AgentOS — Health & Monitoring Routes
 * ═══════════════════════════════════════════════════════
 *  GET /health             — Quick liveness (<50ms)
 *  GET /api/v1/health      — API version check
 *  GET /api/v1/health/ready — Readiness (DB, Anthropic)
 *  GET /api/v1/health/metrics — Full metrics dashboard
 */

import { Router } from 'express';
import type { Request, Response } from 'express';
import { getMetricsSnapshot, getQuickStats } from '../lib/metrics.js';
import { supabase } from '../middleware/db.js';
import { authenticate } from '../middleware/auth.js';
import { safeError } from '../lib/safeError.js';

const router = Router();
const API_VERSION = 'v1';

// ── Liveness probe — must be < 50ms, no external calls ──
router.get('/health', (_req: Request, res: Response) => {
  const stats = getQuickStats();
  res.json({
    status: 'ok',
    version: API_VERSION,
    uptime: stats.uptime,
    requests: stats.requests,
    errors: stats.errors,
    db: !!supabase,
  });
});

router.get(`/api/${API_VERSION}/health`, (_req: Request, res: Response) => {
  res.json({ status: 'ok', version: API_VERSION });
});

// ── Readiness probe — checks external dependencies ──
router.get(`/api/${API_VERSION}/health/ready`, async (_req: Request, res: Response) => {
  const checks: Record<string, { status: string; latency_ms?: number; error?: string }> = {};

  // Supabase check
  if (supabase) {
    const start = Date.now();
    try {
      const { error } = await supabase.from('organizations').select('id').limit(1);
      checks.supabase = {
        status: error ? 'degraded' : 'ok',
        latency_ms: Date.now() - start,
        ...(error ? { error: error.message } : {}),
      };
    } catch (err: unknown) {
      checks.supabase = {
        status: 'down',
        latency_ms: Date.now() - start,
        error: 'Connection failed',
      };
    }
  } else {
    checks.supabase = { status: 'not_configured' };
  }

  // Anthropic check
  checks.anthropic = {
    status: process.env.ANTHROPIC_API_KEY ? 'configured' : 'not_configured',
  };

  // Stripe check
  checks.stripe = {
    status: process.env.STRIPE_SECRET_KEY ? 'configured' : 'not_configured',
  };

  const allOk = Object.values(checks).every(c => c.status === 'ok' || c.status === 'configured');
  const anyDown = Object.values(checks).some(c => c.status === 'down');

  res.status(anyDown ? 503 : 200).json({
    status: anyDown ? 'unavailable' : allOk ? 'ready' : 'degraded',
    version: API_VERSION,
    uptime_seconds: Math.floor(process.uptime()),
    checks,
  });
});

// ── Full metrics dashboard — p50/p95/p99, per-endpoint (auth required) ──
router.get(`/api/${API_VERSION}/health/metrics`, authenticate, (_req: Request, res: Response) => {
  const snapshot = getMetricsSnapshot();
  res.json(snapshot);
});

export default router;
