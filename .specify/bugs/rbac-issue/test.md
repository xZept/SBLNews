# Bug Verification: Gate TopNav Admin Link on `profiles.role === "admin"`

- **Slug**: rbac-issue
- **Tested**: 2026-11-26T22:13:37+08:00
- **Assessment**: ./assessment.md
- **Fix**: ./fix.md
- **Result**: partial

## Summary

All automated unit tests (including the 5 new `TopNav` RBAC tests), TypeScript typecheck, and ESLint checks pass with zero errors. Live end-to-end OAuth signup reproduction in a browser against Supabase was skipped (requires interactive OAuth credentials), so the result is marked `partial` until confirmed in a live environment.

## Checks Performed

| Check | Command / Action | Result | Notes |
|-------|------------------|--------|-------|
| Reproduction (post-fix) | Interactive Google/GitHub OAuth signup in browser | skipped | Requires interactive OAuth flow against live Supabase project |
| New / updated tests | `npm test` (`tests/top-nav.test.ts`) | pass | 5/5 tests in `top-nav.test.ts` passed (`member`, `admin`, error/null, SSR render, JSX guard) |
| Regression suite | `npm test` (`vitest run` in `web/`) | pass | 6 test files, 29/29 tests passed |
| Lint / type-check | `npm run typecheck` & `npm run lint` | pass | `tsc --noEmit` exited 0; `next lint` reported no warnings or errors |

## Output Excerpts

```text
 ✓ tests/top-nav.test.ts (5 tests) 42ms
 Test Files  6 passed (6)
      Tests  29 passed (29)
```

```text
> sbl-news-web@0.1.0 lint
> next lint
✔ No ESLint warnings or errors
EXIT_CODES: test=0 typecheck=0 lint=0
```

## Residual Risks

- Live OAuth signup in a browser against the target Supabase instance was not exercised in this session; if `supabase/migrations/0003_rls_policies_and_triggers.sql` was not applied in the target database, `profiles` rows would be missing on signup (though `fetchIsAdmin()` safely returns `false`).

## Recommendation

Hold — all automated tests, typechecks, and lint checks pass; perform a quick manual sign-in check with a newly created `member` OAuth account in dev/staging to confirm the `Admin` link stays hidden before closing the bug.
