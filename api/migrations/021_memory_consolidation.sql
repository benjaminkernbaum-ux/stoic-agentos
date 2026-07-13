-- ═══════════════════════════════════════════════════════
--  Migration 021: Memory Consolidation (Retention Layer)
--  Stoic AgentOS — Reflection-Driven Episodic Archival
-- ═══════════════════════════════════════════════════════
--  Consolidation folds AGED + LOW-IMPORTANCE episodic memories
--  into semantic_memory triples (via the existing Haiku reflection
--  path) and then MOVES the raw rows out of the hot episodic_memory
--  table into episodic_memory_archive. This is non-destructive:
--  raw episodes are preserved and restorable, and semantic triples
--  carry source_episodes[] provenance back to the archived rows.
--
--  Moving rows out of the hot table shrinks both the table and the
--  halfvec HNSW index (fewer hot vectors) — the metric that
--  step-4 partitioning instrumentation watches.
--
--  The move is performed by consolidate_episodic_batch(), a
--  SECURITY DEFINER function that does the DELETE→INSERT in a single
--  data-modifying CTE so a row is never in neither table nor both.
--  Org isolation is enforced by the explicit p_org_id predicate,
--  exactly as in match_episodic_memories (migration 019/020).
--
--  Requires: migration 008 (episodic_memory) + 020 (halfvec(384)).
--  Degrades gracefully: if this migration hasn't run, the
--  /reflection/consolidate endpoint returns {archived: 0, hint: ...}.
--
--  FUTURE: hard-delete of archived rows is deliberately NOT here.
--  It belongs behind a per-org retention-policy setting (v2) and
--  would purge from episodic_memory_archive only (never the hot
--  table), on a longer horizon than consolidation itself.
-- ═══════════════════════════════════════════════════════

-- ── Archive table: column-for-column mirror of episodic_memory ──
-- (embedding is halfvec(384) to match the post-migration-020 hot table)
CREATE TABLE IF NOT EXISTS episodic_memory_archive (
  id UUID PRIMARY KEY,
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  agent_id UUID,
  content TEXT NOT NULL,
  embedding halfvec(384),
  event_type TEXT NOT NULL DEFAULT 'observation',
  importance SMALLINT DEFAULT 5 CHECK (importance BETWEEN 1 AND 10),
  valid_from TIMESTAMPTZ,
  valid_to TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ,
  -- archival bookkeeping
  archived_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived_reason TEXT,
  consolidation_run_id UUID
);

CREATE INDEX IF NOT EXISTS idx_episodic_archive_org_archived
  ON episodic_memory_archive (org_id, archived_at DESC);

CREATE INDEX IF NOT EXISTS idx_episodic_archive_org_agent
  ON episodic_memory_archive (org_id, agent_id);

CREATE INDEX IF NOT EXISTS idx_episodic_archive_run
  ON episodic_memory_archive (consolidation_run_id);

-- ── RLS: same org-scoped stance as episodic_memory (migration 009) ──
--  SELECT + INSERT only; no public DELETE (invalidate/restore, don't delete).
ALTER TABLE episodic_memory_archive ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='episodic_memory_archive' AND policyname='episodic_archive_select_org') THEN
    CREATE POLICY "episodic_archive_select_org"
      ON episodic_memory_archive FOR SELECT
      USING (org_id = auth.uid()::uuid OR org_id IN (
        SELECT org_id FROM org_members WHERE user_id = auth.uid()
      ));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='episodic_memory_archive' AND policyname='episodic_archive_insert_org') THEN
    CREATE POLICY "episodic_archive_insert_org"
      ON episodic_memory_archive FOR INSERT
      WITH CHECK (org_id = auth.uid()::uuid OR org_id IN (
        SELECT org_id FROM org_members WHERE user_id = auth.uid()
      ));
  END IF;
END
$$;

-- ── Atomic move: hot episodic_memory → archive, org-scoped ──
--  Single data-modifying CTE: DELETE ... RETURNING feeds INSERT.
--  Both run under one snapshot, so the move is all-or-nothing.
CREATE OR REPLACE FUNCTION consolidate_episodic_batch(
  p_org_id UUID,
  p_episode_ids UUID[],
  p_run_id UUID DEFAULT NULL,
  p_reason TEXT DEFAULT 'consolidation'
)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  moved INT;
BEGIN
  WITH moved_rows AS (
    DELETE FROM episodic_memory em
    WHERE em.org_id = p_org_id
      AND em.id = ANY(p_episode_ids)
    RETURNING em.*
  ), inserted AS (
    INSERT INTO episodic_memory_archive (
      id, org_id, agent_id, content, embedding, event_type, importance,
      valid_from, valid_to, metadata, created_at,
      archived_at, archived_reason, consolidation_run_id
    )
    SELECT
      id, org_id, agent_id, content, embedding, event_type, importance,
      valid_from, valid_to, metadata, created_at,
      now(), p_reason, p_run_id
    FROM moved_rows
    RETURNING 1
  )
  SELECT count(*) INTO moved FROM inserted;
  RETURN moved;
END;
$$;

-- ═══════════════════════════════════════════════════════
--  ROLLBACK (down path) — uncomment and run to revert.
--  Restores nothing from archive automatically; if rows have
--  already been archived, move them back to episodic_memory first
--  (schema is identical) before dropping the table:
--    INSERT INTO episodic_memory (id, org_id, agent_id, content,
--      embedding, event_type, importance, valid_from, valid_to,
--      metadata, created_at)
--    SELECT id, org_id, agent_id, content, embedding, event_type,
--      importance, valid_from, valid_to, metadata, created_at
--    FROM episodic_memory_archive;
-- ═══════════════════════════════════════════════════════
-- DROP FUNCTION IF EXISTS consolidate_episodic_batch(UUID, UUID[], UUID, TEXT);
-- DROP TABLE IF EXISTS episodic_memory_archive;
