/**
 * ═══════════════════════════════════════════════════════
 *  Stoic AgentOS — Self-Monitoring & Status Page
 * ═══════════════════════════════════════════════════════
 *  GET /api/v1/status          — Public status page data
 *  GET /api/v1/status/checks   — Deep self-check (auth required)
 *
 *  "AgentOS monitors agents, but who monitors AgentOS?"
 *  This module. It checks DB connectivity, API latency,
 *  memory usage, error rates, and service dependencies.
 */

import { Router } from 'express';
import type { Response } from 'express';
import { authenticate } from '../middleware/auth.js';
import { supabase } from '../middleware/db.js';
import { getMetricsSnapshot, getQuickStats } from '../lib/metrics.js';
import { vaultStatus } from '../lib/anthropic.js';
import type { AuthenticatedRequest } from '../types.js';
import { safeError } from '../lib/safeError.js';

const router = Router();
const API_VERSION = 'v1';

// ── Service health status for each subsystem ──
type HealthLevel = 'operational' | 'degraded' | 'outage' | 'unknown';

interface ServiceCheck {
  name: string;
  status: HealthLevel;
  latency_ms?: number;
  message?: string;
  last_checked: string;
}

// ── Public status page data (no auth) ──
router.get(`/api/${API_VERSION}/status`, async (_req, res: Response) => {
  const stats = getQuickStats();
  const uptime = Math.floor(process.uptime());
  const checks: ServiceCheck[] = [];
  const now = new Date().toISOString();

  // 1. API Server
  checks.push({
    name: 'API Server',
    status: 'operational',
    latency_ms: 0,
    message: `Uptime: ${formatUptime(uptime)}`,
    last_checked: now,
  });

  // 2. Database (Supabase)
  if (supabase) {
    const start = Date.now();
    try {
      const { error } = await supabase.from('organizations').select('id').limit(1);
      const latency = Date.now() - start;
      checks.push({
        name: 'Database',
        status: error ? 'degraded' : latency > 2000 ? 'degraded' : 'operational',
        latency_ms: latency,
        message: error ? (process.env.NODE_ENV === 'production' ? 'Query failed' : error.message) : `${latency}ms response`,
        last_checked: now,
      });
    } catch (err: unknown) {
      checks.push({
        name: 'Database',
        status: 'outage',
        latency_ms: Date.now() - start,
        message: 'Connection failed',
        last_checked: now,
      });
    }
  } else {
    checks.push({
      name: 'Database',
      status: 'unknown',
      message: 'Not configured',
      last_checked: now,
    });
  }

  // 3. AI Engine (Anthropic)
  const aiStatus = process.env.ANTHROPIC_API_KEY ? 'operational' : 'degraded';
  const vaultState = vaultStatus();
  checks.push({
    name: 'AI Engine',
    status: aiStatus,
    message: `Platform key: ${aiStatus === 'operational' ? 'active' : 'missing'} | BYOK vault: ${vaultState}`,
    last_checked: now,
  });

  // 4. Billing (Stripe)
  checks.push({
    name: 'Billing',
    status: process.env.STRIPE_SECRET_KEY ? 'operational' : 'degraded',
    message: process.env.STRIPE_SECRET_KEY ? 'Stripe configured' : 'Not configured',
    last_checked: now,
  });

  // Sanitize service checks for public response — strip internal details
  const publicServices = checks.map(c => ({
    name: c.name,
    status: c.status,
    last_checked: c.last_checked,
    // Do NOT expose: latency_ms, message (may contain DB errors, config details)
  }));

  // Overall status
  const hasOutage = checks.some(c => c.status === 'outage');
  const hasDegraded = checks.some(c => c.status === 'degraded');
  const overall: HealthLevel = hasOutage ? 'outage' : hasDegraded ? 'degraded' : 'operational';

  res.json({
    status: overall,
    message: overall === 'operational'
      ? 'All systems operational'
      : overall === 'degraded'
        ? 'Some systems degraded'
        : 'Service disruption detected',
    uptime_human: formatUptime(uptime),
    services: publicServices,
    last_updated: now,
    version: API_VERSION,
    // Removed: error_rate, total_requests, uptime_seconds (information disclosure)
  });
});

// ── Deep self-check (auth required) ──
router.get(`/api/${API_VERSION}/status/checks`, authenticate, async (req: AuthenticatedRequest, res: Response) => {
  const metrics = getMetricsSnapshot();
  const now = new Date().toISOString();
  const warnings: string[] = [];
  const critical: string[] = [];

  // Memory check
  const mem = process.memoryUsage();
  const heapMB = Math.round(mem.heapUsed / 1048576);
  const heapMaxMB = Math.round(mem.heapTotal / 1048576);
  const heapPercent = Math.round((mem.heapUsed / mem.heapTotal) * 100);
  if (heapPercent > 90) critical.push(`Heap memory at ${heapPercent}% (${heapMB}MB / ${heapMaxMB}MB)`);
  else if (heapPercent > 75) warnings.push(`Heap memory at ${heapPercent}% (${heapMB}MB / ${heapMaxMB}MB)`);

  // Error rate check
  const errorRate = metrics.total_requests > 0
    ? (metrics.total_errors / metrics.total_requests) * 100
    : 0;
  if (errorRate > 10) critical.push(`Error rate at ${errorRate.toFixed(1)}%`);
  else if (errorRate > 5) warnings.push(`Error rate at ${errorRate.toFixed(1)}%`);

  // Latency check
  if (metrics.latency.p95_ms > 5000) critical.push(`P95 latency at ${metrics.latency.p95_ms}ms`);
  else if (metrics.latency.p95_ms > 2000) warnings.push(`P95 latency at ${metrics.latency.p95_ms}ms`);

  // DB connectivity
  let dbLatency = 0;
  let dbStatus = 'unknown';
  if (supabase) {
    const start = Date.now();
    try {
      const { error } = await supabase.from('organizations').select('id').limit(1);
      dbLatency = Date.now() - start;
      dbStatus = error ? 'error' : 'ok';
      if (dbLatency > 3000) warnings.push(`DB latency: ${dbLatency}ms`);
    } catch {
      dbStatus = 'unreachable';
      critical.push('Database unreachable');
    }
  }

  // Table existence checks
  const tables = ['agents', 'observations', 'traces', 'organizations', 'chat_conversations'];
  const tableStatus: Record<string, string> = {};
  if (supabase) {
    for (const table of tables) {
      try {
        const { error } = await supabase.from(table).select('id').limit(1);
        tableStatus[table] = error ? (process.env.NODE_ENV === 'production' ? 'error: check failed' : `error: ${error.message}`) : 'ok';
      } catch {
        tableStatus[table] = 'missing';
      }
    }
  }

  // Severity
  const severity = critical.length > 0 ? 'critical' : warnings.length > 0 ? 'warning' : 'healthy';

  res.json({
    severity,
    checked_at: now,
    memory: {
      heap_used_mb: heapMB,
      heap_total_mb: heapMaxMB,
      heap_percent: heapPercent,
      rss_mb: Math.round(mem.rss / 1048576),
      external_mb: Math.round(mem.external / 1048576),
    },
    database: {
      status: dbStatus,
      latency_ms: dbLatency,
      tables: tableStatus,
    },
    metrics: {
      uptime_seconds: metrics.uptime_seconds,
      total_requests: metrics.total_requests,
      total_errors: metrics.total_errors,
      error_rate_percent: Number(errorRate.toFixed(2)),
      requests_per_minute: metrics.requests_per_minute,
      latency: metrics.latency,
    },
    services: {
      anthropic: process.env.ANTHROPIC_API_KEY ? 'configured' : 'missing',
      stripe: process.env.STRIPE_SECRET_KEY ? 'configured' : 'missing',
      vault_byok: vaultStatus(),
    },
    warnings,
    critical,
  });
});

function formatUptime(seconds: number): string {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export default router;
