# Feature Specification: 16-Bit Retro-RPG Neo-Brutalist UI Refactorization

**Feature Branch**: `008-ui-refactorization`  
**Created**: 2026-11-29  
**Status**: Draft  
**Input**: User description: "Refer to the constitution to specify the UI refactorization"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Cohesive 16-Bit Retro-RPG Design System & Theme Parity (Priority: P1)

Visitors and returning members experience a unified, high-contrast **16-Bit Retro-RPG Neo-Brutalist Sky Blue** visual identity across the entire application, starting in Light Mode by default with an opt-in Dark Mode toggle. Every card, badge, button, input, and tab uses crisp square or tight micro-rounded corners, bold solid borders, zero-blur hard offset shadows, snappy arcade press feedback, and crisp-edge pixel icons without any purple hues, gradients, glassmorphism, or decorative hero bloat.

**Why this priority**: The visual foundation—color tokens, typography hierarchy, border/shadow geometry, press states, and pixel iconography—governs every screen in the application. Establishing it first ensures all route refactors share one consistent, compliant visual language.

**Independent Test**: Can be fully tested by inspecting the core interface primitives (cards, badges, buttons, inputs, tabs, pixel icons) in both default Light Mode and opt-in Dark Mode across desktop and mobile viewports, verifying exact color tokens, corner radius ceilings, shadow offsets, font pairings, and absence of prohibited visual patterns.

**Acceptance Scenarios**:

1. **Given** a new or unauthenticated visitor opens any page, **When** the page loads, **Then** Light Mode is active by default with `#F8FAFC` page canvas, `#FFFFFF` card surfaces, `#0F172A` primary ink and structural borders, `#475569` muted text, and `#38BDF8` Sky Blue primary accents paired with `#0F172A` text.
2. **Given** a signed-in user switches their theme preference to Dark Mode, **When** any page renders, **Then** Dark Mode applies `#0B1120` page canvas, `#1E293B` card surfaces, `#F8FAFC` primary ink, `#94A3B8` muted text, `#38BDF8` Sky Blue accents paired with `#0F172A` ink, high-contrast `#38BDF8` or `#E2E8F0` borders, and `#020617` zero-blur offset shadows.
3. **Given** any interactive button, upvote trigger, tab, or filter pill across the site, **When** the user presses it, **Then** it displays a snappy 75ms arcade press transition where the element shifts down-right by `2px` and its offset shadow collapses cleanly.
4. **Given** any page or component in either theme, **When** visually audited, **Then** there are zero purple, violet, or indigo hues, zero color gradients or mesh backgrounds, zero backdrop blur effects, zero blurry shadows, zero corners exceeding `6px` radius, and all UI icons are crisp-edge `16x16` or `24x24` pixel graphics under `2 KB` each.

---

### User Story 2 - Retro-RPG Quest-Board Feed, Search Deck & Double-Framed "Ask AI" Dialogue (Priority: P1)

Readers browsing the main research feed (`/`) and the hybrid search workspace (`/search`) interact with a retro-RPG inventory/quest-board command bar, collectible character-sheet study cards, and a double-framed RPG dialogue box for `"Ask AI"` literature synthesis. All existing filtering, sorting, searching, upvoting, and AI synthesis workflows remain immediately accessible without any tall marketing hero banner pushing content below the fold.

**Why this priority**: The main feed (`/`) and search page (`/search`) are the primary entry points for all users. Restyling them while preserving 100% of their functional controls and fast public loading delivers immediate core value.

**Independent Test**: Can be fully tested by loading `/` and `/search` as both a logged-out visitor and an authenticated member, exercising timeframe tabs, `Trained Lifters Only` toggle, study-design pills, duration/status filters, keyword/semantic search, upvoting, and `"Ask AI"` (OAuth prompt when logged out; citation-grounded synthesis with quota badge when logged in).

**Acceptance Scenarios**:

1. **Given** a visitor opens `/` or `/search`, **When** the sticky command bar and filter/search deck render, **Then** the `SBL NEWS` pixel display wordmark, `Daily | Weekly | Top` timeframe tabs, `Trained Lifters Only` toggle, live study count readout, study-design filter pills (`All Designs`, `Meta-Analysis`, `Systematic Review`, `RCT`, `Controlled Trial`, `Cohort / Obs.`), search input (`"Search literature or ask a research question..."`) with Sky Blue `Search` and `Ask AI` pixel-icon buttons, and `32x32` square avatar/initials account menu are all visible and functional without a marketing hero banner.
2. **Given** a visitor views study feed cards on `/`, **When** cards are displayed, **Then** each card is framed as a collectible character sheet with `2px` borders and `4px` hard offset shadow, preserving the upvote trigger and count, journal/year, monospace metrics, `Space Grotesk` title, semantic evidence badges plus `Full-Text`/`Abstract-Only` transparency badge, 2-sentence `Inter` takeaway (`65ch–75ch` max line width), `Discussion` count button, and `PubMed/DOI` link.
3. **Given** an unauthenticated visitor triggers `"Ask AI"` on `/` or `/search`, **When** the double-framed RPG dialogue panel opens, **Then** it presents the inline Google and GitHub sign-in prompt styled in matching Neo-Brutalist RPG framing with zero purple or gradient styling.
4. **Given** an authenticated user submits an `"Ask AI"` question on `/` or `/search`, **When** the synthesis response renders inside the double-framed RPG dialogue panel, **Then** it displays the monospace quota badge (`4/5 LEFT` or `ADMIN • UNLIMITED`), cache/grounding status, inline `[1]` study citations in `Inter` prose, and supporting study cards with their evidence and inspection-depth badges.

---

### User Story 3 - Training Codex & Skill Tree (`/guidelines`) and Study / Methodology Dossiers (`/study/[id]`, `/methodology`) (Priority: P2)

Users consulting practical lifting guidelines (`/guidelines`), deep-diving into individual study records (`/study/[id]`), or reviewing scientific scoring transparency (`/methodology`) experience a structured Training Codex & Skill Tree and RPG stat-sheet dossiers that make evidence grades, limitations, and nested discussions effortless to scan.

**Why this priority**: After feed discovery and search, `/guidelines` and `/study/[id]` represent the core scientific reading and community discussion destinations.

**Independent Test**: Can be tested independently by navigating to `/guidelines`, `/study/[id]`, and `/methodology` in both Light and Dark modes and verifying all hubs, variable cards, stat grids, limitations callouts, secondary video shelves, and nested comment threads with profile links.

**Acceptance Scenarios**:

1. **Given** a visitor opens `/guidelines`, **When** the Training Codex renders, **Then** it displays the pixel-accented page banner, the 3-column Core Hubs grid (*Hypertrophy*, *Maximal Strength*, *Recovery & Nutrition*) with double-frame RPG dialog borders, the 4-column variable directory (*Weekly Volume*, *RIR / Failure*, *Frequency*, *Rest Intervals*, *Protein Intake*) with `GRADE A/B/C` evidence badges and anchor meta-analyses, and the last-updated changelog.
2. **Given** a visitor opens `/study/[id]`, **When** the study dossier renders, **Then** it presents a double-framed RPG header, a bordered RPG stat grid for extracted study parameters, the `Full-Text` vs. `Abstract-Only` inspection badge, a `#FED7AA` limitations callout, the primary `PubMed/DOI` link, a visually subordinate secondary creator video shelf, and a stepped nested discussion thread where commenter avatars and names link to `/profile/[id]`.
3. **Given** a visitor opens `/methodology`, **When** the page renders, **Then** all ingestion source rules, deterministic scoring rubrics, inspection-depth rules, and human-in-the-loop governance documentation are framed in matching Neo-Brutalist RPG containers with `65ch–75ch` readable prose measure.

---

### User Story 4 - Collectible Character-Sheet Profiles (`/profile`, `/profile/[id]`) & Admin Moderation Queue (`/admin/review`) (Priority: P3)

Signed-in members managing their account (`/profile`), visitors viewing a commenter's public profile (`/profile/[id]`), and administrators reviewing ingested studies and `Consensus Drift` alerts (`/admin/review`) interact with collectible character-sheet profiles and double-framed moderation queues that preserve all existing security, upload, and approval workflows.

**Why this priority**: Profile customization, theme switching, public commenter attribution, and admin moderation complete the 8-route application while keeping every authenticated and RBAC-protected flow intact.

**Independent Test**: Can be tested independently by signing in to edit `/profile` (including avatar upload/initials fallback, role/bio, and Light/Dark theme toggle), viewing a public `/profile/[id]` page (verifying private fields are absent), and accessing `/admin/review` as an admin to inspect study approvals and double-framed `Consensus Drift` alerts.

**Acceptance Scenarios**:

1. **Given** an authenticated user visits `/profile`, **When** the character-sheet profile renders, **Then** they can manage their square avatar (`<= 256x256` with 2-letter `JetBrains Mono` initials fallback), display name, training/professional role tag, short bio/credentials, `Light`/`Dark` theme toggle, and switch between upvoted study and comment activity tabs.
2. **Given** any visitor clicks a commenter's name or avatar in a discussion to open `/profile/[id]`, **When** the public profile renders, **Then** it displays the read-only character-sheet card with public avatar/initials, display name, role badge, bio/credentials, and public comment history without exposing private account metadata.
3. **Given** an administrator opens `/admin/review`, **When** the moderation queue renders, **Then** pending study approvals and side-by-side `Consensus Drift` alerts (styled with double-frame RPG dialog borders) preserve all existing verification and approval actions while non-admins remain blocked.

---

### Edge Cases

- What happens when a user's browser has a system-level Dark Mode preference on first visit? The application MUST still default to Light Mode for new and unauthenticated visitors; Dark Mode is strictly opt-in via the account menu or `/profile` settings.
- What happens when a user has no uploaded avatar image on `/`, `/study/[id]`, `/profile`, or `/profile/[id]`? A `32x32` (or profile-sized) square badge renders their 2-letter initials in `JetBrains Mono` with a `2px` border and `2px` hard offset shadow.
- What happens when a study is `Abstract-Only` or has missing optional metadata fields? The `#FED7AA` `Abstract-Only` warning badge and limitations callout remain clearly visible, and stat grid cells gracefully display fallback dashes without breaking border alignment.
- What happens on narrow mobile viewports (`320px–640px`) with `4px` hard offset shadows and multi-column RPG grids? Multi-column grids (3-column Core Hubs, 4-column variable directory, side-by-side `Consensus Drift` comparison, and RPG stat grids) stack cleanly into single-column layouts with sufficient horizontal margin so offset shadows never cause horizontal page overflow.
- What happens if a pixel display font fails to load or renders at small sizes? Pixel display typography is restricted strictly to the `SBL NEWS` wordmark, page/hub banners, and uppercase HUD labels, never affecting study titles (`Space Grotesk`), body prose (`Inter`), or metrics (`JetBrains Mono`).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The application MUST enforce the **16-Bit Retro-RPG Neo-Brutalist Sky Blue** visual system across all 8 user-facing routes (`/`, `/study/[id]`, `/guidelines`, `/search`, `/methodology`, `/admin/review`, `/profile`, `/profile/[id]`) without adding any new user-facing routes or internal endpoints.
- **FR-002**: Light Mode MUST be the default theme for all new and unauthenticated visitors (`#F8FAFC` canvas, `#FFFFFF` surface, `#0F172A` ink/borders, `#475569` muted text, `#38BDF8` Sky Blue accent with `#0F172A` ink). Opt-in Dark Mode MUST be selectable via the top-right account menu and `/profile` settings (`#0B1120` canvas, `#1E293B` surface, `#F8FAFC` ink, `#94A3B8` muted text, `#38BDF8` accent with `#0F172A` ink, `#38BDF8` or `#E2E8F0` borders, `#020617` shadow).
- **FR-003**: All UI elements MUST strictly exclude purple, violet, and indigo hues, color gradients, mesh backgrounds, backdrop blur (`glassmorphism`), blurry drop-shadows, tall hero banners, and heavy GIFs.
- **FR-004**: Interface primitives (cards, badges, buttons, inputs, tabs) MUST default to sharp `0px` or tight `2px–4px` corners (never exceeding `6px`), framed by `2px` solid structural borders and zero-blur hard offset shadows (`4px 4px 0px` on cards; `2px 2px 0px` on controls, avatars, and pills).
- **FR-005**: High-priority containers—specifically the `"Ask AI"` synthesis panel, `/study/[id]` header, `/guidelines` Core Hubs, and `/admin/review` `Consensus Drift` alerts—MUST render with double-frame RPG dialog inset borders.
- **FR-006**: Interactive buttons, upvote triggers, tabs, and filter pills MUST provide a `75ms` arcade press state that translates the control `2px` along X and Y while collapsing its offset shadow.
- **FR-007**: Typography MUST enforce four distinct roles: pixel display (`Silkscreen` or `Thaleah Fat`) strictly for the `SBL NEWS` wordmark, page/hub banners, and uppercase HUD labels; `Space Grotesk` (`700`/`800`) for study titles and card headings; `Inter` (`65ch–75ch` max measure) for body copy, takeaways, and AI synthesis prose; and `JetBrains Mono` for badges, study metrics, upvote counts, avatar initials, timestamps, and quota counters.
- **FR-008**: All semantic evidence and inspection-depth badges MUST use `1.5px solid #0F172A` borders, `#0F172A` ink, `JetBrains Mono`, and the five normative solid pastel fills across both themes: Meta-Analysis/Systematic Review (`#A7F3D0`), >=8-week Human RCT (`#BAE6FD`), Trained Population (`#FDE68A`), Open-Access Full Text (`#BBF7D0`), and Abstract-Only Warning (`#FED7AA`).
- **FR-009**: UI icons MUST be crisp-edge `16x16` or `24x24` inline pixel graphics under `2 KB` each (including a pixel magnifying glass for `Search` and a `#38BDF8` Sky Blue pixel terminal/crystal/book icon for `Ask AI`), replacing any external icon or animation library dependencies.
- **FR-010**: The refactor MUST preserve 100% of existing functional controls, data flows, static/ISR public rendering on `/` and `/guidelines`, client-side island execution for `"Ask AI"`, OAuth prompts, daily AI quota badges, public profile privacy boundaries, and RBAC moderation protections.

### Key Entities *(include if feature involves data)*

- **Theme Preference**: User-selected visual mode (`Light` default or `Dark` opt-in), persisted for authenticated users via `/profile` and account menu controls.
- **Design Token Set**: Normative palette colors, border widths, hard shadow offsets, corner radius limits, and typographic role assignments governing all 8 routes.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of the 8 approved user-facing routes render with zero purple/violet/indigo colors, zero gradients, zero backdrop blurs, zero blurry shadows, and zero corners exceeding `6px` across both Light and Dark themes.
- **SC-002**: 100% of existing user journeys—feed filtering, keyword/semantic search, upvoting, `"Ask AI"` synthesis/OAuth gating, guideline browsing, study detail & nested commenting, profile editing, and admin moderation—pass end-to-end functional verification with zero removed controls.
- **SC-003**: Public routes (`/` and `/guidelines`) maintain fast static/ISR delivery without blocking on per-request server rendering, and all UI icons remain under `2 KB` per inline pixel graphic with zero external icon/animation library bloat.
- **SC-004**: 100% of type checks, linting, and existing automated unit test suites pass after the UI refactorization is complete.

## Assumptions

- Existing backend routes, database schemas, authentication flows, and AI synthesis logic remain unchanged; this refactorization is strictly scoped to visual presentation, primitive styling, iconography, typography, and retro-RPG layout craft across `/web`.
- Layout adjustments (such as grouping controls into a retro-RPG inventory/quest-board HUD or framing study cards as character sheets) are permitted to harmonize with the 16-bit aesthetic as long as every existing control and UX flow remains present and accessible.
- All 5 semantic badge pastel fills retain `#0F172A` ink and `1.5px solid #0F172A` borders in both Light and Dark themes to guarantee high contrast and instant visual recognition.
