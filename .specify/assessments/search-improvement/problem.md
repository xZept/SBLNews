# Problem Definition: Direct Search & Ask AI Flow and Structured AI Output

- **Slug**: search-improvement
- **Created**: 2026-11-28T23:35:00+08:00
- **Inputs used**: intake.md, research.md

## Problem Statement

Lifters, coaches, clinicians, and researchers using SBL News encounter confusing multi-step search interactions on both the homepage (`/`)—where an apparent search bar acts as a redirect link—and `/search`—where `"Ask AI"` acts as a mode toggle that reveals a separate `"Synthesize"` button rather than directly running AI synthesis. In addition, AI synthesis results render as dense prose containing raw `** **` markdown markers instead of a clean, structured layout, reducing scannability and perceived editorial quality.

## Affected Users & Stakeholders

- **Users — Public Visitors & Signed-In Members (lifters, coaches, clinicians, researchers)**: Expect to type directly into the homepage search bar and trigger Ask AI in one action on `/search`, and need readable, structured AI summaries without raw markdown punctuation.
- **Stakeholders — Product Owner / Maintainer**: Identified the UX friction and messy AI output after `005-ai-literature-search` and `006-relocate-search-ask-ai`; owns decisions on interaction flow, quota-badge visibility, and structured output format within the Constitution's $0/month and Neo-Brutalist Sky Blue constraints.

## Goals

- Make initiating both standard literature search and Ask AI direct and intuitive from the homepage (`/`) without misleading faux-input redirects.
- Eliminate the two-step `"Ask AI"` toggle → `"Synthesize"` interaction on `/search` so users can trigger AI synthesis in a single action after entering a query, while preserving public, quota-free standard search.
- Preserve pre-submit visibility of the user's remaining daily AI allowance and the logged-out sign-in prompt without introducing accidental quota consumption.
- Present AI synthesis results in a clean, scannable, structured layout with zero raw `** **` markdown artifacts, preserving inline `[S1]..[S5]` study citations, progressive streaming, and Neo-Brutalist Light/Dark parity.

## Non-Goals

- Changing the 3-tier AI provider failover chain, `<2,000`-token context budget, daily member quota cap, or shared TTL cache retention policy.
- Making AI synthesis run automatically on every standard keyword/semantic search (which would consume daily member quota unintentionally).
- Adding new user-facing page routes beyond the 8 approved routes or introducing unapproved paid/heavyweight dependencies.
- Modifying `/guidelines` or altering deterministic study quality scoring.

## Success Metrics

- **Homepage search step count**: Users can enter a query and submit a search or Ask AI request directly from `/` in 1 submission step (baseline: 2+ steps via redirect link to `/search` or hidden secondary input).
- **`/search` Ask AI trigger step count**: Signed-in users on `/search` can run AI synthesis in 1 click after entering a query (baseline: 2 clicks — `"Ask AI"` toggle + `"Synthesize"` submit).
- **Raw markdown artifact rate**: `0` literal `** **` emphasis markers appear in rendered AI synthesis panels across both newly streamed and cached responses (baseline: raw `** **` markers visible in prose).
- **Public search & quota integrity**: `100%` of standard searches remain public and consume `0` daily AI quota; `100%` of logged-out `"Ask AI"` triggers continue to present the sign-in prompt without invoking `/api/ai-search` (baseline: `100%`).
- **Scannability of AI results** *(qualitative)*: AI synthesis outputs display distinct, labeled sections and clean list/emphasis formatting matching SBL News's Neo-Brutalist Sky Blue typography (baseline: single unparsed paragraph blocks).

## Cost of Inaction

- Visitors on `/`—where the homepage filter card is now the primary search entrypoint—continue to hit a deceptive redirect box instead of a usable search input.
- Users on `/search` continue to experience false starts when clicking `"Ask AI"` and seeing only a button label change instead of results.
- Unformatted `** **` markers in AI responses continue to make evidence summaries look broken, undermining reader trust in SBL News's scientific presentation.

## Open Questions

- [NEEDS CLARIFICATION: On the homepage (`/`), should the 75%/25% row in `FilterBar` become a direct text input with `"Search"` and `"Ask AI"` submit actions (navigating directly to `/search?q=...` or `/search?ai=1&q=...` with active feed filters), eliminating the secondary expandable input row?]
- [NEEDS CLARIFICATION: On `/search`, should `"Search"` and `"Ask AI"` act as two direct 1-click submit actions on the shared query input, with the daily quota badge visible whenever a signed-in user is on `/search`?]
- [NEEDS CLARIFICATION: What specific section structure is preferred for AI synthesis results (e.g., *Direct Answer / Consensus*, *Key Evidence & Findings*, *Limitations & Evidence Gaps*) alongside proper rendering of bold emphasis and bulleted points?]
