-- 0007_grant_service_role_privileges.sql
-- Grant service_role privileges on all public tables and search RPC so the
-- backend ingestion pipeline (/pipeline) can read/upsert studies and drift alerts.

GRANT USAGE ON SCHEMA public TO service_role;

GRANT ALL PRIVILEGES ON TABLE public.profiles TO service_role;
GRANT ALL PRIVILEGES ON TABLE public.studies TO service_role;
GRANT ALL PRIVILEGES ON TABLE public.secondary_commentaries TO service_role;
GRANT ALL PRIVILEGES ON TABLE public.guidelines TO service_role;
GRANT ALL PRIVILEGES ON TABLE public.consensus_drift_alerts TO service_role;
GRANT ALL PRIVILEGES ON TABLE public.votes TO service_role;
GRANT ALL PRIVILEGES ON TABLE public.comments TO service_role;

GRANT EXECUTE ON FUNCTION public.search_studies_hybrid(
  text,
  vector,
  public.study_design_type,
  numeric,
  boolean,
  integer
) TO service_role;
