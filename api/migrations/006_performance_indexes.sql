-- ═══════════════════════════════════════════════════════
--  Migration 006: Performance Indexes
-- ═══════════════════════════════════════════════════════
--  Idempotent indexes for common query patterns.
--  Run in Supabase SQL Editor.

-- Observations: common filters and sorts
CREATE INDEX IF NOT EXISTS idx_observations_org_type
  ON observations (org_id, type);

CREATE INDEX IF NOT EXISTS idx_observations_org_agent
  ON observations (org_id, agent_id);

CREATE INDEX IF NOT EXISTS idx_observations_org_workspace
  ON observations (org_id, workspace_id);

CREATE INDEX IF NOT EXISTS idx_observations_org_importance
  ON observations (org_id, importance DESC);

-- Agents: common lookups
CREATE INDEX IF NOT EXISTS idx_agents_org_status
  ON agents (org_id, status);

CREATE INDEX IF NOT EXISTS idx_agents_org_heartbeat
  ON agents (org_id, last_heartbeat DESC NULLS LAST);

-- Traces: common filters
CREATE INDEX IF NOT EXISTS idx_traces_org_status
  ON traces (org_id, status);

CREATE INDEX IF NOT EXISTS idx_traces_org_started
  ON traces (org_id, started_at DESC NULLS LAST);

CREATE INDEX IF NOT EXISTS idx_traces_org_agent
  ON traces (org_id, agent);

-- Knowledge items: text search
CREATE INDEX IF NOT EXISTS idx_knowledge_org_name
  ON knowledge_items (org_id, name);

-- Workspaces: lookup by name
CREATE INDEX IF NOT EXISTS idx_workspaces_org_name
  ON workspaces (org_id, name);

-- API keys: active key lookup (auth hot path)
CREATE INDEX IF NOT EXISTS idx_api_keys_key_active
  ON api_keys (key) WHERE active = true;

-- Anthropic usage: dashboard queries
CREATE INDEX IF NOT EXISTS idx_anthropic_usage_org_created
  ON anthropic_usage (org_id, created_at DESC);
