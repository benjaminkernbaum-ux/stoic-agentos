/**
 * ═══════════════════════════════════════════════════════
 *  Stoic AgentOS — Traces & Spans API
 * ═══════════════════════════════════════════════════════
 *  Full CRUD + analytics for LLM call tracing.
 *  Integrates with the SDK's auto-instrumentation layer.
 *
 *  Endpoints:
 *    POST   /api/v1/traces              Start a trace
 *    PATCH  /api/v1/traces/:id          End/update a trace
 *    GET    /api/v1/traces              List traces (filterable)
 *    GET    /api/v1/traces/analytics    Aggregated cost/token/latency analytics
 *    GET    /api/v1/traces/stats        Quick stats summary
 *    GET    /api/v1/traces/:traceId     Get single trace + all spans
 *    POST   /api/v1/traces/:id/spans    Add a span to a trace
 *    POST   /api/v1/traces/ingest       Batch ingest trace + spans (SDK primary)
 */

import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { authenticate } from '../middleware/auth.js';
import { supabase, checkLimit, PLAN_LIMITS } from '../middleware/db.js';
import { calculateCost } from '../middleware/cost.js';

const router = Router();
const API_VERSION = 'v1';

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  TRACES — CRUD
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * POST /api/v1/traces — Start a new trace
 * Body: { name, agent?, trace_id?, metadata? }
 */
router.post(`/api/${API_VERSION}/traces`, authenticate, async (req, res) => {
  try {
    const { name, agent, trace_id, metadata } = req.body;
    if (!name) return res.status(400).json({ error: 'name is required' });

    // Check monthly trace limit
    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
    const { count } = await supabase
      .from('traces')
      .select('*', { count: 'exact', head: true })
      .eq('org_id', req.org.id)
      .gte('created_at', monthStart);

    if (!checkLimit(req.org.plan, 'traces', count)) {
      return res.status(429).json({
        error: 'Monthly trace limit reached',
        limit: PLAN_LIMITS[req.org.plan]?.traces,
        current: count,
        upgrade_url: '/pricing',
      });
    }

    const { data, error } = await supabase
      .from('traces')
      .insert({
        org_id: req.org.id,
        trace_id: trace_id || `tr_${uuidv4().replace(/-/g, '').slice(0, 16)}`,
        name,
        agent: agent || null,
        status: 'running',
        metadata: metadata || {},
        started_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;

    console.log(`📊 Trace started: ${name} [${data.trace_id}]`);
    res.status(201).json(data);
  } catch (err) {
    console.error('Trace create error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

/**
 * PATCH /api/v1/traces/:id — End/update a trace
 * Body: { status?, duration_ms?, metadata? }
 */
router.patch(`/api/${API_VERSION}/traces/:id`, authenticate, async (req, res) => {
  try {
    const { status, duration_ms, metadata } = req.body;
    const updates = {};

    if (status) {
      updates.status = status;
      if (status === 'success' || status === 'error') {
        updates.ended_at = new Date().toISOString();
      }
    }
    if (duration_ms !== undefined) updates.duration_ms = duration_ms;
    if (metadata) updates.metadata = metadata;

    const { data, error } = await supabase
      .from('traces')
      .update(updates)
      .eq('id', req.params.id)
      .eq('org_id', req.org.id)
      .select()
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Trace not found' });

    res.json(data);
  } catch (err) {
    console.error('Trace update error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/v1/traces — List traces with filtering
 * Query: limit, offset, status, agent, from, to
 */
router.get(`/api/${API_VERSION}/traces`, authenticate, async (req, res) => {
  try {
    const { limit = 50, offset = 0, agent, status, from, to } = req.query;

    let query = supabase
      .from('traces')
      .select('*')
      .eq('org_id', req.org.id)
      .order('created_at', { ascending: false })
      .range(+offset, +offset + +limit - 1);

    if (agent) query = query.eq('agent', agent);
    if (status) query = query.eq('status', status);
    if (from) query = query.gte('started_at', from);
    if (to) query = query.lte('started_at', to);

    const { data, error } = await query;
    if (error) throw error;
    res.json(data || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  ANALYTICS & STATS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * GET /api/v1/traces/analytics — Rich analytics with breakdowns
 * Query: period (7d|30d|90d), agent?
 */
router.get(`/api/${API_VERSION}/traces/analytics`, authenticate, async (req, res) => {
  try {
    const { period = '30d', agent } = req.query;
    const days = parseInt(period) || 30;
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

    // Trace aggregates
    let traceQuery = supabase
      .from('traces')
      .select('status, duration_ms, total_tokens, total_cost_usd, span_count, agent')
      .eq('org_id', req.org.id)
      .gte('created_at', since);
    if (agent) traceQuery = traceQuery.eq('agent', agent);

    const { data: traces, error: traceErr } = await traceQuery;
    if (traceErr) throw traceErr;

    // Span aggregates (model breakdown)
    let spanQuery = supabase
      .from('spans')
      .select('provider, model, prompt_tokens, completion_tokens, total_tokens, cost_usd, latency_ms, status')
      .eq('org_id', req.org.id)
      .gte('created_at', since);

    const { data: spans, error: spanErr } = await spanQuery;
    if (spanErr) throw spanErr;

    // Compute aggregates
    const totalTraces = traces?.length || 0;
    const successTraces = traces?.filter(t => t.status === 'success').length || 0;
    const errorTraces = traces?.filter(t => t.status === 'error').length || 0;
    const totalTokens = traces?.reduce((sum, t) => sum + (t.total_tokens || 0), 0) || 0;
    const totalCost = traces?.reduce((sum, t) => sum + parseFloat(t.total_cost_usd || 0), 0) || 0;
    const avgLatency = totalTraces
      ? Math.round(traces.reduce((sum, t) => sum + (t.duration_ms || 0), 0) / totalTraces)
      : 0;
    const totalSpans = spans?.length || 0;

    // Model breakdown
    const modelMap = {};
    spans?.forEach(s => {
      const key = `${s.provider}/${s.model}`;
      if (!modelMap[key]) {
        modelMap[key] = { provider: s.provider, model: s.model, calls: 0, tokens: 0, cost: 0, errors: 0 };
      }
      modelMap[key].calls++;
      modelMap[key].tokens += s.total_tokens || 0;
      modelMap[key].cost += parseFloat(s.cost_usd || 0);
      if (s.status === 'error') modelMap[key].errors++;
    });
    const modelBreakdown = Object.values(modelMap)
      .sort((a, b) => b.cost - a.cost)
      .map(m => ({ ...m, cost: parseFloat(m.cost.toFixed(6)) }));

    // Agent breakdown
    const agentMap = {};
    traces?.forEach(t => {
      const name = t.agent || 'unknown';
      if (!agentMap[name]) {
        agentMap[name] = { agent: name, traces: 0, tokens: 0, cost: 0, errors: 0 };
      }
      agentMap[name].traces++;
      agentMap[name].tokens += t.total_tokens || 0;
      agentMap[name].cost += parseFloat(t.total_cost_usd || 0);
      if (t.status === 'error') agentMap[name].errors++;
    });
    const agentBreakdown = Object.values(agentMap)
      .sort((a, b) => b.cost - a.cost)
      .map(a => ({ ...a, cost: parseFloat(a.cost.toFixed(6)) }));

    res.json({
      period: `${days}d`,
      totals: {
        traces: totalTraces,
        spans: totalSpans,
        tokens: totalTokens,
        cost_usd: parseFloat(totalCost.toFixed(6)),
        success: successTraces,
        errors: errorTraces,
        error_rate: totalTraces ? parseFloat(((errorTraces / totalTraces) * 100).toFixed(2)) : 0,
      },
      averages: {
        latency_ms: avgLatency,
        tokens_per_trace: totalTraces ? Math.round(totalTokens / totalTraces) : 0,
        cost_per_trace: totalTraces ? parseFloat((totalCost / totalTraces).toFixed(6)) : 0,
        spans_per_trace: totalTraces ? parseFloat((totalSpans / totalTraces).toFixed(1)) : 0,
      },
      by_model: modelBreakdown,
      by_agent: agentBreakdown,
    });
  } catch (err) {
    console.error('Analytics error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/v1/traces/stats — Quick stats (lighter than analytics)
 * Query: from?, to?
 */
router.get(`/api/${API_VERSION}/traces/stats`, authenticate, async (req, res) => {
  try {
    const { from, to } = req.query;

    let query = supabase
      .from('traces')
      .select('*')
      .eq('org_id', req.org.id)
      .order('created_at', { ascending: false })
      .limit(1000);

    if (from) query = query.gte('started_at', from);
    if (to) query = query.lte('started_at', to);

    const { data: traces, error } = await query;
    if (error) throw error;

    const allTraces = traces || [];
    const totalTraces = allTraces.length;
    const totalTokens = allTraces.reduce((s, t) => s + (t.total_tokens || 0), 0);
    const totalCost = allTraces.reduce((s, t) => s + parseFloat(t.total_cost_usd || 0), 0);
    const avgLatency = totalTraces > 0
      ? Math.round(allTraces.reduce((s, t) => s + (t.duration_ms || 0), 0) / totalTraces)
      : 0;
    const errorCount = allTraces.filter(t => t.status === 'error').length;
    const errorRate = totalTraces > 0 ? (errorCount / totalTraces * 100).toFixed(1) : 0;

    // Provider + model breakdown from spans
    const { data: spans } = await supabase
      .from('spans')
      .select('provider, model, total_tokens, cost_usd')
      .eq('org_id', req.org.id)
      .order('created_at', { ascending: false })
      .limit(5000);

    const providerBreakdown = {};
    const modelBreakdown = {};

    (spans || []).forEach(sp => {
      const p = sp.provider || 'unknown';
      if (!providerBreakdown[p]) providerBreakdown[p] = { calls: 0, tokens: 0, cost: 0 };
      providerBreakdown[p].calls++;
      providerBreakdown[p].tokens += sp.total_tokens || 0;
      providerBreakdown[p].cost += parseFloat(sp.cost_usd || 0);

      const m = sp.model || 'unknown';
      if (!modelBreakdown[m]) modelBreakdown[m] = { calls: 0, tokens: 0, cost: 0 };
      modelBreakdown[m].calls++;
      modelBreakdown[m].tokens += sp.total_tokens || 0;
      modelBreakdown[m].cost += parseFloat(sp.cost_usd || 0);
    });

    res.json({
      total_traces: totalTraces,
      total_tokens: totalTokens,
      total_cost_usd: Math.round(totalCost * 1000000) / 1000000,
      avg_latency_ms: avgLatency,
      error_count: errorCount,
      error_rate: parseFloat(errorRate),
      total_spans: (spans || []).length,
      providers: providerBreakdown,
      models: modelBreakdown,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  TRACE DETAIL
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * GET /api/v1/traces/:traceId — Get single trace + all spans
 */
router.get(`/api/${API_VERSION}/traces/:traceId`, authenticate, async (req, res) => {
  try {
    const { traceId } = req.params;

    // Try by trace_id first, then by UUID id
    let traceResult = await supabase
      .from('traces')
      .select('*')
      .eq('org_id', req.org.id)
      .eq('trace_id', traceId)
      .single();

    if (traceResult.error || !traceResult.data) {
      // Try by UUID
      traceResult = await supabase
        .from('traces')
        .select('*')
        .eq('org_id', req.org.id)
        .eq('id', traceId)
        .single();
    }

    if (traceResult.error || !traceResult.data) {
      return res.status(404).json({ error: 'Trace not found' });
    }

    const trace = traceResult.data;

    const { data: spans, error: spanErr } = await supabase
      .from('spans')
      .select('*')
      .eq('trace_id', trace.id)
      .order('started_at', { ascending: true });

    if (spanErr) throw spanErr;

    res.json({ ...trace, spans: spans || [] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  SPANS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * POST /api/v1/traces/:id/spans — Add a span to an existing trace
 *
 * Body: { provider, model, type?, prompt_tokens, completion_tokens,
 *         latency_ms?, status?, error_message?, metadata? }
 *
 * Auto-calculates cost_usd and rolls up parent trace totals.
 */
router.post(`/api/${API_VERSION}/traces/:id/spans`, authenticate, async (req, res) => {
  try {
    const traceId = req.params.id;
    const {
      provider, model, type,
      prompt_tokens = 0, completion_tokens = 0,
      latency_ms, status = 'success', error_message,
      started_at, ended_at, metadata,
    } = req.body;

    if (!provider || !model) {
      return res.status(400).json({ error: 'provider and model are required' });
    }

    // Verify trace exists and belongs to org
    const { data: trace, error: traceErr } = await supabase
      .from('traces')
      .select('id, org_id, total_tokens, total_cost_usd, span_count')
      .eq('id', traceId)
      .eq('org_id', req.org.id)
      .single();

    if (traceErr || !trace) {
      return res.status(404).json({ error: 'Trace not found' });
    }

    // Auto-calculate cost
    const totalTokens = prompt_tokens + completion_tokens;
    const costUsd = calculateCost(provider, model, prompt_tokens, completion_tokens);

    // Insert span
    const { data: span, error: spanErr } = await supabase
      .from('spans')
      .insert({
        org_id: req.org.id,
        trace_id: traceId,
        span_id: `sp_${uuidv4().replace(/-/g, '').slice(0, 16)}`,
        provider,
        model,
        type: type || 'chat.completions',
        prompt_tokens,
        completion_tokens,
        total_tokens: totalTokens,
        latency_ms: latency_ms || null,
        cost_usd: costUsd,
        status,
        error_message: error_message || null,
        started_at: started_at || new Date().toISOString(),
        ended_at: ended_at || new Date().toISOString(),
        metadata: metadata || {},
      })
      .select()
      .single();

    if (spanErr) throw spanErr;

    // Roll-up: update parent trace totals
    await supabase
      .from('traces')
      .update({
        total_tokens: (trace.total_tokens || 0) + totalTokens,
        total_cost_usd: parseFloat(((parseFloat(trace.total_cost_usd) || 0) + costUsd).toFixed(6)),
        span_count: (trace.span_count || 0) + 1,
      })
      .eq('id', traceId);

    console.log(`📊 Span added: ${provider}/${model} — ${totalTokens} tok — $${costUsd}`);
    res.status(201).json(span);
  } catch (err) {
    console.error('Span create error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  BATCH INGEST (SDK primary endpoint)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * POST /api/v1/traces/ingest — Batch ingest trace + spans
 *
 * Body: {
 *   trace: { trace_id, name, agent?, status, duration_ms, metadata? },
 *   spans: [{ provider, model, prompt_tokens, completion_tokens, latency_ms, ... }]
 * }
 *
 * Server-side cost calculation: if span.cost_usd is missing or 0,
 * we compute it from provider/model/tokens automatically.
 */
router.post(`/api/${API_VERSION}/traces/ingest`, authenticate, async (req, res) => {
  try {
    const { trace, spans } = req.body;
    if (!trace || !trace.trace_id || !trace.name) {
      return res.status(400).json({ error: 'trace object with trace_id and name required' });
    }

    // Check monthly trace limit
    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
    const { count } = await supabase
      .from('traces')
      .select('*', { count: 'exact', head: true })
      .eq('org_id', req.org.id)
      .gte('created_at', monthStart);

    if (!checkLimit(req.org.plan, 'traces', count)) {
      return res.status(429).json({
        error: 'Monthly trace limit reached',
        limit: PLAN_LIMITS[req.org.plan]?.traces,
        current: count,
        upgrade_url: '/pricing',
      });
    }

    // ── Server-side cost calculation for each span ──
    let computedTotalTokens = 0;
    let computedTotalCost = 0;
    const processedSpans = (spans || []).map(s => {
      const promptTok = s.prompt_tokens || 0;
      const compTok = s.completion_tokens || 0;
      const tok = promptTok + compTok;
      // Use SDK-provided cost if available, otherwise compute server-side
      const cost = s.cost_usd && parseFloat(s.cost_usd) > 0
        ? parseFloat(s.cost_usd)
        : calculateCost(s.provider || 'openai', s.model || 'gpt-4o', promptTok, compTok);
      computedTotalTokens += tok;
      computedTotalCost += cost;
      return { ...s, total_tokens: tok, cost_usd: cost };
    });

    // Use server-computed totals, fallback to SDK-provided
    const finalTokens = computedTotalTokens || trace.total_tokens || 0;
    const finalCost = computedTotalCost || parseFloat(trace.total_cost_usd || 0);

    // Upsert trace — SDK may send updates to a running trace
    const { data: existingTrace } = await supabase
      .from('traces')
      .select('id, span_count')
      .eq('org_id', req.org.id)
      .eq('trace_id', trace.trace_id)
      .single();

    let traceDbId;

    if (existingTrace) {
      // Update existing trace
      const { data: updated, error: updateErr } = await supabase
        .from('traces')
        .update({
          status: trace.status || 'success',
          duration_ms: trace.duration_ms || null,
          total_tokens: finalTokens,
          total_cost_usd: parseFloat(finalCost.toFixed(6)),
          span_count: (existingTrace.span_count || 0) + processedSpans.length,
          ended_at: trace.ended_at || new Date().toISOString(),
          metadata: trace.metadata || {},
        })
        .eq('id', existingTrace.id)
        .select('id')
        .single();

      if (updateErr) throw updateErr;
      traceDbId = updated.id;
    } else {
      // Insert new trace
      const { data: newTrace, error: insertErr } = await supabase
        .from('traces')
        .insert({
          org_id: req.org.id,
          trace_id: trace.trace_id,
          name: trace.name,
          agent: trace.agent || null,
          status: trace.status || 'running',
          duration_ms: trace.duration_ms || null,
          total_tokens: finalTokens,
          total_cost_usd: parseFloat(finalCost.toFixed(6)),
          span_count: processedSpans.length,
          started_at: trace.started_at || new Date().toISOString(),
          ended_at: trace.ended_at || null,
          metadata: trace.metadata || {},
        })
        .select('id')
        .single();

      if (insertErr) throw insertErr;
      traceDbId = newTrace.id;
    }

    // Insert spans
    if (processedSpans.length > 0) {
      const spanRows = processedSpans.map(span => ({
        org_id: req.org.id,
        trace_id: traceDbId,
        span_id: span.span_id || `sp_${uuidv4().replace(/-/g, '').slice(0, 12)}`,
        provider: span.provider || 'unknown',
        model: span.model || 'unknown',
        type: span.type || 'chat.completions',
        prompt_tokens: span.prompt_tokens || 0,
        completion_tokens: span.completion_tokens || 0,
        total_tokens: span.total_tokens || 0,
        latency_ms: span.latency_ms || null,
        cost_usd: span.cost_usd || 0,
        status: span.status || 'success',
        error_message: span.error_message || null,
        metadata: span.metadata || {},
        started_at: span.started_at || new Date().toISOString(),
        ended_at: span.ended_at || new Date().toISOString(),
      }));

      const { error: spanErr } = await supabase.from('spans').insert(spanRows);
      if (spanErr) {
        console.error('Batch span insert error:', spanErr.message);
        // Non-fatal — trace was already created
      }
    }

    console.log(`📊 Trace ingested: ${trace.trace_id} — ${processedSpans.length} spans, ${finalTokens} tokens, $${finalCost.toFixed(4)}`);

    res.status(201).json({
      trace_id: trace.trace_id,
      db_id: traceDbId,
      spans_inserted: processedSpans.length,
      total_tokens: finalTokens,
      total_cost_usd: parseFloat(finalCost.toFixed(6)),
    });
  } catch (err) {
    console.error('Trace ingest error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

export default router;
