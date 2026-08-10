-- ═══════════════════════════════════════════════════════════════
-- Stoic AgentOS — Active Shield: consolidated migrations 018 + 019 + 020
--
-- HOW TO RUN: paste this entire file into the Supabase SQL Editor
-- (project viiagdhtzbvkfhcjqrlz → SQL Editor → New query) and Run once.
--
-- Fully idempotent: safe to re-run even if 018/019 were applied before.
-- The final SELECT prints a checklist of what is now active.
-- ═══════════════════════════════════════════════════════════════


-- ───────────────────────────────────────────────
-- [018] pending_approvals — HITL approval queue
-- ───────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS pending_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL,
  agent_id UUID,
  trace_id TEXT,
  tool_name TEXT NOT NULL,
  tool_args JSONB DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'PENDING',
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID
);

CREATE INDEX IF NOT EXISTS idx_pending_approvals_org_status
  ON pending_approvals (org_id, status);

ALTER TABLE pending_approvals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "approvals_select_org" ON pending_approvals;
DROP POLICY IF EXISTS "approvals_insert_org" ON pending_approvals;
DROP POLICY IF EXISTS "approvals_update_org" ON pending_approvals;

CREATE POLICY "approvals_select_org" ON pending_approvals
  FOR SELECT USING (org_id = auth.uid()::uuid OR org_id IN (
    SELECT org_id FROM org_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "approvals_insert_org" ON pending_approvals
  FOR INSERT WITH CHECK (org_id = auth.uid()::uuid OR org_id IN (
    SELECT org_id FROM org_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "approvals_update_org" ON pending_approvals
  FOR UPDATE USING (org_id = auth.uid()::uuid OR org_id IN (
    SELECT org_id FROM org_members WHERE user_id = auth.uid()
  ));


-- ───────────────────────────────────────────────
-- [019] Atomic CAS transitions + CONSUMED status
-- ───────────────────────────────────────────────

ALTER TABLE pending_approvals DROP CONSTRAINT IF EXISTS chk_pending_approvals_status;

ALTER TABLE pending_approvals ADD CONSTRAINT chk_pending_approvals_status
  CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED', 'TIMEOUT', 'CONSUMED'));

CREATE OR REPLACE FUNCTION transition_approval_status(
  p_org_id UUID,
  p_approval_id UUID,
  p_from_status TEXT,
  p_to_status TEXT,
  p_user_id UUID DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  org_id UUID,
  agent_id UUID,
  trace_id TEXT,
  tool_name TEXT,
  tool_args JSONB,
  status TEXT,
  created_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID
) AS $$
BEGIN
  RETURN QUERY
  UPDATE pending_approvals
  SET
    status = p_to_status,
    resolved_at = CASE WHEN p_to_status IN ('APPROVED', 'REJECTED') THEN NOW() ELSE resolved_at END,
    resolved_by = CASE WHEN p_to_status IN ('APPROVED', 'REJECTED') THEN COALESCE(p_user_id, resolved_by) ELSE resolved_by END
  WHERE pending_approvals.id = p_approval_id
    AND pending_approvals.org_id = p_org_id
    AND pending_approvals.status = p_from_status
  RETURNING
    pending_approvals.id,
    pending_approvals.org_id,
    pending_approvals.agent_id,
    pending_approvals.trace_id,
    pending_approvals.tool_name,
    pending_approvals.tool_args,
    pending_approvals.status,
    pending_approvals.created_at,
    pending_approvals.resolved_at,
    pending_approvals.resolved_by;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Realtime (optional, ignored when unavailable)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE pending_approvals;
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    NULL; -- already in the publication
END
$$;


-- ───────────────────────────────────────────────
-- [020] shield_policies — declarative policies
-- ───────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS shield_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  tool_pattern TEXT NOT NULL,
  action TEXT NOT NULL DEFAULT 'REQUIRE_APPROVAL',
  priority INTEGER NOT NULL DEFAULT 100,
  timeout_seconds INTEGER NOT NULL DEFAULT 300,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  CONSTRAINT chk_shield_policies_action
    CHECK (action IN ('ALLOW', 'REQUIRE_APPROVAL', 'BLOCK')),
  CONSTRAINT chk_shield_policies_timeout
    CHECK (timeout_seconds BETWEEN 10 AND 86400)
);

CREATE INDEX IF NOT EXISTS idx_shield_policies_org_enabled
  ON shield_policies (org_id, enabled, priority);

ALTER TABLE shield_policies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "shield_policies_select_org" ON shield_policies;
DROP POLICY IF EXISTS "shield_policies_insert_org" ON shield_policies;
DROP POLICY IF EXISTS "shield_policies_update_org" ON shield_policies;
DROP POLICY IF EXISTS "shield_policies_delete_org" ON shield_policies;

CREATE POLICY "shield_policies_select_org" ON shield_policies
  FOR SELECT USING (org_id IN (
    SELECT org_id FROM org_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "shield_policies_insert_org" ON shield_policies
  FOR INSERT WITH CHECK (org_id IN (
    SELECT org_id FROM org_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "shield_policies_update_org" ON shield_policies
  FOR UPDATE USING (org_id IN (
    SELECT org_id FROM org_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "shield_policies_delete_org" ON shield_policies
  FOR DELETE USING (org_id IN (
    SELECT org_id FROM org_members WHERE user_id = auth.uid()
  ));

ALTER TABLE pending_approvals
  ADD COLUMN IF NOT EXISTS timeout_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS policy_id UUID;

CREATE INDEX IF NOT EXISTS idx_pending_approvals_timeout
  ON pending_approvals (status, timeout_at)
  WHERE status = 'PENDING';


-- ───────────────────────────────────────────────
-- VERIFICATION — the query result is your checklist
-- ───────────────────────────────────────────────

SELECT
  (SELECT COUNT(*) FROM information_schema.tables
     WHERE table_name = 'pending_approvals') = 1                        AS "018_pending_approvals",
  (SELECT COUNT(*) FROM information_schema.table_constraints
     WHERE constraint_name = 'chk_pending_approvals_status') = 1        AS "019_status_constraint",
  (SELECT COUNT(*) FROM pg_proc
     WHERE proname = 'transition_approval_status') >= 1                 AS "019_cas_rpc",
  (SELECT COUNT(*) FROM information_schema.tables
     WHERE table_name = 'shield_policies') = 1                          AS "020_shield_policies",
  (SELECT COUNT(*) FROM information_schema.columns
     WHERE table_name = 'pending_approvals'
       AND column_name = 'timeout_at') = 1                              AS "020_timeout_at",
  (SELECT COUNT(*) FROM pg_policies
     WHERE tablename IN ('pending_approvals', 'shield_policies')) >= 7  AS "rls_policies";
