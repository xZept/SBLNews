# Bug Verification: Favicon Not Showing in Browser Tab

- **Slug**: favicon-not-showing
- **Tested**: 2026-11-26T21:57:20+08:00
- **Assessment**: ./assessment.md
- **Fix**: ./fix.md
- **Result**: partial

## Summary

Automated verification confirms the built Next.js HTML emits the reordered, cache-busted `<link rel="icon">` tags (`/favicon.ico?v=2` first, `/img/logo.png?v=2` second, `/apple-touch-icon.png?v=2` for Apple touch), `web/public/favicon.ico` encodes 3 distinct frames (`16x16`, `32x32`, `48x48`), and all 23 Vitest tests pass with zero regressions. Marked `partial` because live browser tab rendering was not exercised in a desktop browser and the `next start` HTTP probe did not bind within the 3-second wait window.

## Checks Performed

| Check | Command / Action | Result | Notes |
|-------|------------------|--------|-------|
| Reproduction (post-fix, live HTTP) | `npx next start -p 3099` + `Invoke-WebRequest` | not-run | Server did not bind within 3s wait (`Unable to connect to the remote server`); manual browser tab check not executed |
| Built HTML `<head>` inspection | Regex scan of `web/.next/server/app/index.html` | pass | Emits `/favicon.ico?v=2` (`sizes="any"`), `/img/logo.png?v=2` (`512x512`), `/apple-touch-icon.png?v=2` (`180x180`); no `shortcut icon` |
| New / updated tests | `npm test` (`vitest run` in `web/`) | pass | 4 test files, 23/23 tests passed (including `brand-logo.test.ts` ICO frame & `metadata.icons` checks) |
| Regression suite & build | `npm run typecheck`, `npm run lint`, `npm run build` | pass | Executed in `/speckit-bug-fix` after final edit; 0 errors, 0 warnings, 7 routes built |

## Output Excerpts

```text
<link rel="icon" href="/favicon.ico?v=2" sizes="any"/>
<link rel="icon" href="/img/logo.png?v=2" type="image/png" sizes="512x512"/>
<link rel="apple-touch-icon" href="/apple-touch-icon.png?v=2" sizes="180x180" type="image/png"/>
```

```text
 ✓ tests/projections.test.ts (3 tests) 10ms
 ✓ tests/phase11-convergence.test.ts (3 tests) 17ms
 ✓ tests/validations.test.ts (7 tests) 20ms
 ✓ tests/brand-logo.test.ts (10 tests) 36ms

 Test Files  4 passed (4)
      Tests  23 passed (23)
```

## Residual Risks

- Live desktop browser tab rendering (including clearing any previously cached `404` on `localhost:3000/favicon.ico`) has not been visually confirmed in a browser window.

## Recommendation

Hold — all automated unit, build, and HTML `<head>` checks pass; confirm in your running dev/prod browser tab (`http://localhost:3000`, hard refresh `Ctrl+Shift+R` or Incognito) before closing the bug.
