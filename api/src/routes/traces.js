import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { supabase } from '../middleware/db.js';
import { v4 as uuidv4 } from 'uuid';

const router = Router();
const API_VERSION = 'v1';

// ── Ingest Trace + Spans (from SDK) ──
router.post(`/api/${API_VERSION}/traces/ingest`, authenticate, async (req, res) => {
  try {
    const { trace, spans } = req.body;
    if (!trace || !trace.trace_id || !trace.name) {
      return res.status(400).json({ error: 'trace object with trace_id and name required' });
    }

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
          total_tokens: trace.total_tokens || 0,
          total_cost_usd: trace.total_cost_usd || 0,
          span_count: (existingTrace.span_count || 0) + (spans?.length || 0),
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
          total_tokens: trace.total_tokens || 0,
          total_cost_usd: trace.total_cost_usd || 0,
          span_count: spans?.length || 0,
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
    if (spans?.length > 0) {
      const spanRows = spans.map(span => ({
        org_id: req.org.id,
        trace_id: traceDbId,
        span_id: span.span_id || `sp_${uuidv4().slice(0, 12)}`,
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

      const { error: spanErr } = await supabase
        .from('spans')
        .insert(spanRows);

      if (spanErr) throw spanErr;
    }

    console.log(`📊 Trace ingested: ${trace.trace_id} — ${spans?.length || 0} spans, ${trace.total_tokens || 0} tokens, $${(trace.total_cost_usd || 0).toFixed(4)}`);

    res.status(201).json({
      trace_id: trace.trace_id,
      db_id: traceDbId,
      spans_inserted: spans?.length || 0,
    });
  } catch (err) {
    console.error('Trace ingest error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── List Traces ──
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

// ── Trace Stats (aggregated) — must be before /:traceId to avoid conflict ──
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

    // Provider breakdown from spans
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

// ── Get Single Trace with Spans ──
router.get(`/api/${API_VERSION}/traces/:traceId`, authenticate, async (req, res) => {
  try {
    const { traceId } = req.params;

    const { data: trace, error: traceErr } = await supabase
      .from('traces')
      .select('*')
      .eq('org_id', req.org.id)
      .eq('trace_id', traceId)
      .single();

    if (traceErr || !trace) {
      return res.status(404).json({ error: 'Trace not found' });
    }

    const { data: spans, error: spanErr } = await supabase
      .from('spans')
      .select('*')
      .eq('trace_id', trace.id)
      .order('started_at', { ascending: true });

    if (spanErr) throw spanErr;

    res.json({
      ...trace,
      spans: spans || [],
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
