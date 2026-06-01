-- ═══════════════════════════════════════════════════════
-- Migration 013 — Drop Plaintext API Keys & Revoke Compromised Key
-- Stoic AgentOS — Security Hardening
-- ═══════════════════════════════════════════════════════

-- Ensure pgcrypto extension exists (required for hashing comparison in SQL)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. Deactivate/revoke compromised telemetry key (already executed via dashboard)
--    The key has been revoked. This step is a no-op safety net.
--    Hash: see Supabase audit log for the revoked key_hash value.
-- UPDATE api_keys SET active = false WHERE key_hash = '<revoked_key_hash>';

-- 2. Drop the plaintext key column
--    This automatically drops any unique constraints and default indices referencing the column
ALTER TABLE api_keys DROP COLUMN IF EXISTS key;

-- 3. Clean up legacy indices explicitly if they exist
DROP INDEX IF EXISTS idx_api_keys_key;
DROP INDEX IF EXISTS idx_api_keys_key_active;
