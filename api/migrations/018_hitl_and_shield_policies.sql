-- =============================================
-- Stoic AgentOS — Migration 018
-- Active Shield: HITL Approvals & Policies
-- Run in Supabase SQL Editor
-- =============================================

-- Create pending approvals table
CREATE TABLE IF NOT EXISTS pending_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL,
  agent_id UUID,
  trace_id TEXT,
  tool_name TEXT NOT NULL,
  tool_args JSONB DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'PENDING', -- PENDING, APPROVED, REJECTED, TIMEOUT
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID
);

-- Index for quick status polling and lists
CREATE INDEX IF NOT EXISTS idx_pending_approvals_org_status
  ON pending_approvals (org_id, status);

ALTER TABLE pending_approvals ENABLE ROW LEVEL SECURITY;

-- Enable SELECT, INSERT, UPDATE policies for org isolation
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
