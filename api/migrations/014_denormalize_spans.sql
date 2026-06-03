-- ═══════════════════════════════════════════════════════
--  Migration 014: Denormalize Spans for Query Performance
-- ═══════════════════════════════════════════════════════
--
--  LESSON FROM LANGFUSE V4: Propagating trace-level attributes
--  (agent, workspace, session) directly into the spans table
--  eliminates expensive JOINs on read paths.
--
--  Before: SELECT * FROM traces JOIN spans ON traces.id = spans.trace_id
--          WHERE traces.agent = 'my-agent'
--  After:  SELECT * FROM spans WHERE agent = 'my-agent'
--
--  Impact: ~10-50× faster dashboard queries on large datasets.

-- Add denormalized columns to spans
ALTER TABLE spans ADD COLUMN IF NOT EXISTS agent TEXT;
ALTER TABLE spans ADD COLUMN IF NOT EXISTS workspace_id UUID;
ALTER TABLE spans ADD COLUMN IF NOT EXISTS trace_name TEXT;
ALTER TABLE spans ADD COLUMN IF NOT EXISTS user_session TEXT;

-- Composite indexes for common dashboard queries
CREATE INDEX IF NOT EXISTS idx_spans_agent ON spans(org_id, agent) WHERE agent IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_spans_workspace ON spans(org_id, workspace_id) WHERE workspace_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_spans_model_cost ON spans(org_id, model, cost_usd);
CREATE INDEX IF NOT EXISTS idx_spans_started_at ON spans(org_id, started_at DESC);

-- Backfill existing spans from traces (one-time)
UPDATE spans s
SET
  agent = t.agent,
  trace_name = t.name
FROM traces t
WHERE s.trace_id = t.id
  AND s.agent IS NULL;

-- Add comment for documentation
COMMENT ON COLUMN spans.agent IS 'Denormalized from traces.agent — avoids JOIN on read path';
COMMENT ON COLUMN spans.workspace_id IS 'Denormalized from traces context — avoids JOIN on read path';
COMMENT ON COLUMN spans.trace_name IS 'Denormalized from traces.name — avoids JOIN on read path';
COMMENT ON COLUMN spans.user_session IS 'Session ID propagated from SDK — enables session-level filtering without JOIN';
