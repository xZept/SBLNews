# UI & Prompt Contracts: Direct Search & Ask AI Flow and Structured AI Output

**Feature**: `007-search-improvement`
**Date**: 2026-11-28

## 1. URL & Navigation Contract (`buildStandardSearchPath` & `buildAskAiReturnPath`)

Defined in `web/src/components/search/ask-ai-oauth-prompt.tsx`:

| Function | Output Path Format | `ai=1` Included? | AI Quota Impact |
|----------|--------------------|------------------|-----------------|
| `buildStandardSearchPath({ query, studyDesign, minDurationWeeks, trainedOnly })` | `/search` or `/search?q=...&study_design=...&min_duration_weeks=...&trained_only=true` | **No** | `0` (100% public standard hybrid search) |
| `buildAskAiReturnPath({ query, studyDesign, minDurationWeeks, trainedOnly })` | `/search?ai=1&q=...&study_design=...&min_duration_weeks=...&trained_only=true` | **Yes (`ai=1`)** | Triggers authenticated `/api/ai-search` synthesis on `/search` arrival (cache hits cost `0` quota; uncached syntheses deduct `1` daily quota) |

---

## 2. Homepage Filter Bar Contract (`web/src/components/feed/filter-bar.tsx`)

### 2.1 Layout & Controls (`FR-001`–`FR-005`)

Inside `<section aria-label="Feed filters">`, the bottom row renders a `<form onSubmit={handleStandardSearchSubmit}>` arranged in a 4-column responsive grid (`mt-3 grid grid-cols-1 gap-3 border-t-2 border-border/15 pt-3 sm:grid-cols-4`):

1. **Left 75% Search Group (`sm:col-span-3 flex flex-col gap-2 sm:flex-row sm:items-center`)**:
   - `<Input id="feed-search-q" name="q" type="search" placeholder="Search literature or ask a research question..." maxLength={AI_QUERY_MAX_LENGTH} className="min-h-[44px] flex-1" />`
   - `<Button type="submit" variant="primary" className="min-h-[44px] shrink-0 gap-1.5 font-mono text-xs font-bold">` with `<Search />` icon and `<span>Search</span>`.
2. **Right 25% Ask AI Action (`sm:col-span-1`)**:
   - `<button type="button" onClick={handleAskAiClick} className="inline-flex min-h-[44px] w-full items-center justify-center gap-1.5 rounded-md border-2 border-border bg-accent px-3.5 py-2 font-mono text-xs font-bold text-accent-ink shadow-card transition-transform active:translate-x-[2px] active:translate-y-[2px] active:shadow-none cursor-pointer">` with `<Sparkles />` icon and `<span>Ask AI</span>`.

### 2.2 Interaction Matrix on `/`

| User Action on `/` | Auth State | Query Length (`trimmed.length`) | Expected Behavior |
|--------------------|------------|---------------------------------|-------------------|
| Click **`Search`** or press `Enter` in input | Any | `0..300` | Navigates via `router.push(buildStandardSearchPath({ query, studyDesign, trainedOnly }))`. Zero AI quota used. |
| Click **`Ask AI`** | Signed out (`!profile`) | `0..300` | Toggles open `<AskAiOAuthPrompt query={searchQuery} studyDesign={studyDesign} trainedOnly={trainedOnly} />` below the row. Zero calls to `/api/ai-search`. |
| Click **`Ask AI`** | Signed in (`profile`) | `< 3` | Focuses `#feed-search-q` and displays inline validation alert (`role="alert"`): `"Enter at least 3 characters to ask AI."` Does not navigate or call `/api/ai-search`. |
| Click **`Ask AI`** | Signed in (`profile`) | `3..300` | Navigates directly to `buildAskAiReturnPath({ query: trimmed, studyDesign, trainedOnly })` (`/search?ai=1&q=...`), where `/search` immediately auto-triggers AI synthesis. |

---

## 3. Search Workspace Contract (`web/src/components/search/ai-search-workspace.tsx`)

### 3.1 Direct Action Bar & Persistent Quota Badge (`FR-006`–`FR-008`)

The `/search` form (`<form action="/search" method="GET" onSubmit={handleStandardSearchSubmit}>`) renders:

1. **Query Input**: `<Input id="search-q" name="q" type="search" value={query} maxLength={AI_QUERY_MAX_LENGTH} placeholder='Search keywords or ask a research question (e.g., "Do lengthened partials build more muscle than full ROM?")' />`
2. **Direct `Search` Submit Button**:
   - `<Button type="submit" variant="primary" className="gap-1.5"><Search className="h-4 w-4" /><span>Search</span></Button>`
3. **Direct `Ask AI` Action Button**:
   - `<button type="button" onClick={handleAskAiClick} disabled={synthesis.isStreaming} className="inline-flex h-10 items-center gap-1.5 rounded-md border-2 border-border bg-accent px-3.5 font-mono text-xs font-bold text-accent-ink shadow-control transition-transform active:translate-x-[2px] active:translate-y-[2px] active:shadow-none disabled:opacity-60 cursor-pointer"><Sparkles className="h-3.5 w-3.5" /><span>{synthesis.isStreaming ? "Synthesizing..." : "Ask AI"}</span></button>`
4. **Persistent Signed-In Quota Badge**:
   - Rendered whenever `Boolean(profile && quota)` (independent of whether `Ask AI` has been clicked yet):
   - `<span data-testid="ai-quota-badge" ...>{quota.isAdmin ? "ADMIN • UNLIMITED" : `${quota.remainingToday}/${quota.dailyLimit} LEFT TODAY`}</span>`
5. **No Intermediate `"Synthesize"` Button**:
   - The legacy two-step `"Ask AI"` toggle + `"Synthesize"` button pattern is completely removed.

### 3.2 Interaction Matrix on `/search`

| User Action on `/search` | Auth State | Query Length (`trimmed.length`) | Expected Behavior |
|--------------------------|------------|---------------------------------|-------------------|
| Click **`Search`** or press `Enter` in `#search-q` | Any | `0..300` | Clears/dismisses any open `AiSynthesisPanel` and `validationError`, navigates to `buildStandardSearchPath({ query, studyDesign, minDurationWeeks, trainedOnly })` (or lets native GET submit without `ai=1`), and consumes `0` AI quota. |
| Click **`Ask AI`** | Signed out (`!profile`) | `0..300` | Displays `<AskAiOAuthPrompt query={query} studyDesign={studyDesign} minDurationWeeks={minDurationWeeks} trainedOnly={trainedOnly} />` below the search card. Zero calls to `/api/ai-search`. |
| Click **`Ask AI`** | Signed in (`profile`) | `< 3` | Focuses `#search-q` and displays inline validation alert (`role="alert"`): `"Enter at least 3 characters to ask AI."` Zero calls to `/api/ai-search`. |
| Click **`Ask AI`** | Signed in (`profile`) | `3..300` | Clears validation alert, opens `AiSynthesisPanel`, updates the URL via `router.push(buildAskAiReturnPath(...), { scroll: false })` so standard study results stay synchronized with any edited query/filters, and immediately dispatches `runAiSynthesis(trimmed)` in 1 click. |
| Land on `/search?ai=1&q=...` (e.g., from `/` **`Ask AI`**) | Signed in (`profile`) | `3..300` | Auto-triggers `runAiSynthesis(initialQuery)` once on mount (`autoTriggeredRef`) and opens `AiSynthesisPanel`. |

---

## 4. Structured AI Synthesis Prompt & Panel Contract (`FR-009`–`FR-011`)

### 4.1 System Prompt Contract (`AI_SYNTHESIS_SYSTEM_PROMPT` in `web/src/lib/ai-search/context-builder.ts`)

`AI_SYNTHESIS_SYSTEM_PROMPT` MUST enforce:
- Exact 3-section Markdown structure:
  ```markdown
  ### Consensus & Bottom Line
  - ...

  ### Evidence Breakdown
  - ...

  ### Limitations & Gaps
  - ...
  ```
- Concise `- ` bullet points inside each section with inline `[S1]`..`[S5]` citations on every factual claim.
- Short `**bold**` key terms only where helpful; explicit prohibition on wrapping entire paragraphs, full sentences, or section headings in `** **` delimiters.
- Retained prompt-injection defense (`<user_question>` and `<retrieved_studies>` treated strictly as untrusted data) and explicit gap-stating rule when retrieved studies do not address the user's claim.

### 4.2 Structured Renderer Contract (`web/src/components/search/ai-synthesis-panel.tsx`)

`AiSynthesisPanel` renders `parseStructuredAiSynthesis(answerMarkdown)`:
- If `sections` contains one or more titled sections (`section.title !== null`), each titled section renders inside a distinct Neo-Brutalist subsection container (`rounded-md border-2 border-border bg-canvas p-3.5`) with a `Space Grotesk` uppercase section header (`<h3 className="font-display text-xs font-bold uppercase tracking-wider text-ink">`).
- Any untitled section (`section.title === null`, such as legacy cached single-paragraph prose) renders cleanly in the body container without an empty header box.
- `unordered-list` blocks render as `<ul className="list-disc space-y-1.5 pl-5 text-ink">` with `<li>` items; `ordered-list` blocks render as `<ol className="list-decimal space-y-1.5 pl-5 text-ink">`.
- `strong` inline tokens render as `<strong className="font-bold text-ink">`.
- `citation` inline tokens matching `studyByLabel` render as clickable `<Link href="/study/${study.id}">[{label}]</Link>` badges.
- **Invariant (`SC-003`)**: Rendered output MUST contain `0` literal `**` sequences for any input string (live SSE partial chunks, completed structured markdown, or legacy cached prose).
