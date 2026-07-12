-- =============================================
-- Stoic AgentOS — Migration 019
-- Active Shield: Atomic Transitions & CAS
-- Run in Supabase SQL Editor
-- =============================================

-- Add 'CONSUMED' to the allowed status check constraint on pending_approvals if not already open text
-- Note: Our database schema defines status as TEXT. We can enforce allowed values at the constraint level.

ALTER TABLE pending_approvals DROP CONSTRAINT IF EXISTS chk_pending_approvals_status;

ALTER TABLE pending_approvals ADD CONSTRAINT chk_pending_approvals_status 
  CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED', 'TIMEOUT', 'CONSUMED'));

-- Create SQL helper function for Compare-and-Swap (CAS) transition
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

-- Enable Realtime for pending_approvals to support SDK realtime subscriptions
-- Run: alter publication supabase_realtime add table pending_approvals;
-- Note: This requires publication to exist. We wrap this safely.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE pending_approvals;
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    -- Table might already be part of the publication, catch silently
    NULL;
END
$$;
