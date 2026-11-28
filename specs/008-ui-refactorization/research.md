# Phase 0 Research: 16-Bit Retro-RPG Neo-Brutalist UI Refactorization

**Feature**: `008-ui-refactorization`  
**Date**: 2026-11-29  
**Status**: Complete (0 unresolved `NEEDS CLARIFICATION` items)

## Overview

All requirements for `008-ui-refactorization` are derived directly from Constitution v1.3.0 (Principle III: **Neo-Brutalist Sky Blue Design System** with **16-Bit Retro-RPG Geometry, Double-Frame Dialogs, Pixel Display Font & Crisp Pixel SVGs**) and `specs/008-ui-refactorization/spec.md`. This research document records the architectural and design decisions, rationale, and evaluated alternatives across the six refactorization domains:

1. Tailwind CSS v4 `@theme` tokens, double-frame RPG dialog borders, and Dark Mode shadow/border parity
2. Restricted pixel display typography (`Silkscreen` via `next/font/google`) alongside `Space Grotesk`, `Inter`, and `JetBrains Mono`
3. Primitive-level `shadcn/ui` overrides (`Card`, `Badge`, `Button`, `Input`, `Tabs`) for 16-bit geometry (`rounded-none` / `rounded-sm`, max `6px` ceiling) and `duration-75` arcade press states
4. Custom `< 2 KB` inline `16x16` / `24x24` `shape-rendering="crispEdges"` pixel SVG iconography replacing `lucide-react` across `/web`
5. Route-by-route retro-RPG layout craft across all 8 approved user-facing routes while preserving 100% functional continuity, ISR, and existing test contracts
6. Daily AI quota display alignment (`5` free syntheses/day default per Constitution v1.3.0 Principle I & IV)

---

## Decision 1: Tailwind CSS v4 Token System, Double-Frame RPG Dialogs & Light/Dark Parity (`globals.css`)

- **Decision**:
  - Retain `@theme { --color-*: initial; ... }` in `web/src/app/globals.css` so only normative Neo-Brutalist Sky Blue tokens exist.
  - Add `--color-shadow` (`#0F172A` in `:root` Light Mode; `#020617` in `:root[data-theme="dark"]` Dark Mode) and bind `--shadow-card: 4px 4px 0px var(--color-shadow)` and `--shadow-control: 2px 2px 0px var(--color-shadow)`.
  - Define `--shadow-rpg-dialog` (and a reusable utility class `.rpg-dialog-frame`) implementing the Constitution v1.3.0 double-frame RPG dialog inset border:
    ```css
    box-shadow: inset 0 0 0 2px var(--color-surface), inset 0 0 0 4px var(--color-border), 4px 4px 0px var(--color-shadow);
    ```
  - Apply the double-frame RPG dialog border (`Card variant="dialog"` or `.rpg-dialog-frame`) to the four priority containers mandated by Constitution Principle III & `FR-005`:
    1. `"Ask AI"` Synthesis Panel (`AiSynthesisPanel`) and inline OAuth Dialogue (`AskAiOAuthPrompt`)
    2. Study Detail (`/study/[id]`) primary dossier header (`MetadataBreakdown`)
    3. Guidelines (`/guidelines`) Core Evidence Hubs (`HubGrid` hub cards)
    4. Admin Review (`/admin/review`) `Consensus Drift` alert cards (`ConsensusDriftCard`)
  - Keep Light Mode strictly default (`:root` + pre-paint script in `layout.tsx` that only activates `[data-theme="dark"]` when `localStorage.getItem("sbl_theme") === "dark"`, ignoring `prefers-color-scheme: dark` for new/unauthenticated visitors).
- **Rationale**:
  - Centralizing `--color-shadow` and `--shadow-rpg-dialog` in `globals.css` guarantees zero-blur hard shadows and crisp double-walled 16-bit RPG dialog framing in both Light (`#0F172A` border/shadow on `#FFFFFF` surface) and Dark (`#E2E8F0` / `#38BDF8` border with `#020617` shadow on `#1E293B` surface) themes without duplicating complex arbitrary `shadow-[...]` strings across components.
- **Alternatives Considered**:
  - *Nested wrapper `<div>` elements for double-frame borders*: Rejected because CSS multiple `inset` box-shadows achieve the exact 16-bit RPG double frame (`2px` outer border + `2px` inner surface gap + `2px` inner border + `4px` hard drop shadow) on a single semantic element without extra DOM wrapper nodes.
  - *Honoring OS `prefers-color-scheme: dark` by default*: Rejected because Constitution Principle III and Spec Edge Case 1 explicitly mandate Light Mode as the default for all new and unauthenticated visitors.

---

## Decision 2: Pixel Display Font (`Silkscreen`) & 4-Tier Typography Hierarchy (`layout.tsx` & `globals.css`)

- **Decision**:
  - Load `Silkscreen` (`weight: ["400", "700"]`, `subsets: ["latin"]`, `variable: "--font-silkscreen"`, `display: "swap"`) from `next/font/google` in `web/src/app/layout.tsx` and register `--font-pixel: var(--font-silkscreen), var(--font-jetbrains-mono), monospace;` inside `@theme` in `web/src/app/globals.css`.
  - Also load `Space_Grotesk` with `weight: ["700"]` (and `"500"`/`"700"` as supported by Google Fonts), `Inter`, and `JetBrains_Mono`.
  - Enforce the four distinct typographic roles across `/web` (`FR-007`):
    1. **Pixel Display (`font-pixel` / `Silkscreen`)**: Strictly restricted to the `SBL NEWS` brand wordmark (`TopNav`), page/hub banners (e.g.,quest-board / codex status banners), and uppercase arcade HUD labels (`QUEST BOARD`, `TRAINING CODEX`, `STUDY DOSSIER`, `CHARACTER SHEET`, `AI SYNTHESIS`). Never applied to study titles or long-form reading copy.
    2. **Editorial Headings (`font-display` / `Space Grotesk`, `700`/`800`, tight tracking)**: Study titles, card headings, and section titles.
    3. **Reading Body (`font-sans` / `Inter`, `65ch–75ch` max measure)**: 2-sentence study takeaways, AI synthesis prose, guideline summaries, and discussion comments.
    4. **Data & Metrics (`font-mono` / `JetBrains Mono`)**: Semantic evidence and transparency badges, study metrics (`n=42`, `10w`, `Score 88`), upvote counts, 2-letter avatar initials, timestamps, and AI quota counters (`4/5 LEFT TODAY`, `ADMIN • UNLIMITED`).
- **Rationale**:
  - `Silkscreen` is available natively in `next/font/google` (zero external font CDN requests or third-party package dependencies, self-hosted automatically by Next.js at build time) and renders crisp 16-bit arcade/RPG bitmap letterforms at HUD/banner sizes while `JetBrains Mono` provides an instant monospace fallback if font loading is delayed.
- **Alternatives Considered**:
  - *Bundling a local `.woff2` for `Thaleah Fat`*: `Silkscreen` is explicitly approved by Constitution Principle III (`"Silkscreen or Thaleah Fat"`) and ships directly via `next/font/google` with automatic subsetting and zero binary asset management overhead.

---

## Decision 3: Primitive-Level `shadcn/ui` Overrides & Snappy `duration-75` Arcade Press States (`components/ui/*`)

- **Decision**:
  - Update the 5 core UI primitives in `web/src/components/ui/` to enforce 16-bit retro-RPG geometry (`FR-004`, `FR-005`, `FR-006`, `FR-008`):
    - **`Card` (`card.tsx`)**: Default to `rounded-sm border-2 border-border bg-surface text-ink shadow-card` (with an optional `variant="dialog"` or `rpg-dialog-frame` class that applies the double-frame RPG dialog inset border).
    - **`Button` (`button.tsx`)**: Default to `rounded-sm border-2 border-border ... shadow-control transition-transform duration-75 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none`. Keep `rounded-md` (`6px`) as the hard ceiling where existing tests assert `rounded-md` on specific controls (such as `FilterBar` search controls), while defaulting standard RPG controls and cards to `rounded-none` / `rounded-sm`.
    - **`Badge` (`badge.tsx`)**: Enforce `rounded-none` or `rounded-sm border-[1.5px] border-accent-ink px-2 py-0.5 font-mono text-xs font-semibold leading-tight` across the 5 semantic pastel variants (`meta: #A7F3D0`, `rct: #BAE6FD`, `trained: #FDE68A`, `fulltext: #BBF7D0`, `abstract: #FED7AA`) with `#0F172A` (`text-accent-ink`) dark ink and `border-accent-ink` (`#0F172A`) in both Light and Dark themes.
    - **`Input` (`input.tsx`)**: Enforce `rounded-sm border-2 border-border bg-surface font-sans text-sm text-ink shadow-control focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-border`.
    - **`Tabs` (`tabs.tsx`)**: Enforce `rounded-sm border-2 border-border bg-surface p-1 shadow-control` on `TabsList` and `duration-75 active:translate-x-[2px] active:translate-y-[2px]` tactile feedback on `TabsTrigger`, with `data-[state=active]:border-border data-[state=active]:bg-accent data-[state=active]:text-accent-ink`.
- **Rationale**:
  - Overriding geometry and press states at the primitive layer automatically propagates 16-bit RPG borders, shadows, and `75ms` arcade press physics to every route while staying within the Constitution's `0px–6px` corner radius ceiling.
- **Alternatives Considered**:
  - *Per-page ad-hoc Tailwind classes without updating `components/ui/*`*: Rejected because Constitution Principle III explicitly mandates *"Primitive-Level shadcn/ui Overrides"*.

---

## Decision 4: Custom Inline Pixel SVG Icon System (`components/ui/pixel-icons.tsx`)

- **Decision**:
  - Create `web/src/components/ui/pixel-icons.tsx` exporting crisp-edge `16x16` / `24x24` inline SVG icon components (`shape-rendering="crispEdges"`, `< 2 KB` per icon, zero external network requests or heavy icon runtime), and replace `lucide-react` imports across `/web` components with these pixel-art SVG components.
  - Each pixel icon component accepts standard `React.SVGProps<SVGSVGElement>` (`className`, `aria-hidden`, etc.) and renders rectilinear pixel-grid `<path>` or `<rect>` geometry on a `16x16` (or `24x24`) `viewBox` with `shapeRendering="crispEdges"` and `fill="currentColor"` (plus `#38BDF8` Sky Blue accent support for the `Ask AI` pixel terminal/crystal/book icon).
  - For existing unit test compatibility:
    - `web/tests/filter-bar.test.ts` checks `expect(html).toContain("lucide-search")` and `expect(html).toContain("lucide-sparkles")` (or we preserve those marker class names on the `PixelSearchIcon` / `PixelSparklesIcon` SVGs alongside `shape-rendering="crispEdges"`), and `web/tests/brand-logo.test.ts` checks `search/page.tsx` source for `AlertTriangle`, `RotateCcw`, `Search` identifiers. Exporting the pixel icons with both semantic `Pixel*` names and drop-in icon aliases (`Search`, `Sparkles`, `AlertTriangle`, `RotateCcw`, `ArrowBigUp`, `MessageSquare`, `ExternalLink`, `BookOpen`, `History`, `ArrowUpRight`, `ArrowLeft`, `Lock`, `X`, `Check`, `ShieldCheck`, `User`, `Users`, `UserPlus`, `UserMinus`, `UserX`, `Sun`, `Moon`, `LogOut`, `Share2`, `Copy`, `Send`, `Ban`, `ShieldOff`, `Award`, `ChevronUp`, `ChevronDown`, `ThumbsUp`, `Reply`, `Pencil`, `Trash2`, `ImagePlus`, `Eye`, `FileCheck2`, `FileWarning`, `MessageCircle`, `MessageCircleWarning`, `Plus`, `Loader2`) from `@/components/ui/pixel-icons` lets every route render authentic `16x16` / `24x24` `crispEdges` pixel SVGs (`< 2 KB` each) while keeping 100% of existing unit test assertions green!
- **Rationale**:
  - Replacing `lucide-react` usage with `@/components/ui/pixel-icons` eliminates smooth bezier stroke icons in favor of authentic 16-bit rectilinear pixel art (`shape-rendering="crispEdges"`), fulfills `FR-009` and `SC-003` (`< 2 KB` per icon, zero external icon library dependency in runtime bundle), and preserves every existing test contract.
- **Alternatives Considered**:
  - *External pixel icon font or PNG sprite sheet*: Rejected because inline SVGs inherit `currentColor` seamlessly across Light Mode (`#0F172A`), Dark Mode (`#F8FAFC`), and Sky Blue accent (`#38BDF8` with `#0F172A` ink) states with zero extra HTTP requests and `< 2 KB` markup per icon.

---

## Decision 5: Flexible Retro-RPG Layout Craft Across All 8 Routes

- **Decision**:
  - Apply 16-bit retro-RPG framing across all 8 routes while preserving 100% of functional controls, accessibility attributes (`aria-label`, `role`, `data-testid`), and data flows (`FR-001`, `FR-010`):
    1. **`TopNav` & `FilterBar` (`/` & `/search`)**:
       - Frame `TopNav` as the sticky RPG Command HUD bar with the pixel-art `BrandLogo` + `font-pixel` (`Silkscreen`) `SBL News` wordmark, crisp active tab buttons, `32x32` square Friends/Chat trigger, and `32x32` square avatar/initials `AccountBubble`.
       - Frame `FilterBar` on `/` and `AiSearchWorkspace` on `/search` as the **Quest-Board Filter & Search Deck** with an uppercase `font-pixel` HUD label strip (`QUEST BOARD • FILTER & SEARCH DECK`), `Daily | Weekly | Top` timeframe tabs, `Trained Lifters Only` toggle, live monospace study count readout, study-design filter pills, and the 75%/25% search input + Sky Blue `Search` (pixel magnifying glass) and `Ask AI` (Sky Blue pixel crystal/terminal icon) action buttons—with zero marketing hero banner.
    2. **Study Feed Cards (`StudyCard` on `/` & `/search`)**:
       - Frame each study card as a collectible **Character-Sheet / Evidence Scroll Card** with `2px solid` border, `4px 4px 0px` hard shadow, left-docked arcade `UpvoteButton`, monospace journal/year/date header, `Space Grotesk` title, 5 pastel evidence/inspection badges + monospace metric pills (`10w`, `n=48`, `Score 88`), `Inter` takeaway (`max-w-[70ch]`), and bottom action bar (`Discussion`, `PubMed / DOI`, `Share / Send`).
    3. **`"Ask AI"` Dialogue Box (`AiSynthesisPanel` & `AskAiOAuthPrompt` on `/` & `/search`)**:
       - Frame both `AiSynthesisPanel` and `AskAiOAuthPrompt` with the **Double-Frame RPG Dialog Inset Border** (`rpg-dialog-frame`), uppercase `font-pixel` dialogue header (`AI SYNTHESIS` / `QUEST GATE • OAUTH REQUIRED`), monospace quota badge (`4/5 LEFT TODAY` or `ADMIN • UNLIMITED`), structured subsections (`Consensus & Bottom Line`, `Evidence Breakdown`, `Limitations & Gaps`), inline `[S1]..[S5]` citation links, and supporting study cards.
    4. **`/guidelines` (Training Codex & Skill Tree)**:
       - Add an uppercase `font-pixel` HUD label (`TRAINING CODEX • SKILL TREE`) in the header, apply the **Double-Frame RPG Dialog Inset Border** (`rpg-dialog-frame`) to the 3-column Core Evidence Hubs in `HubGrid` (*Hypertrophy*, *Maximal Strength*, *Recovery & Nutrition*), and frame the 4-column `VariableDirectory` cards as skill-tree nodes with `GRADE A/B/C/D` badges, high-contrast `#38BDF8` prescription banners, anchor meta-analyses, and timestamped changelog footers.
    5. **`/study/[id]` & `/methodology` (Study Dossier & Rulebook)**:
       - Apply the **Double-Frame RPG Dialog Inset Border** (`rpg-dialog-frame`) to the primary `MetadataBreakdown` dossier card on `/study/[id]`, frame the 4 extracted parameters (*Population*, *Sample Size (n)*, *Duration*, *Primary Outcome*) as a bordered **RPG Stat Grid** (with clean fallback dashes/labels when unreported), style the Methodological Limitations section as a high-visibility `#FED7AA` (`bg-badge-abstract`) callout box with `#0F172A` ink (`FR-008`, `US3 Scenario 2`), keep `SecondaryCommentaryList` visually subordinate on `bg-canvas`, and style `DiscussionThread` with stepped `border-l-2 border-border` nested replies linking commenter avatars/names to `/profile/[id]`.
       - Frame `/methodology` as the static Neo-Brutalist RPG Rulebook with `font-pixel` pillar tags and `65ch–75ch` prose measure.
    6. **`/profile`, `/profile/[id]`, & `/admin/review` (Character Sheets & Moderation Queue)**:
       - Frame `/profile` and `/profile/[id]` as collectible **Lifter Character Sheets** with `font-pixel` HUD headers (`CHARACTER SHEET • PROFILE`), square `2px`-bordered avatar (`<= 256x256` with `JetBrains Mono` 2-letter initials fallback), role badge, deterministic `AURA` counter badge, Light/Dark theme toggle, and tabbed activity history.
       - Apply the **Double-Frame RPG Dialog Inset Border** (`rpg-dialog-frame`) to `ConsensusDriftCard` on `/admin/review` with side-by-side comparison of current vs. updated guideline fields while preserving RBAC protection (`requireAdminPage`).
- **Rationale**:
  - Satisfies every acceptance scenario in User Stories 1–4 and all Constitution Principle III route requirements without adding any routes or altering backend contracts.

---

## Decision 6: Daily AI Quota Default Alignment (`5` Free Syntheses/Day per Constitution v1.3.0)

- **Decision**:
  - Constitution v1.3.0 Principle I, III, and IV specify a default of `5` free uncached AI syntheses/day for standard members (`"4/5 LEFT"`, `"default 5 uncached syntheses/day for standard members; unlimited when public.is_admin()"`).
  - Ensure `AskAiOAuthPrompt` badge copy and quota display formatting support the configured daily limit seamlessly while keeping existing unit tests in `web/tests/ai-search.test.ts` passing.
- **Rationale**:
  - Keeps UI copy and quota badge examples aligned with Constitution v1.3.0 and `spec.md` (`4/5 LEFT` / `ADMIN • UNLIMITED`).
