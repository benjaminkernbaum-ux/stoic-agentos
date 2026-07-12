-- Migration 020: add optional tags[] to observations
-- Enables consumers to attach free-form labels for grouping/search.
-- Safe to run at any time; existing rows get NULL/empty and continue working.

ALTER TABLE observations
  ADD COLUMN IF NOT EXISTS tags TEXT[] NOT NULL DEFAULT '{}';

-- GIN index for fast tag-array filtering (e.g. tags @> ARRAY['critical']).
CREATE INDEX IF NOT EXISTS idx_observations_tags
  ON observations USING GIN (tags);
