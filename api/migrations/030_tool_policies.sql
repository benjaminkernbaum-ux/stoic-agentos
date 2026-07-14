-- =============================================
-- Stoic AgentOS — Migration 030
-- Active Shield Layer 1: Schema Policy Engine
-- Per-tool JSON Schema policies with graduated
-- enforcement (block / require_approval / monitor)
-- Run in Supabase SQL Editor
-- =============================================

CREATE TABLE IF NOT EXISTS tool_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL,
  tool_name TEXT NOT NULL,
  schema JSONB NOT NULL DEFAULT '{}',            -- JSON Schema (draft-07) describing valid tool args
  enforcement TEXT NOT NULL DEFAULT 'monitor',   -- graduated verdict on schema violation
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_tool_policies_org_tool UNIQUE (org_id, tool_name),
  CONSTRAINT chk_tool_policies_enforcement CHECK (enforcement IN ('block', 'require_approval', 'monitor'))
);

-- Index for the hot path: policy lookup per (org, tool) on every /shield/evaluate call
CREATE INDEX IF NOT EXISTS idx_tool_policies_org_tool
  ON tool_policies (org_id, tool_name);

ALTER TABLE tool_policies ENABLE ROW LEVEL SECURITY;

-- Org-isolation policies (mirrors pending_approvals in migration 018)
CREATE POLICY "tool_policies_select_org" ON tool_policies
  FOR SELECT USING (org_id = auth.uid()::uuid OR org_id IN (
    SELECT org_id FROM org_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "tool_policies_insert_org" ON tool_policies
  FOR INSERT WITH CHECK (org_id = auth.uid()::uuid OR org_id IN (
    SELECT org_id FROM org_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "tool_policies_update_org" ON tool_policies
  FOR UPDATE USING (org_id = auth.uid()::uuid OR org_id IN (
    SELECT org_id FROM org_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "tool_policies_delete_org" ON tool_policies
  FOR DELETE USING (org_id = auth.uid()::uuid OR org_id IN (
    SELECT org_id FROM org_members WHERE user_id = auth.uid()
  ));
