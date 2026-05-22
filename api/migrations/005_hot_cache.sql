-- ═══════════════════════════════════════════════════════════
-- Migration 005: Hot Cache (LLM Wiki pattern)
--
-- Adds a per-org rolling AI summary ("hot cache") that the
-- /insights/ask endpoint reads first instead of re-fetching
-- 20 observations every call.
--
-- Run in Supabase SQL editor after migration_004.
-- ═══════════════════════════════════════════════════════════

-- ── 1. Add columns to organizations ──────────────────────

ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS hot_cache            TEXT         DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS hot_cache_updated_at TIMESTAMPTZ  DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS hot_cache_stale      BOOLEAN      DEFAULT TRUE;

COMMENT ON COLUMN organizations.hot_cache IS
  'Rolling ~500-word AI summary of recent observations (LLM Wiki pattern)';
COMMENT ON COLUMN organizations.hot_cache_updated_at IS
  'Timestamp of the last hot cache refresh';
COMMENT ON COLUMN organizations.hot_cache_stale IS
  'TRUE when new observations have landed since the last cache refresh';


-- ── 2. Trigger: auto-mark cache stale on new observations ─

CREATE OR REPLACE FUNCTION mark_hot_cache_stale()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE organizations
  SET    hot_cache_stale = TRUE
  WHERE  id = NEW.org_id
    AND  hot_cache_stale IS NOT TRUE;  -- skip if already stale
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop if exists so the migration is idempotent
DROP TRIGGER IF EXISTS trg_mark_hot_cache_stale ON observations;

CREATE TRIGGER trg_mark_hot_cache_stale
  AFTER INSERT ON observations
  FOR EACH ROW
  EXECUTE FUNCTION mark_hot_cache_stale();


-- ── 3. Index for the refresh query (recent obs by org) ────

CREATE INDEX IF NOT EXISTS idx_observations_org_created
  ON observations (org_id, created_at DESC);
