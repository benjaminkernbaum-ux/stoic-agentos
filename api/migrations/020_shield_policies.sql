-- =============================================
-- Stoic AgentOS — Migration 020
-- Active Shield: Declarative Policies
-- Run in Supabase SQL Editor (after 019)
-- =============================================
--
-- Moves Shield enforcement from client-side config (sdk.criticalTools)
-- to server-side declarative policies. A policy matches tool names by
-- glob pattern and decides: ALLOW, REQUIRE_APPROVAL, or BLOCK.
-- Lowest priority number wins; first match decides.

CREATE TABLE IF NOT EXISTS shield_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  tool_pattern TEXT NOT NULL,            -- glob: * matches any run, ? one char (e.g. "stripe_*", "*_delete")
  action TEXT NOT NULL DEFAULT 'REQUIRE_APPROVAL',
  priority INTEGER NOT NULL DEFAULT 100, -- lower number = evaluated first
  timeout_seconds INTEGER NOT NULL DEFAULT 300, -- HITL approval window
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

-- Same org-isolation model as pending_approvals (018)
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

-- Per-approval timeout (set from the matching policy at suspend time).
-- The server-side sweep prefers timeout_at when present, and falls back
-- to the legacy fixed 5-minute window (created_at + 5min) when NULL.
ALTER TABLE pending_approvals
  ADD COLUMN IF NOT EXISTS timeout_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS policy_id UUID;

CREATE INDEX IF NOT EXISTS idx_pending_approvals_timeout
  ON pending_approvals (status, timeout_at)
  WHERE status = 'PENDING';
