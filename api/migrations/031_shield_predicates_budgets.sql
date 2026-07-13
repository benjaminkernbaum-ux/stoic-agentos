-- =============================================
-- Stoic AgentOS — Migration 031
-- Active Shield Layer 2: Predicate Rules (CEL) + Budgets
-- Adds a nullable CEL predicate to tool_policies and a
-- fleet-wide budgets table with an atomic consume RPC.
-- Run in Supabase SQL Editor
-- =============================================

-- ── 1. CEL predicate column on tool_policies ──
-- Evaluated server-side (sandboxed cel-js) after schema validation passes.
-- NULL = no predicate (Layer 1 behavior unchanged).
ALTER TABLE tool_policies ADD COLUMN IF NOT EXISTS predicate TEXT;

-- ── 2. Budgets table ──
-- One row per (org, agent, key). agent_id NULL = fleet-wide budget shared
-- by every agent in the org. All amounts in integer cents.
CREATE TABLE IF NOT EXISTS budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL,
  agent_id UUID,                                 -- NULL = fleet-wide (org-level) budget
  key TEXT NOT NULL,                             -- e.g. tool name or logical spend bucket
  limit_cents BIGINT NOT NULL,
  spent_cents BIGINT NOT NULL DEFAULT 0,
  period TEXT NOT NULL DEFAULT 'monthly',        -- informational: monthly / weekly / total
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- NULLS NOT DISTINCT so only ONE fleet-wide (agent_id IS NULL) row per (org, key)
  CONSTRAINT uq_budgets_org_agent_key UNIQUE NULLS NOT DISTINCT (org_id, agent_id, key),
  CONSTRAINT chk_budgets_limit_nonneg CHECK (limit_cents >= 0),
  CONSTRAINT chk_budgets_spent_nonneg CHECK (spent_cents >= 0)
);

-- Hot path: budget lookup per (org, key) on every predicated /shield/evaluate call
CREATE INDEX IF NOT EXISTS idx_budgets_org_key ON budgets (org_id, key);

ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;

-- Org-isolation policies (mirrors tool_policies in migration 030)
CREATE POLICY "budgets_select_org" ON budgets
  FOR SELECT USING (org_id = auth.uid()::uuid OR org_id IN (
    SELECT org_id FROM org_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "budgets_insert_org" ON budgets
  FOR INSERT WITH CHECK (org_id = auth.uid()::uuid OR org_id IN (
    SELECT org_id FROM org_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "budgets_update_org" ON budgets
  FOR UPDATE USING (org_id = auth.uid()::uuid OR org_id IN (
    SELECT org_id FROM org_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "budgets_delete_org" ON budgets
  FOR DELETE USING (org_id = auth.uid()::uuid OR org_id IN (
    SELECT org_id FROM org_members WHERE user_id = auth.uid()
  ));

-- ── 3. Atomic budget consumption (compare-and-swap) ──
-- The decision and the debit are ONE server-side UPDATE: per-call checks can
-- never see fleet-wide spend, so a read-then-write from the API would race.
-- Zero rows returned = over budget (or no budget row configured).
-- Picks the most specific budget: agent-scoped row first, else fleet-wide.
CREATE OR REPLACE FUNCTION consume_budget(
  p_org_id UUID,
  p_agent_id UUID,
  p_key TEXT,
  p_amount_cents BIGINT
)
RETURNS TABLE (
  id UUID,
  org_id UUID,
  agent_id UUID,
  key TEXT,
  limit_cents BIGINT,
  spent_cents BIGINT,
  period TEXT
) AS $$
BEGIN
  RETURN QUERY
  UPDATE budgets b
  SET spent_cents = b.spent_cents + p_amount_cents,
      updated_at = now()
  WHERE b.id = (
      SELECT b2.id FROM budgets b2
      WHERE b2.org_id = p_org_id
        AND b2.key = p_key
        AND (b2.agent_id = p_agent_id OR b2.agent_id IS NULL)
      ORDER BY b2.agent_id NULLS LAST   -- prefer the agent-scoped budget
      LIMIT 1
    )
    AND b.spent_cents + p_amount_cents <= b.limit_cents
  RETURNING b.id, b.org_id, b.agent_id, b.key, b.limit_cents, b.spent_cents, b.period;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
