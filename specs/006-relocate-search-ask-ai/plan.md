# Implementation Plan: Relocate Search Trigger and Ask AI Bar

**Branch**: `006-relocate-search-ask-ai` | **Date**: 2026-11-28 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/006-relocate-search-ask-ai/spec.md`

## Summary

Relocate the `"Search"` entry from `TopNav` (`web/src/components/layout/top-nav.tsx`) and the inline `"Ask AI"` button from the filter controls row of `FilterBar` (`web/src/components/feed/filter-bar.tsx`) into a dedicated, full-width horizontal split row inside the `FilterBar` card container. On desktop/wider viewports (`sm:` and up), the row uses a 4-column CSS grid (`grid-cols-1 gap-3 sm:grid-cols-4`) so the Search trigger occupies 75% (`sm:col-span-3`) on the left and the Ask AI button occupies 25% (`sm:col-span-1`) on the right, stacking cleanly at full width with >= 44px touch targets on mobile viewports. Both controls adhere to the Neo-Brutalist Sky Blue design tokens (`border-2 border-border`, `shadow-card` `4px 4px 0px`, `bg-surface` / `bg-accent` `#38BDF8`, `font-mono`) across Light and Dark themes while preserving ISR on `/` and all existing Search and Ask AI behaviors.

## Technical Context

**Language/Version**: TypeScript 5.8 (`strict: true`), React 19, Next.js 15.2 App Router  
**Primary Dependencies**: Tailwind CSS v4 (`@tailwindcss/postcss`), `lucide-react`, `next/link`, `next/navigation`, `class-variance-authority`, `clsx`, `tailwind-merge` (no new dependencies)  
**Storage**: N/A (pure client UI layout & navigation update; no schema or storage changes)  
**Testing**: Vitest 3 (`npm test` / `vitest run`), TypeScript (`npm run typecheck`), ESLint (`npm run lint`)  
**Target Platform**: Web (Vercel Hobby Next.js runtime; responsive desktop >= 640px and mobile < 640px)  
**Project Type**: Monorepo web application (`/web`)  
**Performance Goals**: Preserve static/ISR rendering on `/` (`FeedClient` / `FilterBar` remain client-side islands); zero layout shift or horizontal overflow on 375px+ viewports  
**Constraints**: Strict adherence to Neo-Brutalist Sky Blue tokens in `web/src/app/globals.css` (zero purple/violet/gradients), >= 44px mobile touch targets, zero new dependencies  
**Scale/Scope**: 2 UI components (`top-nav.tsx`, `filter-bar.tsx`) and 2 Vitest test files (`top-nav.test.ts`, `filter-bar.test.ts`)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **I. Architecture & $0/Month Free-Tier First**: PASS (Pre-Design & Post-Design). Changes are confined to `/web` client components (`TopNav`, `FilterBar`), preserve ISR on `/`, and introduce zero new dependencies or services.
- **II. Scientific Integrity & Deterministic AI Pipeline**: PASS (Pre-Design & Post-Design). No changes to ingestion, scoring, or `/api/ai-search` citation grounding; `FilterBar` continues forwarding `studyDesign` and `trainedOnly` filters into `buildAskAiReturnPath`.
- **III. Neo-Brutalist Sky Blue Design System**: PASS (Pre-Design & Post-Design). Relocated buttons use `border-2 border-border`, `shadow-card` (`4px 4px 0px` hard offset), `bg-surface` / `bg-accent` (`#38BDF8` with `#0F172A` ink), `font-mono`, active press `translate(2px, 2px)`, and dark-theme token support (`[data-theme="dark"]`), with zero purple/violet hues or gradients.
- **IV. Performance, Egress & Security Guardrails**: PASS (Pre-Design & Post-Design). No database queries, `SELECT *`, or auth boundary changes.
- **V. Scoped Route Discipline**: PASS (Pre-Design & Post-Design). No new routes or API handlers; `/search` remains an approved route reached via the relocated Search trigger.
- **VI. Verification & Deterministic Code Quality**: PASS (Pre-Design & Post-Design). Covered by `tsc --noEmit`, `next lint`, and Vitest unit tests in `web/tests/top-nav.test.ts` and `web/tests/filter-bar.test.ts`.

## Project Structure

### Documentation (this feature)

```text
specs/006-relocate-search-ask-ai/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/           # Phase 1 output (/speckit-plan command)
│   └── ui-components.md
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
web/
├── src/
│   ├── app/
│   │   └── globals.css                  # Existing Neo-Brutalist Sky Blue tokens (reference only)
│   └── components/
│       ├── feed/
│       │   └── filter-bar.tsx           # Remove inline Ask AI; add 75%/25% Search + Ask AI split row
│       └── layout/
│           └── top-nav.tsx              # Remove Search link from NAV_LINKS (desktop & mobile)
└── tests/
    ├── top-nav.test.ts                  # Assert Search link removed from TopNav
    └── filter-bar.test.ts               # Assert 75%/25% split row, Search trigger, and Ask AI behavior
```

**Structure Decision**: All changes live inside the existing `/web` workspace (`src/components/layout/top-nav.tsx`, `src/components/feed/filter-bar.tsx`, and `tests/`). No `/pipeline` or database migration files are affected.

## Complexity Tracking

> No Constitution Check violations; table intentionally omitted.
