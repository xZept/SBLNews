# Bug Verification: Restore USAGE and EXECUTE on Private RLS Helper Predicates

- **Slug**: database-error
- **Tested**: 2026-11-28
- **Assessment**: ./assessment.md
- **Fix**: ./fix.md
- **Result**: verified

## Summary

The `42501: permission denied for function ...` errors on `public.votes`, `public.recent_study_views`, and `public.direct_messages` no longer reproduce on the live Supabase database, and authenticated `SELECT`, `INSERT`, and `DELETE` operations on `public.votes` (including upvote count and Aura triggers) succeed cleanly. All static tests, TypeScript typechecks, and ESLint checks pass with zero regressions.

## Checks Performed

| Check | Command / Action | Result | Notes |
|-------|------------------|--------|-------|
| Reproduction (post-fix) | Live DB `execute_sql` (`SET LOCAL ROLE authenticated` with JWT `sub` claim): `SELECT`, `INSERT`, `SELECT`, `DELETE` on `public.votes`; `SELECT` on `public.recent_study_views` and `public.direct_messages` (rolled back) | pass | No `42501` error; owner sees existing and newly inserted votes; triggers succeed |
| Privilege matrix | Live DB `execute_sql` on `pg_proc` / `has_schema_privilege` / `has_function_privilege` | pass | `USAGE` on `private` granted to `anon, authenticated`; `EXECUTE` granted on the 4 RLS predicates; `private.recompute_user_aura` remains `false` for both |
| New / updated tests | `npm --prefix web test -- --run` (`tests/social.test.ts`) | pass | 20/20 tests in `social.test.ts` passed, including migration `0010` grant check |
| Regression suite | `npm --prefix web test -- --run` | pass | 8/8 test files, 73/73 tests passed |
| Lint / type-check | `npm --prefix web run typecheck` & `npm --prefix web run lint` | pass | `tsc --noEmit` exited 0; `next lint` reported `No ESLint warnings or errors` |

## Output Excerpts

```text
> tsc --noEmit
✔ No ESLint warnings or errors

 Test Files  8 passed (8)
      Tests  73 passed (73)
```

## Residual Risks

- `Recently Viewed Studies` only records new study views when a user's `viewed_studies_visibility` is set to `'friends'` or `'public'` in Profile Settings; all 6 existing profiles currently have the default `'private'`.
- Live browser UI click-through against a running Next.js dev server was not executed in this step (verification was performed directly at the PostgreSQL/RLS layer on the live Supabase project plus the Vitest/typecheck/lint suite).

## Recommendation

Close the bug — verified end-to-end against the live Supabase database and the full web test, lint, and typecheck suites.
