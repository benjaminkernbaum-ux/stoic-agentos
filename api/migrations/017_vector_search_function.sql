-- =============================================
-- Stoic AgentOS — Migration 017
-- Cosine Similarity Vector Search + HNSW Index
-- Run in Supabase SQL Editor
-- =============================================

-- Enable pgvector (just in case)
CREATE EXTENSION IF NOT EXISTS vector;

-- Create RPC for cosine distance vector similarity search on episodic_memory
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

-- Create HNSW index for vector cosine distance operations
CREATE INDEX IF NOT EXISTS idx_episodic_memory_embedding
  ON episodic_memory USING hnsw (embedding vector_cosine_ops);
