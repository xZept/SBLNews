# Bug Assessment: Favicon Not Showing in Browser Tab

- **Slug**: favicon-not-showing
- **Created**: 2026-11-26T21:50:00+08:00
- **Source**: pasted text
- **Verdict**: likely valid, needs reproduction
- **Severity**: medium

## Report (verbatim or summarized)

> why is favicon not showing

## Symptom

When loading the SBL News web application in a browser, the expected SBL News pixel-art favicon does not appear in the browser tab, even though static icon files exist under `web/public/` and `metadata.icons` is configured in `RootLayout`.

## Reproduction

1. Run the `/web` Next.js application (`npm run dev` or `npm run start` on `http://localhost:3000`).
2. Open `/` in a browser that previously visited `localhost:3000` (when `/favicon.ico` returned `404`), or inspect the browser tab icon.
3. Observe that the browser tab continues to show the default blank/globe icon instead of the SBL News emblem.
4. [NEEDS CLARIFICATION: Confirm whether the issue reproduces in a fresh Incognito/private window or if DevTools Network shows `404` / `200` for `/favicon.ico` and `/img/logo.png` in the user's running server.]

## Suspected Code Paths

- `web/src/app/layout.tsx:27-35` — Configures `metadata.icons` with unversioned `/img/logo.png` (`512x512`) and `shortcut: ["/img/logo.png"]` ahead of `/favicon.ico` (`sizes: "any"`), without Next.js file-based icon conventions (`app/favicon.ico` / `app/icon.png`) or cache-busting versioning.
- `web/public/favicon.ico` — Binary ICO header inspection shows 3 entries (`16x16`, duplicate `16x16`, `32x32`; 4,746 bytes) rather than a clean `16x16` + `32x32` + `48x48` multi-resolution ICO.
- `web/src/app/` — No `app/favicon.ico` or `app/icon.png` file-based metadata convention is present; Next.js only serves the unversioned `web/public/favicon.ico` and `web/public/img/logo.png` paths.

## Root Cause Hypothesis

The built HTML (`web/.next/server/app/index.html`) correctly emits `<link rel="shortcut icon" href="/img/logo.png"/>`, `<link rel="icon" href="/img/logo.png" type="image/png" sizes="512x512"/>`, `<link rel="icon" href="/favicon.ico" sizes="any"/>`, and `<link rel="apple-touch-icon" href="/apple-touch-icon.png" sizes="180x180" type="image/png"/>`, and `web/src/middleware.ts` does not exist to block them. The most likely cause of the favicon not appearing in the browser tab is **aggressive browser favicon caching** of the prior `404` on `/favicon.ico` for `localhost:3000` combined with **unversioned `public/` icon URLs** and **`512x512` PNG / `shortcut icon` ordering** ahead of `/favicon.ico` in `web/src/app/layout.tsx`. Additionally, `web/public/favicon.ico` contains a duplicate `16x16` entry from Pillow's `append_images` call. Confidence: high for browser caching + icon declaration ordering; medium until confirmed in a fresh Incognito tab.

## Proposed Remediation

**Preferred**: Adopt Next.js App Router file-based icon metadata (`web/src/app/favicon.ico` and `web/src/app/icon.png` or `web/src/app/apple-icon.png`) or add a versioned query/reorder `metadata.icons` in `web/src/app/layout.tsx` so `/favicon.ico` is listed first and Next.js automatically appends a cache-busting content hash to the emitted `<link rel="icon">` URLs. Also regenerate `web/public/favicon.ico` cleanly with distinct `16x16`, `32x32`, and `48x48` frames (no duplicate `16x16` entry) and remove the legacy `shortcut: ["/img/logo.png"]` `512x512` override.

**Alternatives**:
- Append a manual cache-busting query string (e.g., `/favicon.ico?v=2`, `/img/logo.png?v=2`) in `web/src/app/layout.tsx` `metadata.icons` while keeping all files in `web/public/`. Trade-off: simpler diff, but requires manual version bumps on future icon changes unlike Next.js `app/icon.png`.

**Files likely to change**:
- `web/src/app/layout.tsx`
- `web/public/favicon.ico` (and/or `web/src/app/favicon.ico`, `web/src/app/icon.png`)
- `web/tests/brand-logo.test.ts`

**Tests to add or update**:
- Update `web/tests/brand-logo.test.ts` to assert `/favicon.ico` has distinct `16x16`/`32x32` (and `48x48`) entries without duplicate frames, and that `RootLayout` `metadata.icons` prioritizes `/favicon.ico` (or Next.js file-based icon route) cleanly.

## Risks & Considerations

- Moving or duplicating icons into `web/src/app/` must remain compatible with `web/tests/brand-logo.test.ts` and `specs/002-brand-logo-favicon/contracts/brand-assets-and-ui.md`, which require `/img/logo.png`, `/favicon.ico`, and `/apple-touch-icon.png` to remain reachable with HTTP `200 OK`.
- If `web/src/app/favicon.ico` is added alongside `web/public/favicon.ico`, Next.js prioritizes `src/app/favicon.ico` — ensure both are identical or remove the redundant `metadata.icons` conflict.

## Open Questions

- [NEEDS CLARIFICATION: Does the favicon appear when opening `http://localhost:3000` in a fresh Incognito/private window, and is the Next.js server running the latest build after `002-brand-logo-favicon`?]
