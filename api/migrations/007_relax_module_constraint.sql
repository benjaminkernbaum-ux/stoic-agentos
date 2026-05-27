-- ═══════════════════════════════════════════════════════
--  Migration 007: Relax agents_module_check constraint
-- ═══════════════════════════════════════════════════════
--  The original CHECK constraint on agents.module only allows
--  a few values. This prevents creating agents with custom modules
--  like 'engineering', 'analytics', 'support', etc.
--
--  Fix: Drop the old constraint and add a more permissive one
--  that allows any non-empty string.

ALTER TABLE agents DROP CONSTRAINT IF EXISTS agents_module_check;

-- Allow any non-empty module value (users should be free to name modules)
ALTER TABLE agents ADD CONSTRAINT agents_module_check
  CHECK (module IS NULL OR length(module) > 0);
