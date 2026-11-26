# Implementation Plan: Brand Logo and Favicon Integration

**Branch**: `002-brand-logo-favicon` | **Date**: 2026-11-26 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/002-brand-logo-favicon/spec.md`

## Summary

Integrate the official SBL News pixel-art brand emblem (`web/public/img/logo.png`) across the `/web` Next.js application within the existing 6-route MVP scope:

1. **Asset Optimization & Browser Icon Variants**: Optimize `web/public/img/logo.png` using nearest-neighbor resampling (`512x512`, `< 50 KB`) so pixel edges remain razor-sharp without serving a 3.45 MB payload under `images: { unoptimized: true }`, and generate nearest-neighbor derived `web/public/favicon.ico` (`16x16` + `32x32`) and `web/public/apple-touch-icon.png` (`180x180`).
2. **Reusable Neo-Brutalist `<BrandLogo />` & Sticky Top Bar (`TopNav`)**: Create `web/src/components/layout/brand-logo.tsx` with `2px solid #0F172A` borders, `#FFFFFF` surface fill, `2px 2px 0px #0F172A` hard offset shadow, and `[image-rendering:pixelated]` scaling. Replace the temporary `"SBL"` text monogram in `web/src/components/layout/top-nav.tsx` with `<BrandLogo size="sm" />` using decorative accessibility attributes (`alt=""`, `aria-hidden="true"`) inside the home `<Link href="/">` so screen readers announce `"SBL News"` once without duplication.
3. **Global Favicon, Touch Icon & Social Metadata (`RootLayout`)**: Configure `metadata.icons` (`icon`, `shortcut`, `apple`), `metadata.openGraph.images`, and `metadata.twitter.images` in `web/src/app/layout.tsx` so all 6 MVP routes serve the official brand emblem as their tab favicon, mobile touch icon, and link-preview image.
4. **Supporting Page Headers & Empty-State Brand Callouts**: Add `<BrandLogo />` to the `/methodology` Transparency Hub header, `/guidelines` Living Evidence Matrix header, and empty-state callout cards on `/` and `/search` while keeping all functional action icons (`Search`, `ArrowBigUp`, `LogOut`, `ShieldCheck`, `RotateCcw`, `AlertTriangle`, `ArrowLeft`) distinct.

## Technical Context

**Language/Version**: TypeScript 5.8 (`strict: true`, Node.js 20+) in `/web`; Python 3.12+ (for deterministic nearest-neighbor icon resizing/generation during build/task execution)

**Primary Dependencies**: Next.js 15.2 (App Router), React 19, Tailwind CSS v4, `lucide-react`, `clsx`, `tailwind-merge`, `vitest` (no new dependencies added)

**Storage**: Static files in `web/public/` (`web/public/img/logo.png`, `web/public/favicon.ico`, `web/public/apple-touch-icon.png`); zero database schema changes

**Testing**: TypeScript static check (`npm run typecheck` / `tsc --noEmit`), ESLint (`npm run lint`), and Vitest unit/contract tests (`npm test`) verifying asset dimensions/byte size, `RootLayout` icon/OpenGraph metadata, `BrandLogo` Neo-Brutalist classes, and accessibility attributes

**Target Platform**: Vercel Hobby ($0/month) via Next.js App Router (`images: { unoptimized: true }`)

**Project Type**: Monorepo web frontend (`/web`) static asset, metadata, and UI component enhancement

**Performance Goals**:
- Canonical `/img/logo.png` and derived favicon/touch icons `< 50 KB` each (reducing initial logo payload from 3.45 MB by >98%)
- Zero layout shift (CLS = 0) via explicit container width/height dimensions (`h-8 w-8`, `h-10 w-10`, `h-12 w-12`)

**Constraints**:
- Strict $0/month free-tier ceiling and no external paid image CDNs or new UI libraries (Constitution Principle I)
- Neo-Brutalist Sky Blue visual rules: `2px solid #0F172A` borders, `2px 2px 0px #0F172A` hard offset shadows, `rounded-sm` (`4px`) radius, crisp pixel-art scaling (`[image-rendering:pixelated]`), zero purple hues or blurry shadows (Constitution Principle III)
- Strict 6-route MVP scope (`/`, `/study/[id]`, `/guidelines`, `/search`, `/methodology`, `/admin/review`) (Constitution Principle V)

**Scale/Scope**: 1 new shared UI component (`brand-logo.tsx`), 3 static icon assets in `web/public/`, 5 updated files in `web/src/` (`layout.tsx`, `top-nav.tsx`, `methodology/page.tsx`, `guidelines/page.tsx`, `search/page.tsx`, `feed-client.tsx`), and 1 Vitest contract test file (`web/tests/brand-logo.test.ts`)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Constitution Principle | Pre-Research Gate | Post-Design Evaluation (Phase 1) | Status |
|------------------------|-------------------|----------------------------------|--------|
| **I. Architecture & $0/Month Free-Tier First** | Changes are confined to `/web` static assets, Next.js `Metadata`, and React components on Vercel Hobby ($0/month). No new npm libraries, ORMs, or paid image services are introduced. | Confirmed in [research.md](./research.md) and [data-model.md](./data-model.md). Static icon derivatives are served directly from `web/public/` with zero runtime compute cost. | ✅ PASS |
| **II. Scientific Integrity & Deterministic AI Pipeline** | `/pipeline` ingestion, deterministic scoring, transparency badges, and HITL guideline workflows are untouched. | Confirmed. All scientific badges and `/methodology` / `/guidelines` content remain intact while gaining the official brand emblem in their headers. | ✅ PASS |
| **III. Neo-Brutalist Sky Blue Design System** | Brand emblem frame uses `2px solid #0F172A` (`border-2 border-ink`), `#FFFFFF` (`bg-surface`), `rounded-sm` (`4px`), hard offset shadow (`shadow-[2px_2px_0px_#0F172A]`), and `[image-rendering:pixelated]`. No purple hues, gradients, or blurred shadows. | Confirmed in [contracts/brand-assets-and-ui.md](./contracts/brand-assets-and-ui.md) and [data-model.md](./data-model.md). | ✅ PASS |
| **IV. Performance, Egress & Security Guardrails** | Optimizing the 3.45 MB `logo.png` down to `< 50 KB` nearest-neighbor PNG + `.ico` prevents multi-megabyte asset transfers on every page load. Database queries, RLS, and RBAC remain unmodified. | Confirmed in [research.md](./research.md) and [quickstart.md](./quickstart.md). | ✅ PASS |
| **V. Scoped MVP Route Discipline** | Zero new page routes added; applies strictly across the existing 6 MVP routes (`/`, `/study/[id]`, `/guidelines`, `/search`, `/methodology`, `/admin/review`). | Confirmed in [contracts/brand-assets-and-ui.md](./contracts/brand-assets-and-ui.md). | ✅ PASS |
| **VI. Verification & Deterministic Code Quality** | Verified via `tsc --noEmit`, `next lint`, and automated Vitest tests checking asset size/existence, metadata exports, Neo-Brutalist classes, and screen-reader accessibility attributes. | Confirmed in [quickstart.md](./quickstart.md). | ✅ PASS |

## Project Structure

### Documentation (this feature)

```text
specs/002-brand-logo-favicon/
├── plan.md                              # This file (/speckit-plan command output)
├── research.md                          # Phase 0 output (/speckit-plan command)
├── data-model.md                        # Phase 1 output (/speckit-plan command)
├── quickstart.md                        # Phase 1 output (/speckit-plan command)
├── contracts/                           # Phase 1 output (/speckit-plan command)
│   └── brand-assets-and-ui.md           # Static asset, metadata, and UI placement contract
└── tasks.md                             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
web/
├── public/
│   ├── favicon.ico                      # Derived 16x16 & 32x32 nearest-neighbor favicon
│   ├── apple-touch-icon.png             # Derived 180x180 nearest-neighbor touch icon
│   └── img/
│       └── logo.png                     # Canonical nearest-neighbor optimized 512x512 pixel-art brand emblem (< 50 KB)
├── src/
│   ├── app/
│   │   ├── layout.tsx                   # Updated Metadata: icons (icon, shortcut, apple), openGraph.images, twitter.images
│   │   ├── guidelines/
│   │   │   └── page.tsx                 # Updated header with <BrandLogo size="md" />
│   │   ├── methodology/
│   │   │   └── page.tsx                 # Updated header with <BrandLogo size="lg" />
│   │   └── search/
│   │       └── page.tsx                 # Updated empty-state callout card with <BrandLogo size="md" />
│   └── components/
│       ├── feed/
│       │   └── feed-client.tsx          # Updated empty-state callout card with <BrandLogo size="md" />
│       └── layout/
│           ├── brand-logo.tsx           # New reusable Neo-Brutalist pixel-art BrandLogo component
│           └── top-nav.tsx              # Updated sticky top bar replacing "SBL" text box with <BrandLogo size="sm" />
└── tests/
    └── brand-logo.test.ts               # Vitest contract tests for assets, metadata, and BrandLogo rendering/a11y
```

**Structure Decision**: All changes reside within the existing `/web` workspace of the monorepo (`web/public/`, `web/src/components/layout/`, `web/src/app/`, and `web/tests/`). No changes are needed in `/pipeline` or `/supabase/migrations`.

## Complexity Tracking

No Constitution Check violations exist; all 6 core principles pass without exception.
