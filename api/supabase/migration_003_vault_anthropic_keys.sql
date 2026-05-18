-- ═══════════════════════════════════════════════════════════
-- STOIC AGENTOS — Migration 003: Move Anthropic keys to Vault
-- Replaces plaintext anthropic_api_key column with a vault_id
-- pointer to vault.secrets (pgsodium-encrypted at rest).
-- ═══════════════════════════════════════════════════════════

-- Supabase projects ship with the vault extension; this is a no-op if already enabled.
CREATE EXTENSION IF NOT EXISTS supabase_vault WITH SCHEMA vault;

-- Add the vault pointer column
ALTER TABLE organizations
    ADD COLUMN IF NOT EXISTS anthropic_key_vault_id UUID;

COMMENT ON COLUMN organizations.anthropic_key_vault_id IS
    'UUID of the vault.secrets row holding the org''s Anthropic API key. Read via get_org_anthropic_key().';

-- ── Helper functions (service-role only) ──

CREATE OR REPLACE FUNCTION public.set_org_anthropic_key(p_org_id UUID, p_key TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, vault, extensions
AS $$
DECLARE
    v_existing_vault_id UUID;
    v_new_vault_id UUID;
    v_last4 TEXT;
BEGIN
    SELECT anthropic_key_vault_id INTO v_existing_vault_id FROM organizations WHERE id = p_org_id;
    v_last4 := right(p_key, 4);

    IF v_existing_vault_id IS NOT NULL THEN
        PERFORM vault.update_secret(v_existing_vault_id, p_key);
    ELSE
        v_new_vault_id := vault.create_secret(
            p_key,
            'org_anthropic_' || p_org_id::text,
            'Anthropic API key for org ' || p_org_id::text
        );
        UPDATE organizations SET anthropic_key_vault_id = v_new_vault_id WHERE id = p_org_id;
    END IF;

    UPDATE organizations
       SET anthropic_key_last4 = v_last4,
           anthropic_key_updated_at = now()
     WHERE id = p_org_id;

    RETURN v_last4;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_org_anthropic_key(p_org_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, vault, extensions
AS $$
DECLARE
    v_vault_id UUID;
    v_secret TEXT;
BEGIN
    SELECT anthropic_key_vault_id INTO v_vault_id FROM organizations WHERE id = p_org_id;
    IF v_vault_id IS NULL THEN RETURN NULL; END IF;

    SELECT decrypted_secret INTO v_secret FROM vault.decrypted_secrets WHERE id = v_vault_id;
    RETURN v_secret;
END;
$$;

CREATE OR REPLACE FUNCTION public.clear_org_anthropic_key(p_org_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, vault, extensions
AS $$
DECLARE
    v_vault_id UUID;
BEGIN
    SELECT anthropic_key_vault_id INTO v_vault_id FROM organizations WHERE id = p_org_id;
    IF v_vault_id IS NOT NULL THEN
        DELETE FROM vault.secrets WHERE id = v_vault_id;
    END IF;
    UPDATE organizations
       SET anthropic_key_vault_id = NULL,
           anthropic_key_last4 = NULL,
           anthropic_key_updated_at = now()
     WHERE id = p_org_id;
    RETURN TRUE;
END;
$$;

-- Lock down: only service_role (the API) can call these.
-- authenticated/anon users go through /api-keys/anthropic which the API gates.
REVOKE ALL ON FUNCTION public.set_org_anthropic_key(UUID, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_org_anthropic_key(UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.clear_org_anthropic_key(UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.set_org_anthropic_key(UUID, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_org_anthropic_key(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.clear_org_anthropic_key(UUID) TO service_role;

-- ── Migrate existing plaintext keys into the vault ──
-- This block is idempotent — only migrates rows that have a plaintext key
-- but no vault pointer yet.
DO $$
DECLARE
    rec RECORD;
    v_new_vault_id UUID;
BEGIN
    -- The column may not exist if migration_002 was never run, in which case
    -- there's nothing to migrate.
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
         WHERE table_schema = 'public'
           AND table_name = 'organizations'
           AND column_name = 'anthropic_api_key'
    ) THEN
        RETURN;
    END IF;

    FOR rec IN
        EXECUTE 'SELECT id, anthropic_api_key FROM organizations
                  WHERE anthropic_api_key IS NOT NULL
                    AND anthropic_key_vault_id IS NULL'
    LOOP
        v_new_vault_id := vault.create_secret(
            rec.anthropic_api_key,
            'org_anthropic_' || rec.id::text,
            'Migrated from plaintext column on ' || now()::text
        );
        UPDATE organizations
           SET anthropic_key_vault_id = v_new_vault_id
         WHERE id = rec.id;
    END LOOP;
END $$;

-- Drop the plaintext column. After this point, the key only exists encrypted in vault.secrets.
ALTER TABLE organizations DROP COLUMN IF EXISTS anthropic_api_key;
