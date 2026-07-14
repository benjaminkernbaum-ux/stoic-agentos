-- ═══════════════════════════════════════════════════════
--  Migration 023: Vector Scaling Instrumentation (no partitioning)
--  Stoic AgentOS — Hot-Vector Reporting + Partition Plan
-- ═══════════════════════════════════════════════════════
--  Partitioning is intentionally NOT implemented here. This migration
--  only adds the instrumentation needed to decide WHEN partitioning
--  becomes worthwhile, plus the documented plan for that day.
--
--  "Hot vectors" = episodic_memory rows with a non-null embedding —
--  i.e. rows actually occupying the halfvec HNSW index. Consolidation
--  (migration 022) is what keeps this number bounded by archiving aged,
--  low-importance rows out of the hot table.
-- ═══════════════════════════════════════════════════════

-- Report hot-vector count. Global (partition decision is table-wide)
-- when p_org_id IS NULL; org-scoped (dashboards) when provided.
CREATE OR REPLACE FUNCTION episodic_hot_vector_count(p_org_id UUID DEFAULT NULL)
RETURNS BIGINT
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT count(*)
  FROM episodic_memory
  WHERE embedding IS NOT NULL
    AND (p_org_id IS NULL OR org_id = p_org_id);
$$;

-- ═══════════════════════════════════════════════════════
--  FUTURE: Time-range partitioning of episodic_memory
-- ═══════════════════════════════════════════════════════
--  Deferred until metrics justify it. Revisit when the TABLE-WIDE hot-
--  vector count (episodic_hot_vector_count(NULL), surfaced via
--  GET /api/v1/memory/vector-stats) approaches ~10-20M and/or p95
--  vector-retrieval latency degrades past target. Below that, a single
--  halfvec HNSW index + consolidation (migration 022) is sufficient.
--
--  Plan when the threshold is crossed:
--    1. Convert episodic_memory to a PARTITIONED table, RANGE-partitioned
--       on valid_from (monthly or quarterly partitions). Recent partitions
--       stay hot; old partitions age out and are cheap to archive/detach.
--    2. Build a per-partition halfvec HNSW index (partition-local indexes)
--       so each vector search only probes recent partitions, keeping the
--       hot graph small even as total rows grow.
--    3. match_episodic_memories stays compatible — with iterative_scan
--       (migration 020) already on, partition pruning + per-partition HNSW
--       compose cleanly; add a valid_from lower-bound predicate to prune.
--    4. Preserve RLS on every partition (RLS is inherited by partitions in
--       PG 15+, but verify policies after the ALTER).
--
--  Escalation path beyond partitioning (if a single node can't hold the
--  hot graph in memory, or recall/latency still degrade at scale):
--    → pgvectorscale (StreamingDiskANN + Statistical Binary Quantization):
--      disk-backed ANN index that scales past what in-memory HNSW allows,
--      with quantization to shrink the resident footprint further. This is
--      the "we've outgrown pgvector HNSW" exit, not a v1 concern.
-- ═══════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════
--  ROLLBACK (down path) — uncomment and run to revert.
-- ═══════════════════════════════════════════════════════
-- DROP FUNCTION IF EXISTS episodic_hot_vector_count(UUID);
