-- match_recent_article_events is SECURITY DEFINER, so it bypasses RLS on
-- article_events. Revoking from PUBLIC is not enough on Supabase, where anon
-- and authenticated receive explicit EXECUTE grants on new functions. Limit
-- it to the edge function's service role. pgvector lives in the extensions
-- schema, which is not on the migration search_path, so the type is qualified.
revoke all on function public.match_recent_article_events(
  extensions.vector, text, text, timestamptz, integer, double precision
) from public, anon, authenticated;

grant execute on function public.match_recent_article_events(
  extensions.vector, text, text, timestamptz, integer, double precision
) to service_role;
