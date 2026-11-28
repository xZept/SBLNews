# Quickstart & Validation Guide: 16-Bit Retro-RPG Neo-Brutalist UI Refactorization

**Feature**: `008-ui-refactorization`  
**Date**: 2026-11-29  

## Prerequisites

- Node.js 20+ and npm installed
- Working directory: `c:\Users\allen\Documents\SBLNews\web`
- Environment variables configured in `web/.env.local` (optional for static/unit verification; required for live Supabase auth and AI synthesis)

## 1. Automated Verification Commands

Run TypeScript strict typechecking, ESLint, and the full Vitest unit test suite from `/web`:

```powershell
cd web
npm run typecheck ; npm run lint ; npx vitest run
```

### Expected Automated Test Outcomes

1. **Design System & Pixel Icon Audit (`web/tests/ui-refactorization.test.ts` + existing suites)**:
   - Verifies `web/src/app/globals.css` defines the Tailwind v4 `--color-*: initial;` reset, exact Light Mode (`#F8FAFC`, `#FFFFFF`, `#0F172A`, `#475569`, `#38BDF8`) and Opt-In Dark Mode (`#0B1120`, `#1E293B`, `#F8FAFC`, `#94A3B8`, `#E2E8F0`, `#020617`) tokens, all 5 semantic badge pastel tokens (`#A7F3D0`, `#BAE6FD`, `#FDE68A`, `#BBF7D0`, `#FED7AA`), `--font-pixel` (`Silkscreen`), and `--shadow-rpg-dialog` double-frame inset borders.
   - Scans all `.tsx` and `.css` files under `web/src/` to confirm **zero** purple/violet/indigo utility classes or hex codes, **zero** gradients (`bg-gradient-`, `linear-gradient`, `radial-gradient`), **zero** `backdrop-blur` or blurry shadow classes (`shadow-sm/md/lg/xl/2xl`), **zero** corner classes exceeding `6px` (`rounded-lg/xl/2xl/3xl/full`), and **zero** remaining `lucide-react` imports in `web/src/`.
   - Verifies every inline pixel SVG icon exported from `web/src/components/ui/pixel-icons.tsx` includes `shape-rendering="crispEdges"` and renders `< 2,048` bytes (`< 2 KB`) of markup.
   - Verifies double-frame RPG dialog borders (`rpg-dialog-frame`) on `AiSynthesisPanel`, `AskAiOAuthPrompt`, `MetadataBreakdown`, `HubGrid`, and `ConsensusDriftCard`.
   - Verifies `duration-75` and `active:translate-x-[2px] active:translate-y-[2px]` arcade press states on `Button`, `UpvoteButton`, `TabsTrigger`, and `FilterBar` pills.
2. **Existing Regression Suites (`web/tests/*.test.ts`)**:
   - `brand-logo.test.ts`, `filter-bar.test.ts`, `top-nav.test.ts`, `ai-search.test.ts`, `profile.test.ts`, `projections.test.ts`, `social.test.ts`, `validations.test.ts`, `next-config.test.ts`, and `phase11-convergence.test.ts` all pass with 0 regressions.

## 2. Manual Visual & End-to-End Walkthrough Across All 8 Routes

Start the local development server:

```powershell
cd web
npm run dev
```

1. **Theme Default & Opt-In Dark Mode (`US1`)**:
   - Open `http://localhost:3000/` in an incognito window (even with OS Dark Mode enabled) → confirm Light Mode (`#F8FAFC` canvas, `#FFFFFF` cards, `#0F172A` borders/shadows) loads by default.
   - Sign in and toggle **Dark** in the top-right `32x32` account menu or `/profile` → confirm immediate switch to `#0B1120` canvas, `#1E293B` cards, `#E2E8F0` borders, `#020617` hard shadows, and `#38BDF8` Sky Blue accents with `#0F172A` dark ink.
2. **Quest-Board Feed, Search Deck & Double-Framed `"Ask AI"` Dialogue (`/` & `/search`, `US2`)**:
   - On `/`, verify the `SBL News` pixel display wordmark, sticky Quest-Board `FilterBar`, character-sheet `StudyCard` list, and crisp `16x16` pixel icons on `Search` and `Ask AI`.
   - Click `Ask AI` while signed out → verify the double-framed RPG OAuth prompt opens inline.
   - Sign in and click `Ask AI` on `/search` → verify the double-framed `AiSynthesisPanel`, monospace quota badge, and cited study cards.
3. **Training Codex (`/guidelines`), Study Dossier (`/study/[id]`), & Methodology (`/methodology`, `US3`)**:
   - Visit `/guidelines` → verify the 3 double-framed Core Evidence Hubs and 4-column variable skill cards with `Grade A/B/C/D` pastel badges.
   - Open any `/study/[id]` → verify the double-framed dossier header, 4-cell bordered RPG stat grid, `#FED7AA` Methodological Limitations callout, subordinate creator video shelf, and stepped nested discussion thread.
   - Visit `/methodology` → verify the static RPG rulebook cards and scoring tables.
4. **Character-Sheet Profiles (`/profile`, `/profile/[id]`) & Admin Queue (`/admin/review`, `US4`)**:
   - Visit `/profile` and `/profile/[id]` → verify character-sheet layout, square avatar / 2-letter `JetBrains Mono` initials fallback, Aura badge, and activity tabs.
   - Visit `/admin/review` as an admin → verify double-framed `Consensus Drift` cards and pending study moderation table.
