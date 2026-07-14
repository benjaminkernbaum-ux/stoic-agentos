-- ═══════════════════════════════════════════════════════
--  Migration 020: Iterative HNSW Index Scans for Episodic Memory
--  Stoic AgentOS — Vector Search Correctness Fix
-- ═══════════════════════════════════════════════════════
--  pgvector 0.8.0 introduced hnsw.iterative_scan, which fixes
--  HNSW queries under-returning fewer than p_match_count rows
--  when a restrictive WHERE filter (org_id, agent_id, event_type)
--  is applied after the index scan. Without it, the planner takes
--  a fixed-size candidate list from the graph and post-filters —
--  so a selective org_id can legitimately get back 0-2 rows even
--  when 10 good matches exist for that org.
--
--  Set via SET LOCAL inside the function body (not a session/role
--  GUC) so it's guaranteed active for every match_episodic_memories()
--  call regardless of the calling connection's prior state — this
--  matters because Supabase's PgBouncer transaction pooling does not
--  preserve session-level SET across requests on the same connection.
--
--  Requires: pgvector >= 0.8.0 (confirmed installed on production: 0.8.0)
-- ═══════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION match_episodic_memories(
  p_org_id UUID,
  p_query_embedding vector(384),
  p_match_threshold double precision,
  p_match_count int,
  p_agent_id UUID DEFAULT NULL,
  p_event_type TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  agent_id UUID,
  content TEXT,
  event_type TEXT,
  importance SMALLINT,
  valid_from TIMESTAMPTZ,
  valid_to TIMESTAMPTZ,
  metadata JSONB,
  created_at TIMESTAMPTZ,
  similarity double precision
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Relaxed-order iterative scan: keeps re-probing the HNSW graph
  -- until p_match_count rows pass the WHERE filters below, instead
  -- of silently returning fewer than requested.
  SET LOCAL hnsw.iterative_scan = relaxed_order;

  RETURN QUERY
  SELECT
    em.id,
    em.agent_id,
    em.content,
    em.event_type,
    em.importance,
    em.valid_from,
    em.valid_to,
    em.metadata,
    em.created_at,
    (1 - (em.embedding <=> p_query_embedding))::double precision AS similarity
  FROM episodic_memory em
  WHERE em.org_id = p_org_id
    AND em.embedding IS NOT NULL
    AND (p_agent_id IS NULL OR em.agent_id = p_agent_id)
    AND (p_event_type IS NULL OR em.event_type = p_event_type)
    AND (1 - (em.embedding <=> p_query_embedding)) > p_match_threshold
  ORDER BY em.embedding <=> p_query_embedding
  LIMIT p_match_count;
END;
$$;

-- ═══════════════════════════════════════════════════════
--  ROLLBACK (down path)
--  Restores the pre-019 function definition (no iterative
--  scan — identical to what migration 017 originally created).
--  Uncomment and run to revert.
-- ═══════════════════════════════════════════════════════
-- CREATE OR REPLACE FUNCTION match_episodic_memories(
--   p_org_id UUID,
--   p_query_embedding vector(384),
--   p_match_threshold double precision,
--   p_match_count int,
--   p_agent_id UUID DEFAULT NULL,
--   p_event_type TEXT DEFAULT NULL
-- )
-- RETURNS TABLE (
--   id UUID,
--   agent_id UUID,
--   content TEXT,
--   event_type TEXT,
--   importance SMALLINT,
--   valid_from TIMESTAMPTZ,
--   valid_to TIMESTAMPTZ,
--   metadata JSONB,
--   created_at TIMESTAMPTZ,
--   similarity double precision
-- )
-- LANGUAGE plpgsql
-- SECURITY DEFINER
-- AS $$
-- BEGIN
--   RETURN QUERY
--   SELECT
--     em.id,
--     em.agent_id,
--     em.content,
--     em.event_type,
--     em.importance,
--     em.valid_from,
--     em.valid_to,
--     em.metadata,
--     em.created_at,
--     (1 - (em.embedding <=> p_query_embedding))::double precision AS similarity
--   FROM episodic_memory em
--   WHERE em.org_id = p_org_id
--     AND em.embedding IS NOT NULL
--     AND (p_agent_id IS NULL OR em.agent_id = p_agent_id)
--     AND (p_event_type IS NULL OR em.event_type = p_event_type)
--     AND (1 - (em.embedding <=> p_query_embedding)) > p_match_threshold
--   ORDER BY em.embedding <=> p_query_embedding
--   LIMIT p_match_count;
-- END;
-- $$;
