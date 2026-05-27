-- ═══════════════════════════════════════════════════════════════
-- Migration 009: Vault-backed Anthropic API Keys (BYOK)
--
-- Enables per-org Anthropic API key storage using Supabase Vault.
-- Keys are encrypted at rest and decrypted only via RPC.
--
-- Prerequisites: Supabase Vault extension must be enabled.
-- To enable: Dashboard → Database → Extensions → search "vault" → Enable
-- ═══════════════════════════════════════════════════════════════

-- 1. Add vault reference column to organizations
ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS anthropic_key_vault_id UUID DEFAULT NULL;

COMMENT ON COLUMN organizations.anthropic_key_vault_id IS
  'References vault.secrets.id — stores the encrypted Anthropic API key for BYOK.';

-- 2. Create the RPC that the API server calls to decrypt the key
--    Only callable with service_role key (not from the browser).
CREATE OR REPLACE FUNCTION get_org_anthropic_key(p_org_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, vault
AS $$
DECLARE
  v_vault_id UUID;
  v_decrypted TEXT;
BEGIN
  -- Look up the vault secret ID for this org
  SELECT anthropic_key_vault_id INTO v_vault_id
    FROM organizations
   WHERE id = p_org_id;

  IF v_vault_id IS NULL THEN
    RETURN NULL;
  END IF;

  -- Decrypt the secret from vault
  SELECT decrypted_secret INTO v_decrypted
    FROM vault.decrypted_secrets
   WHERE id = v_vault_id;

  RETURN v_decrypted;
END;
$$;

-- 3. Create the RPC to SET an org's Anthropic key (inserts/updates vault secret)
CREATE OR REPLACE FUNCTION set_org_anthropic_key(p_org_id UUID, p_api_key TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, vault
AS $$
DECLARE
  v_existing_vault_id UUID;
  v_new_vault_id UUID;
BEGIN
  -- Check if org already has a vault key
  SELECT anthropic_key_vault_id INTO v_existing_vault_id
    FROM organizations
   WHERE id = p_org_id;

  IF v_existing_vault_id IS NOT NULL THEN
    -- Update existing secret
    UPDATE vault.secrets
       SET secret = p_api_key,
           updated_at = NOW()
     WHERE id = v_existing_vault_id;
  ELSE
    -- Insert new secret into vault
    INSERT INTO vault.secrets (secret, name, description)
    VALUES (
      p_api_key,
      'anthropic_key_org_' || p_org_id::TEXT,
      'Anthropic API key for org ' || p_org_id::TEXT
    )
    RETURNING id INTO v_new_vault_id;

    -- Link the vault secret to the org
    UPDATE organizations
       SET anthropic_key_vault_id = v_new_vault_id
     WHERE id = p_org_id;
  END IF;
END;
$$;

-- 4. Create the RPC to DELETE an org's Anthropic key
CREATE OR REPLACE FUNCTION delete_org_anthropic_key(p_org_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, vault
AS $$
DECLARE
  v_vault_id UUID;
BEGIN
  SELECT anthropic_key_vault_id INTO v_vault_id
    FROM organizations
   WHERE id = p_org_id;

  IF v_vault_id IS NOT NULL THEN
    -- Remove from vault
    DELETE FROM vault.secrets WHERE id = v_vault_id;

    -- Clear the reference
    UPDATE organizations
       SET anthropic_key_vault_id = NULL
     WHERE id = p_org_id;
  END IF;
END;
$$;

-- 5. Restrict RPCs to service_role only (API server)
REVOKE EXECUTE ON FUNCTION get_org_anthropic_key(UUID) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION set_org_anthropic_key(UUID, TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION delete_org_anthropic_key(UUID) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION get_org_anthropic_key(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION set_org_anthropic_key(UUID, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION delete_org_anthropic_key(UUID) TO service_role;
