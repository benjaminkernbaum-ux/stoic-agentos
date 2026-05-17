/**
 * Stoic AgentOS — API Server
 * Express.js backend for AI Agent Operations Platform
 * Routes are organized in src/routes/
 */

import express from 'express';
import cors from 'cors';
import { supabase } from './middleware/db.js';

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

// ── Config ──
const PORT = process.env.PORT || 4444;
const API_VERSION = 'v1';

const app = express();

// ── Middleware ──
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '1mb' }));

// Make supabase accessible via app.locals
app.locals.supabase = supabase;

// Request logging
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const ms = Date.now() - start;
    if (!req.url.includes('/health')) {
      console.log(`${req.method} ${req.url} ${res.statusCode} ${ms}ms`);
    }
  });
  next();
});

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

// ── Start ──
app.listen(PORT, () => {
  console.log(`\n⚡ Stoic AgentOS API — ${API_VERSION}`);
  console.log(`   Port: ${PORT}`);
  console.log(`   Supabase: ${supabase ? '✅ Connected' : '⚠️  No URL or Service Key (demo mode)'}`);
  console.log(`   Stripe: ${process.env.STRIPE_SECRET_KEY ? '✅ Ready' : '⚠️  Not configured'}\n`);
});
