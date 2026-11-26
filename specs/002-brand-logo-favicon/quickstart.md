# Quickstart & Validation Guide: Brand Logo and Favicon Integration (`002-brand-logo-favicon`)

**Date**: 2026-11-26  
**Branch**: `002-brand-logo-favicon`

## Prerequisites

- Node.js 20+ and npm installed
- Python 3.12+ (for asset size/dimension inspection or icon derivative generation if re-running asset scripts)
- Dependencies installed in `/web` (`cd web && npm install`)

## 1. Static Type, Lint & Unit Test Verification

From the `web/` workspace directory, run the automated verification gates:

```powershell
cd web
npm run typecheck
npm run lint
npm test
```

**Expected Outcome**:
- `tsc --noEmit` exits with code `0` (strict TypeScript compliance).
- `next lint` exits with zero warnings or errors.
- `vitest run` passes all existing tests plus the new brand logo / metadata contract tests (`web/tests/brand-logo.test.ts`), confirming:
  - `web/public/img/logo.png`, `web/public/favicon.ico`, and `web/public/apple-touch-icon.png` exist and are `< 100 KB` each.
  - `RootLayout` metadata configures `/img/logo.png`, `/favicon.ico`, `/apple-touch-icon.png`, and OpenGraph/Twitter image references.
  - `TopNav` and `BrandLogo` render `/img/logo.png` with pixel-art crispness (`[image-rendering:pixelated]`), Neo-Brutalist borders (`border-2 border-ink`), and non-redundant screen-reader accessibility (`alt=""`, `aria-hidden="true"` alongside `"SBL News"`).

## 2. End-to-End Visual & Browser Verification

Start the local Next.js server:

```powershell
cd web
npm run dev
```

Verify the three user stories in a browser at `http://localhost:3000`:

1. **Sticky Top Bar Brand Logo (User Story 1 - P1)**:
   - Open `/`, `/guidelines`, `/search`, `/methodology`, `/study/[id]`, and `/admin/review`.
   - Confirm the pixel-art emblem (`/img/logo.png`) appears beside `"SBL News"` in the sticky top bar inside a crisp `2px solid #0F172A` frame with a hard `2px 2px 0px #0F172A` shadow.
   - Resize the viewport to `375px` width (mobile) and `1280px` width (desktop) to confirm zero horizontal overflow or blurry scaling.
   - Click the brand emblem from `/guidelines` or `/methodology` and confirm it navigates to `/`.
2. **Browser Favicon & Touch Icons (User Story 2 - P2)**:
   - Check the browser tab icon and confirm the SBL News emblem is displayed.
   - Request `http://localhost:3000/img/logo.png`, `http://localhost:3000/favicon.ico`, and `http://localhost:3000/apple-touch-icon.png` directly and verify HTTP `200 OK` with zero broken icon requests in DevTools Network tab.
3. **Supporting Page Headers & Social Metadata (User Story 3 - P3)**:
   - Visit `/methodology` and `/guidelines` and verify the brand emblem renders cleanly in the page header block.
   - Visit `/search?q=nonexistentqueryxyz` and verify the empty-state callout card displays the brand emblem while the Search and Reset buttons retain their distinct Lucide functional icons.
   - Inspect `<head>` in DevTools Elements and confirm `<meta property="og:image" content=".../img/logo.png">` and `<meta name="twitter:image" content=".../img/logo.png">` are present.
