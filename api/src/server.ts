/**
 * Stoic AgentOS — API Server (Production-Hardened)
 * Express.js backend for AI Agent Operations Platform
 *
 * Features:
 * - Request ID tracking (x-request-id)
 * - Per-endpoint metrics collection (p50/p95/p99 latency)
 * - Plan-aware rate limiting (100/1000/5000/10000 req/min)
 * - Structured JSON logging
 * - Global error handler with standardized responses
 * - Graceful shutdown (SIGTERM/SIGINT)
 * - Uncaught exception / unhandled rejection safety nets
 */

import express from 'express';
import type { Request, Response } from 'express';
import cors from 'cors';
import { supabase } from './middleware/db.js';

// Production middleware
import {
  requestIdMiddleware,
  metricsMiddleware,
  globalErrorHandler,
  installProcessHandlers,
} from './middleware/production.js';
import { apiLimiter } from './middleware/rateLimiter.js';

// Route modules
import healthRoutes from './routes/health.js';
import authRoutes from './routes/auth.js';
import observationRoutes from './routes/observations.js';
import agentRoutes from './routes/agents.js';
import workspaceRoutes from './routes/workspaces.js';
import knowledgeRoutes from './routes/knowledge.js';
import statsRoutes from './routes/stats.js';
import apiKeyRoutes from './routes/apiKeys.js';
import billingRoutes from './routes/billing.js';
import webhookRoutes from './routes/webhooks.js';
import traceRoutes from './routes/traces.js';
import alertRoutes from './routes/alerts.js';
import graphRoutes from './routes/graph.js';
import insightRoutes from './routes/insights.js';
import chatRoutes from './routes/chat.js';
import adminRoutes from './routes/admin.js';
import { probeVaultRpc } from './lib/anthropic.js';

// ── Install process-level safety nets ──
installProcessHandlers();

// ── Config ──
const PORT = process.env.PORT || 4444;
const API_VERSION = 'v1';

const app = express();

// ── Core Middleware (order matters) ──

// 1. Request ID — must be first so all subsequent logs include it
app.use(requestIdMiddleware);

// 2. CORS
app.use(cors({
  origin: [
    'https://stoicagentos.com',
    'https://stoic-agentos.vercel.app',
    'https://stoic-agentos-benjaminkernbaum-uxs-projects.vercel.app',
    process.env.NODE_ENV === 'development' && 'http://localhost:5173',
  ].filter(Boolean) as string[],
  credentials: true,
  exposedHeaders: ['X-Request-ID', 'X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset', 'Retry-After'],
}));

// 3. Body parsing
app.use(express.json({ limit: '1mb' }));

// 4. Metrics + structured logging
app.use(metricsMiddleware);

// 5. Rate limiting (applied to all API routes)
app.use('/api/', apiLimiter);

// Make supabase accessible via app.locals
app.locals.supabase = supabase;

// ── Mount Routes ──
app.use(healthRoutes);
app.use(authRoutes);
app.use(observationRoutes);
app.use(agentRoutes);
app.use(workspaceRoutes);
app.use(knowledgeRoutes);
app.use(statsRoutes);
app.use(apiKeyRoutes);
app.use(billingRoutes);
app.use(webhookRoutes);
app.use(traceRoutes);
app.use(alertRoutes);
app.use(graphRoutes);
app.use(insightRoutes);
app.use(chatRoutes);       // AI Chat Assistant
app.use(adminRoutes); // TEMPORARY — remove after migrations

// ── 404 handler ──
app.use((req: Request, res: Response) => {
  res.status(404).json({
    error: 'Not found',
    code: 'NOT_FOUND',
    request_id: req.requestId,
    path: req.originalUrl,
  });
});

// ── Global error handler (must be last) ──
app.use(globalErrorHandler);

// ── Start ──
app.listen(PORT, async () => {
  console.log(`\n⚡ Stoic AgentOS API — ${API_VERSION} (production-hardened)`);
  console.log(`   Port: ${PORT}`);
  console.log(`   Supabase: ${supabase ? '✅ Connected' : '⚠️  No URL or Service Key (demo mode)'}`);
  console.log(`   Stripe: ${process.env.STRIPE_SECRET_KEY ? '✅ Ready' : '⚠️  Not configured'}`);
  console.log(`   Anthropic: ${process.env.ANTHROPIC_API_KEY ? '✅ Platform key set' : '⚠️  BYOK only (no platform fallback)'}`);
  console.log(`   Rate limiting: ✅ Plan-aware (free:100/min, pro:1K, team:5K)`);
  console.log(`   Metrics: ✅ /api/v1/health/metrics`);
  console.log(`   Error handling: ✅ Global handler + process safety nets`);

  if (supabase) {
    const status = await probeVaultRpc();
    const icon = status === 'ready' ? '✅' : status === 'pending' ? '⚠️ ' : '❓';
    const label = status === 'ready'   ? 'Vault BYOK ready'
                : status === 'pending' ? 'Vault BYOK PENDING — run migration_003_vault_anthropic_keys.sql'
                : 'Vault BYOK status unknown (probe failed)';
    console.log(`   ${icon} ${label}`);
  }
  console.log('');
});
