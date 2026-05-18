/**
 * Claude-powered insight endpoints.
 *
 * POST /insights/summarize         — summarize recent observations
 * POST /insights/analyze-agent     — diagnose an agent's recent runs
 * POST /insights/ask               — free-form Q&A grounded in org data
 */

import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { supabase } from '../middleware/db.js';
import { complete, hasAnthropic, MODELS } from '../lib/anthropic.js';

const router = Router();
const API_VERSION = 'v1';

function handleAnthropicError(err, res) {
  if (err.code === 'NO_ANTHROPIC_KEY') {
    return res.status(402).json({
      error: 'Anthropic API key not configured',
      hint: 'Set ANTHROPIC_API_KEY on the platform or POST /api-keys/anthropic for your org',
    });
  }
  if (err.status === 401) return res.status(402).json({ error: 'Invalid Anthropic API key' });
  if (err.status === 429) return res.status(429).json({ error: 'Anthropic rate limit', retry_after: err.headers?.['retry-after'] });
  return res.status(500).json({ error: err.message });
}

// ── Summarize recent observations ──
router.post(`/api/${API_VERSION}/insights/summarize`, authenticate, async (req, res) => {
  try {
    if (!hasAnthropic(req.org)) {
      return res.status(402).json({ error: 'No Anthropic API key configured' });
    }

    const { hours = 24, agent_id, workspace_id } = req.body;
    const since = new Date(Date.now() - hours * 3600 * 1000).toISOString();

    let query = supabase
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
      .map((o) => `[${o.type}|imp:${o.importance}] ${o.title}${o.content ? `\n  ${o.content.slice(0, 300)}` : ''}`)
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
  } catch (err) {
    handleAnthropicError(err, res);
  }
});

// ── Analyze a single agent's health ──
router.post(`/api/${API_VERSION}/insights/analyze-agent`, authenticate, async (req, res) => {
  try {
    if (!hasAnthropic(req.org)) {
      return res.status(402).json({ error: 'No Anthropic API key configured' });
    }

    const { agent_id } = req.body;
    if (!agent_id) return res.status(400).json({ error: 'agent_id required' });

    const { data: agent } = await supabase
      .from('agents')
      .select('*')
      .eq('id', agent_id)
      .eq('org_id', req.org.id)
      .single();
    if (!agent) return res.status(404).json({ error: 'Agent not found' });

    const { data: observations } = await supabase
      .from('observations')
      .select('type,title,content,importance,created_at')
      .eq('org_id', req.org.id)
      .eq('agent_id', agent_id)
      .order('created_at', { ascending: false })
      .limit(50);

    const errorRate = agent.total_runs > 0 ? (agent.total_errors / agent.total_runs) : 0;
    const formatted = (observations || [])
      .map((o) => `[${o.type}] ${o.title}${o.content ? ` — ${o.content.slice(0, 200)}` : ''}`)
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
  } catch (err) {
    handleAnthropicError(err, res);
  }
});

// ── Free-form ask ──
router.post(`/api/${API_VERSION}/insights/ask`, authenticate, async (req, res) => {
  try {
    if (!hasAnthropic(req.org)) {
      return res.status(402).json({ error: 'No Anthropic API key configured' });
    }

    const { question, model = 'fast' } = req.body;
    if (!question) return res.status(400).json({ error: 'question required' });

    const [{ count: agentCount }, { count: wsCount }, { data: recent }] = await Promise.all([
      supabase.from('agents').select('*', { count: 'exact', head: true }).eq('org_id', req.org.id),
      supabase.from('workspaces').select('*', { count: 'exact', head: true }).eq('org_id', req.org.id),
      supabase
        .from('observations')
        .select('type,title,created_at')
        .eq('org_id', req.org.id)
        .order('created_at', { ascending: false })
        .limit(20),
    ]);

    const context =
      `Organization: ${req.org.name} (plan: ${req.org.plan})\n` +
      `Agents: ${agentCount}, Workspaces: ${wsCount}\n\n` +
      `Last 20 observations:\n` +
      (recent || []).map((o) => `- [${o.type}] ${o.title}`).join('\n');

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
      model: result.model,
      usage: result.usage,
    });
  } catch (err) {
    handleAnthropicError(err, res);
  }
});

import { estimateCost } from '../lib/pricing.js';

// ── Usage summary for the dashboard ──
router.get(`/api/${API_VERSION}/insights/usage`, authenticate, async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const since = new Date(Date.now() - Number(days) * 86400 * 1000).toISOString();

    const { data, error } = await supabase
      .from('anthropic_usage')
      .select('endpoint,model,input_tokens,output_tokens,cache_read_tokens,cache_creation_tokens,created_at')
      .eq('org_id', req.org.id)
      .gte('created_at', since)
      .order('created_at', { ascending: false });
    if (error) throw error;

    const totals = { calls: 0, input: 0, output: 0, cache_read: 0, cache_creation: 0, cost_usd: 0 };
    const byEndpoint = {};
    const byModel = {};

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
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
