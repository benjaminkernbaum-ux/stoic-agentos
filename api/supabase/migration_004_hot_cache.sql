-- ═══════════════════════════════════════════════════════════
-- STOIC AGENTOS — Migration 004: Hot Cache (LLM Wiki pattern)
--
-- Adds a per-org rolling summary (~500 words, overwritten not
-- appended) that captures recent activity. Inspired by the
-- claude-obsidian/Karpathy LLM Wiki "hot.md" pattern.
--
-- Read first on /insights/ask to short-circuit the 20-observation
-- context fetch, cutting per-call input tokens by ~80% on repeat
-- questions.
-- ═══════════════════════════════════════════════════════════

ALTER TABLE organizations
    ADD COLUMN IF NOT EXISTS hot_cache TEXT,
    ADD COLUMN IF NOT EXISTS hot_cache_updated_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS hot_cache_stale BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN organizations.hot_cache IS
    'Rolling ~500-word summary of recent org activity. Overwritten on refresh, not appended. Read first by /insights/ask.';
COMMENT ON COLUMN organizations.hot_cache_updated_at IS
    'When hot_cache was last regenerated.';
COMMENT ON COLUMN organizations.hot_cache_stale IS
    'Set true when new observations land. Cleared on refresh.';

-- Auto-mark stale when observations are inserted. Cheap trigger
-- (one UPDATE per insert keyed on indexed PK) — way cheaper than
-- regenerating on every insert.
CREATE OR REPLACE FUNCTION public.mark_hot_cache_stale()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    UPDATE organizations
       SET hot_cache_stale = true
     WHERE id = NEW.org_id
       AND hot_cache_stale = false;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_observations_mark_hot_cache_stale ON observations;
CREATE TRIGGER trg_observations_mark_hot_cache_stale
    AFTER INSERT ON observations
    FOR EACH ROW
    EXECUTE FUNCTION public.mark_hot_cache_stale();
