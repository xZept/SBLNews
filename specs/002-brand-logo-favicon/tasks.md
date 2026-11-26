---

description: "Actionable, dependency-ordered implementation tasks for Brand Logo and Favicon Integration"
---

# Tasks: Brand Logo and Favicon Integration

**Input**: Design documents from `/specs/002-brand-logo-favicon/`  
**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/brand-assets-and-ui.md](./contracts/brand-assets-and-ui.md), [quickstart.md](./quickstart.md)

**Tests**: Included in `web/tests/brand-logo.test.ts` per [plan.md](./plan.md) and [quickstart.md](./quickstart.md) (Constitution Principle VI: static asset dimensions/byte size, `RootLayout` icon/OpenGraph metadata, `BrandLogo` Neo-Brutalist classes, and screen-reader accessibility attributes).

**Organization**: Tasks are grouped by user story in priority order (`P1` → `P2` → `P3`) to enable independent implementation and testing of each increment within the existing `/web` workspace.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (`US1`, `US2`, `US3`)
- Exact file paths are included in every task description

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Verify `/web` workspace prerequisites, existing canonical `web/public/img/logo.png` source asset, and Python image tooling for nearest-neighbor icon generation.

- [X] T001 Verify `web/public/img/logo.png` exists, inspect its current dimensions and byte size, and confirm `/web` dependencies (`npm test`, `npm run typecheck`, `npm run lint`) run cleanly in `web/package.json`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Optimize the canonical pixel-art emblem with nearest-neighbor resampling, generate standard browser/touch icon derivatives, and build the reusable Neo-Brutalist `<BrandLogo />` component.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [X] T002 Optimize `web/public/img/logo.png` using nearest-neighbor resampling (`512x512` PNG, `< 50 KB`, max `< 100 KB`) and generate nearest-neighbor derived `web/public/favicon.ico` (`16x16` + `32x32` multi-resolution, `< 50 KB`) and `web/public/apple-touch-icon.png` (`180x180` PNG, `< 50 KB`)
- [X] T003 [P] Create reusable `BrandLogo` component with props `size?: "sm" | "md" | "lg"` (default `"sm"` mapping to `h-8 w-8` / `h-10 w-10` / `h-12 w-12`), `alt?: string` (default `""` with `aria-hidden="true"` when empty), and `className?: string` merged via `cn()`, styled with `inline-flex shrink-0 items-center justify-center overflow-hidden rounded-sm border-2 border-ink bg-surface shadow-[2px_2px_0px_#0F172A]` and `[image-rendering:pixelated]` in `web/src/components/layout/brand-logo.tsx`

**Checkpoint**: Foundation ready — optimized static brand assets (`logo.png`, `favicon.ico`, `apple-touch-icon.png`) and `<BrandLogo />` primitive are in place.

---

## Phase 3: User Story 1 - Sticky Top Bar Brand Logo (Priority: P1) 🎯 MVP

**Goal**: Display the official pixel-art brand emblem (`web/public/img/logo.png`) in the sticky top navigation bar across all 6 MVP routes next to the `"SBL News"` wordmark, replacing the temporary `"SBL"` text monogram.

**Independent Test**: Open any page (`/`, `/guidelines`, `/search`, `/methodology`, `/study/[id]`, `/admin/review`), inspect the sticky top bar at `375px` and `1280px` viewports, verify `<BrandLogo size="sm" />` renders crisply beside `"SBL News"` without overflow, clicking navigates to `/`, and screen readers announce `"SBL News"` once without duplicate alt text.

- [X] T004 [US1] Replace the temporary `"SBL"` text monogram inside the primary home `<Link href="/">` in `web/src/components/layout/top-nav.tsx` with `<BrandLogo size="sm" />` (decorative `alt=""`, `aria-hidden="true"`) alongside `<span>SBL News</span>`, preserving responsive mobile/desktop spacing and keeping functional icons (`Search`, `ShieldCheck`, `LogOut`) intact
- [X] T005 [US1] Add unit/contract tests verifying `<BrandLogo />` renders `/img/logo.png` with `[image-rendering:pixelated]`, `border-2 border-ink`, `bg-surface`, `rounded-sm`, `shadow-[2px_2px_0px_#0F172A]`, default `alt=""` + `aria-hidden="true"`, and `TopNav` single-label accessibility in `web/tests/brand-logo.test.ts`

**Checkpoint**: User Story 1 (`TopNav` brand emblem across all 6 routes) is independently functional and verified.

---

## Phase 4: User Story 2 - Browser Tab Favicon & App Icons (Priority: P2)

**Goal**: Serve the official brand emblem (`web/public/img/logo.png`) and its nearest-neighbor derivatives (`web/public/favicon.ico`, `web/public/apple-touch-icon.png`) as the browser tab favicon and mobile home-screen touch icon across all 6 MVP routes.

**Independent Test**: Inspect `metadata.icons` in `web/src/app/layout.tsx` and request `/img/logo.png`, `/favicon.ico`, and `/apple-touch-icon.png` from `/web`, confirming `200 OK`, exact dimensions, `< 100 KB` payload size, and crisp pixel-art rendering.

- [X] T006 [US2] Configure `metadata.icons` (`icon`: `[{ url: "/img/logo.png", type: "image/png", sizes: "512x512" }, { url: "/favicon.ico", sizes: "any" }]`, `shortcut`: `["/img/logo.png"]`, `apple`: `[{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }]`) in `web/src/app/layout.tsx`
- [X] T007 [US2] Add asset & icon metadata tests in `web/tests/brand-logo.test.ts` verifying `web/public/img/logo.png`, `web/public/favicon.ico`, and `web/public/apple-touch-icon.png` exist, are `< 100 KB` (target `< 50 KB`), and `RootLayout` `metadata.icons` references all three assets

**Checkpoint**: User Stories 1 and 2 are independently functional and verified.

---

## Phase 5: User Story 3 - Supporting Page & Section Brand Icons (Priority: P3)

**Goal**: Consistently display the official brand emblem (`web/public/img/logo.png`) in social link-preview metadata (`openGraph.images`, `twitter.images`), secondary editorial headers (`/methodology`, `/guidelines`), and empty-state brand callout cards (`/`, `/search`) while keeping all functional action icons distinct.

**Independent Test**: Visit `/methodology`, `/guidelines`, `/search?q=nonexistentqueryxyz`, and `/` empty state, and inspect `<head>` OpenGraph/Twitter tags to confirm `/img/logo.png` is used for brand seals and link previews while functional icons (`Search`, `RotateCcw`, `AlertTriangle`, `ArrowBigUp`, `ArrowLeft`) remain unchanged.

- [X] T008 [P] [US3] Configure `metadata.openGraph` (`siteName: "SBL News"`, `type: "website"`, `images: [{ url: "/img/logo.png", width: 512, height: 512, alt: "SBL News — Science-Based Lifting News emblem" }]`) and `metadata.twitter` (`card: "summary"`, `images: ["/img/logo.png"]`) in `web/src/app/layout.tsx`
- [X] T009 [P] [US3] Add `<BrandLogo size="lg" />` left of the `"Methodology & Transparency Standards"` `<h1>` in the page `<header>` of `web/src/app/methodology/page.tsx`
- [X] T010 [P] [US3] Add `<BrandLogo size="md" />` left of the `"Training Guidelines"` `<h1>` in the page `<header>` of `web/src/app/guidelines/page.tsx`
- [X] T011 [P] [US3] Add `<BrandLogo size="md" />` centered above the `"No matching studies found"` empty-state heading inside the empty-state `<Card>` in `web/src/components/feed/feed-client.tsx` and `web/src/app/search/page.tsx`, keeping `Search`, `RotateCcw`, `AlertTriangle`, and `ArrowBigUp` functional icons intact
- [X] T012 [US3] Extend `web/tests/brand-logo.test.ts` to verify `RootLayout` `openGraph.images` and `twitter.images` reference `/img/logo.png` and supporting page/empty-state placements render `<BrandLogo />` without replacing functional icons

**Checkpoint**: All three user stories (`US1`, `US2`, `US3`) are complete and independently testable.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Final static analysis, design-system compliance audit, and `quickstart.md` validation gates across `/web`.

- [X] T013 [P] Audit all modified files in `web/src/` against Constitution Principle III (no purple/violet/indigo hues, no gradients or blurred shadows, `2px solid #0F172A` borders, `[image-rendering:pixelated]`) and FR-005 (functional action icons distinct from brand logo)
- [X] T014 Run `quickstart.md` verification gates (`npm run typecheck`, `npm run lint`, `npm test`, and `npm run build` in `web/`)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately.
- **Foundational (Phase 2)**: Depends on Phase 1 (`T001`) — **BLOCKS** all user stories (`US1`–`US3`).
- **User Story 1 (`P1`, Phase 3)**: Depends on Phase 2 (`T002`, `T003`).
- **User Story 2 (`P2`, Phase 4)**: Depends on Phase 2 (`T002`). Can run in parallel with Phase 3 (`US1`) since `layout.tsx` and `top-nav.tsx` are separate files (coordinate `web/tests/brand-logo.test.ts` sequentially).
- **User Story 3 (`P3`, Phase 5)**: Depends on Phase 2 (`T002`, `T003`); `T008` edits `web/src/app/layout.tsx` after `T006` (or together if coordinated).
- **Polish (Phase 6)**: Depends on completion of Phases 3–5.

### Parallel Opportunities

- **Foundational**: `T002` (Python asset optimization) and `T003` (`brand-logo.tsx`) can run in parallel.
- **User Story 3**: `T009` (`methodology/page.tsx`), `T010` (`guidelines/page.tsx`), and `T011` (`feed-client.tsx` & `search/page.tsx`) touch independent files and can run in parallel.

---

## Parallel Example: User Story 3

```bash
# Launch independent supporting page & empty-state placements in parallel:
Task: "T009 [P] [US3] Add <BrandLogo size='lg' /> to web/src/app/methodology/page.tsx"
Task: "T010 [P] [US3] Add <BrandLogo size='md' /> to web/src/app/guidelines/page.tsx"
Task: "T011 [P] [US3] Add <BrandLogo size='md' /> to empty-state cards in web/src/components/feed/feed-client.tsx and web/src/app/search/page.tsx"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (`T001`).
2. Complete Phase 2: Foundational (`T002`, `T003`).
3. Complete Phase 3: User Story 1 (`T004`, `T005`).
4. **STOP and VALIDATE**: Run `npm run typecheck`, `npm run lint`, `npm test` in `web/` and verify sticky top bar across routes.

### Incremental Delivery

1. Setup + Foundational → Optimized `logo.png`, `favicon.ico`, `apple-touch-icon.png`, and `<BrandLogo />`.
2. Add User Story 1 (`TopNav`) → Test independently (MVP!).
3. Add User Story 2 (`layout.tsx` `metadata.icons`) → Test independently.
4. Add User Story 3 (`openGraph`/`twitter` metadata + `/methodology`, `/guidelines`, `/` & `/search` empty states) → Test independently.
5. Run Phase 6 Polish & full `quickstart.md` verification (`typecheck`, `lint`, `test`, `build`).
