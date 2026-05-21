-- =============================================
-- Stoic AgentOS — Migration 004
-- Add UNIQUE constraints for upsert operations
-- Run in Supabase SQL Editor
-- =============================================
-- 
-- These constraints enable Supabase's .upsert() with onConflict
-- to work atomically, eliminating race conditions in:
--   1. Agent heartbeat (POST /agents/heartbeat)
--   2. Trace batch ingest (POST /traces/ingest)
--
-- Safe to run multiple times (IF NOT EXISTS).
-- =============================================

-- ── Agents: UNIQUE on (org_id, name) ──
-- Prevents duplicate agents within the same org
-- Required by: agents.ts heartbeat .upsert({ onConflict: 'org_id,name' })
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE indexname = 'idx_agents_org_name_unique'
  ) THEN
    CREATE UNIQUE INDEX idx_agents_org_name_unique ON agents(org_id, name);
  END IF;
END $$;

-- ── Traces: UNIQUE on (org_id, trace_id) ──
-- Prevents duplicate traces within the same org
-- Required by: traces.ts ingest .upsert({ onConflict: 'org_id,trace_id' })
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE indexname = 'idx_traces_org_trace_id_unique'
  ) THEN
    CREATE UNIQUE INDEX idx_traces_org_trace_id_unique ON traces(org_id, trace_id);
  END IF;
END $$;

-- ══════════════════════════════════════
-- DONE — 2 unique indexes created
-- These enable atomic upsert operations
-- ══════════════════════════════════════
