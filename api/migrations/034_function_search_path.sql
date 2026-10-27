-- Migration 034: pin search_path on public functions
-- Without a fixed search_path, a function resolves unqualified names using the
-- caller's path, so an object planted earlier on that path can shadow a table
-- or operator (most dangerous for SECURITY DEFINER functions, which run with
-- the owner's rights). Flagged by the Supabase advisor (lint 0011).
-- The pgvector extension lives in public, so public stays on the path for the
-- vector/halfvec types and the <=> operator; pg_temp goes last so temporary
-- objects can never shadow anything.

ALTER FUNCTION public.increment_monthly_usage() SET search_path = public, pg_temp;
ALTER FUNCTION public.mark_hot_cache_stale() SET search_path = public, pg_temp;
ALTER FUNCTION public.match_episodic_memories(uuid, vector, double precision, integer, uuid, text) SET search_path = public, pg_temp;
ALTER FUNCTION public.consolidate_episodic_batch(uuid, uuid[], uuid, text) SET search_path = public, pg_temp;
ALTER FUNCTION public.episodic_hot_vector_count(uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.consume_budget(uuid, uuid, text, bigint) SET search_path = public, pg_temp;
