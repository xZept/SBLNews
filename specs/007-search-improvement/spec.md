# Feature Specification: Direct Search & Ask AI Flow and Structured AI Output

**Feature Branch**: `007-search-improvement`

**Created**: 2026-11-28

**Status**: Draft

**Input**: User description: "Use the handoff summary in .specify/assessments/search-improvement/decision.md to specify the approved search-improvement concept."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Direct Dual-Action Search and Ask AI on the Homepage (Priority: P1)

A visitor or signed-in member on the homepage (`/`) wants to immediately type a research question or keyword into the top filter bar and either run a standard literature search or trigger an AI evidence synthesis in a single step—without clicking a deceptive search box that merely redirects to `/search` or opening a secondary input drawer.

**Why this priority**: Since the homepage filter card is the primary search entrypoint for SBL News, replacing the faux search redirect link with an actual search input paired with direct **`Search`** and **`Ask AI`** actions removes the highest-frequency navigation friction for every visitor.

**Independent Test**: Can be fully tested on `/` by typing a query into the filter bar's search input, submitting via **`Search`** (or Enter) to verify direct navigation to `/search` with query and active feed filters applied, and clicking **`Ask AI`** as both a signed-in user and a signed-out visitor to verify direct AI synthesis handoff or the inline sign-in prompt.

**Acceptance Scenarios**:

1. **Given** any user on `/`, **When** they focus the search bar in the top filter card, **Then** they can type directly into the search input inline (without being redirected to `/search` on click) and see distinct **`Search`** and **`Ask AI`** action buttons in the same search row.
2. **Given** any user on `/` who has typed a query (e.g., `"creatine hypertrophy"`) and optionally toggled feed filter pills (`Meta-Analysis`, `RCT (>=8w)`, `Trained Pop.`), **When** they click **`Search`** or press `Enter` inside the search input, **Then** the application navigates directly to `/search` with their query (`q`) and active filter parameters applied as a standard public literature search consuming zero AI quota.
3. **Given** an authenticated user on `/` who has entered a query of at least 3 characters, **When** they click **`Ask AI`**, **Then** the application navigates directly to `/search` with `ai=1`, the query (`q`), and active feed filters in the URL and immediately starts AI evidence synthesis on `/search` without requiring another button click.
4. **Given** an authenticated user on `/` whose search input is empty or fewer than 3 non-whitespace characters, **When** they click **`Ask AI`**, **Then** the search input receives focus and displays clear inline validation guidance instructing them to enter at least 3 characters before running Ask AI, without navigating or calling the AI synthesis service.
5. **Given** an unauthenticated visitor on `/` (with or without text typed in the search input), **When** they click **`Ask AI`**, **Then** the inline sign-in prompt (`Google` and `GitHub` OAuth options) toggles open below the filter bar—preserving any typed query and active filters in the post-login return destination—and zero requests are sent to the AI synthesis service.

---

### User Story 2 - Direct 1-Click Search and Ask AI Actions on the Search Page (Priority: P1)

A visitor or signed-in member on `/search` wants **`Search`** and **`Ask AI`** to act as two direct 1-click actions on the search query input—where **`Search`** runs a standard public search and **`Ask AI`** immediately executes AI synthesis for the current query and filters—while signed-in users can always see their remaining daily AI allowance before clicking **`Ask AI`**.

**Why this priority**: Eliminating the confusing two-step `"Ask AI"` mode toggle → `"Synthesize"` button pattern on `/search` directly resolves the false-start interaction where users click `"Ask AI"` expecting an answer and only see another button appear.

**Independent Test**: Can be independently tested on `/search` by entering a query, clicking **`Search`** to verify standard public results update with zero AI quota usage, and clicking **`Ask AI`** to verify that study results and AI synthesis execute immediately in one click while displaying the persistent daily quota badge for signed-in users.

**Acceptance Scenarios**:

1. **Given** a signed-in user on `/search`, **When** the page loads, **Then** the search bar displays a **`Search`** submit button, a direct **`Ask AI`** action button, and a persistent monospace daily quota badge (e.g., `10/10 LEFT TODAY` or `ADMIN • UNLIMITED`) without requiring a mode toggle first.
2. **Given** a signed-in user on `/search` who has typed or modified a query of at least 3 characters (and optionally adjusted study-design, duration, or training-status filters), **When** they click **`Ask AI`**, **Then** the page updates the URL and standard search results for the current query/filters if needed and immediately starts AI synthesis in that single click—with no intermediate `"Synthesize"` button step.
3. **Given** any user on `/search` who has typed a query, **When** they click **`Search`** or press `Enter` in the query input, **Then** standard public hybrid search results are fetched for the query and filters, any previous AI synthesis panel is dismissed or cleared for the new standard search, and zero daily AI quota is consumed.
4. **Given** a signed-in user on `/search` whose query input is empty or fewer than 3 non-whitespace characters, **When** they click **`Ask AI`**, **Then** the query input is focused and inline validation feedback informs the user to enter at least 3 characters, without dispatching an AI synthesis request.
5. **Given** an unauthenticated visitor on `/search`, **When** they click **`Ask AI`**, **Then** the inline sign-in prompt is displayed below the search bar (preserving their current typed query and active filters in the return URL) and zero requests are sent to the AI synthesis service.

---

### User Story 3 - Structured Sectioned AI Synthesis with Zero Raw Markdown Artifacts (Priority: P1)

A signed-in member reading an AI literature synthesis on `/search` wants the synthesized response organized into clear, scannable Neo-Brutalist sections with formatted bullet lists, proper bold emphasis, and clickable `[S1]..[S5]` study citations—with zero raw `** **` markdown characters leaking into the rendered text across both live streaming and cached responses.

**Why this priority**: Unparsed `** **` markdown delimiters in flat paragraphs make scientific summaries hard to scan and visually broken; structured sections and clean inline formatting restore editorial trust and scannability.

**Independent Test**: Can be independently tested by running an `"Ask AI"` query on `/search` (and re-running for a cached response, as well as testing legacy cached text containing headings, bullets, and matched or unmatched `**` markers) and verifying that the panel renders distinct labeled sections, HTML lists, semantic bold text, clickable `[S1]..[S5]` links, and zero literal `**` characters.

**Acceptance Scenarios**:

1. **Given** an authenticated user who triggers **`Ask AI`** on `/search` for a topic with matching studies, **When** the AI synthesis streams in or loads from the shared cache, **Then** the response is organized into distinct, labeled visual subsections inside the synthesis panel (defaulting to **Consensus & Bottom Line**, **Evidence Breakdown**, and **Limitations & Gaps**).
2. **Given** an AI synthesis response containing bullet points (`- ` or `* `), numbered items (`1. `), bold emphasis (`**term**`), and study citations (`[S1]`–`[S5]`), **When** `AiSynthesisPanel` renders the content during progressive streaming and after completion, **Then** list items render as semantic lists, bold phrases render with proper bold typography, citations render as clickable Neo-Brutalist badges linking to `/study/[id]`, and zero literal `**` markdown markers appear anywhere in the visible text.
3. **Given** an older cached synthesis or a mid-stream token chunk containing unmatched, trailing, or stray `**` markers or single-paragraph prose without section headers, **When** `AiSynthesisPanel` renders the content, **Then** stray `**` characters are cleanly stripped without losing text content, and the prose renders gracefully inside the synthesis card while preserving all `[S1]..[S5]` citation links.
4. **Given** an user viewing the structured AI synthesis panel in either the default Neo-Brutalist Sky Blue Light Mode or the opt-in Dark Mode, **When** they inspect the section cards, headings, lists, and citation badges, **Then** all elements use the approved high-contrast Neo-Brutalist Sky Blue tokens (`2px solid` borders, hard zero-blur shadows, `Space Grotesk` headings, `Inter` body copy, `JetBrains Mono` badges) with zero purple, violet, or indigo hues.

---

### Edge Cases

- **Empty or short query (`< 3` non-whitespace characters) when clicking `Search` vs. `Ask AI`**: On `/`, clicking **`Search`** with an empty query navigates to `/search` ( retaining any active feed filters); clicking **`Ask AI`** when signed in with `< 3` characters focuses the search input and shows inline validation feedback without navigating or calling the AI synthesis service. On `/search`, clicking **`Ask AI`** when signed in with `< 3` characters focuses the input and shows inline validation feedback.
- **Pressing `Enter` in the search input**: Pressing `Enter` inside the search input on either `/` or `/search` ALWAYS triggers a standard public **`Search`** (consuming `0` AI quota), preventing accidental quota consumption from keyboard submission.
- **Mid-stream partial markdown tokens**: While an SSE synthesis stream is actively arriving, an opening `**` may arrive several chunks before its closing `**`; the renderer MUST prevent raw `**` delimiters from flashing or remaining in the visible text during and after streaming.
- **Pre-existing cached syntheses without section headings**: Responses already stored in the shared 7/30-day TTL cache prior to this update may consist of flat paragraphs with `**bold**` markers and `[S1]` citations; the renderer MUST still strip all literal `**` delimiters, format inline bolding and citations, and display the content cleanly without throwing errors.
- **Double-clicks on `Ask AI` while synthesis is in flight**: While a synthesis stream is actively loading, the **`Ask AI`** button on `/search` MUST show an in-progress loading state and ignore duplicate clicks so users cannot trigger concurrent requests for the same submission.
- **Exhausted daily AI quota (`0/10 LEFT TODAY`)**: When a signed-in non-admin user has `0` remaining daily syntheses and clicks **`Ask AI`** on `/search`, the system still checks the shared query-answer cache first (since cached answers are free) and displays the Neo-Brutalist quota-exhausted notice if the query is a cache miss while leaving standard search results visible.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The homepage filter bar (`/` `FilterBar`) MUST replace the static `/search` redirect link and expandable secondary input drawer with a real search text input (`type="search"`, placeholder `"Search literature or ask a research question..."`) paired inline with a **`Search`** submit button and an **`Ask AI`** action button within the filter card row (maintaining the 75% search group / 25% **`Ask AI`** proportion on desktop and clean full-width stacking on mobile viewports) while remaining a client-side island that preserves `/` Incremental Static Regeneration (ISR).
- **FR-002**: Submitting the homepage search bar via the **`Search`** button or pressing `Enter` in the homepage search input MUST navigate directly to `/search` with the trimmed query (`q`, if non-empty) and any active homepage feed filter parameters (`study_design`, `trained_only`) serialized in the URL, executing a standard public search that consumes zero AI quota.
- **FR-003**: When an authenticated user clicks **`Ask AI`** on `/` with a query of at least 3 non-whitespace characters, the application MUST navigate directly to `/search?ai=1&q=<encoded-query>` (including any active homepage feed filters) so `/search` immediately executes both the study search and the AI evidence synthesis on arrival.
- **FR-004**: When an authenticated user clicks **`Ask AI`** on `/` or `/search` while the search input has fewer than 3 non-whitespace characters, the application MUST focus the search input and display a visible Neo-Brutalist inline validation message (e.g., `"Enter at least 3 characters to ask AI."`) without navigating or sending a request to `/api/ai-search`.
- **FR-005**: When an unauthenticated visitor clicks **`Ask AI`** on `/` or `/search`, the application MUST display the inline Neo-Brutalist OAuth sign-in prompt (`AskAiOAuthPrompt` with Google and GitHub sign-in buttons), preserving the visitor's currently typed query (`q`), active filter parameters, and `ai=1` in the OAuth `next` return URL without invoking `/api/ai-search`.
- **FR-006**: The `/search` workspace (`AiSearchWorkspace`) MUST remove the two-step `"Ask AI"` mode toggle and separate `"Synthesize"` button, and instead present two direct action buttons alongside the query input: **`Search`** (runs standard public hybrid search and clears/hides any active AI synthesis view, consuming zero AI quota) and **`Ask AI`** (directly runs AI synthesis for the current query and filter state in 1 click).
- **FR-007**: When an authenticated user clicks **`Ask AI`** on `/search` with a valid query (`>= 3` characters), `AiSearchWorkspace` MUST synchronize the URL and standard search results if the input or filter controls have uncommitted changes, open the synthesis panel, and immediately dispatch the `/api/ai-search` synthesis request in that single click (and MUST also auto-trigger synthesis on initial page load when navigated to with `ai=1` and a valid `q` parameter).
- **FR-008**: Whenever an authenticated user is on `/search`, the search bar area MUST persistently display their monospace daily AI quota badge (`e.g., 10/10 LEFT TODAY` for standard members or `ADMIN • UNLIMITED` for administrators, initialized from server-hydrated quota metadata and updated after synthesis responses) alongside the **`Ask AI`** button so users have pre-submit quota visibility without clicking a mode toggle first.
- **FR-009**: The AI synthesis system instructions (`AI_SYNTHESIS_SYSTEM_PROMPT`) MUST instruct the language model to format every synthesis into three deterministic Markdown section headings—`### Consensus & Bottom Line`, `### Evidence Breakdown`, and `### Limitations & Gaps`—using concise bullet points (`- `), short `**bold**` key terms only where helpful, and inline `[S1]`..`[S5]` citations, while explicitly forbidding wrapping entire paragraphs or headings in `** **` delimiters.
- **FR-010**: The AI synthesis panel (`AiSynthesisPanel`) MUST implement a deterministic, zero-dependency structured content parser and sanitizer that:
  - Recognizes section headings (Markdown `##` / `###` headings or standalone bolded section title lines) and renders each section as a distinct, labeled Neo-Brutalist subsection within the synthesis panel.
  - Renders bulleted (`- `, `* `) and numbered (`1. `) lines as semantic HTML list elements (`<ul>` / `<ol>` and `<li>`).
  - Converts matched `**bold**` inline spans into semantic `<strong>` elements and strips any unmatched, trailing, or stray `**` characters so literal `**` sequences never appear in the rendered DOM during progressive streaming or final/cached display.
  - Preserves inline clickable `[S1]`..`[S5]` citation badge links to `/study/[id]` within both paragraph and list-item text, as well as the supporting primary study cards below the synthesis.
  - Gracefully falls back to rendering a clean single body section when displaying legacy cached syntheses that do not contain section headings.
- **FR-011**: All updated search controls, inline validation notices, quota badges, and structured synthesis sections across `/` and `/search` MUST adhere to SBL News Constitution Principle III (Neo-Brutalist Sky Blue tokens, `2px solid` borders, zero-blur hard offset shadows, `Space Grotesk` / `Inter` / `JetBrains Mono` typography, default Light Mode and opt-in Dark Mode parity, and zero purple/violet/indigo hues or gradient effects) and Principle V (confining all changes to existing `/` and `/search` routes and `/api/ai-search`).

### Key Entities

- **Search & Ask AI Intent State**: Represents the user's current query string (`q`), active deterministic filter selections (`study_design`, `min_duration_weeks`, `trained_only`), authentication state, and action choice (**`Search`** vs. **`Ask AI`** (`ai=1`)) across `/` and `/search`.
- **Structured AI Synthesis Document**: Represents the parsed visual structure derived from a streamed or cached AI synthesis response, composed of one or more ordered sections (each with an optional section heading and ordered content blocks of paragraphs or bullet/numbered lists), inline rich spans (plain text, semantic `<strong>` emphasis with all raw `**` stripped, and `[S1]..[S5]` citation references), supporting study cards, and quota/cache metadata.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users on the homepage (`/`) can type a research query directly into the main filter bar and initiate either a standard search or an Ask AI synthesis in **1 submission action** (down from 2+ steps requiring a redirect click or secondary expandable input drawer).
- **SC-002**: Authenticated users on `/search` can trigger an AI evidence synthesis after entering a query in **1 click** on **`Ask AI`** (down from 2 clicks across a mode toggle and a separate `"Synthesize"` button), with their remaining daily quota badge visible prior to clicking.
- **SC-003**: **0 literal `**` markdown emphasis delimiters** appear in the rendered `AiSynthesisPanel` text across 100% of tested live streaming chunks, completed syntheses, and legacy cached synthesis responses.
- **SC-004**: **100% of newly generated AI syntheses** render in structured, labeled subsections with semantic list formatting and clickable `[S1]..[S5]` citation badges that link to `/study/[id]`.
- **SC-005**: **100% of standard searches** submitted via the **`Search`** button or `Enter` key on `/` and `/search` remain completely public and consume **0 daily AI quota**, while **100% of logged-out clicks** on **`Ask AI`** open the inline OAuth sign-in prompt with `0` network calls to `/api/ai-search`.

## Assumptions

- Pressing `Enter` inside the search text input on `/` or `/search` defaults to standard public **`Search`** so signed-in users never accidentally spend their daily AI synthesis allowance via keyboard submission.
- Standardizing on three section headings—**Consensus & Bottom Line**, **Evidence Breakdown**, and **Limitations & Gaps**—provides clear, Examine-inspired scientific scannability while remaining compact enough for the `<2,000`-token synthesis context and free-tier model outputs.
- Existing backend guardrails in `/api/ai-search` (Supabase Auth verification, shared 7/30-day TTL query-answer cache lookup prior to quota deduction, atomic `check_and_increment_ai_quota` RPC, `<2,000`-token context budget, and 3-tier `Groq` → `OpenRouter :free` → `Gemini` failover) remain unchanged.
