-- ═══════════════════════════════════════════════════════
-- Migration 009: Row-Level Security for Memory & Audit
-- Stoic AgentOS — Three-Tier Memory + Compliance
-- ═══════════════════════════════════════════════════════
-- Apply via Supabase Dashboard → SQL Editor
-- ═══════════════════════════════════════════════════════

-- Enable RLS on all new tables
ALTER TABLE working_memory ENABLE ROW LEVEL SECURITY;
ALTER TABLE episodic_memory ENABLE ROW LEVEL SECURITY;
ALTER TABLE semantic_memory ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;


-- ═══════════════════════════════════════════
-- WORKING MEMORY — org-isolated CRUD
-- ═══════════════════════════════════════════

CREATE POLICY "working_memory_select_org"
  ON working_memory FOR SELECT
  USING (org_id = auth.uid()::uuid OR org_id IN (
    SELECT org_id FROM org_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "working_memory_insert_org"
  ON working_memory FOR INSERT
  WITH CHECK (org_id = auth.uid()::uuid OR org_id IN (
    SELECT org_id FROM org_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "working_memory_update_org"
  ON working_memory FOR UPDATE
  USING (org_id = auth.uid()::uuid OR org_id IN (
    SELECT org_id FROM org_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "working_memory_delete_org"
  ON working_memory FOR DELETE
  USING (org_id = auth.uid()::uuid OR org_id IN (
    SELECT org_id FROM org_members WHERE user_id = auth.uid()
  ));


-- ═══════════════════════════════════════════
-- EPISODIC MEMORY — org-isolated, no deletes
-- ═══════════════════════════════════════════

CREATE POLICY "episodic_memory_select_org"
  ON episodic_memory FOR SELECT
  USING (org_id = auth.uid()::uuid OR org_id IN (
    SELECT org_id FROM org_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "episodic_memory_insert_org"
  ON episodic_memory FOR INSERT
  WITH CHECK (org_id = auth.uid()::uuid OR org_id IN (
    SELECT org_id FROM org_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "episodic_memory_update_org"
  ON episodic_memory FOR UPDATE
  USING (org_id = auth.uid()::uuid OR org_id IN (
    SELECT org_id FROM org_members WHERE user_id = auth.uid()
  ));

-- No DELETE policy for episodic memory — invalidate instead


-- ═══════════════════════════════════════════
-- SEMANTIC MEMORY — org-isolated CRUD
-- ═══════════════════════════════════════════

CREATE POLICY "semantic_memory_select_org"
  ON semantic_memory FOR SELECT
  USING (org_id = auth.uid()::uuid OR org_id IN (
    SELECT org_id FROM org_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "semantic_memory_insert_org"
  ON semantic_memory FOR INSERT
  WITH CHECK (org_id = auth.uid()::uuid OR org_id IN (
    SELECT org_id FROM org_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "semantic_memory_update_org"
  ON semantic_memory FOR UPDATE
  USING (org_id = auth.uid()::uuid OR org_id IN (
    SELECT org_id FROM org_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "semantic_memory_delete_org"
  ON semantic_memory FOR DELETE
  USING (org_id = auth.uid()::uuid OR org_id IN (
    SELECT org_id FROM org_members WHERE user_id = auth.uid()
  ));


-- ═══════════════════════════════════════════
-- AUDIT LOG — org-isolated, INSERT + SELECT only
-- EU AI Act: audit logs must be immutable
-- ═══════════════════════════════════════════

CREATE POLICY "audit_log_select_org"
  ON audit_log FOR SELECT
  USING (org_id = auth.uid()::uuid OR org_id IN (
    SELECT org_id FROM org_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "audit_log_insert_org"
  ON audit_log FOR INSERT
  WITH CHECK (org_id = auth.uid()::uuid OR org_id IN (
    SELECT org_id FROM org_members WHERE user_id = auth.uid()
  ));

-- No UPDATE policy for audit_log — immutable by design
-- No DELETE policy for audit_log — compliance requirement


-- ═══════════════════════════════════════════
-- SERVICE ROLE BYPASS (for API server)
-- The API server uses the service_role key which
-- bypasses RLS automatically in Supabase.
-- These policies only apply to direct client access.
-- ═══════════════════════════════════════════

-- Grant service_role full access (already default in Supabase)
-- This comment is documentation — no SQL needed.

-- ═══════════════════════════════════════════
-- INDEXES for Memory Performance
-- ═══════════════════════════════════════════

-- Working memory: session lookups
CREATE INDEX IF NOT EXISTS idx_working_memory_session
  ON working_memory(org_id, session_id);

CREATE INDEX IF NOT EXISTS idx_working_memory_expires
  ON working_memory(expires_at)
  WHERE expires_at IS NOT NULL;

-- Episodic memory: time-series queries
CREATE INDEX IF NOT EXISTS idx_episodic_memory_event_type
  ON episodic_memory(org_id, event_type);

CREATE INDEX IF NOT EXISTS idx_episodic_memory_importance
  ON episodic_memory(org_id, importance DESC);

CREATE INDEX IF NOT EXISTS idx_episodic_memory_valid
  ON episodic_memory(org_id, valid_from, valid_to);

-- Semantic memory: triple lookups
CREATE INDEX IF NOT EXISTS idx_semantic_memory_subject
  ON semantic_memory(org_id, subject);

CREATE INDEX IF NOT EXISTS idx_semantic_memory_object
  ON semantic_memory(org_id, object);

CREATE INDEX IF NOT EXISTS idx_semantic_memory_relation
  ON semantic_memory(org_id, relation);

CREATE INDEX IF NOT EXISTS idx_semantic_memory_confidence
  ON semantic_memory(org_id, confidence DESC);

-- Audit log: compliance queries
CREATE INDEX IF NOT EXISTS idx_audit_log_event_type
  ON audit_log(org_id, event_type);

CREATE INDEX IF NOT EXISTS idx_audit_log_verdict
  ON audit_log(org_id, verdict);

CREATE INDEX IF NOT EXISTS idx_audit_log_timerange
  ON audit_log(org_id, created_at DESC);
