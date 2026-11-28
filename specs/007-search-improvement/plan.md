# Implementation Plan: Direct Search & Ask AI Flow and Structured AI Output

**Branch**: `007-search-improvement` | **Date**: 2026-11-28 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/007-search-improvement/spec.md`

## Summary

Replace the misleading two-step search and Ask AI interactions on `/` and `/search` with direct 1-step **`Search`** and **`Ask AI`** actions, surface the signed-in user's daily AI quota badge persistently on `/search`, and upgrade AI synthesis prompting and rendering to output structured, scannable Neo-Brutalist subsections (**Consensus & Bottom Line**, **Evidence Breakdown**, **Limitations & Gaps**) with semantic lists, `<strong>` inline emphasis, clickable `[S1]..[S5]` citation links, and zero raw `**` markdown artifacts across live streaming and cached responses:

1. **Homepage Direct Dual-Action Search Bar (`web/src/components/feed/filter-bar.tsx`)**: Replace the faux `<Link href="/search">Search literature...</Link>` trigger and secondary expandable drawer with an inline `<Input type="search">` paired directly with **`Search`** (`type="submit"`, public `/search` navigation with query + active feed filters, `0` AI quota) and **`Ask AI`** (`type="button"`, routing signed-in users with `>= 3` chars directly to `/search?ai=1&q=...`, showing inline focus + validation when `< 3` chars, and opening the inline `<AskAiOAuthPrompt />` for signed-out visitors) while preserving `revalidate = 3600` ISR on `/`.
2. **Search Page 1-Click `Search` & `Ask AI` + Persistent Quota Badge (`web/src/components/search/ai-search-workspace.tsx`)**: Remove the two-step `"Ask AI"` mode toggle → `"Synthesize"` button pattern on `/search`; provide direct **`Search`** (`type="submit"`, runs public hybrid search and dismisses active synthesis) and **`Ask AI`** (`type="button"`, synchronizes URL/results and runs `/api/ai-search` synthesis in 1 click, with inline `< 3`-char validation for signed-in users and `<AskAiOAuthPrompt />` for signed-out visitors); and display the signed-in user's monospace daily quota badge (`10/10 LEFT TODAY` or `ADMIN • UNLIMITED`) persistently beside **`Ask AI`**.
3. **Structured Section Prompting & Zero-`**` Parser (`web/src/lib/ai-search/context-builder.ts`, `web/src/lib/ai-search/markdown-parser.ts`, `web/src/components/search/ai-synthesis-panel.tsx`)**: Update `AI_SYNTHESIS_SYSTEM_PROMPT` to require `### Consensus & Bottom Line`, `### Evidence Breakdown`, and `### Limitations & Gaps` sections with bullet points and inline `[S1]..[S5]` citations; implement a deterministic, zero-dependency structured markdown/citation parser (`parseStructuredAiSynthesis`) that renders labeled Neo-Brutalist subsections, `<ul>`/`<ol>` lists, `<strong>` bold spans, and `[S1]..[S5]` `/study/[id]` links while stripping 100% of unmatched, mid-stream, or stray `**` characters.

## Technical Context

**Language/Version**: TypeScript 5.8 (`strict: true`, Node.js 20+), React 19, Next.js 15.2 App Router  
**Primary Dependencies**: Tailwind CSS v4 (`@tailwindcss/postcss`), overridden `shadcn/ui` primitives (`Button`, `Input`, `Card`, `Badge`, `Tabs`), `lucide-react`, `next/link`, `next/navigation`, `zod` (**zero** new npm packages or third-party Markdown libraries)  
**Storage**: N/A (reuses existing Supabase Free PostgreSQL tables `public.studies`, `public.ai_search_cache`, and `public.user_ai_daily_quotas` with zero schema migrations)  
**Testing**: Vitest 3 (`npx vitest run`), TypeScript (`npm run typecheck` / `tsc --noEmit`), ESLint (`npm run lint`)  
**Target Platform**: Web (Vercel Hobby Next.js runtime; responsive desktop `>= 640px` and mobile `< 640px`)  
**Project Type**: Monorepo web application (`/web`)  
**Performance Goals**: Preserve `revalidate = 3600` ISR on `/` (`FilterBar` remains a client-side island); synchronous zero-allocation/low-overhead structured markdown parsing during 60fps progressive SSE token streaming; `< 2,000`-token prompt context budget preserved  
**Constraints**: Strict adherence to Constitution Principle I ($0/month free-tier, zero new dependencies), Principle II (deterministic retrieval & `[S1]..[S5]` citation grounding), Principle III (Neo-Brutalist Sky Blue tokens in Light and Dark themes, zero purple/violet/indigo hues or gradients), Principle IV (100% public standard search, authenticated AI quota & shared TTL cache rules), and Principle V (strict 8-page-route and 2-route-handler boundary)  
**Scale/Scope**: 4 `/web` source files updated (`filter-bar.tsx`, `ai-search-workspace.tsx`, `ai-synthesis-panel.tsx`, `context-builder.ts`, plus `ask-ai-oauth-prompt.tsx` URL helper), 1 new pure parser helper (`web/src/lib/ai-search/markdown-parser.ts`), and 2 updated Vitest test suites (`web/tests/filter-bar.test.ts`, `web/tests/ai-search.test.ts`)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Constitution Principle | Pre-Research Gate | Post-Design Evaluation (Phase 1) | Status |
|------------------------|-------------------|----------------------------------|--------|
| **I. Architecture & $0/Month Free-Tier First** | Confined to `/web` client components and prompt/parser helpers; preserves `revalidate = 3600` ISR on `/`; introduces zero new npm packages, Markdown libraries, or paid services. | Verified in [research.md](./research.md) and [contracts/search-and-synthesis-ui.md](./contracts/search-and-synthesis-ui.md). `parseStructuredAiSynthesis` is a ~90-line dependency-free TypeScript module. | ✅ PASS |
| **II. Scientific Integrity & Deterministic AI Pipeline** | `AI_SYNTHESIS_SYSTEM_PROMPT` preserves strict `[S1]..[Sn]` grounding, evidence/inspection-depth reporting, gap-stating rules, and prompt-injection defenses while structuring output into three deterministic sections. | Verified in [data-model.md](./data-model.md) Section 2 and [contracts/search-and-synthesis-ui.md](./contracts/search-and-synthesis-ui.md) Section 4.1. All `[S1]..[S5]` citations link to `/study/[id]` inside paragraphs, lists, and bold spans. | ✅ PASS |
| **III. Neo-Brutalist Sky Blue Design System** | All search inputs, **`Search`** / **`Ask AI`** buttons, inline validation notices, persistent quota badges, and synthesis section cards use `2px solid var(--color-border)`, hard offset shadows, `#38BDF8` Sky Blue accent with `#0F172A` dark ink, `Space Grotesk` / `Inter` / `JetBrains Mono`, and Light/Dark parity with zero purple/violet hues. | Verified in [contracts/search-and-synthesis-ui.md](./contracts/search-and-synthesis-ui.md) Sections 2–4. | ✅ PASS |
| **IV. Performance, Egress & Security Guardrails** | Pressing `Enter` or clicking **`Search`** on `/` and `/search` always runs 100% public standard search (`0` AI quota); **`Ask AI`** enforces `< 3`-char client validation before network calls and preserves `/api/ai-search` `401` auth, `<2,000`-token cap, pre-quota shared TTL cache, and atomic quota RPCs. | Verified in [contracts/search-and-synthesis-ui.md](./contracts/search-and-synthesis-ui.md) Sections 2.2 & 3.2. | ✅ PASS |
| **V. Scoped Route Discipline** | Zero new page routes or Route Handlers added; all changes operate within existing `/` and `/search` page routes and `/api/ai-search`. | Verified in Project Structure below and enforced by the automated route-boundary test in `web/tests/ai-search.test.ts`. | ✅ PASS |
| **VI. Verification & Deterministic Code Quality** | Testable acceptance criteria (`SC-001`–`SC-005`); covered by `tsc --noEmit`, `next lint`, and deterministic Vitest unit tests in `web/tests/filter-bar.test.ts` and `web/tests/ai-search.test.ts`. | Verified in [quickstart.md](./quickstart.md) Section 1. | ✅ PASS |

## Project Structure

### Documentation (this feature)

```text
specs/007-search-improvement/
├── plan.md                                      # This file (/speckit-plan command output)
├── research.md                                  # Phase 0 output (/speckit-plan command)
├── data-model.md                                # Phase 1 output (/speckit-plan command)
├── quickstart.md                                # Phase 1 output (/speckit-plan command)
├── contracts/                                   # Phase 1 output (/speckit-plan command)
│   └── search-and-synthesis-ui.md
└── tasks.md                                     # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
web/
├── src/
│   ├── app/
│   │   ├── page.tsx                             # Unchanged ISR homepage (mounts FeedClient -> FilterBar)
│   │   └── search/
│   │       └── page.tsx                         # Existing /search SSR page (hydrates initialQuota and passes to AiSearchWorkspace)
│   ├── components/
│   │   ├── feed/
│   │   │   └── filter-bar.tsx                   # UPDATED: Direct search input + Search (submit) & Ask AI (1-step nav / inline validation / OAuth prompt)
│   │   └── search/
│   │       ├── ask-ai-oauth-prompt.tsx          # UPDATED: Exports buildStandardSearchPath alongside buildAskAiReturnPath
│   │       ├── ai-search-workspace.tsx          # UPDATED: Direct 1-click Search & Ask AI buttons + persistent signed-in quota badge (removes 2-step Synthesize toggle)
│   │       └── ai-synthesis-panel.tsx           # UPDATED: Renders structured sections, semantic lists, strong spans, and [S1]..[S5] links via parseStructuredAiSynthesis
│   └── lib/
│       └── ai-search/
│           ├── context-builder.ts               # UPDATED: AI_SYNTHESIS_SYSTEM_PROMPT mandates 3-section structure and forbids paragraph-level ** ** wrapping
│           └── markdown-parser.ts               # NEW: Pure, zero-dependency structured section, list, strong, and citation parser/sanitizer (0 raw ** output)
└── tests/
    ├── filter-bar.test.ts                       # UPDATED: Verifies inline search input, dual Search/Ask AI actions, URL builders, and Neo-Brutalist tokens
    └── ai-search.test.ts                        # UPDATED: Verifies structured system prompt, parseStructuredAiSynthesis zero-** invariant, and 1-click workspace controls
```

**Structure Decision**: Confines all modifications to the existing `/web` workspace (`web/src/components/feed/`, `web/src/components/search/`, `web/src/lib/ai-search/`, and `web/tests/`). Extracting `parseStructuredAiSynthesis` into `web/src/lib/ai-search/markdown-parser.ts` keeps the structured section/list/inline-token parser pure and directly unit-testable in `web/tests/ai-search.test.ts` while `AiSynthesisPanel` handles React/Next.js `<Link>` rendering.

## Complexity Tracking

No Constitution Check violations exist; all 6 core principles in Constitution v1.2.0 pass without exception.
