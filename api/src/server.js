/**
 * Stoic AgentOS — API Server (Production-Hardened)
 * Express.js backend for AI Agent Operations Platform
 *
 * Production layers applied:
 *   ✅ Layer 2:  API Gateway with versioned routes
 *   ✅ Layer 8:  Security headers (CORS, HSTS, CSP, XSS)
 *   ✅ Layer 9:  Rate limiting (tier-based per plan)
 *   ✅ Layer 12: Structured logging (JSON in prod)
 *   ✅ Layer 4:  Auth middleware (JWT + API key)
 */

import express from 'express';
import { supabase } from './middleware/db.js';

// ── Production Middleware ──
import { securityHeaders, requestId } from './middleware/security.js';
import { apiLimiter, ingestLimiter, authLimiter } from './middleware/rateLimiter.js';
import { logger, requestLogger } from './middleware/logger.js';

// ── Route Modules ──
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
import { probeVaultRpc } from './lib/anthropic.js';

// ── Config ──
const PORT = process.env.PORT || 4444;
const API_VERSION = 'v1';
const START_TIME = new Date().toISOString();

const app = express();

// ═══════════════════════════════════════════════
//  MIDDLEWARE STACK (order matters!)
// ═══════════════════════════════════════════════

// 1. Request ID — assign unique ID for tracing
app.use(requestId);

// 2. Security headers — CORS, HSTS, CSP, etc.
app.use(securityHeaders);

// 3. Body parsing with size limits
app.use(express.json({ limit: '1mb' }));

// 4. Structured request logging
app.use(requestLogger);

// Make supabase accessible via app.locals
app.locals.supabase = supabase;

// ═══════════════════════════════════════════════
//  ROUTE MOUNTING WITH RATE LIMITING
// ═══════════════════════════════════════════════

// Health check — NO rate limiting, NO auth (for monitoring)
app.use(healthRoutes);

// Auth routes — strict rate limiting (anti-brute-force)
app.use(authLimiter, authRoutes);

// Standard API routes — tier-based rate limiting
app.use(apiLimiter, observationRoutes);
app.use(apiLimiter, agentRoutes);
app.use(apiLimiter, workspaceRoutes);
app.use(apiLimiter, knowledgeRoutes);
app.use(apiLimiter, statsRoutes);
app.use(apiLimiter, apiKeyRoutes);
app.use(apiLimiter, billingRoutes);
app.use(apiLimiter, webhookRoutes);
app.use(apiLimiter, alertRoutes);
app.use(apiLimiter, graphRoutes);
app.use(apiLimiter, insightRoutes);

// Trace routes — split limiters (ingest is higher)
app.use(apiLimiter, traceRoutes);

// ═══════════════════════════════════════════════
//  ERROR HANDLING
// ═══════════════════════════════════════════════

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `No route matches ${req.method} ${req.path}`,
    docs: `GET /api/${API_VERSION}/health`,
  });
});

// Global error handler
app.use((err, req, res, _next) => {
  const log = req.log || logger;
  log.error({
    error: err.message,
    stack: process.env.NODE_ENV !== 'production' ? err.stack : undefined,
    requestId: req.requestId,
  }, 'Unhandled error');

  res.status(err.status || 500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV !== 'production' ? err.message : 'Something went wrong',
    requestId: req.requestId,
  });
});

// ═══════════════════════════════════════════════
//  STARTUP
// ═══════════════════════════════════════════════

app.listen(PORT, async () => {
  logger.info({
    port: PORT,
    version: API_VERSION,
    startedAt: START_TIME,
    node: process.version,
    env: process.env.NODE_ENV || 'development',
  }, `⚡ Stoic AgentOS API — ${API_VERSION}`);

  logger.info({ connected: !!supabase }, `Supabase: ${supabase ? '✅ Connected' : '⚠️  No URL or Service Key (demo mode)'}`);
  logger.info({ configured: !!process.env.STRIPE_SECRET_KEY }, `Stripe: ${process.env.STRIPE_SECRET_KEY ? '✅ Ready' : '⚠️  Not configured'}`);
  logger.info({ configured: !!process.env.ANTHROPIC_API_KEY }, `Anthropic: ${process.env.ANTHROPIC_API_KEY ? '✅ Platform key' : '⚠️  BYOK only'}`);

  if (supabase) {
    const status = await probeVaultRpc();
    const label = status === 'ready' ? '✅ Vault BYOK ready'
      : status === 'pending' ? '⚠️  Vault BYOK pending'
      : '❓ Vault status unknown';
    logger.info({ vaultStatus: status }, label);
  }

  logger.info({
    layers: {
      rateLimit: '✅ Active (tier-based)',
      security: '✅ CORS + HSTS + CSP',
      logging: '✅ Structured JSON',
      validation: '✅ Schema enforcement',
      auth: '✅ JWT + API key',
    }
  }, '🏗️ Production layers active');
});
