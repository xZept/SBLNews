# Decision: Direct Search & Ask AI Flow and Structured AI Output

- **Slug**: search-improvement
- **Decided**: 2026-11-28T23:40:15+08:00
- **Verdict**: go
- **Artifacts reviewed**: intake.md, research.md, problem.md, concept.md

## Scorecard

| Criterion | Rating | Justification |
|-----------|--------|---------------|
| Problem validity | strong | Direct repository inspection confirms all three UX issues: the homepage `<Link href="/search">` in `FilterBar` mimics a search input (`"Search literature..."`) while redirecting on click, `"Ask AI"` on `/search` acts as a mode toggle revealing `"Synthesize"`, and `AiSynthesisPanel` renders unparsed `** **` markdown markers in flat paragraphs. |
| Evidence strength | strong | High-confidence codebase evidence (`filter-bar.tsx`, `ai-search-workspace.tsx`, `ai-synthesis-panel.tsx`, `context-builder.ts`, `specs/005`, `specs/006`, `constitution.md`) directly verifies the behavior and constraints. |
| Value vs. inaction | strong | Because `006` made the homepage filter card the primary search entrypoint, replacing the faux search box and 2-step Ask AI toggle with direct 1-step actions and structured, `** **`-free AI synthesis removes daily navigation friction and restores Neo-Brutalist editorial polish. |
| Feasibility / appetite | strong | Option B fits within a `small` appetite by updating existing client components (`FilterBar`, `AiSearchWorkspace`, `AiSynthesisPanel`), prompt instructions (`context-builder.ts`), and unit tests with zero database schema changes or new npm dependencies. |
| Strategic fit | strong | Preserves $0/month free-tier operation, `/` ISR caching (`revalidate = 3600`), 100% public standard search, authenticated AI quota & shared TTL cache rules, 8-route discipline, and Neo-Brutalist Sky Blue Light/Dark parity. |
| Risk posture | strong | Keeping **`Search`** and **`Ask AI`** as two distinct direct submit actions prevents accidental quota burn; input validation handles empty-query clicks; and a deterministic client-side section/inline parser preserves progressive SSE streaming and backward compatibility with cached syntheses. |

## Verdict & Rationale

**Verdict: `go`**. Every scorecard criterion rates `strong`, and the project owner explicitly confirmed **Option B — Direct Dual-Action Search Bar (`/` & `/search`) + Structured Sectioned AI Synthesis**. Converting the homepage faux search link into an actual search input with direct **`Search`** and **`Ask AI`** actions, turning **`Ask AI`** on `/search` into a direct 1-click synthesis action (with the daily quota badge visible for signed-in users), and structuring AI synthesis outputs into labeled Neo-Brutalist sections with proper bold/list formatting and zero raw `** **` markers directly resolves the user complaints while honoring all Constitution guardrails.

## If needs-clarification

- N/A (Verdict is `go`; Option B is confirmed and concrete defaults are carried forward into `/speckit-specify`.)

## If go — Handoff to `/speckit-specify`

- **Problem**: Users visiting `/` and `/search` face misleading multi-step search controls—where the homepage search bar is actually a redirect link (`<Link href="/search">`) and `"Ask AI"` on `/search` is a toggle button that merely reveals a `"Synthesize"` button—and receive AI synthesis results containing raw `** **` markdown markers in unstructured paragraph blocks.
- **Chosen approach**: **Option B — Direct Dual-Action Search Bar (`/` & `/search`) + Structured Sectioned AI Synthesis**:
  1. **Direct Dual-Action Search Input on the Homepage (`/`, `FilterBar`)**:
     - Replace the 75%-width `<Link href="/search">Search literature...</Link>` and secondary expandable input drawer in `FilterBar` with an immediate, real search text input (`<Input type="search">`) paired directly with **`Search`** and **`Ask AI`** action buttons in the filter card row (preserving 75%/25% desktop proportion / clean mobile stacking and `/` ISR caching).
     - Submitting via **`Search`** (or pressing Enter in the input) navigates directly to `/search` with the typed query (`q`) and active feed filters (`study_design`, `trained_only`) applied as a standard public search.
     - Clicking **`Ask AI`** on `/`:
       - When signed out: toggles open the inline `AskAiOAuthPrompt` below the row (preserving any typed query and active feed filters in the OAuth return URL) without calling `/api/ai-search`.
       - When signed in: if a valid query (`>= 3` chars) is entered, navigates directly to `/search?ai=1&q=...` (with active feed filters) so AI synthesis starts immediately on `/search`; if the input is empty or `< 3` chars, focuses the search input and shows inline validation feedback so the user can type and click **`Ask AI`** in one step without opening a separate secondary input box.
  2. **Direct 1-Click `Search` & `Ask AI` Actions on `/search` (`AiSearchWorkspace`)**:
     - Remove the two-step `"Ask AI"` mode toggle → `"Synthesize"` button pattern on `/search`.
     - Pair the `/search` query input with two direct action buttons: **`Search`** (submits standard public hybrid keyword + `pgvector` search, consuming `0` AI quota and hiding/clearing any active AI synthesis panel if desired or updating standard results) and **`Ask AI`** (directly triggers AI synthesis for the current query and filter state in 1 click).
     - When a signed-in user clicks **`Ask AI`** on `/search` with a valid query (`>= 3` chars), synchronize the URL/results for the current query & filters and immediately run `/api/ai-search` synthesis without requiring a second click on `"Synthesize"`; if the query is `< 3` chars, focus the input and display inline validation feedback.
     - When a signed-out visitor clicks **`Ask AI`** on `/search`, display `AskAiOAuthPrompt` (preserving the current query and filters) without calling `/api/ai-search`.
     - Display the signed-in user's monospace daily quota badge (`e.g., 10/10 LEFT TODAY` or `ADMIN • UNLIMITED`) persistently alongside the **`Ask AI`** button on `/search` whenever a user is authenticated (hydrated server-side via `initialQuota` in `/search/page.tsx`).
  3. **Structured Sectioned AI Synthesis & Zero-`** **` Renderer (`AiSynthesisPanel` & `context-builder.ts`)**:
     - Update `AI_SYNTHESIS_SYSTEM_PROMPT` in `context-builder.ts` to instruct the model to organize every synthesis into clear, deterministic section headings (e.g., **Consensus & Bottom Line**, **Evidence Breakdown**, and **Limitations & Gaps**) using concise bullet points and inline `[S1]..[S5]` citations, without wrapping whole paragraphs or headings in stray `** **` blocks.
     - Replace the naive paragraph splitter (`renderProseWithCitations`) in `AiSynthesisPanel` with a deterministic, dependency-free structured renderer that:
       - Parses section headings (Markdown `###` / `##` or bolded section labels) into distinct Neo-Brutalist subsections/cards within the synthesis panel.
       - Renders bulleted and numbered list items (`- `, `* `, `1. `) as proper HTML lists (`<ul>` / `<ol>` with `<li>`).
       - Parses matched `**bold**` spans into semantic `<strong>` elements and strips any unmatched/stray `**` delimiters so literal `** **` sequences never appear in the rendered UI—across both live progressive SSE streams and pre-existing cached syntheses.
       - Preserves inline clickable `[S1]..[S5]` citation badge links to `/study/[id]` and the cited primary literature cards below.
- **In scope / out of scope**:
  - *In scope*: `FilterBar` direct search input + dual **`Search`** / **`Ask AI`** actions on `/`; `AiSearchWorkspace` direct 1-click **`Search`** and **`Ask AI`** actions + persistent signed-in quota badge on `/search`; `AI_SYNTHESIS_SYSTEM_PROMPT` structured section template; `AiSynthesisPanel` structured section, list, bold-emphasis, and `[S1]..[S5]` citation parser/sanitizer; Vitest unit test updates (`filter-bar.test.ts`, `ai-search.test.ts`).
  - *Out of scope*: Changes to the 3-tier AI provider failover chain, `<2,000`-token context cap, daily quota limit, or shared TTL cache tables/RPCs; automatic AI synthesis on standard **`Search`** clicks; new routes outside the 8 approved page routes; third-party Markdown libraries.
- **Success metrics**:
  - `1` step to type and submit either a standard search or Ask AI query from `/`.
  - `1` click on **`Ask AI`** to execute AI synthesis after entering a query on `/search` (0 toggle-then-synthesize steps).
  - `0` literal `** **` markdown delimiters rendered in `AiSynthesisPanel` across live and cached responses, with responses organized into clear visual sections and bullet lists.
  - `100%` of standard searches remain public and consume `0` AI quota; `/web` passes `tsc --noEmit`, ESLint, and Vitest test suites.
- **Carried-forward open questions**:
  - None blocking; exact section titles (defaulting to **Consensus & Bottom Line**, **Evidence Breakdown**, and **Limitations & Gaps**) and `/search` query-plus-synthesis synchronization details can be finalized in `/speckit-specify`.
