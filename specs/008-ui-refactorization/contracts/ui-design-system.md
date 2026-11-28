# UI & Design System Contracts: 16-Bit Retro-RPG Neo-Brutalist Sky Blue

**Feature**: `008-ui-refactorization`  
**Date**: 2026-11-29  

## 1. Global Visual & Anti-Vibecoding Guardrails (`FR-001`–`FR-009`, `SC-001`)

Across all source files in `web/src/app/` and `web/src/components/`:

1. **Zero Prohibited Styles**:
   - **No Purple/Violet/Indigo**: `0` occurrences of `purple`, `violet`, `indigo`, or hex codes in the purple spectrum (`#6366F1`, `#8B5CF6`, `#A855F7`, `#7C3AED`, etc.).
   - **No Gradients or Mesh Backgrounds**: `0` occurrences of `bg-gradient-`, `linear-gradient`, `radial-gradient`, or `conic-gradient`.
   - **No Glassmorphism or Blurry Shadows**: `0` occurrences of `backdrop-blur`, `blur-`, `shadow-sm`, `shadow-md`, `shadow-lg`, `shadow-xl`, `shadow-2xl`, or `drop-shadow`.
   - **No Oversized Radii**: `0` occurrences of `rounded-lg`, `rounded-xl`, `rounded-2xl`, `rounded-3xl`, or `rounded-full` on cards, badges, buttons, inputs, tabs, or avatars (max corner radius is `6px` / `rounded-md`; primitives default to `rounded-none` or `rounded-sm`).
2. **Arcade Press Physics (`FR-006`)**:
   - All interactive buttons (`Button`), upvote triggers (`UpvoteButton`), tabs (`TabsTrigger`), and filter pills (`FilterBar`) MUST include `duration-75 active:translate-x-[2px] active:translate-y-[2px]` (and `active:shadow-none` on shadowed controls).
3. **Double-Frame RPG Dialog Inset Border (`FR-005`)**:
   - The `.rpg-dialog-frame` utility (or `<Card variant="dialog">`) MUST apply `box-shadow: inset 0 0 0 2px var(--color-surface), inset 0 0 0 4px var(--color-border), 4px 4px 0px var(--color-shadow)` to:
     - `AiSynthesisPanel` (`web/src/components/search/ai-synthesis-panel.tsx`)
     - `AskAiOAuthPrompt` (`web/src/components/search/ask-ai-oauth-prompt.tsx`)
     - `MetadataBreakdown` (`web/src/components/study/metadata-breakdown.tsx`)
     - `HubGrid` Core Hub cards (`web/src/components/guidelines/hub-grid.tsx`)
     - `ConsensusDriftCard` (`web/src/components/admin/consensus-drift-card.tsx`)
4. **Crisp Pixel SVG Iconography (`FR-009`, `SC-003`)**:
   - All UI icons MUST be imported from `@/components/ui/pixel-icons` and render inline `<svg>` elements with `shape-rendering="crispEdges"` and serialized byte length `< 2,048` bytes (`< 2 KB`).
   - Specifically:
     - **`Search` Action Button**: Renders the `16x16` pixel magnifying glass (`Search` / `PixelSearchIcon` with `shape-rendering="crispEdges"`).
     - **`Ask AI` Action Button & Synthesis Header**: Renders the `16x16` pixel crystal/terminal/book icon (`Sparkles` / `PixelAskAiIcon` with `shape-rendering="crispEdges"`).

---

## 2. Route-by-Route Layout & Preservation Contracts (`FR-001`, `FR-010`, `SC-002`)

| Route | 16-Bit Retro-RPG Framing | Mandatory Functional Elements Preserved |
|-------|--------------------------|-----------------------------------------|
| **Global Shell (`layout.tsx`, `TopNav`, `AccountBubble`, `FriendsChatDrawer`)** | Sticky RPG Command Bar with `BrandLogo` (`[image-rendering:pixelated]`), `font-pixel` (`Silkscreen`) `SBL News` wordmark, crisp nav links (`Feed`, `Guidelines`, `Methodology` — omitting `/search`), `32x32` square Friends/Chat trigger, and `32x32` square avatar/initials `AccountBubble` with `Light`/`Dark` theme switch | Pre-paint `localStorage.getItem("sbl_theme") === "dark"` script (Light Mode default); OAuth Google/GitHub sign-in buttons when logged out; admin link gated behind `isAdmin`; Friends & Chat drawer |
| **`/` (`app/page.tsx`, `FeedClient`, `FilterBar`, `StudyCard`, `TopUsersRail`)** | Quest-Board Filter & Search Deck (`FilterBar`) + Collectible Character-Sheet Study Cards (`StudyCard`) + Top Contributors Aura Rail (`TopUsersRail`), with **no** tall marketing hero banner | `revalidate = 3600` ISR; `Daily \| Weekly \| Top` tabs; `Trained Lifters Only` toggle; live study count (`{n} studies`); 6 study-design pills; 75%/25% split search input (`#feed-search-q`, `min-h-[44px]`) + Sky Blue `Search` & `Ask AI` buttons; inline `<AskAiOAuthPrompt />`; `UpvoteButton`, badges, `Inter` takeaway (`max-w-[70ch]`), `Discussion ({n})`, `PubMed / DOI`, `StudyShareMenu` |
| **`/search` (`app/search/page.tsx`, `AiSearchWorkspace`, `AiSynthesisPanel`, `AskAiOAuthPrompt`)** | Hybrid Literature Search Deck + Double-Framed RPG Dialogue Box for `"Ask AI"` synthesis and OAuth prompt | Public keyword + `pgvector` search; deterministic filters (`study_design`, `min_duration_weeks`, `trained_only`); 1-click `Search` & `Ask AI` buttons; persistent `data-testid="ai-quota-badge"` (`{remaining}/{limit} LEFT TODAY` or `ADMIN • UNLIMITED`); structured 3-section synthesis (`Consensus & Bottom Line`, `Evidence Breakdown`, `Limitations & Gaps`) with `[S1]..[S5]` links and supporting study cards |
| **`/guidelines` (`app/guidelines/page.tsx`, `HubGrid`, `VariableDirectory`)** | Training Codex & Skill Tree with `font-pixel` HUD badge, 3-column Double-Framed Core Evidence Hubs (`HubGrid`), and 4-column Indexed Variable Skill Nodes (`VariableDirectory`) | `revalidate = 3600` ISR; 3 Core Hubs (*Hypertrophy*, *Maximal Strength*, *Recovery & Nutrition*); 4-column variable directory with `Grade A/B/C/D` pastel badges, `#38BDF8` practical prescription banner, anchor meta-analysis links, and chronological changelog |
| **`/study/[id]` (`app/study/[id]/page.tsx`, `MetadataBreakdown`, `SecondaryCommentaryList`, `DiscussionThread`)** | Double-Framed RPG Study Dossier (`MetadataBreakdown`) with 4-cell bordered **RPG Stat Grid**, `#FED7AA` Methodological Limitations callout box, subordinate `bg-canvas` Secondary Creator Commentary shelf, and stepped nested Discussion Thread | `generateMetadata` OpenGraph/Twitter tags; `Full-Text` (`#BBF7D0`) vs. `Abstract-Only` (`#FED7AA`) transparency badge & banner; fallback dashes/labels for unreported stats; primary `PubMed / DOI` CTA + `StudyShareMenu`; nested comments with clickable avatar/name links to `/profile/[id]`, `Helpful` (+2 Aura) endorsements, reply/edit/delete |
| **`/methodology` (`app/methodology/page.tsx`)** | Static Neo-Brutalist RPG Transparency Rulebook with `font-pixel` Pillar badges and bordered scoring/Aura tables | `dynamic = "force-static"`; `BrandLogo size="lg"`; Pillars 1–5 documentation (`65ch–75ch` measure) and deterministic scoring / Aura rubric tables |
| **`/profile` (`app/profile/page.tsx`, `AvatarUploadControl`, `ProfileSettingsForm`, `ProfileActivityLists`, `ProfileSignInGate`)** | Collectible Lifter Character-Sheet Profile & Settings with `font-pixel` HUD header, square `2px`-bordered avatar, and tabbed activity logs | `ProfileSignInGate` when logged out; `<= 256x256` (`<= 200 KB`) client-side avatar upload + 2-letter `JetBrains Mono` initials fallback; display name, role tag, 160-char bio, `Light`/`Dark` theme toggle, activity visibility toggles, and `Upvoted Studies` / `Recently Viewed` / `Comment History` tabs |
| **`/profile/[id]` (`app/profile/[id]/page.tsx`, `not-found.tsx`)** | Public Read-Only Character-Sheet Profile Card with `UserAvatar`, role badge, `AuraBadge`, friend actions, and public activity tabs | Zero exposure of private fields (`email`, `theme_preference`, `role`); `ProfileFriendActions`; public comment history and visibility-gated upvotes/recent views |
| **`/admin/review` (`app/admin/review/page.tsx`, `ConsensusDriftCard`, `PendingStudiesTable`, `SecondaryCommentaryForm`)** | RBAC-Protected Guild Moderation & Double-Framed `Consensus Drift` Alert Queue | Server-side `requireAdminPage()` guard; double-framed `ConsensusDriftCard` with trigger study summary, grade/prescription/summary editor, and required reviewer changelog note; `PendingStudiesTable` approve/reject actions; `SecondaryCommentaryForm` |
