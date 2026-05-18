-- ═══════════════════════════════════════════════════════════
-- STOIC AGENTOS — Migration 002: Per-org Anthropic API keys
-- Adds BYOK support so customers can route Claude inference
-- through their own Anthropic account (or fall back to the
-- platform key set via ANTHROPIC_API_KEY env var).
-- ═══════════════════════════════════════════════════════════

ALTER TABLE organizations
    ADD COLUMN IF NOT EXISTS anthropic_api_key TEXT,
    ADD COLUMN IF NOT EXISTS anthropic_key_last4 TEXT,
    ADD COLUMN IF NOT EXISTS anthropic_key_updated_at TIMESTAMPTZ;

COMMENT ON COLUMN organizations.anthropic_api_key IS
    'Customer Anthropic API key (sk-ant-...). Service role only — never expose to client. Falls back to ANTHROPIC_API_KEY env var when null.';
COMMENT ON COLUMN organizations.anthropic_key_last4 IS
    'Last 4 chars of the Anthropic key for display in the dashboard (safe to expose).';

-- Tighten RLS: clients should NEVER read the raw key column.
-- The existing "Users see own org" policy on organizations would otherwise
-- expose the key — replace it with a column-restricted view for client reads.

CREATE OR REPLACE VIEW organizations_public AS
SELECT
    id,
    name,
    slug,
    plan,
    stripe_customer_id,
    stripe_subscription_id,
    anthropic_key_last4,
    anthropic_key_updated_at,
    created_at,
    updated_at
FROM organizations;

GRANT SELECT ON organizations_public TO authenticated;

-- Track per-org Claude usage for cost attribution
CREATE TABLE IF NOT EXISTS anthropic_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    endpoint TEXT NOT NULL,
    model TEXT NOT NULL,
    input_tokens INTEGER DEFAULT 0,
    output_tokens INTEGER DEFAULT 0,
    cache_read_tokens INTEGER DEFAULT 0,
    cache_creation_tokens INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_anthropic_usage_org ON anthropic_usage(org_id, created_at DESC);

ALTER TABLE anthropic_usage ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org scoped anthropic usage" ON anthropic_usage FOR SELECT
    USING (org_id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid()));
