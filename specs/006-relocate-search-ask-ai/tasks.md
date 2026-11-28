---

description: "Task list for Relocate Search Trigger and Ask AI Bar"
---

# Tasks: Relocate Search Trigger and Ask AI Bar

**Input**: Design documents from `/specs/006-relocate-search-ask-ai/`
**Prerequisites**: `plan.md` (required), `spec.md` (required for user stories), `research.md`, `data-model.md`, `contracts/ui-components.md`, `quickstart.md`

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., `US1`, `US2`, `US3`)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Verify baseline `/web` build/test tooling before modifying navigation and feed filter components.

- [x] T001 Verify baseline typecheck, lint, and Vitest suite pass in `web/package.json` (`npm run typecheck && npm run lint && npm test`)

---

## Phase 2: User Story 1 - Prominent Feed Search & Ask AI Action Row (Priority: P1) 🎯 MVP

**Goal**: Add a dedicated full-width horizontal split row inside the main feed filter card with a 75% Search trigger on the left and a 25% Ask AI button on the right, preserving existing Search navigation and Ask AI behavior.

**Independent Test**: Load `/` on a desktop viewport, verify the split row appears inside `FilterBar` with Search at 75% (`sm:col-span-3`) on the left and Ask AI at 25% (`sm:col-span-1`) on the right, and verify clicking Search navigates to `/search` while clicking Ask AI toggles the inline OAuth prompt (logged out) or query form (logged in, preserving `studyDesign` and `trainedOnly`).

- [x] T002 [US1] Add dedicated full-width `grid grid-cols-1 gap-3 sm:grid-cols-4` action row inside the `<section aria-label="Feed filters">` container in `web/src/components/feed/filter-bar.tsx`
- [x] T003 [US1] Implement the left 75% (`sm:col-span-3`) Search trigger `<Link href="/search">` with `Search` icon from `lucide-react` in `web/src/components/feed/filter-bar.tsx`
- [x] T004 [US1] Implement the right 25% (`sm:col-span-1`) Ask AI `<button type="button" aria-pressed={askAiOpen}>` with `Sparkles` icon and `setAskAiOpen` toggle in `web/src/components/feed/filter-bar.tsx`
- [x] T005 [P] [US1] Add unit tests for the 75%/25% split row, `/search` Link target, and Ask AI toggle/filter preservation in `web/tests/filter-bar.test.ts`

**Checkpoint**: User Story 1 is functional and independently testable.

---

## Phase 3: User Story 2 - Streamlined Top Navigation and Filter Controls Row (Priority: P2)

**Goal**: Remove the redundant `"Search"` link from `TopNav` (desktop and mobile) and remove the old inline `"Ask AI"` button from the filter controls row next to `"Trained Lifters Only"`.

**Independent Test**: Render `TopNav` across desktop and mobile viewports to confirm `"Feed"`, `"Guidelines"`, and `"Methodology"` are present and `href="/search"` is absent; render `FilterBar` to confirm `"Ask AI"` is no longer in the inline controls row next to `"Trained Lifters Only"`.

- [x] T006 [P] [US2] Remove `{ href: "/search", label: "Search" }` from `NAV_LINKS`, remove unused `Search` icon import, and remove the `/search` icon conditional in `web/src/components/layout/top-nav.tsx`
- [x] T007 [US2] Remove the old inline `"Ask AI"` button from the `Daily | Weekly | Top` + `"Trained Lifters Only"` controls row in `web/src/components/feed/filter-bar.tsx`
- [x] T008 [P] [US2] Update `web/tests/top-nav.test.ts` to assert `TopNav` renders `Feed`, `Guidelines`, and `Methodology` and omits `href="/search"` in both desktop and mobile navbars

**Checkpoint**: User Stories 1 and 2 are both complete and independently testable.

---

## Phase 4: User Story 3 - Responsive Mobile Stacking & Neo-Brutalist Visual Consistency (Priority: P3)

**Goal**: Ensure the relocated Search trigger and Ask AI buttons stack cleanly at full width on mobile (`< 640px`) with >= 44px touch targets and strictly follow Neo-Brutalist Sky Blue design tokens across Light and Dark themes.

**Independent Test**: Inspect `FilterBar` at 375px mobile and >= 768px desktop in both Light and Dark themes; verify vertical stacking with zero horizontal overflow, `min-h-[44px]`, `border-2 border-border`, `shadow-card` (`4px 4px 0px`), `font-mono`, `bg-surface` / `bg-accent` (`#38BDF8` with `#0F172A` ink), tactile `active:translate-x-[2px] active:translate-y-[2px] active:shadow-none`, and zero purple/violet/gradient classes.

- [x] T009 [US3] Apply Neo-Brutalist Sky Blue tokens (`min-h-[44px] rounded-md border-2 border-border shadow-card font-mono text-xs font-bold active:translate-x-[2px] active:translate-y-[2px] active:shadow-none`, `bg-surface text-ink` / `bg-accent text-accent-ink`) to both relocated buttons in `web/src/components/feed/filter-bar.tsx`
- [x] T010 [P] [US3] Add assertions in `web/tests/filter-bar.test.ts` verifying mobile stacking (`grid-cols-1`), `min-h-[44px]`, Neo-Brutalist token classes (`border-2`, `border-border`, `shadow-card`, `font-mono`), and absence of purple/violet/gradient classes

**Checkpoint**: All user stories (US1, US2, US3) are independently functional and verified.

---

## Phase 5: Polish & Cross-Cutting Concerns

**Purpose**: Final verification across type-checking, linting, unit tests, and quickstart validation.

- [x] T011 Run `npm run typecheck && npm run lint && npm test` in `web/` and verify all checks pass with zero errors
- [ ] T012 Verify manual Light/Dark theme and 375px/desktop checklist in `specs/006-relocate-search-ask-ai/quickstart.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — run baseline verification first.
- **Phase 2 (US1)**: Can start immediately after Phase 1.
- **Phase 3 (US2)**: `T006` (`top-nav.tsx`) and `T008` (`top-nav.test.ts`) can run in parallel with Phase 2; `T007` (`filter-bar.tsx`) should follow or be combined cleanly with `T002`–`T004` in `filter-bar.tsx`.
- **Phase 4 (US3)**: Builds on `T002`–`T004` in `filter-bar.tsx` and `T005` in `filter-bar.test.ts`.
- **Phase 5 (Polish)**: Depends on all desired user stories being complete.

### Parallel Opportunities

- `T006` (`web/src/components/layout/top-nav.tsx`) and `T008` (`web/tests/top-nav.test.ts`) have zero file overlap with `web/src/components/feed/filter-bar.tsx` and can run in parallel with `T002`–`T005`.

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1 (`T001`).
2. Complete Phase 2 (`T002`–`T005`) to deliver the 75%/25% Search + Ask AI split row.
3. Validate US1 independently, then proceed to US2 (`T006`–`T008`) and US3 (`T009`–`T010`).
