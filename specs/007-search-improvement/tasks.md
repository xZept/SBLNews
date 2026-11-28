# Tasks: Direct Search & Ask AI Flow and Structured AI Output

**Input**: Design documents from `/specs/007-search-improvement/`
**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/search-and-synthesis-ui.md`, `quickstart.md`

**Tests**: Automated unit tests are included in `web/tests/filter-bar.test.ts` and `web/tests/ai-search.test.ts` per Constitution Principle VI and `quickstart.md`.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., `US1`, `US2`, `US3`)
- Include exact file paths in descriptions

---

## Phase 1: Setup & Shared URL Helpers

**Purpose**: Establish shared URL serialization helpers used across both `/` (`FilterBar`) and `/search` (`AiSearchWorkspace`) before modifying UI components.

- [X] T001 Export `buildStandardSearchPath` alongside `buildAskAiReturnPath` in `web/src/components/search/ask-ai-oauth-prompt.tsx` so standard searches serialize `q` (trimmed), `study_design` (omitting `"all"`), `min_duration_weeks` (integer >= 0), and `trained_only=true` without `ai=1`

---

## Phase 2: Foundational (Structured Synthesis Parser & Prompt)

**Purpose**: Core prompt and zero-dependency AST parser/sanitizer required by User Story 3 and verified independently in unit tests.

- [X] T002 [P] Update `AI_SYNTHESIS_SYSTEM_PROMPT` in `web/src/lib/ai-search/context-builder.ts` to mandate the three exact Markdown headings (`### Consensus & Bottom Line`, `### Evidence Breakdown`, `### Limitations & Gaps`), concise `- ` bullet points with inline `[S1]`..`[S5]` citations, short `**bold**` key terms only, and an explicit ban on wrapping entire paragraphs or headings in `** **` delimiters while preserving prompt-injection and gap-stating rules
- [X] T003 [P] Create `web/src/lib/ai-search/markdown-parser.ts` exporting `parseStructuredAiSynthesis(markdown: string): StructuredAiSynthesis` with `SynthesisSection`, `SynthesisBlock` (`paragraph`, `unordered-list`, `ordered-list`), and `InlineSpan` (`text`, `citation`, `strong`) types that strips 100% of unmatched, trailing, or mid-stream `**` sequences (`/\*{2,}/g`) and preserves `[S1]`..`[S5]` citation groups inside paragraphs, lists, and `strong` spans

---

## Phase 3: User Story 1 - Direct Dual-Action Search and Ask AI on the Homepage (Priority: P1) 🎯 MVP

**Goal**: Replace the faux `<Link href="/search">` redirect and secondary expandable input drawer in `FilterBar` with an inline `<Input type="search">` (`maxLength=300`) paired with direct **`Search`** (`type="submit"`) and **`Ask AI`** (`type="button"`) actions while preserving `/` ISR (`revalidate = 3600`).

**Independent Test**: On `/`, type a query in `FilterBar`, press `Enter` or click **`Search`** to verify direct navigation to `/search` with `q` and active feed filters (`study_design`, `trained_only`) and `0` AI quota used; click **`Ask AI`** while signed out to verify `<AskAiOAuthPrompt />` opens inline with `0` `/api/ai-search` calls; click **`Ask AI`** while signed in with `< 3` chars to verify input focus + inline validation `"Enter at least 3 characters to ask AI."`; click **`Ask AI`** while signed in with `>= 3` chars to verify direct navigation to `/search?ai=1&q=...`.

- [X] T004 [US1] Replace the static `<Link href="/search">` and expandable `askAiOpen` input drawer in `web/src/components/feed/filter-bar.tsx` with an inline `<form onSubmit={handleStandardSearchSubmit}>` containing `<Input id="feed-search-q" type="search" maxLength={AI_QUERY_MAX_LENGTH} placeholder="Search literature or ask a research question..." />`, a **`Search`** submit button (`sm:col-span-3` group), and an **`Ask AI`** button (`sm:col-span-1`), maintaining `min-h-[44px]` touch targets and Neo-Brutalist Sky Blue tokens
- [X] T005 [US1] Wire **`Ask AI`** click handling in `web/src/components/feed/filter-bar.tsx`: open `<AskAiOAuthPrompt />` inline (preserving `searchQuery`, `studyDesign`, `trainedOnly`) when unauthenticated; focus `#feed-search-q` and render inline `role="alert"` validation (`"Enter at least 3 characters to ask AI."`) when authenticated with `searchQuery.trim().length < 3`; and navigate to `buildAskAiReturnPath` (`/search?ai=1&q=...`) when authenticated with `>= 3` chars
- [X] T006 [US1] Update `web/tests/filter-bar.test.ts` to assert the inline `<input type="search">` replaces `<a href="/search">`, verify **`Search`** and **`Ask AI`** controls in the 75%/25% `sm:grid-cols-4` row, test `buildStandardSearchPath` vs `buildAskAiReturnPath`, and verify zero purple/violet/gradient utility classes

---

## Phase 4: User Story 2 - Direct 1-Click Search and Ask AI Actions on the Search Page (Priority: P1)

**Goal**: Remove the two-step `"Ask AI"` mode toggle → `"Synthesize"` button pattern on `/search`, provide direct **`Search`** (`type="submit"`) and **`Ask AI`** (`type="button"`) 1-click actions, and display the signed-in user's monospace daily quota badge persistently beside **`Ask AI`**.

**Independent Test**: On `/search` while signed in, verify `data-testid="ai-quota-badge"` (`10/10 LEFT TODAY` or `ADMIN • UNLIMITED`) is visible on initial load; click **`Ask AI`** with `>= 3` chars to verify URL/results synchronize and `/api/ai-search` synthesis starts in 1 click; click **`Ask AI`** with `< 3` chars to verify input focus + inline validation `"Enter at least 3 characters to ask AI."`; click **`Search`** or press `Enter` to verify standard public results update, any open synthesis panel clears, and `0` AI quota is consumed; click **`Ask AI`** while signed out to verify `<AskAiOAuthPrompt />` opens with `0` API calls.

- [X] T007 [US2] Refactor `web/src/components/search/ai-search-workspace.tsx` to remove the `aiActive` mode toggle and `"Synthesize"` button, rendering direct **`Search`** (`type="submit"`) and **`Ask AI`** (`type="button"`, disabled with `"Synthesizing..."` while `synthesis.isStreaming`) buttons alongside `#search-q` (`maxLength={AI_QUERY_MAX_LENGTH}`)
- [X] T008 [US2] Display `data-testid="ai-quota-badge"` persistently in `web/src/components/search/ai-search-workspace.tsx` whenever `profile && quota` is present (hydrating via `GET /api/ai-search` if `initialQuota` is null after client auth load), independent of whether **`Ask AI`** has been clicked
- [X] T009 [US2] Implement 1-click **`Ask AI`** and **`Search`** handlers in `web/src/components/search/ai-search-workspace.tsx`: **`Search`** / `Enter` clears `synthesisPanelOpen` and `validationError` and navigates via `buildStandardSearchPath`; **`Ask AI`** opens `<AskAiOAuthPrompt />` when signed out, focuses `#search-q` with inline `role="alert"` validation when `< 3` chars, or synchronizes URL via `router.push(buildAskAiReturnPath(...), { scroll: false })` and immediately invokes `runAiSynthesis(trimmed)` when `>= 3` chars

---

## Phase 5: User Story 3 - Structured Sectioned AI Synthesis with Zero Raw Markdown Artifacts (Priority: P1)

**Goal**: Render AI syntheses in `AiSynthesisPanel` using `parseStructuredAiSynthesis` so live streaming, completed, and legacy cached syntheses display labeled Neo-Brutalist subsections, semantic `<ul>`/`<ol>` lists, `<strong>` bold spans, clickable `[S1]..[S5]` `/study/[id]` links, and `0` literal `**` characters.

**Independent Test**: Render `AiSynthesisPanel` (and unit test `parseStructuredAiSynthesis`) with structured 3-section Markdown, bullet/numbered lists, matched `**bold**` spans, mid-stream unmatched `**` tokens, and legacy unsectioned cached prose; verify distinct subsection cards, `<ul>`/`<ol>`, `<strong>`, clickable `/study/[id]` citation badges, and `0` literal `**` characters in rendered output.

- [X] T010 [US3] Replace `renderProseWithCitations` in `web/src/components/search/ai-synthesis-panel.tsx` with `parseStructuredAiSynthesis(answerMarkdown)` from `web/src/lib/ai-search/markdown-parser.ts`, rendering each titled `SynthesisSection` inside a Neo-Brutalist subsection container (`rounded-md border-2 border-border bg-canvas p-3.5`) with `Space Grotesk` heading, semantic `<ul>`/`<ol>` lists, `<strong>` inline spans, clickable `[S1]..[S5]` `<Link href="/study/[id]">` badges, and clean fallback for untitled legacy cached prose
- [X] T011 [US3] Add unit tests in `web/tests/ai-search.test.ts` covering `AI_SYNTHESIS_SYSTEM_PROMPT` 3-section instructions, `parseStructuredAiSynthesis` (headings, `<ul>`/`<ol>`, `<strong>`, `[S1]..[S5]` citations, mid-stream unmatched `**` stripping, and legacy unsectioned fallback), `AiSynthesisPanel` static markup rendering with `0` literal `**`, and `AiSearchWorkspace` direct **`Search`** / **`Ask AI`** buttons + persistent `ai-quota-badge`

---

## Phase 6: Polish & Cross-Cutting Verification

**Purpose**: Verify full type safety, linting, unit tests, and Neo-Brutalist design compliance across `/web`.

- [X] T012 Run `npm run typecheck ; npm run lint ; npx vitest run` in `web/` and confirm all checks pass with zero errors or skipped tests

---

## Dependencies & Execution Order

- **Phase 1 (T001)** → Blocks **Phase 3 (T004–T006)** and **Phase 4 (T007–T009)**.
- **Phase 2 (T002, T003)** → Can run in parallel with Phase 1; blocks **Phase 5 (T010–T011)**.
- **Phase 3 (US1)**, **Phase 4 (US2)**, and **Phase 5 (US3)** → Can proceed independently once their Phase 1/2 prerequisites are complete.
- **Phase 6 (T012)** → Runs after all implementation and test tasks are complete.

## Parallel Example

```text
# Parallelizable foundational & setup work:
T001 (ask-ai-oauth-prompt.tsx) || T002 (context-builder.ts) || T003 (markdown-parser.ts)

# Once T001-T003 complete, all three user stories can run in parallel:
US1: T004 -> T005 -> T006 (FilterBar + filter-bar.test.ts)
US2: T007 -> T008 -> T009 (AiSearchWorkspace)
US3: T010 -> T011 (AiSynthesisPanel + ai-search.test.ts)
```

## Implementation Strategy

- **MVP First**: Complete Phase 1 (`T001`) + Phase 3 (`US1`: `T004–T006`) to immediately fix the highest-friction homepage faux search input.
- **Incremental Delivery**: Complete Phase 4 (`US2`: `T007–T009`) for 1-click `/search` actions + persistent quota visibility, then Phase 2 + Phase 5 (`US3`: `T002–T003`, `T010–T011`) for structured, `**`-free AI synthesis rendering, finishing with Phase 6 (`T012`) verification.

---

## Phase 7: Convergence

- [X] T013 CRITICAL: Replace non-token Tailwind classes (`text-red-600 dark:text-red-400`) on `#feed-search-validation` in `web/src/components/feed/filter-bar.tsx` with Neo-Brutalist Sky Blue validation alert tokens (`mt-2 rounded-sm border-2 border-border bg-badge-abstract px-3 py-1.5 font-mono text-xs font-bold text-accent-ink`) and assert token compliance in `web/tests/filter-bar.test.ts` per Constitution III, FR-004, FR-011 (contradicts)
- [X] T014 Add `AiSearchWorkspace` unit tests in `web/tests/ai-search.test.ts` verifying direct **`Search`** (`type="submit"`) and **`Ask AI`** (`type="button"`) buttons, removal of the two-step `"Synthesize"` toggle button, and persistent `data-testid="ai-quota-badge"` rendering (`10/10 LEFT TODAY` and `ADMIN • UNLIMITED`) per T011, FR-006, FR-008, US2/AC1 (partial)
- [X] T015 Tighten `STRONG_PAIR_REGEX` in `web/src/lib/ai-search/markdown-parser.ts` to `/\*\*(?!\s)([^*]+?)(?<!\s)\*\*/g` and guard `if (authLoading) return;` in `handleAskAiClick` in `web/src/components/search/ai-search-workspace.tsx` so an unmatched mid-stream `**` never pairs across whitespace with a later `**term**` and premature clicks during auth hydration do not open the logged-out OAuth prompt per FR-010, US3/AC3, plan: Decision 2 & Decision 3 (partial)

