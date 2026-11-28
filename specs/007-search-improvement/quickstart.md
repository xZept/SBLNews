# Quickstart & Validation Guide: Direct Search & Ask AI Flow and Structured AI Output

**Feature**: `007-search-improvement`
**Date**: 2026-11-28

## Prerequisites

- Node.js 20+ and npm installed
- Working directory: `c:\Users\allen\Documents\SBLNews\web`
- Environment variables configured in `web/.env.local` (Supabase URL/Anon Key and AI tier keys for live synthesis verification)

## 1. Automated Verification Commands

Run TypeScript strict typechecking, ESLint, and the Vitest unit test suite from `/web`:

```powershell
cd web
npm run typecheck ; npm run lint ; npx vitest run
```

### Expected Automated Test Outcomes

1. **`web/tests/filter-bar.test.ts`**:
   - Verifies `FilterBar` renders a real `<input type="search">` (not a static `<a href="/search">` redirect link) paired with direct **`Search`** (`type="submit"`) and **`Ask AI`** (`type="button"`) controls in the 75%/25% split row (`sm:col-span-3` / `sm:col-span-1`).
   - Verifies `buildStandardSearchPath` omits `ai=1` while preserving `q`, `study_design`, and `trained_only`.
   - Verifies `buildAskAiReturnPath` includes `ai=1` alongside `q` and active filters.
   - Verifies zero purple, violet, indigo, or gradient classes exist in `filter-bar.tsx`.
2. **`web/tests/ai-search.test.ts`**:
   - Verifies `AI_SYNTHESIS_SYSTEM_PROMPT` mandates `### Consensus & Bottom Line`, `### Evidence Breakdown`, and `### Limitations & Gaps` sections and forbids wrapping paragraphs/headings in `** **`.
   - Verifies `parseStructuredAiSynthesis` (and `AiSynthesisPanel` static markup rendering) parses Markdown `###` headings into distinct labeled sections, formats `- ` and `1. ` items into `<ul>`/`<ol>` lists, converts matched `**term**` spans into `<strong>`, preserves clickable `[S1]`..`[S5]` `/study/[id]` links, and strips 100% of unmatched, mid-stream, or stray `**` markers (`expect(html).not.toContain("**")`).
   - Verifies `AiSearchWorkspace` renders direct **`Search`** and **`Ask AI`** buttons (with no two-step `"Synthesize"` toggle button) and persistently renders `data-testid="ai-quota-badge"` for authenticated users with hydrated quota.
   - Verifies Constitution Principle V route boundaries remain strictly at the 8 approved page routes and 2 approved Route Handlers.

## 2. Manual End-to-End Scenarios

Start the local development server:

```powershell
cd web
npm run dev
```

1. **Homepage Direct Search (`US1`, Scenario 1 & 2)**:
   - Open `http://localhost:3000/`.
   - Click the search input in the top `FilterBar` card and type `lengthened partials`.
   - Toggle `RCT` and `Trained Lifters Only`, then press `Enter` (or click **`Search`**).
   - Verify direct navigation to `/search?q=lengthened+partials&study_design=rct&trained_only=true` with `0` AI quota consumed and no AI synthesis panel triggered.
2. **Homepage Direct Ask AI (`US1`, Scenario 3–5)**:
   - While signed out on `/`, click **`Ask AI`** → verify `<AskAiOAuthPrompt />` opens inline below the filter bar with zero `/api/ai-search` requests.
   - Sign in, return to `/`, leave the search input empty (or type `hi`), and click **`Ask AI`** → verify the input receives focus and shows `"Enter at least 3 characters to ask AI."`
   - Type `lengthened partials hypertrophy` on `/` and click **`Ask AI`** → verify immediate navigation to `/search?ai=1&q=lengthened+partials+hypertrophy` and automatic AI synthesis start on `/search`.
3. **Search Page 1-Click Ask AI & Persistent Quota Badge (`US2`, Scenario 1–5)**:
   - On `/search` while signed in, verify the monospace quota badge (`10/10 LEFT TODAY` or `ADMIN • UNLIMITED`) is visible immediately beside **`Ask AI`**.
   - Type a new query `creatine recovery` and click **`Ask AI`** once → verify both the URL/study results and the AI synthesis panel update in that single click (no `"Synthesize"` button).
   - Click **`Search`** (or press `Enter` in the query input) → verify the AI synthesis panel closes and standard public search results update with `0` AI quota used.
4. **Structured Sectioned Synthesis & Zero `**` Markers (`US3`, Scenario 1–4)**:
   - Inspect the rendered `AiSynthesisPanel` during streaming and after completion (and re-run the same query to verify a `CACHED • 0 QUOTA USED` response).
   - Verify the response displays **Consensus & Bottom Line**, **Evidence Breakdown**, and **Limitations & Gaps** subsections, proper bullet lists, bold terms, clickable `[S1]..[S5]` citation badges, and `0` literal `**` characters in both Light and Dark themes.
