-- Security hardening: close default Supabase API access to sensitive tables and views.

-- 1. Enable RLS on summary_feedback (was missing; without it the table is
--    readable/writable via PostgREST with the anon key).
ALTER TABLE public.summary_feedback ENABLE ROW LEVEL SECURITY;

-- 2. Revoke anon/authenticated access to analytics views so internal
--    telemetry (including raw device_id in analytics_retention) is not
--    queryable through the public REST API.
REVOKE ALL ON public.analytics_daily_active FROM anon, authenticated;
REVOKE ALL ON public.analytics_usage_by_bucket FROM anon, authenticated;
REVOKE ALL ON public.analytics_top_voted_articles FROM anon, authenticated;
REVOKE ALL ON public.analytics_retention FROM anon, authenticated;
