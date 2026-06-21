-- =============================================
-- Stoic AgentOS — Migration 016
-- Analytics RPCs + Optimized Indexes
-- Run in Supabase SQL Editor
-- =============================================
-- Moves heavy analytics aggregation from Node.js (full-table scan)
-- to PostgreSQL (server-side computation). Reduces memory usage and
-- response times by 10-100x for orgs with >1k traces.
-- =============================================

-- ── Optimized index for span analytics by model ──
CREATE INDEX IF NOT EXISTS idx_spans_org_model_created
  ON spans(org_id, model, created_at DESC);

-- ── Optimized index for trace analytics by agent ──
CREATE INDEX IF NOT EXISTS idx_traces_org_agent_created
  ON traces(org_id, agent, created_at DESC);

-- ══════════════════════════════════════════════
--  RPC: get_trace_analytics
--  Replaces the /traces/analytics endpoint's
--  full-table scan + JS aggregation.
-- ══════════════════════════════════════════════

CREATE OR REPLACE FUNCTION get_trace_analytics(
  p_org_id UUID,
  p_since TIMESTAMPTZ,
  p_agent TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'totals', (
      SELECT json_build_object(
        'traces', COALESCE(COUNT(*), 0),
        'tokens', COALESCE(SUM(total_tokens), 0),
        'cost_usd', COALESCE(ROUND(SUM(total_cost_usd)::numeric, 6), 0),
        'success', COALESCE(COUNT(*) FILTER (WHERE status = 'success'), 0),
        'errors', COALESCE(COUNT(*) FILTER (WHERE status = 'error'), 0),
        'error_rate', CASE
          WHEN COUNT(*) > 0 THEN ROUND(
            (COUNT(*) FILTER (WHERE status = 'error')::numeric / COUNT(*)::numeric) * 100, 2
          )
          ELSE 0
        END,
        'avg_latency_ms', COALESCE(ROUND(AVG(duration_ms)), 0),
        'avg_tokens_per_trace', CASE
          WHEN COUNT(*) > 0 THEN ROUND(SUM(total_tokens)::numeric / COUNT(*)::numeric)
          ELSE 0
        END,
        'avg_cost_per_trace', CASE
          WHEN COUNT(*) > 0 THEN ROUND((SUM(total_cost_usd)::numeric / COUNT(*)::numeric), 6)
          ELSE 0
        END,
        'avg_spans_per_trace', CASE
          WHEN COUNT(*) > 0 THEN ROUND((SUM(span_count)::numeric / COUNT(*)::numeric), 1)
          ELSE 0
        END
      )
      FROM traces
      WHERE org_id = p_org_id
        AND created_at >= p_since
        AND (p_agent IS NULL OR agent = p_agent)
    ),
    'total_spans', (
      SELECT COALESCE(COUNT(*), 0)
      FROM spans
      WHERE org_id = p_org_id
        AND created_at >= p_since
    ),
    'by_model', (
      SELECT COALESCE(json_agg(row_to_json(m)), '[]'::json)
      FROM (
        SELECT
          provider,
          model,
          COUNT(*) AS calls,
          COALESCE(SUM(total_tokens), 0) AS tokens,
          ROUND(COALESCE(SUM(cost_usd), 0)::numeric, 6) AS cost,
          COUNT(*) FILTER (WHERE status = 'error') AS errors
        FROM spans
        WHERE org_id = p_org_id AND created_at >= p_since
        GROUP BY provider, model
        ORDER BY SUM(cost_usd) DESC NULLS LAST
      ) m
    ),
    'by_agent', (
      SELECT COALESCE(json_agg(row_to_json(a)), '[]'::json)
      FROM (
        SELECT
          COALESCE(agent, 'unknown') AS agent,
          COUNT(*) AS traces,
          COALESCE(SUM(total_tokens), 0) AS tokens,
          ROUND(COALESCE(SUM(total_cost_usd), 0)::numeric, 6) AS cost,
          COUNT(*) FILTER (WHERE status = 'error') AS errors
        FROM traces
        WHERE org_id = p_org_id
          AND created_at >= p_since
          AND (p_agent IS NULL OR agent = p_agent)
        GROUP BY agent
        ORDER BY SUM(total_cost_usd) DESC NULLS LAST
      ) a
    )
  ) INTO result;

  RETURN result;
END;
$$;

-- ══════════════════════════════════════════════
--  RPC: get_trace_stats
--  Replaces the /traces/stats endpoint's
--  dual-query + JS aggregation.
-- ══════════════════════════════════════════════

CREATE OR REPLACE FUNCTION get_trace_stats(
  p_org_id UUID,
  p_from TIMESTAMPTZ DEFAULT NULL,
  p_to TIMESTAMPTZ DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'total_traces', (
      SELECT COALESCE(COUNT(*), 0)
      FROM traces
      WHERE org_id = p_org_id
        AND (p_from IS NULL OR started_at >= p_from)
        AND (p_to IS NULL OR started_at <= p_to)
    ),
    'total_tokens', (
      SELECT COALESCE(SUM(total_tokens), 0)
      FROM traces
      WHERE org_id = p_org_id
        AND (p_from IS NULL OR started_at >= p_from)
        AND (p_to IS NULL OR started_at <= p_to)
    ),
    'total_cost_usd', (
      SELECT ROUND(COALESCE(SUM(total_cost_usd), 0)::numeric, 6)
      FROM traces
      WHERE org_id = p_org_id
        AND (p_from IS NULL OR started_at >= p_from)
        AND (p_to IS NULL OR started_at <= p_to)
    ),
    'avg_latency_ms', (
      SELECT COALESCE(ROUND(AVG(duration_ms)), 0)
      FROM traces
      WHERE org_id = p_org_id
        AND (p_from IS NULL OR started_at >= p_from)
        AND (p_to IS NULL OR started_at <= p_to)
    ),
    'error_count', (
      SELECT COALESCE(COUNT(*), 0)
      FROM traces
      WHERE org_id = p_org_id
        AND status = 'error'
        AND (p_from IS NULL OR started_at >= p_from)
        AND (p_to IS NULL OR started_at <= p_to)
    ),
    'total_spans', (
      SELECT COALESCE(COUNT(*), 0)
      FROM spans
      WHERE org_id = p_org_id
        AND (p_from IS NULL OR created_at >= p_from)
        AND (p_to IS NULL OR created_at <= p_to)
    ),
    'providers', (
      SELECT COALESCE(json_object_agg(provider, json_build_object(
        'calls', calls, 'tokens', tokens, 'cost', cost
      )), '{}'::json)
      FROM (
        SELECT
          COALESCE(provider, 'unknown') AS provider,
          COUNT(*) AS calls,
          COALESCE(SUM(total_tokens), 0) AS tokens,
          ROUND(COALESCE(SUM(cost_usd), 0)::numeric, 6) AS cost
        FROM spans
        WHERE org_id = p_org_id
          AND (p_from IS NULL OR created_at >= p_from)
          AND (p_to IS NULL OR created_at <= p_to)
        GROUP BY provider
      ) p
    ),
    'models', (
      SELECT COALESCE(json_object_agg(model, json_build_object(
        'calls', calls, 'tokens', tokens, 'cost', cost
      )), '{}'::json)
      FROM (
        SELECT
          COALESCE(model, 'unknown') AS model,
          COUNT(*) AS calls,
          COALESCE(SUM(total_tokens), 0) AS tokens,
          ROUND(COALESCE(SUM(cost_usd), 0)::numeric, 6) AS cost
        FROM spans
        WHERE org_id = p_org_id
          AND (p_from IS NULL OR created_at >= p_from)
          AND (p_to IS NULL OR created_at <= p_to)
        GROUP BY model
      ) m
    )
  ) INTO result;

  RETURN result;
END;
$$;

-- ══════════════════════════════════════════════
-- DONE — 2 RPCs created, 2 indexes added
-- ══════════════════════════════════════════════
