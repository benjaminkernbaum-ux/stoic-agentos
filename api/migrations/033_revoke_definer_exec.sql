-- Migration 033: lock down SECURITY DEFINER functions
-- These functions run with the owner's rights and take an org id as a plain
-- argument, so anyone holding the public anon key could call them through
-- /rest/v1/rpc/... for any org (e.g. wipe an org's Anthropic key, drain its
-- budget). Only the API calls them, with the service-role key, so EXECUTE is
-- revoked from PUBLIC, anon and authenticated and kept for service_role.
-- mark_hot_cache_stale is a trigger function; triggers fire regardless of
-- EXECUTE grants, so revoking it does not affect the trigger.

REVOKE EXECUTE ON FUNCTION public.clear_org_anthropic_key(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.consolidate_episodic_batch(uuid, uuid[], uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.consume_budget(uuid, uuid, text, bigint) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.episodic_hot_vector_count(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.mark_hot_cache_stale() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.match_episodic_memories(uuid, vector, double precision, integer, uuid, text) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.clear_org_anthropic_key(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.consolidate_episodic_batch(uuid, uuid[], uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.consume_budget(uuid, uuid, text, bigint) TO service_role;
GRANT EXECUTE ON FUNCTION public.episodic_hot_vector_count(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.mark_hot_cache_stale() TO service_role;
GRANT EXECUTE ON FUNCTION public.match_episodic_memories(uuid, vector, double precision, integer, uuid, text) TO service_role;
