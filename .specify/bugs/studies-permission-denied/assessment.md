# Bug Assessment: PostgreSQL Permission Denied on `public.studies` for PostgREST Roles

- **Slug**: studies-permission-denied
- **Created**: 2026-11-26
- **Source**: pasted text
- **Verdict**: valid
- **Severity**: critical

## Report (verbatim or summarized)

Next.js Server Component `HomePage` (`web/src/app/page.tsx`) fails at runtime in `getFeedStudies` (`web/src/lib/queries/studies.ts:58`) with PostgreSQL error `permission denied for table studies`.

## Symptom

Loading `/` (and any other PostgREST-backed route: `/study/[id]`, `/guidelines`, `/search`, `/admin/review`) fails with `permission denied for table <table_name>` instead of returning published studies, living guidelines, comments, votes, or admin moderation queues. Because `getFeedStudies()` catches the error and falls back to `[]`, the home feed renders empty while logging `Error fetching feed studies: permission denied for table studies`.

## Reproduction

1. Ensure migrations `0001_enable_pgvector_and_enums.sql` through `0005_seed_guidelines.sql` are applied to Supabase project `mhmurlrxmrtzpctkqzae`.
2. Inspect table privileges for `anon` and `authenticated` via `has_table_privilege(...)` on `public.*`: all 7 tables return `false` for `SELECT`, `INSERT`, `UPDATE`, and `DELETE`.
3. Render `HomePage` (`web/src/app/page.tsx`) or invoke `getFeedStudies()` (`web/src/lib/queries/studies.ts:40-63`) using the anonymous `createPublicClient()` (`NEXT_PUBLIC_SUPABASE_ANON_KEY`).
4. Observe PostgreSQL error `permission denied for table studies` logged at `web/src/lib/queries/studies.ts:58`.

## Suspected Code Paths

- `supabase/migrations/0002_tables_and_indexes.sql` — creates all 7 `public` tables (`profiles`, `studies`, `secondary_commentaries`, `guidelines`, `consensus_drift_alerts`, `votes`, `comments`) without any `GRANT` statements for `anon` or `authenticated`.
- `supabase/migrations/0003_rls_policies_and_triggers.sql` — enables RLS and defines policies on all 7 tables, but does not grant underlying PostgreSQL table privileges (`SELECT`/`INSERT`/`UPDATE`/`DELETE`) to `anon` or `authenticated`.
- `supabase/migrations/0004_hybrid_search_rpc.sql` — defines `public.search_studies_hybrid(text, vector, public.study_design_type, numeric, boolean, integer)` as `SECURITY INVOKER`; because it reads `public.studies` as the calling role, it also fails with `permission denied for table studies` when invoked by `anon` or `authenticated`.
- `web/src/lib/supabase/server.ts:18-54` — `createPublicClient()` and `createClient()` correctly use `NEXT_PUBLIC_SUPABASE_ANON_KEY` (never `service_role`), so all requests execute as PostgREST `anon` or `authenticated` roles.
- `web/src/lib/queries/studies.ts:48-60` — `getFeedStudies()` queries `public.studies` with `STUDY_SUMMARY_COLUMNS` via `createPublicClient()`, hitting the missing `SELECT` grant.
- `web/src/lib/queries/guidelines.ts:55-98` — `getLivingGuidelines()` queries `public.guidelines` and `public.studies` via `createPublicClient()`, hitting the same missing `SELECT` grants.
- `web/src/lib/queries/admin.ts:57-112`, `web/src/lib/actions/votes.ts`, `web/src/lib/actions/comments.ts`, `web/src/lib/actions/moderation.ts` — all correctly use `createClient()` / `assertAdmin()` and RLS-compatible role context, and require explicit table grants for `authenticated`.

## Root Cause Hypothesis

Migrations `0001` through `0005` enabled Row-Level Security and created complete RLS policies on all 7 tables, but never issued PostgreSQL `GRANT` statements for the `anon` and `authenticated` PostgREST roles. On Supabase project `mhmurlrxmrtzpctkqzae`, live privilege inspection confirmed `USAGE` on `public` and `EXECUTE` on `search_studies_hybrid` are present, but all 7 tables have `false` for every privilege (`SELECT`, `INSERT`, `UPDATE`, `DELETE`) for both `anon` and `authenticated`. In PostgreSQL, RLS policies only filter rows *after* table-level privileges are granted; without `GRANT`, PostgREST immediately rejects every query with `permission denied for table ...`. Furthermore, a draft `0006_grant_role_privileges.sql` on disk had not been applied to the remote project and contained an invalid function signature for `search_studies_hybrid` (`text, integer` instead of `public.study_design_type, numeric`). **Confidence: high.**

## Proposed Remediation

**Preferred**: Author and apply sequential Git-first migration `supabase/migrations/0006_grant_role_privileges.sql` granting least-privilege permissions compliant with Constitution Principles I and IV:
- `USAGE` on schema `public` to `anon, authenticated`.
- `SELECT` on `studies`, `guidelines`, `secondary_commentaries`, `profiles`, `comments`, `votes` to `anon, authenticated` (zero grants on `consensus_drift_alerts` for `anon`).
- `UPDATE` on `profiles`, `INSERT, DELETE` on `votes`, and `INSERT, UPDATE, DELETE` on `comments` to `authenticated`.
- `UPDATE` on `studies`, `UPDATE` on `guidelines`, `SELECT, UPDATE` on `consensus_drift_alerts`, and `INSERT, UPDATE, DELETE` on `secondary_commentaries` to `authenticated` (guarded by server-side RBAC in `admin-guard.ts` + RLS `public.is_admin()`).
- `EXECUTE` on `public.search_studies_hybrid(text, vector, public.study_design_type, numeric, boolean, integer)` to `anon, authenticated`.

**Files likely to change**:
- `supabase/migrations/0006_grant_role_privileges.sql`

**Tests to add or update**:
- Verify live table and RPC privileges on `mhmurlrxmrtzpctkqzae` via `pg_catalog.has_table_privilege` / `has_function_privilege`.
- Verify `getFeedStudies()`, `getLivingGuidelines()`, and `search_studies_hybrid` execute cleanly without permission errors using the `anon` key.
- Verify `npx tsc --noEmit` passes in `web/`.

## Risks & Considerations

- **RLS Enforcement**: All 7 tables have `relrowsecurity = true`; table `GRANT`s do not bypass RLS. `anon` has no `SELECT` or write privilege on `consensus_drift_alerts`, and non-admin `authenticated` writes to `studies`, `guidelines`, `consensus_drift_alerts`, and `secondary_commentaries` are blocked by `public.is_admin()` RLS policies plus `assertAdmin()` server guards.
- **Egress Protection**: `getFeedStudies()`, `getLivingGuidelines()`, and `search_studies_hybrid` continue to project only `STUDY_SUMMARY_COLUMNS` (excluding `abstract_text` and `embedding`).
- **Pre-existing Supabase Security Advisor Warnings (out of scope for this grant fix, recommended follow-up)**:
  - `public.search_studies_hybrid` has a mutable `search_path` (`0011_function_search_path_mutable`).
  - `vector` extension is installed in `public` (`0014_extension_in_public`).
  - Trigger/helper `SECURITY DEFINER` functions in `public` (`handle_new_user`, `is_admin`, `protect_profile_role`, `sync_study_comment_count`, `sync_study_upvote_count`) are executable by `anon`/`authenticated` by Postgres default (`0028` / `0029`); revoking `EXECUTE` from `PUBLIC`/`anon`/`authenticated` on trigger functions is a good hardening follow-up.

## Open Questions

- None.
