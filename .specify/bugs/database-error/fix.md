# Bug Fix: Restore USAGE and EXECUTE on Private RLS Helper Predicates

- **Slug**: database-error
- **Fixed**: 2026-11-28
- **Assessment**: ./assessment.md
- **Status**: applied

## Summary

Added and applied migration `0010_grant_private_rls_helper_execute.sql` to grant `USAGE` on the non-exposed `private` schema and `EXECUTE` on the four read-only RLS predicate functions (`can_view_user_upvotes`, `can_view_user_recent_views`, `are_accepted_friends`, `is_blocked_pair`) to the required PostgREST roles (`anon` / `authenticated`). This resolves the `42501: permission denied for function ...` errors when querying `public.votes`, `public.recent_study_views`, and `public.direct_messages` and unblocks upvoting.

## Changes

| File | Change | Notes |
|------|--------|-------|
| `supabase/migrations/0010_grant_private_rls_helper_execute.sql` | added | Grants `USAGE` on `private` and `EXECUTE` on the 4 RLS helper predicates; leaves `private.recompute_user_aura(uuid)` revoked |
| `web/tests/social.test.ts` | modified | Added static regression test verifying `0010_grant_private_rls_helper_execute.sql` grants |
| Live Supabase DB (`mhmurlrxmrtzpctkqzae`) | applied migration | Applied `grant_private_rls_helper_execute` via Supabase MCP |

## Diff Highlights

```sql
GRANT USAGE ON SCHEMA private TO anon, authenticated;

GRANT EXECUTE ON FUNCTION private.can_view_user_upvotes(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION private.can_view_user_recent_views(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION private.are_accepted_friends(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION private.is_blocked_pair(uuid, uuid) TO authenticated;
```

## Tests Added or Updated

- `web/tests/social.test.ts::private RLS helper execute grants (migration 0010)` — Verifies `0010_grant_private_rls_helper_execute.sql` grants `USAGE` on `private` and `EXECUTE` on all four RLS predicate functions while keeping `private.recompute_user_aura` ungranted.

## Local Verification

- Commands run: `npm --prefix web test -- --run` → 8 test files passed, 73 tests passed.
- Live DB checks (`execute_sql` on `mhmurlrxmrtzpctkqzae`):
  - Privilege check confirmed `auth_schema_usage = true`, `anon_schema_usage = true`, `auth_exec = true` for all 4 RLS predicates, `anon_exec = true` for `can_view_user_upvotes` and `can_view_user_recent_views`, `anon_exec = false` for `are_accepted_friends` and `is_blocked_pair`, and `auth_exec = false` / `anon_exec = false` for `recompute_user_aura`.
  - `BEGIN; SET LOCAL ROLE authenticated; SELECT count(*) FROM public.votes / recent_study_views / direct_messages; ROLLBACK;` → succeeded (`0` rows without JWT claim, no `42501` error).
  - `BEGIN; SET LOCAL ROLE anon; SELECT count(*) FROM public.votes / recent_study_views; ROLLBACK;` → succeeded (`0` rows, no `42501` error).

## Deviations from Assessment

- Did not modify `web/src/lib/actions/votes.ts` since `/profile` is already `force-dynamic` and the assessment listed it as optional.

## Follow-ups

- Note for end-users: `Recently Viewed Studies` only records new views when `viewed_studies_visibility` is set to `Friends Only` or `Public` in Profile Settings (all 6 existing profiles currently default to `'private'`).
- Run `/speckit-bug-test slug=database-error` to complete formal verification.
