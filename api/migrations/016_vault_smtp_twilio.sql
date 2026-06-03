-- ═══════════════════════════════════════════════════════════════
-- Migration 016: Vault-backed SMTP and Twilio Credentials (BYOK)
--
-- Enables per-org SMTP (Mercury) and Twilio (Hermes) credentials
-- storage using Supabase Vault. Credentials are encrypted at rest
-- and decrypted only via RPC for service_role actions.
-- ═══════════════════════════════════════════════════════════════

-- 1. Add vault reference columns to organizations table
ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS smtp_key_vault_id UUID DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS twilio_key_vault_id UUID DEFAULT NULL;

COMMENT ON COLUMN organizations.smtp_key_vault_id IS
  'References vault.secrets.id — stores the encrypted SMTP credentials JSON payload.';

COMMENT ON COLUMN organizations.twilio_key_vault_id IS
  'References vault.secrets.id — stores the encrypted Twilio credentials JSON payload.';


-- 2. Create Decryption/Retrieval RPCs
CREATE OR REPLACE FUNCTION get_org_smtp_credentials(p_org_id UUID)
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
  SELECT smtp_key_vault_id INTO v_vault_id
    FROM organizations
   WHERE id = p_org_id;

  IF v_vault_id IS NULL THEN
    RETURN NULL;
  END IF;

  -- Decrypt secret from vault
  SELECT decrypted_secret INTO v_decrypted
    FROM vault.decrypted_secrets
   WHERE id = v_vault_id;

  RETURN v_decrypted;
END;
$$;

CREATE OR REPLACE FUNCTION get_org_twilio_credentials(p_org_id UUID)
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
  SELECT twilio_key_vault_id INTO v_vault_id
    FROM organizations
   WHERE id = p_org_id;

  IF v_vault_id IS NULL THEN
    RETURN NULL;
  END IF;

  -- Decrypt secret from vault
  SELECT decrypted_secret INTO v_decrypted
    FROM vault.decrypted_secrets
   WHERE id = v_vault_id;

  RETURN v_decrypted;
END;
$$;


-- 3. Create Storage/Writing RPCs
CREATE OR REPLACE FUNCTION set_org_smtp_credentials(p_org_id UUID, p_credentials TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, vault
AS $$
DECLARE
  v_existing_vault_id UUID;
  v_new_vault_id UUID;
BEGIN
  -- Check if org already has a vault credential
  SELECT smtp_key_vault_id INTO v_existing_vault_id
    FROM organizations
   WHERE id = p_org_id;

  IF v_existing_vault_id IS NOT NULL THEN
    -- Update existing secret in vault
    UPDATE vault.secrets
       SET secret = p_credentials,
           updated_at = NOW()
     WHERE id = v_existing_vault_id;
    RETURN 'updated';
  ELSE
    -- Insert new secret into vault
    INSERT INTO vault.secrets (secret, name, description)
    VALUES (
      p_credentials,
      'smtp_credentials_org_' || p_org_id::TEXT,
      'SMTP credentials JSON for org ' || p_org_id::TEXT
    )
    RETURNING id INTO v_new_vault_id;

    -- Link the vault secret to the org
    UPDATE organizations
       SET smtp_key_vault_id = v_new_vault_id
     WHERE id = p_org_id;
    RETURN 'created';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION set_org_twilio_credentials(p_org_id UUID, p_credentials TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, vault
AS $$
DECLARE
  v_existing_vault_id UUID;
  v_new_vault_id UUID;
BEGIN
  -- Check if org already has a vault credential
  SELECT twilio_key_vault_id INTO v_existing_vault_id
    FROM organizations
   WHERE id = p_org_id;

  IF v_existing_vault_id IS NOT NULL THEN
    -- Update existing secret in vault
    UPDATE vault.secrets
       SET secret = p_credentials,
           updated_at = NOW()
     WHERE id = v_existing_vault_id;
    RETURN 'updated';
  ELSE
    -- Insert new secret into vault
    INSERT INTO vault.secrets (secret, name, description)
    VALUES (
      p_credentials,
      'twilio_credentials_org_' || p_org_id::TEXT,
      'Twilio credentials JSON for org ' || p_org_id::TEXT
    )
    RETURNING id INTO v_new_vault_id;

    -- Link the vault secret to the org
    UPDATE organizations
       SET twilio_key_vault_id = v_new_vault_id
     WHERE id = p_org_id;
    RETURN 'created';
  END IF;
END;
$$;


-- 4. Create Deletion RPCs
CREATE OR REPLACE FUNCTION delete_org_smtp_credentials(p_org_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, vault
AS $$
DECLARE
  v_vault_id UUID;
BEGIN
  SELECT smtp_key_vault_id INTO v_vault_id
    FROM organizations
   WHERE id = p_org_id;

  IF v_vault_id IS NOT NULL THEN
    -- Delete secret from vault
    DELETE FROM vault.secrets WHERE id = v_vault_id;

    -- Clear reference in organizations table
    UPDATE organizations
       SET smtp_key_vault_id = NULL
     WHERE id = p_org_id;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION delete_org_twilio_credentials(p_org_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, vault
AS $$
DECLARE
  v_vault_id UUID;
BEGIN
  SELECT twilio_key_vault_id INTO v_vault_id
    FROM organizations
   WHERE id = p_org_id;

  IF v_vault_id IS NOT NULL THEN
    -- Delete secret from vault
    DELETE FROM vault.secrets WHERE id = v_vault_id;

    -- Clear reference in organizations table
    UPDATE organizations
       SET twilio_key_vault_id = NULL
     WHERE id = p_org_id;
  END IF;
END;
$$;


-- 5. Restrict RPCs execution to service_role only
REVOKE EXECUTE ON FUNCTION get_org_smtp_credentials(UUID) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION get_org_twilio_credentials(UUID) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION set_org_smtp_credentials(UUID, TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION set_org_twilio_credentials(UUID, TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION delete_org_smtp_credentials(UUID) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION delete_org_twilio_credentials(UUID) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION get_org_smtp_credentials(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION get_org_twilio_credentials(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION set_org_smtp_credentials(UUID, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION set_org_twilio_credentials(UUID, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION delete_org_smtp_credentials(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION delete_org_twilio_credentials(UUID) TO service_role;
