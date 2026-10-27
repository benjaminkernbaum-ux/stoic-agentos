-- Migration 032: landing-page waitlist
-- Emails from the public waitlist form (POST /api/v1/waitlist).
-- Written only by the API with the service key: RLS is enabled with no
-- policies, so anon/authenticated clients can neither read nor write it.
-- Until this runs, the endpoint returns 503 and the form shows an error.

CREATE TABLE IF NOT EXISTS waitlist (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email       TEXT NOT NULL UNIQUE CHECK (char_length(email) <= 254),
  source      TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE waitlist ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_waitlist_created_at ON waitlist (created_at DESC);
