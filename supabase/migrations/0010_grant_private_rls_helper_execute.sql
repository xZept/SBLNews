-- 0010_grant_private_rls_helper_execute.sql
-- Restore USAGE on non-exposed `private` schema and EXECUTE on the four
-- read-only RLS predicate functions so Postgres can evaluate RLS policies on
-- `public.votes`, `public.recent_study_views`, and `public.direct_messages`
-- under the calling role (`anon` / `authenticated`).
-- `private.recompute_user_aura(uuid)` intentionally remains revoked.

GRANT USAGE ON SCHEMA private TO anon, authenticated;

GRANT EXECUTE ON FUNCTION private.can_view_user_upvotes(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION private.can_view_user_recent_views(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION private.are_accepted_friends(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION private.is_blocked_pair(uuid, uuid) TO authenticated;
