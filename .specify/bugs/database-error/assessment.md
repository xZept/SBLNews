# Bug Assessment: RLS Helper Permission Denied Breaks Upvotes, Upvoted Studies, Recently Viewed Studies, and Direct Messages

- **Slug**: database-error
- **Created**: 2026-11-28
- **Source**: pasted text
- **Verdict**: valid
- **Severity**: high

## Report (verbatim or summarized)

> "There seem to be an error in displaying upvoted studies and recently voted studies, because they do not appear in profile. This also affects upvoting as it is not recorded. Check the database tables and see why this occurs."

## Symptom

Signed-in users cannot see their upvoted studies or recently viewed studies (referred to in the report as "recently voted studies") on `/profile` or `/profile/[id]`, and clicking the upvote button on any study fails to record or remove the vote (the optimistic UI rolls back with `"Failed to check vote status."`). Users should see their existing upvoted studies and opted-in recently viewed studies on their profile, and toggling an upvote should persist to `public.votes`.

## Reproduction

1. Sign in as any authenticated user (e.g., an account with existing rows in `public.votes` — the live database currently contains 5 rows in `public.votes`).
2. Navigate to `/profile` and open the **Upvoted Studies** tab: the list renders empty (`"No upvoted studies yet"`) because `getMyUpvotedStudies()` catches Postgres error `42501: permission denied for function can_view_user_upvotes` and falls back to `[]`.
3. Open the **Recently Viewed Studies** tab on `/profile`: `getRecentStudyViews()` fails with Postgres error `42501: permission denied for function can_view_user_recent_views` and falls back to `[]`.
4. Navigate to `/` or `/study/[id]` and click the upvote button on any study: `toggleVoteAction()` runs a `SELECT` on `public.votes` first to check for an existing vote, which fails with `42501: permission denied for function can_view_user_upvotes`, causing the action to abort with `{ ok: false, error: "DB_ERROR", message: "Failed to check vote status." }` before ever reaching `INSERT` or `DELETE`.
5. Direct database reproduction (confirmed on live Supabase project `mhmurlrxmrtzpctkqzae`):
   - `BEGIN; SET LOCAL ROLE authenticated; SELECT count(*) FROM public.votes; ROLLBACK;` -> `ERROR: 42501: permission denied for function can_view_user_upvotes`
   - `BEGIN; SET LOCAL ROLE authenticated; SELECT count(*) FROM public.recent_study_views; ROLLBACK;` -> `ERROR: 42501: permission denied for function can_view_user_recent_views`
   - `BEGIN; SET LOCAL ROLE authenticated; SELECT count(*) FROM public.direct_messages; ROLLBACK;` -> `ERROR: 42501: permission denied for function is_blocked_pair`

## Suspected Code Paths

- `supabase/migrations/0009_socialization_aura_friends_chat.sql:45-46` — Creates schema `private` and executes `REVOKE ALL ON SCHEMA private FROM PUBLIC, anon, authenticated;`.
- `supabase/migrations/0009_socialization_aura_friends_chat.sql:487-491` — Explicitly executes `REVOKE ALL ON FUNCTION ... FROM PUBLIC, anon, authenticated;` for `private.are_accepted_friends(uuid, uuid)`, `private.is_blocked_pair(uuid, uuid)`, `private.can_view_user_upvotes(uuid)`, `private.can_view_user_recent_views(uuid)`, and `private.recompute_user_aura(uuid)`.
- `supabase/migrations/0009_socialization_aura_friends_chat.sql:650-663` — Creates RLS policies `votes_select_by_visibility` (calling `private.can_view_user_upvotes(user_id)`) and `recent_study_views_select_by_visibility` (calling `private.can_view_user_recent_views(user_id)`) for roles `anon, authenticated`.
- `supabase/migrations/0009_socialization_aura_friends_chat.sql:1080-1106` — Creates RLS policies `direct_messages_select_participant` (calling `private.is_blocked_pair(sender_id, recipient_id)`) and `direct_messages_insert_mutual_friends` (calling `private.are_accepted_friends(sender_id, recipient_id)`) for role `authenticated`, which suffer from the exact same revoked-permission defect.
- `web/src/lib/actions/votes.ts:37-50` — `toggleVoteAction()` performs a `SELECT` on `public.votes` before `INSERT`/`DELETE`; the `42501` error on `SELECT` aborts the entire upvote mutation.
- `web/src/lib/queries/profile.ts:166-185` — `getAuthorizedUpvotedStudies()` / `getMyUpvotedStudies()` query `public.votes`, log the `42501` error, and return an empty page.
- `web/src/lib/queries/profile.ts:319-330` — `getRecentStudyViews()` queries `public.recent_study_views`, logs the `42501` error, and returns `[]`.
- `web/src/components/feed/feed-client.tsx:33`, `web/src/app/search/page.tsx:71`, `web/src/app/study/[id]/page.tsx:99` — Read `public.votes` to determine whether the signed-in user has already upvoted each study; all fail with `42501`.
- `web/src/lib/queries/social.ts:113,195,366` and `web/src/lib/actions/social.ts:715,787` — Read/insert `public.direct_messages`; fail with `42501` due to revoked `EXECUTE` on `private.is_blocked_pair` and `private.are_accepted_friends`.
- `web/src/components/study/study-view-tracker.tsx:21` & `supabase/migrations/0009_socialization_aura_friends_chat.sql:697` — Secondary note (expected by design, not a bug): all 6 existing rows in `public.profiles` currently have `viewed_studies_visibility = 'private'` (default), so `public.recent_study_views` has 0 rows until a user opts into `Friends Only` or `Public` visibility in Profile Settings.

## Root Cause Hypothesis

In PostgreSQL, Row-Level Security (RLS) policy expressions are evaluated under the privileges of the **calling role** (`anon` or `authenticated`), not the table or policy owner. Migration `0009_socialization_aura_friends_chat.sql` placed four `SECURITY DEFINER` RLS helper predicates (`private.can_view_user_upvotes`, `private.can_view_user_recent_views`, `private.are_accepted_friends`, `private.is_blocked_pair`) in the non-exposed `private` schema, and then explicitly revoked both `USAGE` on schema `private` (line 46) and `EXECUTE` on all four functions from `PUBLIC, anon, authenticated` (lines 487–490). Because `anon` and `authenticated` lack `EXECUTE` privilege on those functions, every `SELECT` on `public.votes` and `public.recent_study_views` (and every `SELECT`/`INSERT` on `public.direct_messages`) immediately throws PostgreSQL `42501: permission denied for function ...`. This breaks profile activity display, feed/search/detail vote-state hydration, `toggleVoteAction()` (which selects from `public.votes` before inserting/deleting), and direct messaging. **Confidence: high** (directly reproduced on the live Supabase database).

## Proposed Remediation

**Preferred**: Add a new forward migration (e.g., `supabase/migrations/0010_grant_private_rls_helper_execute.sql`) and apply it to the Supabase database to grant the minimum required privileges for RLS evaluation while keeping the `private` schema unexposed via PostgREST and keeping mutation helpers locked down:
1. `GRANT USAGE ON SCHEMA private TO anon, authenticated;`
2. `GRANT EXECUTE ON FUNCTION private.can_view_user_upvotes(uuid) TO anon, authenticated;`
3. `GRANT EXECUTE ON FUNCTION private.can_view_user_recent_views(uuid) TO anon, authenticated;`
4. `GRANT EXECUTE ON FUNCTION private.are_accepted_friends(uuid, uuid) TO authenticated;`
5. `GRANT EXECUTE ON FUNCTION private.is_blocked_pair(uuid, uuid) TO authenticated;`
6. Keep `private.recompute_user_aura(uuid)` revoked from `PUBLIC, anon, authenticated` (it is only invoked by `SECURITY DEFINER` triggers).

Because the `private` schema is not listed in PostgREST's exposed schemas (`public` / `graphql_public`), granting `USAGE` and `EXECUTE` to `anon`/`authenticated` allows PostgreSQL RLS policies to evaluate these read-only boolean predicates without exposing any `/rest/v1/rpc/*` endpoints.

**Alternatives**:
- *Inline the RLS predicates directly into the policies instead of calling `private.*` functions*: Avoids `SECURITY DEFINER` helper functions, but fails for `public.profiles` because `upvoted_studies_visibility` and `viewed_studies_visibility` are intentionally excluded from column-level `GRANT SELECT` on `public.profiles` for `anon`/`authenticated` (to keep privacy settings private), and would also re-introduce RLS cross-table recursion or join overhead. Therefore, keeping the `SECURITY DEFINER` helpers in `private` and granting `EXECUTE` is strictly better.

**Files likely to change**:
- `supabase/migrations/0010_grant_private_rls_helper_execute.sql` (new migration)
- Optionally `web/src/lib/actions/votes.ts` (minor: also call `revalidatePath("/profile")` alongside `/` and `/study/${studyId}` if desired, though `/profile` is already `force-dynamic`)
- `web/tests/social.test.ts` or `web/tests/profile.test.ts` (add regression test/assertion on migration grants)

**Tests to add or update**:
- Database verification test (via SQL under `SET LOCAL ROLE authenticated` and `SET LOCAL ROLE anon` with `request.jwt.claim.sub` set) verifying:
  - Authenticated owner can `SELECT`, `INSERT`, and `DELETE` their own rows in `public.votes` (and `trg_sync_study_upvote_count` + `trg_sync_vote_user_aura` succeed).
  - Non-owner `authenticated` and `anon` callers can only see `public.votes` and `public.recent_study_views` rows permitted by visibility (`private` hidden, `public` visible, `friends` visible only to accepted friends).
  - Authenticated users can `SELECT` and `INSERT` `public.direct_messages` with accepted, non-blocked friends without `42501`.
  - `private.recompute_user_aura(uuid)` remains uncallable by `anon` and `authenticated`.
- Unit/static test in `web/tests/` asserting the migration grants `USAGE` on `private` and `EXECUTE` on the four RLS predicate functions.

## Risks & Considerations

- **Security surface**: Confirm `private` is never added to PostgREST exposed schemas (`db_schemas`). All four functions being granted `EXECUTE` are `STABLE`, read-only boolean predicates with `SET search_path = ''`; none mutate state or leak row data beyond a boolean visibility/relationship check. `private.recompute_user_aura(uuid)` must remain revoked.
- **Recently Viewed Studies UX**: Even after fixing the `42501` error, users whose `viewed_studies_visibility` is still `'private'` (currently all 6 accounts in the database) will see 0 recently viewed studies until they switch `Recently Viewed Studies` visibility to `Friends Only` or `Public` in Profile Settings and visit a study page.
- **Unrelated security advisor findings**: Running Supabase security advisors surfaced pre-existing warnings (`0028`/`0029` on `public` trigger/helper functions, `0011` on `search_studies_hybrid`, `0014` on `vector` extension, and leaked password protection); these are out of scope for this bug fix and should be tracked separately.

## Open Questions

- [NEEDS CLARIFICATION: Confirm whether "recently voted studies" in the report refers to the "Recently Viewed Studies" tab on `/profile`, or if a separate "Recently Voted" section was expected.]
