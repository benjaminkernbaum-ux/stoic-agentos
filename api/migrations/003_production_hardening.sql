-- =============================================
-- Stoic AgentOS — Migration 003
-- Production Hardening: Indexes + Constraints
-- Run in Supabase SQL Editor
-- =============================================

-- ── Performance Indexes ──────────────────────

-- Traces: hot queries
CREATE INDEX IF NOT EXISTS idx_traces_org_status ON traces(org_id, status);
CREATE INDEX IF NOT EXISTS idx_traces_org_agent ON traces(org_id, agent);
CREATE INDEX IF NOT EXISTS idx_traces_status_created ON traces(status, created_at DESC);

-- Spans: model breakdown queries
CREATE INDEX IF NOT EXISTS idx_spans_provider_model ON spans(provider, model);
CREATE INDEX IF NOT EXISTS idx_spans_org_provider ON spans(org_id, provider);

-- Knowledge edges: graph queries
CREATE INDEX IF NOT EXISTS idx_edges_target ON knowledge_edges(org_id, target_entity);
CREATE INDEX IF NOT EXISTS idx_edges_relationship ON knowledge_edges(org_id, relationship);

-- Alert events: unacknowledged alerts
CREATE INDEX IF NOT EXISTS idx_alert_events_unack ON alert_events(org_id, acknowledged, created_at DESC);

-- ── Verify RLS is enabled on all tables ──────

DO $$
DECLARE
  tbl TEXT;
  rls_on BOOLEAN;
BEGIN
  FOR tbl IN
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public'
    AND tablename IN ('traces', 'spans', 'knowledge_edges', 'alert_rules', 'alert_events',
                      'organizations', 'org_members', 'api_keys', 'observations',
                      'agents', 'workspaces', 'knowledge_items')
  LOOP
    SELECT relrowsecurity INTO rls_on
    FROM pg_class WHERE relname = tbl;

    IF NOT rls_on THEN
      RAISE WARNING 'RLS NOT ENABLED on table: %', tbl;
      EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', tbl);
      RAISE NOTICE 'RLS ENABLED on table: %', tbl;
    END IF;
  END LOOP;
END $$;

-- ── Table Statistics View ────────────────────

CREATE OR REPLACE VIEW v_table_stats AS
SELECT
  schemaname,
  relname AS table_name,
  n_live_tup AS row_count,
  n_dead_tup AS dead_rows,
  last_vacuum,
  last_autovacuum,
  last_analyze
FROM pg_stat_user_tables
WHERE schemaname = 'public'
ORDER BY n_live_tup DESC;

-- ══════════════════════════════════════════════
-- DONE — Indexes + RLS verification complete
-- ══════════════════════════════════════════════
