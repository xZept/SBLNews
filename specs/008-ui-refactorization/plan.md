# Implementation Plan: 16-Bit Retro-RPG Neo-Brutalist UI Refactorization

**Branch**: `008-ui-refactorization` | **Date**: 2026-11-29 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/008-ui-refactorization/spec.md`

## Summary

Refactor the `/web` interface across all 8 approved user-facing routes (`/`, `/study/[id]`, `/guidelines`, `/search`, `/methodology`, `/admin/review`, `/profile`, `/profile/[id]`) to implement the Constitution v1.3.0 **16-Bit Retro-RPG Neo-Brutalist Sky Blue** visual system (`wizardshock.xyz`-inspired arcade/codex craft united with Hugging Face Daily Papers feed density and Examine evidence organization) while preserving 100% of existing controls, data flows, static/ISR performance, and automated test contracts:

1. **Design Tokens, 4-Tier Typography & Double-Frame RPG Dialogs (`web/src/app/globals.css`, `web/src/app/layout.tsx`)**:
   - Preserve the Tailwind CSS v4 namespace reset (`--color-*: initial;`) and normative Light Mode default (`#F8FAFC` canvas, `#FFFFFF` surface, `#0F172A` ink/border/shadow, `#475569` muted, `#38BDF8` Sky Blue accent with `#0F172A` ink) plus opt-in Dark Mode (`:root[data-theme="dark"]` with `#0B1120` canvas, `#1E293B` surface, `#F8FAFC` ink, `#94A3B8` muted, `#E2E8F0` border, `#020617` shadow) and all 5 solid pastel semantic badges (`#A7F3D0`, `#BAE6FD`, `#FDE68A`, `#BBF7D0`, `#FED7AA` with `1.5px solid #0F172A` borders and `#0F172A` ink).
   - Load `Silkscreen` via `next/font/google` as `--font-pixel` (`font-pixel`) restricted strictly to the `SBL NEWS` brand wordmark, page/hub banners, and uppercase arcade HUD labels alongside `Space Grotesk` (`--font-display`), `Inter` (`--font-sans`, `65ch–75ch`), and `JetBrains Mono` (`--font-mono`).
   - Define `--shadow-rpg-dialog` and `.rpg-dialog-frame` (`box-shadow: inset 0 0 0 2px var(--color-surface), inset 0 0 0 4px var(--color-border), 4px 4px 0px var(--color-shadow)`) for priority RPG dialog containers.
2. **Primitive-Level `shadcn/ui` Overrides & `< 2 KB` Inline Crisp Pixel SVGs (`web/src/components/ui/*`)**:
   - Tighten `Card`, `Badge`, `Button`, `Input`, and `Tabs` primitives to sharp `rounded-none` / `rounded-sm` geometry (never exceeding `6px` / `rounded-md`), `2px solid var(--color-border)` frames, hard offset shadows (`--shadow-card`, `--shadow-control`), `Card variant="dialog"` double-frame support, and snappy `duration-75` arcade press physics (`active:translate-x-[2px] active:translate-y-[2px] active:shadow-none`).
   - Create `web/src/components/ui/pixel-icons.tsx` providing `< 2 KB` inline `16x16` / `24x24` `shape-rendering="crispEdges"` pixel SVG icons (including a pixel magnifying glass for `Search` and a Sky Blue pixel crystal/terminal/book icon for `Ask AI`) and replace all `lucide-react` imports across `web/src/`.
3. **Flexible 16-Bit Retro-RPG Layout Craft Across All 8 Routes (`web/src/app/**`, `web/src/components/**`)**:
   - Restyle `TopNav`, `FilterBar`, and `AiSearchWorkspace` as a sticky **Quest-Board Command HUD & Filter/Search Deck** (with zero marketing hero banner); `StudyCard` as collectible **Character-Sheet / Evidence Scroll Cards**; `AiSynthesisPanel` and `AskAiOAuthPrompt` as **Double-Framed RPG Dialogue Boxes**; `/guidelines` (`HubGrid` + `VariableDirectory`) as a **Training Codex & Skill Tree** with double-framed Core Hubs; `/study/[id]` (`MetadataBreakdown`, `SecondaryCommentaryList`, `DiscussionThread`) as a **Double-Framed RPG Study Dossier** with a 4-cell bordered RPG stat grid and `#FED7AA` limitations callout; `/methodology` as a static **RPG Transparency Rulebook**; `/profile` and `/profile/[id]` as collectible **Lifter Character Sheets**; and `/admin/review` (`ConsensusDriftCard`) with **Double-Framed Consensus Drift Alerts**.

## Technical Context

**Language/Version**: TypeScript 5.8 (`strict: true`, Node.js 20+), React 19, Next.js 15.2 App Router  
**Primary Dependencies**: Tailwind CSS v4 (`@tailwindcss/postcss`), overridden `shadcn/ui` primitives (`Card`, `Badge`, `Button`, `Input`, `Tabs`), `next/font/google` (`Silkscreen`, `Space_Grotesk`, `Inter`, `JetBrains_Mono`), custom inline pixel SVGs (`@/components/ui/pixel-icons`), `zod` (**zero** new npm dependencies; removes runtime reliance on `lucide-react`)  
**Storage**: N/A (reuses existing `public.profiles.theme_preference` in Supabase PostgreSQL and `localStorage["sbl_theme"]` with zero schema migrations)  
**Testing**: Vitest 3 (`npx vitest run`), TypeScript (`npm run typecheck` / `tsc --noEmit`), ESLint (`npm run lint`)  
**Target Platform**: Web (Vercel Hobby Next.js runtime; responsive desktop `>= 640px` and mobile `320px–640px` with zero horizontal shadow overflow)  
**Project Type**: Monorepo web application (`/web`)  
**Performance Goals**: Preserve `revalidate = 3600` ISR on `/` and `/guidelines` and `dynamic = "force-static"` on `/methodology`; `< 2 KB` per inline pixel SVG icon; `75ms` (`duration-75`) tactile arcade press transitions; zero FOIT/FOUC on initial Light Mode load or opt-in Dark Mode hydration  
**Constraints**: Strict compliance with Constitution v1.3.0 Principles I–VI: $0/month free-tier stack, zero new routes outside the 8 approved page routes and 2 internal Route Handlers, zero purple/violet/indigo hues, zero gradients/mesh backgrounds, zero `backdrop-blur` or blurry shadows, max `6px` corner radius ceiling, and 100% functional preservation  
**Scale/Scope**: All 8 user-facing page routes (`web/src/app/**/page.tsx`), global shell (`layout.tsx`, `globals.css`), 5 UI primitives + new `pixel-icons.tsx` module (`web/src/components/ui/*`), 22 feature components across `layout/`, `feed/`, `search/`, `guidelines/`, `study/`, `profile/`, `social/`, and `admin/`, plus comprehensive design-system and pixel-icon Vitest verification (`web/tests/ui-refactorization.test.ts`).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Constitution Principle (v1.3.0) | Pre-Research Gate | Post-Design Evaluation (Phase 1) | Status |
|---------------------------------|-------------------|----------------------------------|--------|
| **I. Architecture & $0/Month Free-Tier First** | Pure `/web` visual and layout-craft refactorization; preserves `revalidate = 3600` ISR on `/` and `/guidelines`; introduces zero new npm packages or paid services. | Verified in [research.md](./research.md) Decisions 1–4. `Silkscreen` loads via built-in `next/font/google` and all pixel icons are inline React SVG components (`< 2 KB` each). | ✅ PASS |
| **II. Scientific Integrity & Deterministic AI Pipeline** | All deterministic evidence scores, `Full-Text` vs. `Abstract-Only` badges, `[S1]..[S5]` AI citations, limitations callouts, subordinate secondary commentary rules, and HITL `Consensus Drift` workflows remain intact. | Verified in [contracts/ui-design-system.md](./contracts/ui-design-system.md) Section 2. `/study/[id]` highlights methodological limitations in a dedicated `#FED7AA` callout box and keeps creator videos visually subordinate on `bg-canvas`. | ✅ PASS |
| **III. Neo-Brutalist Sky Blue Design System** | Implements every 16-bit retro-RPG rule in Principle III: Light Mode default + opt-in Dark Mode tokens, 5 pastel badges, `rounded-none`/`rounded-sm` (`6px` max ceiling), double-frame RPG dialog inset borders on the 4 priority containers, `duration-75` arcade press states, `Silkscreen` pixel display accent font, and `< 2 KB` `crispEdges` inline pixel SVGs. | Verified in [data-model.md](./data-model.md) Sections 1–2 and [contracts/ui-design-system.md](./contracts/ui-design-system.md) Sections 1–2. | ✅ PASS |
| **IV. Performance, Egress & Security Guardrails** | Zero changes to explicit SQL column projections (`STUDY_SUMMARY_COLUMNS`, etc.), `< 2,000`-token AI context cap, shared TTL cache, atomic quota RPC, RLS policies, avatar downscaling (`<= 256x256`, `<= 200 KB`), or server-side RBAC (`requireAdminPage`). | Verified in [contracts/ui-design-system.md](./contracts/ui-design-system.md) Section 2 and existing `projections.test.ts` / `ai-search.test.ts` / `profile.test.ts` suites. | ✅ PASS |
| **V. Scoped Route Discipline** | Confined strictly to the 8 approved user-facing page routes (`/`, `/study/[id]`, `/guidelines`, `/search`, `/methodology`, `/admin/review`, `/profile`, `/profile/[id]`) and 2 internal Route Handlers (`/auth/callback`, `/api/ai-search`). | Verified in Project Structure below and enforced by the automated route-boundary tests in `web/tests/ai-search.test.ts` and `web/tests/social.test.ts`. | ✅ PASS |
| **VI. Verification & Deterministic Code Quality** | Testable acceptance criteria (`SC-001`–`SC-004`); verified via `tsc --noEmit`, `next lint`, existing Vitest suites, and a dedicated design-system/pixel-icon audit suite (`web/tests/ui-refactorization.test.ts`). | Verified in [quickstart.md](./quickstart.md) Section 1. | ✅ PASS |

## Project Structure

### Documentation (this feature)

```text
specs/008-ui-refactorization/
├── plan.md                                      # This file (/speckit-plan command output)
├── research.md                                  # Phase 0 output (/speckit-plan command)
├── data-model.md                                # Phase 1 output (/speckit-plan command)
├── quickstart.md                                # Phase 1 output (/speckit-plan command)
├── contracts/                                   # Phase 1 output (/speckit-plan command)
│   └── ui-design-system.md
└── tasks.md                                     # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
web/
├── src/
│   ├── app/
│   │   ├── globals.css                          # UPDATED: Adds --color-shadow, --font-pixel (Silkscreen), --shadow-rpg-dialog, and .rpg-dialog-frame
│   │   ├── layout.tsx                           # UPDATED: Loads Silkscreen via next/font/google (--font-silkscreen) alongside Space Grotesk, Inter, JetBrains Mono
│   │   ├── page.tsx                             # UPDATED: 16-bit Quest-Board feed header banner with font-pixel HUD tag (preserves revalidate = 3600 ISR)
│   │   ├── guidelines/
│   │   │   └── page.tsx                         # UPDATED: Training Codex & Skill Tree header banner with font-pixel HUD tag (preserves revalidate = 3600 ISR)
│   │   ├── methodology/
│   │   │   └── page.tsx                         # UPDATED: Static RPG Rulebook framing with font-pixel Pillar tags (preserves force-static)
│   │   ├── search/
│   │   │   └── page.tsx                         # UPDATED: Hybrid Search Deck header & crisp pixel icons
│   │   ├── study/
│   │   │   └── [id]/
│   │   │       └── page.tsx                     # UPDATED: RPG Study Dossier back-navigation button with crisp pixel arrow & duration-75 press state
│   │   ├── profile/
│   │   │   ├── page.tsx                         # UPDATED: Collectible Character-Sheet Profile header with font-pixel HUD tag
│   │   │   └── [id]/
│   │   │       ├── page.tsx                     # UPDATED: Public Character-Sheet Profile card framing
│   │   │       └── not-found.tsx                # UPDATED: Crisp pixel UserX icon & RPG card framing
│   │   └── admin/
│   │       └── review/
│   │           └── page.tsx                     # UPDATED: Guild Moderation & Drift Queue header with crisp pixel ShieldCheck icon
│   └── components/
│       ├── ui/
│       │   ├── pixel-icons.tsx                  # NEW: <2 KB 16x16 & 24x24 inline pixel SVGs (shape-rendering="crispEdges") replacing lucide-react
│       │   ├── card.tsx                         # UPDATED: 16-bit geometry (rounded-sm) + variant="default" | "dialog" (.rpg-dialog-frame)
│       │   ├── button.tsx                       # UPDATED: Snappy duration-75 arcade press state & 16-bit border/shadow geometry
│       │   ├── badge.tsx                        # UPDATED: 1.5px solid #0F172A border, #0F172A ink on 5 pastel badges, JetBrains Mono
│       │   ├── input.tsx                        # UPDATED: 16-bit 2px border & hard control shadow geometry
│       │   └── tabs.tsx                         # UPDATED: 16-bit tab bar with duration-75 tactile tab triggers
│       ├── layout/
│       │   ├── top-nav.tsx                      # UPDATED: font-pixel SBL News wordmark, crisp pixel chat icon, duration-75 nav triggers
│       │   ├── account-bubble.tsx               # UPDATED: 32x32 square avatar trigger, pixel icons (User, Sun, Moon, ShieldCheck, LogOut), double-framed popover
│       │   ├── brand-logo.tsx                   # Verified: Existing pixelated emblem ([image-rendering:pixelated])
│       │   └── friends-chat-drawer.tsx          # UPDATED: Crisp pixel icons & 16-bit RPG drawer framing
│       ├── feed/
│       │   ├── feed-client.tsx                  # UPDATED: 16-bit empty-state dialog framing
│       │   ├── filter-bar.tsx                   # UPDATED: Quest-Board HUD label, duration-75 filter pills, crisp pixel Search & Ask AI icons
│       │   ├── study-card.tsx                   # UPDATED: Collectible character-sheet card layout & crisp pixel Discussion/ExternalLink icons
│       │   └── upvote-button.tsx                # UPDATED: Crisp pixel ArrowBigUp icon & duration-75 arcade press state
│       ├── search/
│       │   ├── ai-search-workspace.tsx          # UPDATED: Quest-Board search deck framing & crisp pixel icons
│       │   ├── ai-synthesis-panel.tsx           # UPDATED: Double-frame RPG dialog border (.rpg-dialog-frame), font-pixel HUD badge, crisp pixel icons
│       │   └── ask-ai-oauth-prompt.tsx          # UPDATED: Double-frame RPG dialog border (.rpg-dialog-frame), font-pixel HUD header, crisp pixel icons
│       ├── guidelines/
│       │   ├── hub-grid.tsx                     # UPDATED: Double-frame RPG dialog borders on 3 Core Evidence Hubs & font-pixel domain counter
│       │   └── variable-directory.tsx           # UPDATED: 4-column Skill Tree variable cards & crisp pixel BookOpen/History/ArrowUpRight icons
│       ├── study/
│       │   ├── metadata-breakdown.tsx           # UPDATED: Double-frame RPG dialog header, 4-cell RPG stat grid with fallback dashes, #FED7AA limitations callout
│       │   ├── secondary-commentary-list.tsx    # UPDATED: Subordinate bg-canvas creator video shelf with crisp pixel icons
│       │   └── discussion-thread.tsx            # UPDATED: Stepped nested RPG discussion thread with crisp pixel action icons
│       ├── profile/
│       │   ├── user-avatar.tsx                  # UPDATED: Square 2px-bordered RPG portrait / JetBrains Mono initials badge
│       │   ├── avatar-upload-control.tsx        # UPDATED: Crisp pixel ImagePlus & Trash2 icons
│       │   ├── profile-settings-form.tsx        # UPDATED: Character-sheet form framing & crisp pixel Sun/Moon/ExternalLink icons
│       │   ├── profile-activity-lists.tsx       # UPDATED: Character-sheet activity tabs & crisp pixel icons
│       │   └── profile-sign-in-gate.tsx         # UPDATED: Double-frame RPG sign-in gate & crisp pixel Lock icon
│       ├── social/
│       │   ├── aura-badge.tsx                   # Verified: JetBrains Mono AURA badge
│       │   ├── top-users-rail.tsx               # UPDATED: RPG Leaderboard rail with font-pixel HUD header & crisp pixel Award/Chevron icons
│       │   ├── profile-friend-actions.tsx       # UPDATED: Crisp pixel social action icons & duration-75 press states
│       │   └── study-share-menu.tsx             # UPDATED: Crisp pixel share icons & 16-bit popover framing
│       └── admin/
│           ├── consensus-drift-card.tsx         # UPDATED: Double-frame RPG dialog border (.rpg-dialog-frame) & crisp pixel icons
│           ├── pending-studies-table.tsx        # UPDATED: Crisp pixel Check/X/ExternalLink icons & RPG queue cards
│           └── secondary-commentary-form.tsx    # UPDATED: Crisp pixel Plus icon & 16-bit form controls
└── tests/
    ├── ui-refactorization.test.ts               # NEW: Automated audit of tokens, zero-purple/gradient/blur/radius rules, <2 KB crispEdges pixel SVGs, double-frame dialogs, and duration-75 press states
    ├── brand-logo.test.ts                       # Existing test suite (preserved 100% passing)
    ├── filter-bar.test.ts                       # Existing test suite (preserved 100% passing)
    ├── top-nav.test.ts                          # Existing test suite (preserved 100% passing)
    └── ai-search.test.ts                        # Existing test suite (preserved 100% passing)
```

**Structure Decision**: Confines all changes to `/web` (`web/src/app/`, `web/src/components/`, and `web/tests/`). Centralizing all `< 2 KB` `shape-rendering="crispEdges"` inline pixel SVGs in `web/src/components/ui/pixel-icons.tsx` and all 16-bit tokens/double-frame shadows in `web/src/app/globals.css` + `web/src/components/ui/*` keeps the architecture clean, modular, and deterministically testable.

## Complexity Tracking

No Constitution Check violations exist; all 6 core principles in Constitution v1.3.0 pass without exception.
