# Concept: Direct Search & Ask AI Flow and Structured AI Output

- **Slug**: search-improvement
- **Created**: 2026-11-28T23:37:00+08:00
- **Recommended option**: Option B — Direct Dual-Action Search Bar (`/` & `/search`) + Structured Sectioned AI Synthesis

## Options

### Option A — Button Restyle & Plain-Text Markdown Strip (Smallest Thing That Could Work)
- **Sketch**: Restyle the 75%-width link on `/` so it clearly reads as a navigation button (`"Open Literature Search →"`) rather than a text box, keep the expandable `"Ask AI"` drawer on `/`, allow clicking `"Ask AI"` on `/search` to submit when a query is present, and strip literal `** **` markers from AI synthesis paragraphs without changing the paragraph layout.
- **Appetite**: small
- **Trade-offs**: Minimal change surface and removes literal `** **` asterisks, but does not make searching from `/` direct (users still cannot type a search query directly into the main bar on `/`) and leaves AI synthesis results as flat paragraphs rather than structured sections.
- **Rabbit holes**: Spending effort tweaking button visuals on `/` while users still expect an actual search input where the 75%-width bar sits.

### Option B — Direct Dual-Action Search Bar (`/` & `/search`) + Structured Sectioned AI Synthesis
- **Sketch**: Replace the faux search link on `/` with a real search text input paired directly with **`Search`** and **`Ask AI`** submit buttons (carrying active feed filters to `/search`), removing the redundant expandable input drawer for signed-in users. On `/search`, replace the two-step `"Ask AI"` mode toggle + `"Synthesize"` button with two direct 1-click actions on the search bar—**`Search`** (public standard search, 0 quota) and **`Ask AI`** (immediately runs study search + AI synthesis in one click for signed-in users, or opens the inline OAuth sign-in prompt with the typed query preserved for logged-out visitors)—while showing the daily quota badge whenever a user is signed in. Present AI synthesis outputs in structured, labeled Neo-Brutalist sections (such as **Bottom Line / Consensus**, **Key Evidence & Findings**, and **Methodological Limitations & Gaps**) with clean bullet points, proper bold typography, clickable `[S1]..[S5]` citations, and zero raw `** **` markers across both live streams and cached answers.
- **Appetite**: small
- **Trade-offs**: Directly addresses every friction point in `intake.md` and satisfies all goals in `problem.md` within a `small` appetite, preserving `/` static ISR caching, 100% public standard search, daily quota protection, and zero new third-party dependencies. Requires a resilient progressive-streaming formatter so partial streamed text and older cached answers render cleanly even if an upstream model varies its headings.
- **Rabbit holes**: Enforcing brittle JSON-only output from free-tier models (which would break progressive token streaming or fail on formatting drift) instead of using structured section headings + a forgiving client-side structured renderer.

### Option C — Inline Homepage Search Results & Automatic AI Synthesis on Every Query
- **Sketch**: Merge `"Search"` and `"Ask AI"` into a single unified search submit action that automatically runs AI synthesis on every search query for signed-in users, and render both search results and AI synthesis directly inline on the homepage (`/`) without navigating to `/search`.
- **Appetite**: medium
- **Trade-offs**: Maximizes immediacy by removing the choice between `"Search"` and `"Ask AI"`, but violates the non-goal of protecting daily member quota (burning a user's 10/day allowance on routine keyword lookups) and clutters the `/` feed with full search-workspace controls.
- **Rabbit holes**: Rebuilding `/search` inside `/`, handling URL state conflicts between feed tabs (`Daily | Weekly | Top`) and search results, and frustrating users who exhaust their daily AI quota on simple keyword searches.

## Recommendation

Recommend **Option B — Direct Dual-Action Search Bar (`/` & `/search`) + Structured Sectioned AI Synthesis**. It achieves 1-step query entry and submission on `/`, 1-click `"Ask AI"` synthesis on `/search` (eliminating the confusing `"Ask AI"` → `"Synthesize"` toggle step), and a clean, structured, `** **`-free AI synthesis layout—while keeping standard search 100% public and quota-free and staying within a `small` appetite with zero new dependencies.

## Out of Scope (for the recommended option)

- Changing the 3-tier AI inference failover chain (`Groq` -> `OpenRouter :free` -> `Gemini`), `<2,000`-token context budget, daily quota limits, or shared TTL cache expiration rules.
- Running AI synthesis automatically when a user clicks standard **`Search`** (so daily AI quota is only used when the user explicitly chooses **`Ask AI`**).
- Adding new user-facing page routes beyond the 8 approved routes or introducing external Markdown/UI libraries.
- Mutating `/guidelines` or altering deterministic study quality scores.

## Assumptions to Validate

- On `/` and `/search`, clicking **`Ask AI`** when the search input is empty or shorter than the minimum query length focuses the search input and displays a clear inline prompt (or opens the OAuth sign-in prompt if logged out) rather than dispatching an invalid synthesis request.
- Always displaying the remaining daily quota badge (`e.g., 10/10 LEFT TODAY` or `ADMIN • UNLIMITED`) next to **`Ask AI`** on `/search` for signed-in users satisfies pre-submit quota transparency without requiring a separate toggle click first.
- Structured AI synthesis sections (e.g., **Bottom Line / Consensus**, **Key Evidence & Findings**, **Limitations & Evidence Gaps**) can be prompted as deterministic section headers/bullets and rendered via a built-in structured formatter that converts bold spans (`**...**`), bullet lists, headings, and `[S1]..[S5]` citations into clean Neo-Brutalist UI elements during both live SSE streaming and cached playback.
