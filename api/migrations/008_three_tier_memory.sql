-- ═══════════════════════════════════════════════════════
--  Migration 008: Three-Tier Memory Architecture
--  (The Hindsight Pattern — PostgreSQL-native)
-- ═══════════════════════════════════════════════════════
--  Tier 1: Working Memory (per-session, mutable JSONB)
--  Tier 2: Episodic Memory (time-series, immutable, embedded)
--  Tier 3: Semantic Memory (knowledge triplets, persistent)
--
--  Requires: pgvector extension (enable in Supabase dashboard)
-- ═══════════════════════════════════════════════════════

-- Enable pgvector if not already enabled
CREATE EXTENSION IF NOT EXISTS vector;

-- ── Tier 1: Working Memory ──────────────────────────────
CREATE TABLE IF NOT EXISTS working_memory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  agent_id UUID REFERENCES agents(id) ON DELETE SET NULL,
  session_id TEXT NOT NULL,
  key TEXT NOT NULL,
  value JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ,
  UNIQUE(org_id, agent_id, session_id, key)
);

CREATE INDEX IF NOT EXISTS idx_working_memory_org_agent_session
  ON working_memory (org_id, agent_id, session_id);

CREATE INDEX IF NOT EXISTS idx_working_memory_expires
  ON working_memory (expires_at) WHERE expires_at IS NOT NULL;

ALTER TABLE working_memory ENABLE ROW LEVEL SECURITY;

-- ── Tier 2: Episodic Memory ─────────────────────────────
CREATE TABLE IF NOT EXISTS episodic_memory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  agent_id UUID REFERENCES agents(id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  embedding vector(384),
  event_type TEXT NOT NULL DEFAULT 'observation',
  importance SMALLINT DEFAULT 5 CHECK (importance BETWEEN 1 AND 10),
  valid_from TIMESTAMPTZ DEFAULT now(),
  valid_to TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_episodic_org_agent
  ON episodic_memory (org_id, agent_id);

CREATE INDEX IF NOT EXISTS idx_episodic_temporal
  ON episodic_memory (org_id, valid_from DESC, valid_to);

CREATE INDEX IF NOT EXISTS idx_episodic_type
  ON episodic_memory (org_id, event_type);

CREATE INDEX IF NOT EXISTS idx_episodic_importance
  ON episodic_memory (org_id, importance DESC);

ALTER TABLE episodic_memory ENABLE ROW LEVEL SECURITY;

-- ── Tier 3: Semantic Memory ─────────────────────────────
CREATE TABLE IF NOT EXISTS semantic_memory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  subject TEXT NOT NULL,
  relation TEXT NOT NULL,
  object TEXT NOT NULL,
  confidence REAL DEFAULT 1.0 CHECK (confidence BETWEEN 0.0 AND 1.0),
  source_type TEXT DEFAULT 'reflection',
  source_episodes UUID[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_semantic_org_subject
  ON semantic_memory (org_id, subject);

CREATE INDEX IF NOT EXISTS idx_semantic_org_relation
  ON semantic_memory (org_id, relation);

ALTER TABLE semantic_memory ENABLE ROW LEVEL SECURITY;

-- ── Audit Log (immutable) ───────────────────────────────
CREATE TABLE IF NOT EXISTS audit_log (
  id BIGSERIAL PRIMARY KEY,
  org_id UUID NOT NULL,
  agent_id UUID,
  event_type TEXT NOT NULL,
  action TEXT NOT NULL,
  reasoning TEXT,
  context_hash TEXT,
  policy_version TEXT,
  verdict TEXT NOT NULL DEFAULT 'PROCEED',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_audit_log_org_created
  ON audit_log (org_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_log_org_agent
  ON audit_log (org_id, agent_id);

CREATE INDEX IF NOT EXISTS idx_audit_log_event_type
  ON audit_log (org_id, event_type);

-- Make audit_log immutable: prevent UPDATE and DELETE
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_rules WHERE rulename = 'audit_no_update') THEN
    CREATE RULE audit_no_update AS ON UPDATE TO audit_log DO INSTEAD NOTHING;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_rules WHERE rulename = 'audit_no_delete') THEN
    CREATE RULE audit_no_delete AS ON DELETE TO audit_log DO INSTEAD NOTHING;
  END IF;
END
$$;

ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
