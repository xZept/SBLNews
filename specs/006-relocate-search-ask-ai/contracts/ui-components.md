# UI Component Contracts: Relocate Search Trigger and Ask AI Bar

**Feature**: `006-relocate-search-ask-ai`  
**Date**: 2026-11-28

## 1. `TopNav` Navigation Contract (`web/src/components/layout/top-nav.tsx`)

- **Desktop & Mobile Nav Links**:
  - Must render links in order: `Feed` (`/`), `Guidelines` (`/guidelines`), `Methodology` (`/methodology`).
  - Must NOT render a `/search` link in either desktop `<nav aria-label="Primary navigation">` or mobile `<nav aria-label="Mobile navigation">`.
- **Unchanged**: Brand wordmark link (`/`), Friends & Chat drawer trigger, `AccountBubble`, and OAuth sign-in buttons.

## 2. `FilterBar` Action Row Contract (`web/src/components/feed/filter-bar.tsx`)

- **Inline Filter Controls Row**:
  - Contains `Daily | Weekly | Top` tabs, `Trained Lifters Only` toggle button, and `{totalCount} study/studies` count.
  - Must NOT contain the `Ask AI` button.
- **Dedicated Search & Ask AI Split Row**:
  - Rendered as a full-width row inside the `FilterBar` `<section aria-label="Feed filters">` container.
  - Responsive grid: `grid grid-cols-1 gap-3 sm:grid-cols-4`.
  - **Left Control (75% / `sm:col-span-3`) — Search Trigger**:
    - Navigates to `/search` (`<Link href="/search">`).
    - Displays `Search` (magnifying glass) icon from `lucide-react` and clear label (e.g., `"Search literature..."` or `"Search"`).
    - Styling: `min-h-[44px]`, `rounded-md`, `border-2 border-border`, `bg-surface text-ink`, `shadow-card`, `font-mono text-xs font-bold`, active press `active:translate-x-[2px] active:translate-y-[2px] active:shadow-none`.
  - **Right Control (25% / `sm:col-span-1`) — Ask AI Button**:
    - `<button type="button" aria-pressed={askAiOpen}>` toggling `askAiOpen`.
    - Displays `Sparkles` icon from `lucide-react` and `"Ask AI"` label.
    - Styling: `min-h-[44px]`, `rounded-md`, `border-2 border-border`, `shadow-card`, `font-mono text-xs font-bold`, `bg-accent text-accent-ink` when `askAiOpen` is true and `bg-surface text-ink` (or `bg-accent` / `bg-surface`) when false, active press `active:translate-x-[2px] active:translate-y-[2px] active:shadow-none`.
- **Inline Ask AI Panel** (unchanged):
  - When `askAiOpen && !authLoading`: renders `AskAiOAuthPrompt` (unauthenticated) or the Ask AI query `<form>` (authenticated) with active `studyDesign` and `trainedOnly` preserved via `buildAskAiReturnPath`.
