/**
 * Claude-powered insight endpoints.
 *
 * POST /insights/summarize         — summarize recent observations
 * POST /insights/analyze-agent     — diagnose an agent's recent runs
 * POST /insights/ask               — free-form Q&A grounded in org data
 * GET  /insights/usage             — token usage dashboard
 * GET  /insights/hot-cache         — read the org's hot cache
 * POST /insights/hot-cache/refresh — regenerate the org's hot cache
 */

import { Router } from 'express';
import type { Response } from 'express';
import { authenticate } from '../middleware/auth.js';
import { aiLimiter } from '../middleware/rateLimiter.js';
import { supabase } from '../middleware/db.js';
import { complete, hasAnthropic, MODELS } from '../lib/anthropic.js';
import { estimateCost } from '../lib/pricing.js';
import { safeError } from '../lib/safeError.js';
import type { AuthenticatedRequest } from '../types.js';

interface AnthropicError extends Error {
  code?: string;
  status?: number;
  headers?: Record<string, string>;
}

const router = Router();
const API_VERSION = 'v1';

function handleAnthropicError(err: AnthropicError, res: Response): void {
  if (err.code === 'NO_ANTHROPIC_KEY') {
    res.status(402).json({
      error: 'Anthropic API key not configured',
      hint: 'Set ANTHROPIC_API_KEY on the platform or POST /api-keys/anthropic for your org',
    });
    return;
  }
  if (err.status === 401) { res.status(402).json({ error: 'Invalid Anthropic API key' }); return; }
  if (err.status === 429) { res.status(429).json({ error: 'Anthropic rate limit', retry_after: err.headers?.['retry-after'] }); return; }
  safeError(res, err);
}

// ── Summarize recent observations ──
router.post(`/api/${API_VERSION}/insights/summarize`, authenticate, aiLimiter, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!hasAnthropic(req.org)) {
      return res.status(402).json({ error: 'No Anthropic API key configured' });
    }

    const { hours = 24, agent_id, workspace_id } = req.body;
    const since = new Date(Date.now() - hours * 3600 * 1000).toISOString();

    let query = supabase!
      .from('observations')
      .select('type,title,content,importance,created_at,agent_id,workspace_id')
      .eq('org_id', req.org.id)
      .gte('created_at', since)
      .order('importance', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(200);

    if (agent_id) query = query.eq('agent_id', agent_id);
    if (workspace_id) query = query.eq('workspace_id', workspace_id);

    const { data: observations, error } = await query;
    if (error) throw error;

    if (!observations || observations.length === 0) {
      return res.json({ summary: 'No observations in the requested window.', count: 0 });
    }

    const formatted = observations
      .map((o: Record<string, unknown>) => `[${o.type}|imp:${o.importance}] ${o.title}${o.content ? `\n  ${(o.content as string).slice(0, 300)}` : ''}`)
      .join('\n');

    const result = await complete(req.org, {
      model: 'fast',
      maxTokens: 1024,
      endpoint: 'summarize',
      system:
        'You are an AI agent operations analyst. Summarize agent activity logs into a concise executive briefing. ' +
        'Lead with the most important architectural decisions, errors, and deployments. Use markdown with bold section headers. ' +
        'Be specific — cite observation titles. If errors cluster around a single agent or theme, flag it.',
      messages: [
        {
          role: 'user',
          content: `Summarize these ${observations.length} observations from the last ${hours}h:\n\n${formatted}`,
        },
      ],
    });

    res.json({
      summary: result.text,
      count: observations.length,
      window_hours: hours,
      model: result.model,
      usage: result.usage,
    });
  } catch (err: unknown) {
    handleAnthropicError(err as AnthropicError, res);
  }
});

// ── Analyze a single agent's health ──
router.post(`/api/${API_VERSION}/insights/analyze-agent`, authenticate, aiLimiter, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!hasAnthropic(req.org)) {
      return res.status(402).json({ error: 'No Anthropic API key configured' });
    }

    const { agent_id } = req.body;
    if (!agent_id) return res.status(400).json({ error: 'agent_id required' });

    const { data: agent, error: agentErr } = await supabase!
      .from('agents')
      .select('*')
      .eq('id', agent_id)
      .eq('org_id', req.org.id)
      .single();
    if (agentErr || !agent) {
      return res.status(404).json({
        error: 'Agent not found',
        agent_id,
        hint: 'Verify the agent_id belongs to your organization',
      });
    }

    const { data: observations } = await supabase!
      .from('observations')
      .select('type,title,content,importance,created_at')
      .eq('org_id', req.org.id)
      .eq('agent_id', agent_id)
      .order('created_at', { ascending: false })
      .limit(50);

    const errorRate = agent.total_runs > 0 ? (agent.total_errors / agent.total_runs) : 0;
    const formatted = (observations || [])
      .map((o: Record<string, unknown>) => `[${o.type}] ${o.title}${o.content ? ` — ${(o.content as string).slice(0, 200)}` : ''}`)
      .join('\n');

    const result = await complete(req.org, {
      model: 'smart',
      maxTokens: 2048,
      thinking: true,
      endpoint: 'analyze-agent',
      system:
        'You are a senior SRE diagnosing AI agent reliability. Output: (1) Health verdict (healthy/degraded/failing), ' +
        '(2) Top 3 issues with evidence from the log, (3) Recommended actions. Be direct, no fluff.',
      messages: [
        {
          role: 'user',
          content:
            `Agent: ${agent.name} (${agent.module})\n` +
            `Status: ${agent.status}\n` +
            `Total runs: ${agent.total_runs}, errors: ${agent.total_errors} (${(errorRate * 100).toFixed(1)}%)\n` +
            `Last heartbeat: ${agent.last_heartbeat || 'never'}\n\n` +
            `Recent observations:\n${formatted || '(none)'}`,
        },
      ],
    });

    res.json({
      analysis: result.text,
      agent: { id: agent.id, name: agent.name, status: agent.status, error_rate: errorRate },
      model: result.model,
      usage: result.usage,
    });
  } catch (err: unknown) {
    handleAnthropicError(err as AnthropicError, res);
  }
});

// ── Free-form ask (hot-cache-first) ──
router.post(`/api/${API_VERSION}/insights/ask`, authenticate, aiLimiter, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!hasAnthropic(req.org)) {
      return res.status(402).json({ error: 'No Anthropic API key configured' });
    }

    const { question, model = 'fast', force_fresh = false } = req.body;
    if (!question) return res.status(400).json({ error: 'question required' });

    // Hot cache path: use the pre-synthesized summary when fresh
    const cacheUsable = !force_fresh
      && typeof req.org.hot_cache === 'string'
      && req.org.hot_cache.length > 0
      && req.org.hot_cache_stale === false;

    let context: string;
    let contextSource: 'hot_cache' | 'live';

    if (cacheUsable) {
      // Fast path — read from the org's hot cache (~500 words vs 20 obs)
      context =
        `Organization: ${req.org.name} (plan: ${req.org.plan})\n\n` +
        `=== Hot Cache (synthesized summary) ===\n${req.org.hot_cache}\n` +
        `=== Last refreshed: ${req.org.hot_cache_updated_at || 'unknown'} ===`;
      contextSource = 'hot_cache';
    } else {
      // Fallback — live-fetch observations (original behavior)
      const [{ count: agentCount }, { count: wsCount }, { data: recent }] = await Promise.all([
        supabase!.from('agents').select('*', { count: 'exact', head: true }).eq('org_id', req.org.id),
        supabase!.from('workspaces').select('*', { count: 'exact', head: true }).eq('org_id', req.org.id),
        supabase!
          .from('observations')
          .select('type,title,created_at')
          .eq('org_id', req.org.id)
          .order('created_at', { ascending: false })
          .limit(20),
      ]);

      context =
        `Organization: ${req.org.name} (plan: ${req.org.plan})\n` +
        `Agents: ${agentCount}, Workspaces: ${wsCount}\n\n` +
        `Last 20 observations:\n` +
        (recent || []).map((o: Record<string, unknown>) => `- [${o.type}] ${o.title}`).join('\n');
      contextSource = 'live';
    }

    const result = await complete(req.org, {
      model,
      maxTokens: 1024,
      endpoint: 'ask',
      system:
        'You are the Stoic AgentOS assistant. Answer questions about the user\'s AI agent fleet based on the ' +
        'observation log provided. If the answer isn\'t in the data, say so.',
      messages: [
        { role: 'user', content: `Context:\n${context}\n\nQuestion: ${question}` },
      ],
    });

    res.json({
      answer: result.text,
      context_source: contextSource,
      model: result.model,
      usage: result.usage,
    });
  } catch (err: unknown) {
    handleAnthropicError(err as AnthropicError, res);
  }
});

// ── Get hot cache status ──
router.get(`/api/${API_VERSION}/insights/hot-cache`, authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    // If hot_cache column doesn't exist (migration not run), degrade gracefully
    if (typeof req.org.hot_cache === 'undefined') {
      return res.json({
        status: 'unavailable',
        hint: 'Run migration_005_hot_cache.sql to enable',
      });
    }

    const hasCache = typeof req.org.hot_cache === 'string' && req.org.hot_cache.length > 0;

    res.json({
      status: hasCache ? (req.org.hot_cache_stale ? 'stale' : 'fresh') : 'empty',
      hot_cache: req.org.hot_cache || null,
      updated_at: req.org.hot_cache_updated_at || null,
      stale: req.org.hot_cache_stale ?? true,
      word_count: hasCache ? req.org.hot_cache!.split(/\s+/).length : 0,
    });
  } catch (err: unknown) {
    safeError(res, err);
  }
});

// ── Refresh hot cache ──
router.post(`/api/${API_VERSION}/insights/hot-cache/refresh`, authenticate, aiLimiter, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!supabase) {
      return res.status(500).json({ error: 'Database not configured' });
    }

    // Check if migration has been applied — if hot_cache is undefined the column doesn't exist
    if (typeof req.org.hot_cache === 'undefined') {
      return res.status(503).json({
        error: 'Hot cache not available — migration_005_hot_cache.sql has not been applied',
        hint: 'Run the migration in the Supabase SQL editor, then retry',
      });
    }

    if (!hasAnthropic(req.org)) {
      return res.status(402).json({ error: 'No Anthropic API key configured' });
    }

    // Fetch recent observations (7-day window, max 150)
    const since = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();
    const { data: observations, error: obsError } = await supabase
      .from('observations')
      .select('type,title,content,importance,agent_id,created_at')
      .eq('org_id', req.org.id)
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(150);

    if (obsError) throw obsError;

    if (!observations || observations.length === 0) {
      // Nothing to summarize — clear any old cache
      await supabase
        .from('organizations')
        .update({
          hot_cache: null,
          hot_cache_updated_at: new Date().toISOString(),
          hot_cache_stale: false,
        })
        .eq('id', req.org.id);

      return res.json({
        status: 'empty',
        hot_cache: null,
        observation_count: 0,
        message: 'No observations in the last 7 days to summarize',
      });
    }

    // Format observations for Claude
    const formatted = observations
      .map((o: Record<string, unknown>) =>
        `[${o.type}|imp:${o.importance}] ${o.title}${o.content ? ` — ${(o.content as string).slice(0, 200)}` : ''}`
      )
      .join('\n');

    // Generate the hot cache summary via Claude Haiku
    const result = await complete(req.org, {
      model: 'fast',
      maxTokens: 800,
      endpoint: 'hot-cache-refresh',
      system:
        'You are an AI operations analyst. Synthesize the provided observation log into a dense rolling summary ' +
        '(~500 words max). Structure it as:\n\n' +
        '**Last Updated**: [current date]\n' +
        '**Key Facts**: top 5-8 most important active facts about this agent fleet\n' +
        '**Recent Changes**: significant events from the last few days\n' +
        '**Active Threads**: ongoing issues, patterns, or trends to monitor\n\n' +
        'Be concrete — cite agent names, observation types, and specific details. ' +
        'This summary will be used as context for future questions, so include anything a colleague would need ' +
        'to quickly get up to speed. Overwrite, don\'t append — this replaces the previous summary entirely.',
      messages: [
        {
          role: 'user',
          content:
            `Organization: ${req.org.name} (plan: ${req.org.plan})\n` +
            `Synthesize these ${observations.length} observations from the last 7 days:\n\n${formatted}`,
        },
      ],
    });

    // Write to the org
    const now = new Date().toISOString();
    const { error: updateError } = await supabase
      .from('organizations')
      .update({
        hot_cache: result.text,
        hot_cache_updated_at: now,
        hot_cache_stale: false,
      })
      .eq('id', req.org.id);

    if (updateError) throw updateError;

    // Update req.org in-memory so subsequent calls in this request see the new cache
    req.org.hot_cache = result.text;
    req.org.hot_cache_updated_at = now;
    req.org.hot_cache_stale = false;

    res.json({
      status: 'fresh',
      hot_cache: result.text,
      updated_at: now,
      observation_count: observations.length,
      word_count: result.text.split(/\s+/).length,
      model: result.model,
      usage: result.usage,
    });
  } catch (err: unknown) {
    handleAnthropicError(err as AnthropicError, res);
  }
});

// ── Usage summary for the dashboard ──
router.get(`/api/${API_VERSION}/insights/usage`, authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { days = 30 } = req.query;
    const since = new Date(Date.now() - Number(days) * 86400 * 1000).toISOString();

    const { data, error } = await supabase!
      .from('anthropic_usage')
      .select('endpoint,model,input_tokens,output_tokens,cache_read_tokens,cache_creation_tokens,created_at')
      .eq('org_id', req.org.id)
      .gte('created_at', since)
      .order('created_at', { ascending: false });
    if (error) throw error;

    const totals = { calls: 0, input: 0, output: 0, cache_read: 0, cache_creation: 0, cost_usd: 0 };
    const byEndpoint: Record<string, number> = {};
    const byModel: Record<string, number> = {};

    for (const row of data || []) {
      totals.calls += 1;
      totals.input += row.input_tokens || 0;
      totals.output += row.output_tokens || 0;
      totals.cache_read += row.cache_read_tokens || 0;
      totals.cache_creation += row.cache_creation_tokens || 0;
      const cost = estimateCost(row);
      totals.cost_usd += cost;

      byEndpoint[row.endpoint] = (byEndpoint[row.endpoint] || 0) + 1;
      byModel[row.model] = (byModel[row.model] || 0) + 1;
    }

    res.json({
      window_days: Number(days),
      totals: { ...totals, cost_usd: Number(totals.cost_usd.toFixed(4)) },
      by_endpoint: byEndpoint,
      by_model: byModel,
      recent: (data || []).slice(0, 10),
    });
  } catch (err: unknown) {
    safeError(res, err);
  }
});

export default router;
