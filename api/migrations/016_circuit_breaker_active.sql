-- ═══════════════════════════════════════════════════════
--  Migration 016: Active Circuit Breaker Helper Function
-- ═══════════════════════════════════════════════════════
--
--  Determines if an agent's execution circuit has tripped due
--  to excessive policy blocks (verdict = 'BLOCK') in the last hour.
--  Supports lookup by either UUID or name text.

CREATE OR REPLACE FUNCTION check_agent_circuit_status(
  p_org_id UUID,
  p_agent_id UUID DEFAULT NULL,
  p_agent_name TEXT DEFAULT NULL
)
RETURNS TABLE (
  tripped BOOLEAN,
  block_count INTEGER,
  resolved_agent_id UUID
) AS $$
DECLARE
  v_agent_id UUID := p_agent_id;
  v_block_count INTEGER;
  v_threshold INTEGER := 5; -- Trip after 5 policy violations
BEGIN
  -- If UUID not supplied, resolve via unique name per org
  IF v_agent_id IS NULL AND p_agent_name IS NOT NULL THEN
    SELECT id INTO v_agent_id
    FROM agents
    WHERE org_id = p_org_id AND name = p_agent_name
    LIMIT 1;
  END IF;

  -- If no agent resolved, assume closed (not tripped)
  IF v_agent_id IS NULL THEN
    RETURN QUERY SELECT FALSE, 0, NULL::UUID;
    RETURN;
  END IF;

  -- Count recent BLOCK verdicts in audit log (past 60 minutes)
  SELECT COUNT(*)::INTEGER INTO v_block_count
  FROM audit_log
  WHERE org_id = p_org_id
    AND agent_id = v_agent_id
    AND verdict = 'BLOCK'
    AND created_at >= NOW() - INTERVAL '1 hour';

  RETURN QUERY SELECT (v_block_count >= v_threshold), v_block_count, v_agent_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION check_agent_circuit_status IS 'Checks if an agents circuit breaker is tripped based on block count in the last hour';
