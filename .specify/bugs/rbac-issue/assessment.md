# Bug Assessment: Newly created accounts appear as Admin in TopNav

- **Slug**: rbac-issue
- **Created**: 2026-11-26T22:08:55+08:00
- **Source**: pasted text
- **Verdict**: valid
- **Severity**: medium

## Report (verbatim or summarized)

> Why are newly created accounts automatically set as admin

## Symptom

When a new user signs up / signs in via OAuth, the top navigation bar immediately displays an `Admin` button linking to `/admin/review`, making it appear as though every newly created account is automatically granted the `admin` role. In reality, newly created accounts are assigned `role = 'member'` in the database, and clicking the `Admin` link silently redirects non-admin users back to `/`.

## Reproduction

1. Sign in with a newly created OAuth account (Google or GitHub) via `TopNav`.
2. Observe the top navigation bar after authentication completes (`authReady && user` becomes truthy).
3. Expected: A newly created `member` account should not see the `Admin` navigation link (`/admin/review`).
4. Observed: The `Admin` link (`<ShieldCheck /> Admin`) is rendered in `TopNav` for every authenticated user regardless of `profiles.role`. Clicking it navigates to `/admin/review`, where `requireAdminPage()` redirects back to `/`.

## Suspected Code Paths

- `web/src/components/layout/top-nav.tsx:116-125` — Renders `<Link href="/admin/review">...<span>Admin</span></Link>` solely behind `{authReady && user ? (...)}` without checking `profiles.role === "admin"`.
- `supabase/migrations/0002_tables_and_indexes.sql:10` — Confirms `public.profiles.role` defaults to `'member'`.
- `supabase/migrations/0003_rls_policies_and_triggers.sql:179-212` — Confirms `public.handle_new_user()` explicitly inserts `'member'` on `AFTER INSERT ON auth.users`.
- `supabase/migrations/0003_rls_policies_and_triggers.sql:41-61` — Confirms `public.protect_profile_role()` blocks non-admin / non-`service_role` role elevation.
- `web/src/lib/supabase/admin-guard.ts:19-51` — Confirms `assertAdmin()` and `requireAdminPage()` verify `profiles.role === "admin"` on the server and redirect unauthorized visitors to `/`.

## Root Cause Hypothesis

Newly created accounts are **not** actually set to `admin` in PostgreSQL (`public.profiles.role` is `'member'` via both the column default and `public.handle_new_user()`). Instead, `TopNav` (`web/src/components/layout/top-nav.tsx:116-125`) checks only whether a Supabase Auth `user` session exists (`authReady && user`) and never queries `public.profiles.role`, causing the `Admin` link to be displayed to all signed-in users. Confidence: high.

## Proposed Remediation

**Preferred**: Update `TopNav` (`web/src/components/layout/top-nav.tsx`) to track `isAdmin` state (defaulting to `false`). When `user` is present (from `supabase.auth.getUser()` or `onAuthStateChange`), query `supabase.from("profiles").select("role").eq("id", user.id).single()` on the client and set `isAdmin = data?.role === "admin"` (resetting to `false` on sign-out or error). Gate the `/admin/review` `<Link>` on `authReady && user && isAdmin`. Doing this client-side inside `TopNav` preserves ISR static caching on `/` and `/guidelines` (whereas reading cookies in `RootLayout` would opt all routes into dynamic rendering).

**Alternatives**:
- Pass `isAdmin` from a Server Component in `web/src/app/layout.tsx` — avoids an extra client query, but reading `cookies()` in `RootLayout` forces dynamic rendering across the entire app and breaks ISR caching on `/` and `/guidelines`.

**Files likely to change**:
- `web/src/components/layout/top-nav.tsx`
- `web/tests/top-nav.test.tsx` (new test)

**Tests to add or update**:
- Unit/component test for `TopNav` verifying the `Admin` link is hidden when signed in with `profiles.role === "member"` or when profile fetch fails/returns null.
- Unit/component test for `TopNav` verifying the `Admin` link is rendered when signed in with `profiles.role === "admin"`.

## Risks & Considerations

- **Security**: No actual privilege escalation exists in the current codebase because `assertAdmin()`, `requireAdminPage()`, and RLS policies (`public.is_admin()`) enforce `profiles.role === 'admin'` server-side and in PostgreSQL. Still, hiding the UI entry point aligns UX with RBAC.
- **Caching / Performance**: Keeping the `profiles.role` lookup client-side in `TopNav` avoids making `RootLayout` dynamic and preserves ISR on `/` and `/guidelines` (per `web/src/lib/supabase/server.ts:43-45`).
- **Live DB verification**: If a live Supabase project did not have `0003_rls_policies_and_triggers.sql` applied, `profiles` rows would be missing on signup rather than set to `'admin'`; admins must still be promoted explicitly via `service_role` / SQL.

## Open Questions

- None.
