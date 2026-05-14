-- ═══════════════════════════════════════════════════════════
-- STOIC AGENTOS — Database Schema (Supabase PostgreSQL)
-- Multi-tenant SaaS schema with RLS
-- ═══════════════════════════════════════════════════════════

-- ── Organizations ──
CREATE TABLE IF NOT EXISTS organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    plan TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'pro', 'team', 'enterprise')),
    stripe_customer_id TEXT,
    stripe_subscription_id TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- ── Org Members ──
CREATE TABLE IF NOT EXISTS org_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member', 'viewer')),
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(org_id, user_id)
);

-- ── API Keys ──
CREATE TABLE IF NOT EXISTS api_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    key TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL DEFAULT 'Default',
    active BOOLEAN DEFAULT true,
    last_used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ── Workspaces ──
CREATE TABLE IF NOT EXISTS workspaces (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    path TEXT DEFAULT '',
    stack TEXT DEFAULT '',
    git_remote TEXT DEFAULT '',
    branch TEXT DEFAULT 'main',
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'archived', 'pending')),
    dirty_files INTEGER DEFAULT 0,
    last_commit_hash TEXT,
    last_commit_message TEXT,
    last_commit_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- ── Agents ──
CREATE TABLE IF NOT EXISTS agents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT DEFAULT '',
    module TEXT DEFAULT 'standalone' CHECK (module IN ('content', 'gtm', 'crm', 'finance', 'standalone')),
    status TEXT DEFAULT 'idle' CHECK (status IN ('idle', 'running', 'success', 'error', 'disabled')),
    last_heartbeat TIMESTAMPTZ,
    total_runs INTEGER DEFAULT 0,
    total_errors INTEGER DEFAULT 0,
    config JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- ── Observations (the core data) ──
CREATE TABLE IF NOT EXISTS observations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    workspace_id TEXT,
    agent_id TEXT,
    type TEXT NOT NULL DEFAULT 'note' CHECK (type IN ('note', 'decision', 'architecture', 'deployment', 'discovery', 'file_edit', 'error', 'git_commit', 'agent_run')),
    title TEXT NOT NULL,
    content TEXT DEFAULT '',
    importance INTEGER DEFAULT 6 CHECK (importance BETWEEN 1 AND 10),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ── Knowledge Items ──
CREATE TABLE IF NOT EXISTS knowledge_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    summary TEXT DEFAULT '',
    content TEXT DEFAULT '',
    artifacts JSONB DEFAULT '[]',
    last_accessed TIMESTAMPTZ DEFAULT now(),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- ── Usage Tracking (for billing) ──
CREATE TABLE IF NOT EXISTS usage_monthly (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    month TEXT NOT NULL, -- '2026-05'
    observations_count INTEGER DEFAULT 0,
    agents_count INTEGER DEFAULT 0,
    api_calls INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(org_id, month)
);

-- ═══ INDEXES ═══
CREATE INDEX IF NOT EXISTS idx_observations_org ON observations(org_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_observations_type ON observations(org_id, type);
CREATE INDEX IF NOT EXISTS idx_agents_org ON agents(org_id);
CREATE INDEX IF NOT EXISTS idx_workspaces_org ON workspaces(org_id);
CREATE INDEX IF NOT EXISTS idx_ki_org ON knowledge_items(org_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_key ON api_keys(key);
CREATE INDEX IF NOT EXISTS idx_org_members_user ON org_members(user_id);

-- ═══ ROW LEVEL SECURITY ═══

-- Organizations: users see only their own
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own org" ON organizations FOR SELECT
    USING (id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid()));

-- Org Members: users see their org's members
ALTER TABLE org_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own org members" ON org_members FOR SELECT
    USING (org_id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid()));

-- Workspaces: scoped to org
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org scoped workspaces" ON workspaces FOR ALL
    USING (org_id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid()));

-- Agents: scoped to org
ALTER TABLE agents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org scoped agents" ON agents FOR ALL
    USING (org_id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid()));

-- Observations: scoped to org
ALTER TABLE observations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org scoped observations" ON observations FOR ALL
    USING (org_id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid()));

-- Knowledge Items: scoped to org
ALTER TABLE knowledge_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org scoped knowledge items" ON knowledge_items FOR ALL
    USING (org_id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid()));

-- API Keys: scoped to org
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org scoped api keys" ON api_keys FOR ALL
    USING (org_id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid()));

-- Usage: scoped to org
ALTER TABLE usage_monthly ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org scoped usage" ON usage_monthly FOR SELECT
    USING (org_id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid()));

-- ═══ FUNCTIONS ═══

-- Auto-increment observation count per month
CREATE OR REPLACE FUNCTION increment_monthly_usage()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO usage_monthly (org_id, month, observations_count)
    VALUES (NEW.org_id, to_char(now(), 'YYYY-MM'), 1)
    ON CONFLICT (org_id, month)
    DO UPDATE SET observations_count = usage_monthly.observations_count + 1;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_observation_usage
AFTER INSERT ON observations
FOR EACH ROW EXECUTE FUNCTION increment_monthly_usage();
