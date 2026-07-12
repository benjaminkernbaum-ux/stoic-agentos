-- ═══════════════════════════════════════════════════════
--  Migration 020: Migrate episodic_memory.embedding to halfvec(384)
--  Stoic AgentOS — Vector Storage Halving
-- ═══════════════════════════════════════════════════════
--  pgvector 0.7+ added the halfvec type (16-bit floats). For
--  cosine similarity over 384-dim sentence embeddings the recall
--  loss vs full float32 vector is negligible (halfvec keeps ~3-4
--  significant decimal digits; embedding values live in [-1,1]),
--  while on-disk storage AND the HNSW index shrink by ~50% —
--  2 bytes/dim instead of 4. That halves index memory pressure,
--  which is the dominant cost as the hot-vector set grows.
--
--  The RPC signature is UNCHANGED: p_query_embedding stays
--  vector(384) so the API (routes/memory.ts) keeps sending a plain
--  float array. We cast the query vector to halfvec inside the
--  function, so <=> operates halfvec-to-halfvec against the column.
--
--  The SET LOCAL hnsw.iterative_scan = relaxed_order from migration
--  019 is PRESERVED here — this CREATE OR REPLACE supersedes 019's
--  function body, so the iterative-scan fix must be re-declared.
--
--  Requires: pgvector >= 0.7.0 (production confirmed on 0.8.0)
--  RLS: unaffected — column type change does not touch policies.
--  Other indexes on episodic_memory (org/agent/temporal/type/
--  importance btrees) are unaffected; only the HNSW vector index
--  is dropped and rebuilt.
-- ═══════════════════════════════════════════════════════

-- 1. Drop the old float32 HNSW index (vector_cosine_ops is invalid
--    on a halfvec column, so it must go before the type change).
DROP INDEX IF EXISTS idx_episodic_memory_embedding;

-- 2. Convert the column in place. USING re-encodes each existing
--    float32 vector as a 16-bit halfvec (NULLs stay NULL).
ALTER TABLE episodic_memory
  ALTER COLUMN embedding TYPE halfvec(384)
  USING embedding::halfvec(384);

-- 3. Rebuild the HNSW index with halfvec cosine ops (same build
--    params as the original — default m=16, ef_construction=64).
CREATE INDEX IF NOT EXISTS idx_episodic_memory_embedding
  ON episodic_memory USING hnsw (embedding halfvec_cosine_ops);

-- 4. Update the RPC to cast the incoming query vector to halfvec.
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
  -- Preserved from migration 019 — keep iterative scan on for the
  -- filtered query path so selective org_id filters don't under-return.
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
    (1 - (em.embedding <=> p_query_embedding::halfvec(384)))::double precision AS similarity
  FROM episodic_memory em
  WHERE em.org_id = p_org_id
    AND em.embedding IS NOT NULL
    AND (p_agent_id IS NULL OR em.agent_id = p_agent_id)
    AND (p_event_type IS NULL OR em.event_type = p_event_type)
    AND (1 - (em.embedding <=> p_query_embedding::halfvec(384))) > p_match_threshold
  ORDER BY em.embedding <=> p_query_embedding::halfvec(384)
  LIMIT p_match_count;
END;
$$;

-- ═══════════════════════════════════════════════════════
--  ROLLBACK (down path)
--  Reverts the column back to vector(384), rebuilds the float32
--  HNSW index, and restores the migration-019 function body
--  (query vector used directly, no halfvec cast). Uncomment to run.
--  NOTE: halfvec→vector widens each value back to float32 but does
--  NOT recover precision lost in the down-conversion; values are the
--  float32 representation of the stored 16-bit floats.
-- ═══════════════════════════════════════════════════════
-- DROP INDEX IF EXISTS idx_episodic_memory_embedding;
--
-- ALTER TABLE episodic_memory
--   ALTER COLUMN embedding TYPE vector(384)
--   USING embedding::vector(384);
--
-- CREATE INDEX IF NOT EXISTS idx_episodic_memory_embedding
--   ON episodic_memory USING hnsw (embedding vector_cosine_ops);
--
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
--   SET LOCAL hnsw.iterative_scan = relaxed_order;
--   RETURN QUERY
--   SELECT
--     em.id, em.agent_id, em.content, em.event_type, em.importance,
--     em.valid_from, em.valid_to, em.metadata, em.created_at,
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
