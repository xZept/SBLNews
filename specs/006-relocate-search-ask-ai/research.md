# Research: Relocate Search Trigger and Ask AI Bar

**Feature**: `006-relocate-search-ask-ai`  
**Date**: 2026-11-28

## Decisions & Findings

### 1. Layout Strategy for Exact 75% / 25% Split with Gap & Mobile Stacking
- **Decision**: Use a CSS Grid container (`grid grid-cols-1 gap-3 sm:grid-cols-4`) inside `FilterBar` (`web/src/components/feed/filter-bar.tsx`), assigning `sm:col-span-3` (75%) to the Search trigger and `sm:col-span-1` (25%) to the Ask AI button.
- **Rationale**: In Flexbox, `w-3/4` + `w-1/4` + `gap-3` overflows 100% width unless `calc()` is used. CSS Grid's 4-column track (`sm:grid-cols-4`) automatically distributes `gap-3` between columns while maintaining an exact 3:1 (75%/25%) proportion on `sm:` (>= 640px) and wider viewports, and stacks cleanly to 100% width (`grid-cols-1`) on mobile (< 640px).
- **Alternatives considered**: Flexbox with `basis-3/4` / `basis-1/4` and negative margins or `calc(75% - 0.375rem)`; rejected as more brittle across responsive breakpoints.

### 2. Neo-Brutalist Sky Blue Token & Shadow Alignment
- **Decision**: Style both relocated buttons using CSS theme tokens from `web/src/app/globals.css`:
  - Borders & typography: `border-2 border-border font-mono font-bold` (`#0F172A` in light theme, `#E2E8F0` in dark theme; `JetBrains Mono`).
  - Elevation: `shadow-card` (`4px 4px 0px #0F172A` in light theme, `4px 4px 0px #020617` in dark theme) with tactile active press (`active:translate-x-[2px] active:translate-y-[2px] active:shadow-none`).
  - Surfaces: Search trigger uses `bg-surface text-ink hover:bg-canvas`; Ask AI button uses `bg-surface text-ink hover:bg-canvas` when inactive and `bg-accent text-accent-ink` (`#38BDF8` Sky Blue with `#0F172A` ink) when `askAiOpen` is `true` (or `bg-accent text-accent-ink` as primary accent CTA—keeping `aria-pressed={askAiOpen}` clearly distinguishable).
  - Touch target: `min-h-[44px]` ensures >= 44px touch-target height on mobile viewports (SC-003).
- **Rationale**: Directly satisfies FR-007, SC-003, SC-005, and Constitution Principle III across both Default Light Theme and Opt-In Dark Theme with zero purple/violet hues or gradients.
- **Alternatives considered**: Reusing `Button` `size="default"` (`h-9`, 36px) with `shadow-control` (`2px 2px 0px`); rejected because the spec explicitly calls for `4px 4px 0px` offset shadows and >= 44px mobile touch targets.

### 3. Top Navigation Bar Cleanup
- **Decision**: Remove `{ href: "/search", label: "Search" }` from `NAV_LINKS` in `web/src/components/layout/top-nav.tsx`, along with the unused `Search` icon import and conditional icon check.
- **Rationale**: `TopNav` renders both desktop and mobile navigation strips from the single `NAV_LINKS` array, so removing the entry updates both viewports consistently and leaves `Feed`, `Guidelines`, and `Methodology`.
- **Alternatives considered**: Hiding `/search` with CSS `hidden` classes; rejected because FR-001 requires removing the link from the navigation bar DOM.

### 4. Preserving ISR & Existing Search / Ask AI Behavior
- **Decision**: Keep `FilterBar` as a `"use client"` island inside `FeedClient` (`web/src/components/feed/feed-client.tsx`). The Search trigger navigates to `/search` via `next/link` (`<Link href="/search">`), and the Ask AI button toggles `askAiOpen` to render `AskAiOAuthPrompt` (when logged out) or the inline query form that calls `buildAskAiReturnPath` and `router.push` (when logged in).
- **Rationale**: Preserves static/ISR rendering on `/` (Constitution Principle I) and guarantees zero regression in Search navigation, OAuth return-URL preservation, and active feed filter forwarding (`studyDesign`, `trainedOnly`).
- **Alternatives considered**: Converting the Search trigger into an inline search input on `/`; rejected because the spec specifies a Search trigger button preserving existing navigation to `/search`.
