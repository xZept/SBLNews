# Bug Fix: Favicon Not Showing in Browser Tab

- **Slug**: favicon-not-showing
- **Fixed**: 2026-11-26T21:56:15+08:00
- **Assessment**: ./assessment.md
- **Status**: applied

## Summary

Regenerated `web/public/favicon.ico` with distinct `16x16`, `32x32`, and `48x48` frames (removing the duplicate `16x16` entry) and updated `metadata.icons` in `web/src/app/layout.tsx` to prioritize `/favicon.ico?v=2` first with cache-busting query strings and remove the legacy `shortcut` 512x512 PNG declaration.

## Changes

| File | Change | Notes |
|------|--------|-------|
| `web/public/favicon.ico` | modified | Regenerated via Pillow from `web/public/img/logo.png` with 3 distinct frames (`16x16`, `32x32`, `48x48`; `9,461` bytes) |
| `web/src/app/layout.tsx` | modified | Reordered `metadata.icons.icon` to list `/favicon.ico?v=2` (`sizes: "any"`) before `/img/logo.png?v=2` (`512x512`), updated `apple` to `/apple-touch-icon.png?v=2`, and removed `shortcut` |
| `web/tests/brand-logo.test.ts` | modified | Updated `RootLayout` `metadata.icons` test and added ICO header frame test (`16x16`, `32x32`, `48x48`) |

## Diff Highlights

```ts
  icons: {
    icon: [
      { url: "/favicon.ico?v=2", sizes: "any" },
      { url: "/img/logo.png?v=2", type: "image/png", sizes: "512x512" },
    ],
    apple: [
      { url: "/apple-touch-icon.png?v=2", sizes: "180x180", type: "image/png" },
    ],
  },
```

## Tests Added or Updated

- `web/tests/brand-logo.test.ts::configures RootLayout metadata.icons prioritizing cache-busted /favicon.ico and /img/logo.png` — verifies `/favicon.ico?v=2` is listed first, `/img/logo.png?v=2` second, and `/apple-touch-icon.png?v=2` in `apple`.
- `web/tests/brand-logo.test.ts::encodes distinct 16x16, 32x32, and 48x48 frames in web/public/favicon.ico` — parses the binary ICO directory header to ensure 3 distinct resolutions without duplicate `16x16` entries.

## Local Verification

- Commands run:
  - `npm test` (`vitest run`) → 4 test files passed, 23 tests passed
  - `npm run typecheck` (`tsc --noEmit`) → exited with code 0
  - `npm run lint` (`next lint`) → No ESLint warnings or errors
  - `npm run build` (`next build`) → compiled and generated all 7 routes cleanly
- Manual checks: Verified `web/public/favicon.ico` binary ICO header (`count = 3`: `16x16`, `32x32`, `48x48`, `9,461` bytes).

## Deviations from Assessment

- Kept icon files under `web/public/` with `?v=2` cache-busting query strings (listed as the Alternative in `assessment.md`) rather than moving/duplicating icons into `web/src/app/favicon.ico` and `web/src/app/icon.png`, avoiding duplicate binary assets while preserving the existing `web/public/` asset contract.

## Follow-ups

- Hard-refresh (`Ctrl+Shift+R`) or test in a fresh browser tab against the running Next.js server, then run `/speckit-bug-test slug=favicon-not-showing`.
