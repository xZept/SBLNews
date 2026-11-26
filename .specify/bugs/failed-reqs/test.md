# Bug Verification: /study/[id] 500 Error Due to Missing @supabase Vendor Chunk

- **Slug**: failed-reqs
- **Tested**: 2026-11-26T22:06:00+08:00
- **Assessment**: ./assessment.md
- **Fix**: ./fix.md
- **Result**: verified

## Summary

The `Cannot find module './vendor-chunks/@supabase.js'` 500 error no longer reproduces. Externalizing `@supabase/supabase-js` and `@supabase/ssr` in `web/next.config.ts` and rebuilding `web/.next` eliminated `vendor-chunks/@supabase.js` references from all server bundles, and `/study/[id]` executes cleanly on `next start`.

## Checks Performed

| Check | Command / Action | Result | Notes |
|-------|------------------|--------|-------|
| Reproduction (post-fix) | `npx next start -p 3099` + `GET /` and `GET /study/00000000-0000-0000-0000-000000000000` | pass | `GET /` returned `200`; `GET /study/00000000-0000-0000-0000-000000000000` returned expected `404` (`notFound()`) with no `vendor-chunks/@supabase` error |
| Build artifact check | `Select-String -Pattern "vendor-chunks/@supabase"` on `web/.next/server` | pass | 0 matches across compiled server bundles |
| New / updated tests | `npm test` (`web/tests/next-config.test.ts`) | pass | 1/1 new test passed |
| Regression suite | `npm test` (in `web/`) | pass | 5/5 test files, 24/24 tests passed |
| Lint / type-check | `npm run typecheck` & `npm run lint` (in `web/`) | pass | `tsc --noEmit` exit 0; `next lint` reported no ESLint warnings or errors |

## Output Excerpts

```text
GET / -> 200
GET /study/00000000-0000-0000-0000-000000000000 -> 404 (has vendor-chunks/@supabase: False)

Test Files  5 passed (5)
     Tests  24 passed (24)

✔ No ESLint warnings or errors
EXIT_CODES: test=0 typecheck=0 lint=0
```

## Residual Risks

- `GET /study/[id]` was tested with a non-existent study UUID (`404` via `notFound()`), which exercises `StudyDetailPage` and `getStudyDetail` (`@supabase/ssr` + `@supabase/supabase-js`) without requiring a seeded study ID; rendering a populated study page depends on live Supabase data.

## Recommendation

Close the bug — verified end-to-end.
