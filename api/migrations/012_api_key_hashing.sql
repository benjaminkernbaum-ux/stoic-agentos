/**
 * ═══════════════════════════════════════════════════════
 *  Migration 012 — API Key Hashing (SHA-256)
 * ═══════════════════════════════════════════════════════
 *  
 *  Security: Stores API keys as SHA-256 hashes instead of plaintext.
 *  On DB breach, attackers cannot recover the original key values.
 *
 *  New columns:
 *    key_hash   — SHA-256 hex digest of the full API key
 *    key_prefix — First 12 chars of the key (for display/identification)
 *
 *  Backward compatible: existing plaintext 'key' column preserved
 *  during migration period. Auth middleware checks key_hash first,
 *  falls back to plaintext, and auto-migrates on successful match.
 */

-- 1. Add columns (idempotent)
ALTER TABLE api_keys ADD COLUMN IF NOT EXISTS key_hash TEXT;
ALTER TABLE api_keys ADD COLUMN IF NOT EXISTS key_prefix TEXT;

-- 2. Index for fast hash-based lookups (only active keys)
CREATE INDEX IF NOT EXISTS idx_api_keys_key_hash 
  ON api_keys(key_hash) 
  WHERE active = true;

-- 3. Backfill existing keys with their SHA-256 hashes
-- Uses pgcrypto's digest() for server-side hashing
-- This runs idempotently (only updates rows where key_hash is NULL)
DO $$
BEGIN
  -- Ensure pgcrypto extension exists (already enabled on most Supabase projects)
  CREATE EXTENSION IF NOT EXISTS pgcrypto;
  
  UPDATE api_keys 
  SET 
    key_hash = encode(digest(key, 'sha256'), 'hex'),
    key_prefix = left(key, 12)
  WHERE key IS NOT NULL 
    AND key_hash IS NULL;
    
  RAISE NOTICE 'Backfilled % API keys with SHA-256 hashes', 
    (SELECT count(*) FROM api_keys WHERE key_hash IS NOT NULL);
END $$;

-- 4. Add a comment documenting the security pattern
COMMENT ON COLUMN api_keys.key_hash IS 'SHA-256 hex digest of the API key — used for authentication lookup';
COMMENT ON COLUMN api_keys.key_prefix IS 'First 12 characters of the API key — for display/identification only';
