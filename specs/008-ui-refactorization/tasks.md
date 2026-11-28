# Tasks: 16-Bit Retro-RPG Neo-Brutalist UI Refactorization

**Input**: Design documents from `/specs/008-ui-refactorization/`
**Prerequisites**: `plan.md` (required), `spec.md` (required for user stories), `research.md`, `data-model.md`, `contracts/ui-design-system.md`, `quickstart.md`

**Tests**: Automated verification tasks are included per Constitution Principle VI (`SC-001`–`SC-004`) to audit design tokens, zero-purple/gradient/blur/radius rules, `< 2 KB` `crispEdges` inline pixel SVGs, double-frame RPG dialog borders, and `duration-75` arcade press states.

**Organization**: Tasks are grouped by user story (`US1`–`US4`) to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (`US1`, `US2`, `US3`, `US4`)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Design Infrastructure)

**Purpose**: Establish the 16-bit retro-RPG CSS tokens, pixel display font, double-frame dialog shadow utility, and inline pixel SVG icon library.

- [X] T001 Update `web/src/app/globals.css` to add `--color-shadow` (`#0F172A` in `:root` Light Mode, `#020617` in `:root[data-theme="dark"]`), `--font-pixel: var(--font-silkscreen), var(--font-jetbrains-mono), monospace;`, `--shadow-card: 4px 4px 0px var(--color-shadow)`, `--shadow-control: 2px 2px 0px var(--color-shadow)`, `--shadow-rpg-dialog`, and `.rpg-dialog-frame` (`box-shadow: inset 0 0 0 2px var(--color-surface), inset 0 0 0 4px var(--color-border), 4px 4px 0px var(--color-shadow)`), while preserving `@theme { --color-*: initial; ... }`
- [X] T002 Update `web/src/app/layout.tsx` to load `Silkscreen` (`weight: ["400", "700"]`, `subsets: ["latin"]`, `variable: "--font-silkscreen"`, `display: "swap"`) from `next/font/google` and apply `${silkscreen.variable}` to `<html>` alongside `spaceGrotesk.variable`, `inter.variable`, and `jetbrainsMono.variable`
- [X] T003 Create `web/src/components/ui/pixel-icons.tsx` exporting `< 2 KB` inline `16x16` / `24x24` `shape-rendering="crispEdges"` pixel SVG icon components (`Search`, `Sparkles`, `AlertTriangle`, `RotateCcw`, `ArrowBigUp`, `MessageSquare`, `ExternalLink`, `BookOpen`, `History`, `ArrowUpRight`, `ArrowLeft`, `Lock`, `X`, `Check`, `ShieldCheck`, `User`, `Users`, `UserPlus`, `UserMinus`, `UserX`, `Sun`, `Moon`, `LogOut`, `Share2`, `Copy`, `Send`, `Ban`, `ShieldOff`, `Award`, `ChevronUp`, `ChevronDown`, `ThumbsUp`, `Reply`, `Pencil`, `Trash2`, `ImagePlus`, `Eye`, `FileCheck2`, `FileWarning`, `MessageCircle`, `MessageCircleWarning`, `Plus`, `Loader2`)

**Checkpoint**: Design tokens, `Silkscreen` pixel font, `.rpg-dialog-frame`, and all `< 2 KB` `crispEdges` inline pixel SVG icons are ready.

---

## Phase 2: Foundational (Primitive-Level `shadcn/ui` Overrides & Global Shell)

**Purpose**: Override core `shadcn/ui` primitives and global navigation shell with 16-bit retro-RPG geometry and `duration-75` arcade press states.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [X] T004 [P] Override `web/src/components/ui/card.tsx` to default to `rounded-sm border-2 border-border bg-surface text-ink shadow-card` and add `variant?: "default" | "dialog"` supporting `.rpg-dialog-frame` double-frame RPG dialog inset borders
- [X] T005 [P] Override `web/src/components/ui/button.tsx` to enforce `rounded-sm border-2 border-border shadow-control transition-transform duration-75 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none` across `primary`, `secondary`, `ghost`, and `warning` variants
- [X] T006 [P] Override `web/src/components/ui/badge.tsx` to enforce `rounded-sm border-[1.5px] border-accent-ink font-mono text-xs font-semibold leading-tight` with `#0F172A` ink (`text-accent-ink`) on all 5 semantic pastel variants (`meta`, `rct`, `trained`, `fulltext`, `abstract`) in both Light and Dark themes
- [X] T007 [P] Override `web/src/components/ui/input.tsx` and `web/src/components/ui/tabs.tsx` to enforce `rounded-sm border-2 border-border shadow-control` and `duration-75 active:translate-x-[2px] active:translate-y-[2px]` tactile feedback on `TabsTrigger`
- [X] T008 Update `web/src/components/layout/top-nav.tsx`, `web/src/components/layout/account-bubble.tsx`, and `web/src/components/layout/friends-chat-drawer.tsx` to use `font-pixel` (`Silkscreen`) for the `SBL News` wordmark, replace all `lucide-react` imports with `@/components/ui/pixel-icons`, apply `duration-75` arcade press states, and enforce 16-bit RPG borders/shadows

**Checkpoint**: Foundation ready — all UI primitives and global navigation/drawer shell enforce 16-bit retro-RPG geometry, pixel icons, and Light/Dark parity.

---

## Phase 3: User Story 1 - Cohesive 16-Bit Retro-RPG Design System & Theme Parity (Priority: P1) 🎯 MVP

**Goal**: Deliver a unified, high-contrast 16-bit retro-RPG Neo-Brutalist Sky Blue visual identity across Light Mode (default) and opt-in Dark Mode with zero purple/violet/indigo hues, gradients, backdrop blurs, blurry shadows, or oversized corners, and `< 2 KB` `crispEdges` pixel icons.

**Independent Test**: Run `web/tests/ui-refactorization.test.ts` to verify Light/Dark tokens, `Silkscreen` font registration, `.rpg-dialog-frame` inset borders, `duration-75` press states, `< 2 KB` `crispEdges` pixel SVGs, and zero prohibited styles across `web/src/`.

- [X] T009 [US1] Create `web/tests/ui-refactorization.test.ts` to audit `web/src/app/globals.css`, `web/src/app/layout.tsx`, `web/src/components/ui/pixel-icons.tsx`, and all `.tsx`/`.css` files under `web/src/` for Light/Dark tokens, zero purple/violet/indigo/gradient/backdrop-blur/blurry-shadow/oversized-radius violations, zero `lucide-react` imports, `< 2 KB` `crispEdges` pixel SVGs, double-frame RPG dialog usage, and `duration-75` press states

**Checkpoint**: User Story 1 is independently verified via `web/tests/ui-refactorization.test.ts`.

---

## Phase 4: User Story 2 - Retro-RPG Quest-Board Feed, Search Deck & Double-Framed "Ask AI" Dialogue (Priority: P1)

**Goal**: Restyle `/` and `/search` as a sticky Quest-Board Command HUD & Filter/Search Deck with collectible Character-Sheet Study Cards and double-framed RPG Dialogue Boxes for `"Ask AI"` synthesis and OAuth prompts, preserving `revalidate = 3600` ISR on `/` and 100% of existing controls.

**Independent Test**: Load `/` and `/search` in Light and Dark modes; verify `FilterBar` Quest-Board HUD, `StudyCard` character-sheet framing, `UpvoteButton` `duration-75` press state, `TopUsersRail` leaderboard, and double-framed `AiSynthesisPanel` / `AskAiOAuthPrompt` with crisp pixel icons.

- [X] T010 [P] [US2] Update `web/src/app/page.tsx` and `web/src/components/feed/feed-client.tsx` to add a compact `font-pixel` (`Silkscreen`) Quest-Board HUD header tag (`QUEST BOARD • DAILY RESEARCH`) without a marketing hero banner and preserve `revalidate = 3600` ISR
- [X] T011 [P] [US2] Update `web/src/components/feed/filter-bar.tsx` to frame the sticky filter/search deck with a `font-pixel` HUD label, `duration-75` arcade press states on `Trained Lifters Only` and study-design pills, and crisp pixel `Search` & Sky Blue `Ask AI` icons from `@/components/ui/pixel-icons`
- [X] T012 [P] [US2] Update `web/src/components/feed/study-card.tsx`, `web/src/components/feed/upvote-button.tsx`, and `web/src/components/social/top-users-rail.tsx` to replace `lucide-react` imports with `@/components/ui/pixel-icons`, apply `duration-75` press states on `UpvoteButton`, and frame `StudyCard` and `TopUsersRail` with 16-bit character-sheet / leaderboard styling
- [X] T013 [P] [US2] Update `web/src/app/search/page.tsx` and `web/src/components/search/ai-search-workspace.tsx` to add `font-pixel` Search Deck HUD framing and replace `lucide-react` imports with `@/components/ui/pixel-icons`
- [X] T014 [US2] Update `web/src/components/search/ai-synthesis-panel.tsx` and `web/src/components/search/ask-ai-oauth-prompt.tsx` to apply double-frame RPG dialog inset borders (`.rpg-dialog-frame`), `font-pixel` dialogue headers (`AI SYNTHESIS`, `QUEST GATE`), and `@/components/ui/pixel-icons`

**Checkpoint**: User Story 2 (`/` and `/search`) is complete and independently testable.

---

## Phase 5: User Story 3 - Training Codex & Skill Tree (`/guidelines`) and Study / Methodology Dossiers (`/study/[id]`, `/methodology`) (Priority: P2)

**Goal**: Restyle `/guidelines` as a Training Codex & Skill Tree with double-framed Core Evidence Hubs, `/study/[id]` with a double-framed dossier header, 4-cell bordered RPG stat grid, `#FED7AA` limitations callout, subordinate creator video shelf, and stepped nested discussions, and `/methodology` as a static RPG Rulebook.

**Independent Test**: Navigate to `/guidelines`, `/study/[id]`, and `/methodology` in Light and Dark modes; verify double-framed Core Hubs, 4-column variable skill cards, 4-cell RPG stat grid with fallback dashes, `#FED7AA` limitations callout, and stepped nested comments linking to `/profile/[id]`.

- [X] T015 [P] [US3] Update `web/src/app/guidelines/page.tsx`, `web/src/components/guidelines/hub-grid.tsx`, and `web/src/components/guidelines/variable-directory.tsx` to add `font-pixel` (`TRAINING CODEX • SKILL TREE`) banner framing, apply `<Card variant="dialog">` (`.rpg-dialog-frame`) to the 3 Core Evidence Hubs, and replace `lucide-react` imports with `@/components/ui/pixel-icons`
- [X] T016 [P] [US3] Update `web/src/app/study/[id]/page.tsx`, `web/src/components/study/metadata-breakdown.tsx`, `web/src/components/study/secondary-commentary-list.tsx`, and `web/src/components/study/discussion-thread.tsx` to apply `<Card variant="dialog">` to `MetadataBreakdown`, style the 4-cell RPG stat grid with fallback dashes, style Methodological Limitations in a `#FED7AA` (`bg-badge-abstract`) callout box, and replace `lucide-react` imports with `@/components/ui/pixel-icons`
- [X] T017 [P] [US3] Update `web/src/app/methodology/page.tsx` to add `font-pixel` Pillar HUD tags and crisp 16-bit RPG rulebook framing while preserving `dynamic = "force-static"` and `65ch–75ch` prose measure

**Checkpoint**: User Story 3 (`/guidelines`, `/study/[id]`, `/methodology`) is complete and independently testable.

---

## Phase 6: User Story 4 - Collectible Character-Sheet Profiles (`/profile`, `/profile/[id]`) & Admin Moderation Queue (`/admin/review`) (Priority: P3)

**Goal**: Restyle `/profile` and `/profile/[id]` as collectible Lifter Character Sheets and `/admin/review` with double-framed `Consensus Drift` alerts while preserving avatar upload, theme switching, public profile privacy boundaries, and RBAC moderation.

**Independent Test**: Visit `/profile`, `/profile/[id]`, and `/admin/review` in Light and Dark modes; verify character-sheet framing, square avatar / 2-letter `JetBrains Mono` initials fallback, double-framed `ConsensusDriftCard`, and crisp pixel icons.

- [X] T018 [P] [US4] Update `web/src/app/profile/page.tsx`, `web/src/app/profile/[id]/page.tsx`, `web/src/app/profile/[id]/not-found.tsx`, `web/src/components/profile/user-avatar.tsx`, `web/src/components/profile/avatar-upload-control.tsx`, `web/src/components/profile/profile-settings-form.tsx`, `web/src/components/profile/profile-activity-lists.tsx`, `web/src/components/profile/profile-sign-in-gate.tsx`, `web/src/components/social/profile-friend-actions.tsx`, and `web/src/components/social/study-share-menu.tsx` to apply collectible Character-Sheet framing, `font-pixel` HUD tags, square `2px`-bordered avatars (`rounded-sm`), `<Card variant="dialog">` on `ProfileSignInGate`, and `@/components/ui/pixel-icons`
- [X] T019 [P] [US4] Update `web/src/app/admin/review/page.tsx`, `web/src/components/admin/consensus-drift-card.tsx`, `web/src/components/admin/pending-studies-table.tsx`, and `web/src/components/admin/secondary-commentary-form.tsx` to apply `<Card variant="dialog">` (`.rpg-dialog-frame`) to `ConsensusDriftCard`, add `font-pixel` Guild Moderation HUD tags, and replace `lucide-react` imports with `@/components/ui/pixel-icons`

**Checkpoint**: User Story 4 (`/profile`, `/profile/[id]`, `/admin/review`) is complete and independently testable.

---

## Phase 7: Polish & Cross-Cutting Verification

**Purpose**: Run full TypeScript, ESLint, and Vitest verification across `/web` to confirm 100% compliance with `SC-001`–`SC-004`.

- [X] T020 Run `npm run typecheck ; npm run lint ; npx vitest run` in `web/` and fix any remaining type, lint, or test issues until all suites pass cleanly

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: `T001`–`T003` — can start immediately (`T001`, `T002`, `T003` touch different files).
- **Foundational (Phase 2)**: `T004`–`T008` — depends on Phase 1 completion; BLOCKS all user stories.
- **User Stories (Phases 3–6)**:
  - **US1 (`T009`)**: Can run immediately after Phase 2.
  - **US2 (`T010`–`T014`)**: Can run in parallel after Phase 2.
  - **US3 (`T015`–`T017`)**: Can run in parallel after Phase 2.
  - **US4 (`T018`–`T019`)**: Can run in parallel after Phase 2.
- **Polish (Phase 7)**: `T020` — depends on all user stories being complete.

### Parallel Opportunities

- `T004`, `T005`, `T006`, `T007` (UI primitives) can all run in parallel.
- `T010`, `T011`, `T012`, `T013` (Feed & Search routes/components) can run in parallel.
- `T015`, `T016`, `T017` (Guidelines, Study Detail, Methodology) can run in parallel.
- `T018`, `T019` (Profiles & Admin Review) can run in parallel.

---

## Implementation Strategy

### MVP First (Phase 1 + Phase 2 + User Story 1 & 2)

1. Complete Phase 1 (`globals.css`, `layout.tsx`, `pixel-icons.tsx`) and Phase 2 (`components/ui/*`, `top-nav.tsx`, `account-bubble.tsx`, `friends-chat-drawer.tsx`).
2. Run `T009` (`web/tests/ui-refactorization.test.ts`) to lock in token, icon, and anti-vibecoding invariants.
3. Complete User Story 2 (`/` and `/search`) and validate Quest-Board Feed + Double-Framed Ask AI.
4. Complete User Story 3 (`/guidelines`, `/study/[id]`, `/methodology`) and User Story 4 (`/profile`, `/profile/[id]`, `/admin/review`), then run `T020` full verification.
