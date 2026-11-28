# Phase 0 Research: Direct Search & Ask AI Flow and Structured AI Output

**Feature**: `007-search-improvement`
**Date**: 2026-11-28
**Status**: Complete (0 unresolved `NEEDS CLARIFICATION` items)

## Overview

All functional and architectural parameters for `007-search-improvement` are grounded in the repository's existing implementation (`specs/005-ai-literature-search`, `specs/006-relocate-search-ask-ai`, and `.specify/assessments/search-improvement/decision.md`). This document records the technical decisions, rationale, and alternatives considered across the three core pillars:

1. Direct dual-action Search and Ask AI bar on `/` (`FilterBar`)
2. Direct 1-click Search and Ask AI actions with persistent signed-in quota badge on `/search` (`AiSearchWorkspace`)
3. Deterministic structured section & inline markdown/citation parser (`AiSynthesisPanel` + `context-builder.ts`)

---

## Decision 1: Direct Dual-Action Search & Ask AI Row on `/` (`FilterBar`)

- **Decision**:
  - Replace the static `<Link href="/search">Search literature...</Link>` and secondary expandable input drawer in `web/src/components/feed/filter-bar.tsx` with an always-visible search form inside the bottom row of `FilterBar`.
  - Use the existing 4-column responsive grid (`grid-cols-1 gap-3 sm:grid-cols-4`) so the search input + **`Search`** submit button group spans 75% (`sm:col-span-3`) on desktop and the **`Ask AI`** button spans 25% (`sm:col-span-1`), stacking cleanly at full width with `min-h-[44px]` touch targets on `< 640px` viewports.
  - Introduce a pure helper `buildStandardSearchPath({ query, studyDesign, minDurationWeeks, trainedOnly })` alongside `buildAskAiReturnPath` in `web/src/components/search/ask-ai-oauth-prompt.ts` (or `filter-bar.tsx`) that serializes `/search` URLs without `ai=1`.
  - Pressing `Enter` inside the input or clicking **`Search`** submits the form and navigates to `buildStandardSearchPath({ query, studyDesign, trainedOnly })` (`0` AI quota consumed).
  - Clicking **`Ask AI`** (`type="button"`):
    - When unauthenticated (`!profile && !authLoading`): toggles open the inline `<AskAiOAuthPrompt query={query} studyDesign={studyDesign} trainedOnly={trainedOnly} />` below the row (`0` calls to `/api/ai-search`).
    - When authenticated (`profile`): if `query.trim().length < AI_QUERY_MIN_LENGTH` (`3`), focuses the search input ref and renders an inline Neo-Brutalist validation alert (`role="alert"`, `"Enter at least 3 characters to ask AI."`) without navigating; if `>= 3` chars, clears validation state and navigates directly to `buildAskAiReturnPath({ query, studyDesign, trainedOnly })` (`/search?ai=1&q=...`).
- **Rationale**:
  - Eliminates the deceptive `<Link href="/search">` box and the 2-step expandable input drawer while preserving `revalidate = 3600` ISR on `/` (`FilterBar` remains a client-side island reading auth state from `useAccountProfile()`).
  - Keeping **`Search`** as the form's default `type="submit"` action guarantees that pressing `Enter` always runs a 100% free public search and never unexpectedly burns daily AI quota.
- **Alternatives Considered**:
  - *Keep `<Link href="/search">` and auto-focus on `/search`*: Rejected because users click the faux input expecting to type immediately on `/` and perceive the page transition as a broken input.
  - *Single unified submit button that auto-triggers AI synthesis*: Rejected because it would either burn signed-in users' 10/day AI quota on routine keyword lookups or pop up login walls on public searches.

---

## Decision 2: Direct 1-Click `Search` & `Ask AI` Actions and Persistent Quota Badge on `/search` (`AiSearchWorkspace`)

- **Decision**:
  - Remove the two-step `"Ask AI"` mode toggle and separate `"Synthesize"` button from `web/src/components/search/ai-search-workspace.tsx`.
  - Render two distinct action buttons beside the `/search` query input:
    1. **`Search`** (`type="submit"`, primary Neo-Brutalist button): executes standard public hybrid search (`GET /search` or `router.push(buildStandardSearchPath(...))`), clears/hides any active `AiSynthesisPanel` and inline validation messages, and consumes `0` AI quota.
    2. **`Ask AI`** (`type="button"`, Sky Blue `#38BDF8` accent Neo-Brutalist button with `Sparkles` icon, disabled while `synthesis.isStreaming` is true): directly triggers AI evidence synthesis in 1 click.
  - When **`Ask AI`** is clicked on `/search`:
    - If unauthenticated (`!profile && !authLoading`): opens `<AskAiOAuthPrompt query={query} studyDesign={studyDesign} minDurationWeeks={minDurationWeeks} trainedOnly={trainedOnly} />` below the search card without calling `/api/ai-search`.
    - If authenticated (`profile`) and `query.trim().length < AI_QUERY_MIN_LENGTH` (`3`): focuses the `/search` query input and displays an inline validation message (`role="alert"`, `"Enter at least 3 characters to ask AI."`) without calling `/api/ai-search`.
    - If authenticated (`profile`) and `query.trim().length >= 3`: clears any validation message, synchronizes the browser URL and standard search results via `router.push(buildAskAiReturnPath({ query, studyDesign, minDurationWeeks, trainedOnly }), { scroll: false })` when the query or filters differ from the server-rendered props (or `router.replace` when already matching), and immediately invokes `runAiSynthesis(query)` in the same click handler.
  - Render the monospace daily quota badge (`data-testid="ai-quota-badge"`, showing `ADMIN • UNLIMITED` or `${quota.remainingToday}/${quota.dailyLimit} LEFT TODAY`) persistently in the `/search` action bar whenever `profile` is present (hydrated on initial SSR via `initialQuota` in `web/src/app/search/page.tsx`, with a client `GET /api/ai-search` fallback if `initialQuota` is null after client auth hydration).
- **Rationale**:
  - Eliminates the confusing toggle-then-click-Synthesize interaction on `/search` while giving signed-in users immediate visibility into their remaining daily quota before clicking **`Ask AI`**.
  - Synchronizing URL searchParams when the user edits the query or filters and clicks **`Ask AI`** ensures the standard study list below `AiSynthesisPanel` always matches the synthesized query and filter state.
- **Alternatives Considered**:
  - *Only display the quota badge after clicking `Ask AI`*: Rejected because users want to know how many daily syntheses they have left *before* spending one.
  - *Trigger `runAiSynthesis` without updating `/search` URL when query changes*: Rejected because the supporting standard search results below the synthesis panel would remain stale from the previous query.

---

## Decision 3: Structured Section Prompting & Zero-Dependency Markdown/Citation Parser (`context-builder.ts` & `AiSynthesisPanel`)

- **Decision**:
  - **System Prompt (`AI_SYNTHESIS_SYSTEM_PROMPT` in `web/src/lib/ai-search/context-builder.ts`)**:
    - Instruct the LLM to format every synthesis using three exact Markdown level-3 section headings in order:
      1. `### Consensus & Bottom Line`
      2. `### Evidence Breakdown`
      3. `### Limitations & Gaps`
    - Instruct the model to use concise `- ` bullet points inside sections, cite every claim inline with `[S1]`..`[S5]`, use short `**bold**` spans only for key labels/terms, and **never** wrap entire paragraphs, sentences, or headings in `** **` delimiters.
  - **Deterministic Structured Parser (`parseStructuredAiSynthesis` in `web/src/lib/ai-search/markdown-parser.ts` or exported from `ai-synthesis-panel.tsx`)**:
    - Build a pure, dependency-free parser that transforms raw `answerMarkdown` (including mid-stream partial SSE chunks and legacy unsectioned cached answers) into a `StructuredAiSynthesis` AST:
      - **Section recognition**: Split lines into sections whenever a line matches a Markdown heading (`^#{1,4}\s+(.+)$`) or a standalone known/bolded section header line (e.g., `^\*\*(Consensus & Bottom Line|Evidence Breakdown|Limitations & Gaps)[:\s]*\*\*$`), stripping any stray `**` or trailing colons from the heading title. Lines appearing before the first heading are grouped into an introductory section (`title: null`) so legacy cached prose without headings still renders cleanly.
      - **Block grouping inside each section**: Consecutive unordered list lines (`^[-*•]\s+(.+)$`) group into `{ type: "ul", items: string[] }`; consecutive ordered list lines (`^\d+[.)]\s+(.+)$`) group into `{ type: "ol", items: string[] }`; other non-empty lines group into `{ type: "p", text: string }` paragraphs separated by blank lines.
      - **Inline span tokenizer & `**` sanitizer (`parseInlineTokens`)**:
        1. First match balanced `**bold**` segments (`/\*\*([^*]+?)\*\*/g`) into `{ type: "strong", children: InlineToken[] }`.
        2. Strip **all** remaining unmatched, trailing, empty (`****`), or mid-stream partial `**` sequences (`text.replace(/\*{2,}/g, "")`) so literal `**` characters can **never** appear in the rendered output even while an SSE stream is halfway through a bold phrase.
        3. Within both plain text and `strong` spans, tokenize citation groups (`(\[(?:S[1-5])(?:\s*,\s*S[1-5])*\])`) into clickable `<Link href="/study/${study.id}">` badges when the label exists in `studyByLabel`.
- **Rationale**:
  - Combining deterministic prompt structure (`### Consensus & Bottom Line`, `### Evidence Breakdown`, `### Limitations & Gaps`) with a defensive parser guarantees scannable Neo-Brutalist section cards for new syntheses while also cleaning up any pre-existing cached syntheses or quirky free-tier model outputs.
  - A pure ~90-line TypeScript parser requires zero third-party Markdown libraries (honoring Constitution Principle I Stack & Dependency Discipline), runs synchronously during 60fps SSE streaming, and is 100% unit-testable in Vitest.
- **Alternatives Considered**:
  - *Install `react-markdown` / `remark-gfm`*: Rejected per Constitution Principle I (no extra UI/parsing libraries without formal amendment) and because standard Markdown parsers still render raw `**` during mid-stream partial tokens before the closing `**` arrives.
  - *Strip all `**` without converting matched pairs to `<strong>`*: Rejected because User Story 3 (`FR-010`) requires matched `**term**` spans to render with proper bold typography (`<strong>`) while stripping unmatched/stray `**` delimiters.
