-- 0006_grant_role_privileges.sql
-- Grant least-privilege schema, table, and RPC permissions to PostgREST roles
-- (`anon` and `authenticated`). Row-Level Security (RLS) on all 7 tables remains
-- enabled and enforces row-level access and admin RBAC.

GRANT USAGE ON SCHEMA public TO anon, authenticated;

-- Public read tables (RLS filters `studies`, `comments`, and `secondary_commentaries`
-- to published rows for non-admin callers)
GRANT SELECT ON TABLE public.studies TO anon, authenticated;
GRANT SELECT ON TABLE public.guidelines TO anon, authenticated;
GRANT SELECT ON TABLE public.secondary_commentaries TO anon, authenticated;
GRANT SELECT ON TABLE public.profiles TO anon, authenticated;
GRANT SELECT ON TABLE public.comments TO anon, authenticated;
GRANT SELECT ON TABLE public.votes TO anon, authenticated;

-- Authenticated member mutations (RLS restricts writes to own user_id / author_id)
GRANT UPDATE ON TABLE public.profiles TO authenticated;
GRANT INSERT, DELETE ON TABLE public.votes TO authenticated;
GRANT INSERT, UPDATE, DELETE ON TABLE public.comments TO authenticated;

-- Admin moderation tables (server-side RBAC + RLS `public.is_admin()` enforce admin role)
-- Note: `anon` intentionally receives NO privileges on `consensus_drift_alerts`.
GRANT UPDATE ON TABLE public.studies TO authenticated;
GRANT UPDATE ON TABLE public.guidelines TO authenticated;
GRANT SELECT, UPDATE ON TABLE public.consensus_drift_alerts TO authenticated;
GRANT INSERT, UPDATE, DELETE ON TABLE public.secondary_commentaries TO authenticated;

-- Hybrid search RPC (SECURITY INVOKER; projects summary columns only)
GRANT EXECUTE ON FUNCTION public.search_studies_hybrid(
  text,
  vector,
  public.study_design_type,
  numeric,
  boolean,
  integer
) TO anon, authenticated;
