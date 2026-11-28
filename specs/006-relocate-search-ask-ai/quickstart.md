# Quickstart Validation Guide: Relocate Search Trigger and Ask AI Bar

**Feature**: `006-relocate-search-ask-ai`  
**Date**: 2026-11-28

## Prerequisites

- Node.js & npm dependencies installed in `/web` (`cd web && npm install`).
- Local `.env.local` configured in `/web` (for running the dev server).

## 1. Automated Verification Gates

Run type-checking, linting, and unit tests from `web/`:

```powershell
cd web
npm run typecheck
npm run lint
npm test
```

**Expected Outcome**:
- `tsc --noEmit` exits with code 0.
- `next lint` exits with code 0 with zero errors.
- `vitest run` passes all test suites, including updated `tests/top-nav.test.ts` (verifying `/search` is absent from `TopNav`) and `tests/filter-bar.test.ts` (verifying the 75%/25% split row, Search trigger, and Ask AI behavior).

## 2. Manual Visual & Functional Verification

Start the dev server:

```powershell
cd web
npm run dev
```

Verify on `http://localhost:3000`:
1. **Top Navigation Bar (Desktop & Mobile)**: Confirm links show `Feed`, `Guidelines`, and `Methodology` only—no `Search` link between `Guidelines` and `Methodology`.
2. **Inline Filter Controls Row**: Confirm `Daily | Weekly | Top`, `Trained Lifters Only`, and study count appear without an inline `Ask AI` button.
3. **Desktop Split Row (>= 640px)**: Confirm the dedicated row inside the feed filter card shows the Search trigger at 75% width on the left (with magnifying glass icon) and `Ask AI` at 25% width on the right (with sparkle icon), with `2px solid` borders, `4px 4px 0px` hard shadows, and monospace typography.
4. **Mobile Stacking (375px)**: Confirm both buttons stack vertically at full container width with >= 44px height and zero horizontal overflow.
5. **Interactive Behavior & Themes**:
   - Click the Search trigger → navigates to `/search`.
   - Click `Ask AI` while logged out → toggles `AskAiOAuthPrompt` inline.
   - Click `Ask AI` while logged in → toggles the query form and submits to `/search?ai=1&q=...` with active `study_design` / `trained_only` filters preserved.
   - Toggle Light and Dark themes in account/profile settings → verify high-contrast borders, shadows, and zero purple/gradient styling.
