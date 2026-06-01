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
import { securityHeaders } from './middleware/security.js';
import { supabase } from './middleware/db.js';

// Production middleware
import {
  requestIdMiddleware,
  metricsMiddleware,
  globalErrorHandler,
  installProcessHandlers,
} from './middleware/production.js';
import { apiLimiter, authLimiter } from './middleware/rateLimiter.js';

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
import memoryRoutes from './routes/memory.js';
import complianceRoutes from './routes/compliance.js';
import reflectionRoutes from './routes/reflection.js';
import statusRoutes from './routes/status.js';
import { probeVaultRpc } from './lib/anthropic.js';

// ── Install process-level safety nets ──
installProcessHandlers();

// ── Config ──
const PORT = process.env.PORT || 4444;
const API_VERSION = 'v1';

const app = express();

// Trust first proxy (Railway) — ensures req.ip returns client IP, not proxy IP
app.set('trust proxy', 1);

// ── Core Middleware (order matters) ──

// 1. Request ID — must be first so all subsequent logs include it
app.use(requestIdMiddleware);

// 2. CORS
const ALLOWED_ORIGINS = [
  'https://stoicagentos.com',
  'https://www.stoicagentos.com',
  'https://stoic-agentos.vercel.app',
  'https://api.stoicagentos.com',
];
if (process.env.NODE_ENV === 'development') ALLOWED_ORIGINS.push('http://localhost:5173');

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) return callback(null, true);
    // Allow Vercel preview deployments for stoic-agentos only (not arbitrary 'stoic' substrings)
    const host = origin.replace('https://', '');
    if (origin.endsWith('.vercel.app') && host.startsWith('stoic-agentos') || ALLOWED_ORIGINS.includes(origin)) {
      return callback(null, true);
    }
    callback(new Error(`CORS: ${origin} not allowed`));
  },
  credentials: true,
  exposedHeaders: ['X-Request-ID', 'X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset', 'Retry-After'],
}));

// 2b. Security headers (HSTS, CSP, X-Frame-Options, etc.)
app.use(securityHeaders);

// 3. Body parsing
app.use(express.json({ limit: '1mb' }));

// 4. Metrics + structured logging
app.use(metricsMiddleware);

// 5. Rate limiting (applied to all API routes)
app.use('/api/', apiLimiter);

// 5b. Stricter auth rate limiting (anti-brute-force)
app.use('/api/v1/auth/', authLimiter);

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
app.use(memoryRoutes);     // Three-Tier Memory (Working/Episodic/Semantic)
app.use(complianceRoutes); // Audit Log + Circuit Breaker
app.use(reflectionRoutes); // Reflection Worker + Memory Decay
app.use(statusRoutes);     // Self-monitoring + Status Page

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
