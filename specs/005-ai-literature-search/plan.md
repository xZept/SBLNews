# Implementation Plan: Unified Authenticated AI-Assisted Literature Search

**Branch**: `005-ai-literature-search` | **Date**: 2026-11-28 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/005-ai-literature-search/spec.md`

## Summary

Implement Option B's Unified Next.js Authenticated AI-Assisted Literature Search across `/web` and `/supabase/migrations` within the $0/month free-tier ceiling, ISR main-feed architecture, and Constitution v1.2.0 route and scientific integrity guardrails:

1. **Shared 7/30-Day TTL Cache & Atomic Per-User UTC Daily Quota (`/supabase/migrations/0011_ai_search_cache_and_quota.sql`)**: Provision `public.ai_search_cache` (`cache_key` SHA-256 primary key, normalized query + canonical filter signature, markdown synthesis, cited 3–5 study summary JSONB, and configurable 7/30-day natural TTL expiration) and `public.user_ai_daily_quotas` (`PRIMARY KEY (user_id, usage_date)` in UTC), protected by Row-Level Security (RLS), least-privilege table grants (withholding direct client writes), and atomic `SECURITY DEFINER` RPCs (`get_my_ai_quota_status`, `check_and_increment_ai_quota` with `public.is_admin()` unlimited bypass and `10`/UTC day default standard member cap, `refund_ai_quota`, `get_cached_ai_synthesis`, and `put_cached_ai_synthesis`).
2. **Authenticated `/api/ai-search` Route Handler, `<2,000`-Token Hybrid Context Builder & 3-Tier Failover Client (`/web/src/app/api/ai-search/route.ts` & `/web/src/lib/ai-search/`)**: Enforce `supabase.auth.getUser()` (`401 Unauthorized` for unauthenticated callers) and runtime Zod input validation (`AiSearchRequestSchema`); normalize queries deterministically (`normalizeAiQueryKey`) and serve unexpired shared cache hits in `< 1s` (`application/json`) before deducting user quota; reserve daily quota atomically on cache misses and refund automatically if `search_studies_hybrid` returns `0` studies (`FR-011`) or all three inference tiers fail (`FR-013`); assemble the top 3–5 deterministically retrieved studies via `AI_CITATION_STUDY_COLUMNS` (strictly excluding `abstract_text` and `embedding`) capped below `2,000` tokens (`buildAiStudyContext`); and stream live syntheses progressively (`text/event-stream`) using native `fetch` with per-tier connect/TTFB timeouts and automatic failover across **Tier 1: Groq (`openai/gpt-oss-20b`)** → **Tier 2: OpenRouter `:free` (`nvidia/nemotron-3-ultra-550b-a55b:free` / `nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free`)** → **Tier 3: Google Gemini Free Tier (`gemini-3.5-flash-lite`)**.
3. **Neo-Brutalist Main-Feed (`/`) "Ask AI" Entrypoint, Logged-Out OAuth Teaser & `/search` Synthesis Workspace (`/web/src/components/`)**: Add the client-island **"Ask AI"** toggle to `FilterBar` on `/` (preserving `revalidate = 3600` ISR with zero marketing hero banner)—presenting an inline Google/GitHub `<AskAiOAuthPrompt />` for signed-out visitors and an inline query input routing to `/search?q=...&ai=1` for signed-in users; enhance `/search` with an **"Ask AI"** toggle that immediately displays the user's monospace quota badge (`10/10 LEFT TODAY` or `ADMIN • UNLIMITED`) upon activation before submitting and renders `<AiSynthesisPanel />` with clickable inline citations (`[S1]`..`[S5]`), deterministic evidence badges, `Full-Text` vs. `Abstract-Only` transparency badges, and methodological limitations above the matching study cards while keeping standard literature search 100% public and unlimited.

## Technical Context

**Language/Version**: TypeScript 5.8 (`strict: true`, Node.js 20+) in `/web`; SQL (PostgreSQL 15+) in `/supabase/migrations` (`/pipeline` Python 3.12+ unchanged, verified via `pytest` regression suite)

**Primary Dependencies**:
- `/web`: Next.js 15.2 (App Router & Route Handlers), React 19, Tailwind CSS v4, overridden `shadcn/ui` primitives, `@supabase/supabase-js`, `@supabase/ssr`, `zod`, `lucide-react`, `vitest`, and native Web `fetch` / `ReadableStream` / `crypto.subtle` (**zero** new npm packages or LLM client SDKs introduced)

**Storage**:
- Supabase Free PostgreSQL (`public.studies`, `public.profiles`, `public.ai_search_cache`, `public.user_ai_daily_quotas`) with `pgvector` (`search_studies_hybrid`), Row-Level Security (RLS), and atomic `SECURITY DEFINER` RPCs

**Testing**:
- `/web`: `tsc --noEmit` (`strict: true`), `next lint`, `vitest run` (unit tests for deterministic query normalization, `<2,000`-token context capping, `401` auth guard, pre-quota cache hit bypass, atomic `10`/day quota + admin bypass, 0-study/all-tier-failure quota refunds, 3-tier `429`/timeout failover, egress-safe projections, and Principle V route boundary checks), and `next build` (ISR & route verification)
- `/pipeline`: `pytest` regression suite

**Target Platform**: Vercel Hobby ($0/month) for `/web` (including `/api/ai-search`); Supabase Free ($0/month) for PostgreSQL, `pgvector`, and Google/GitHub OAuth

**Project Type**: Monorepo web application (`/web`) + sequential Git-first SQL migrations (`/supabase/migrations`) + scheduled ingestion worker (`/pipeline`)

**Performance Goals**:
- Preserve `revalidate = 3600` ISR static caching on `/` (`getFeedStudies()` + `getTopAuraUsers(10)`) and `/guidelines`, plus `force-static` on `/methodology` (`FR-002`, `SC-002`)
- `< 1s` response time on shared query-answer cache hits with `0` quota deducted and `0` upstream embedding/LLM calls (`FR-007`, `SC-004`)
- Strictly `< 2,000` tokens assembled prompt context across the top 3–5 retrieved studies per `/api/ai-search` request (`FR-009`, `SC-003`)
- Bounded per-tier connect/TTFB timeouts (`6s` Tier 1 Groq, `7s` Tier 2 OpenRouter `:free`, `8s` Tier 3 Gemini Free Tier) with progressive SSE token streaming on live syntheses (`FR-012`, `SC-005`)

**Constraints**:
- Strict $0/month recurring cost ceiling (no Render Free backend, no Upstash Redis, no ORMs, no LLM client SDKs, and no extra UI libraries)
- Strict scientific grounding (Principle II): synthesize exclusively over the top 3–5 published studies returned by deterministic `search_studies_hybrid`; display deterministic evidence badges, `Full-Text` vs. `Abstract-Only` inspection badges, and methodological limitations; never fabricate citations, re-score `quality_score`, or mutate `/guidelines`
- Neo-Brutalist Sky Blue visual parity across mandatory default Light Mode and opt-in Dark Mode (`2px solid` borders, zero-blur hard offset shadows, max `6px`/`4px` radii, `#38BDF8` Sky Blue accent with `#0F172A` dark ink, `Space Grotesk` / `Inter` `65ch–75ch` / `JetBrains Mono`, zero `backdrop-blur`, and zero purple/violet/indigo hues)
- Strict route discipline per Constitution Principle V v1.2.0: 8 approved user-facing page routes and 2 approved internal Route Handlers (`/auth/callback` and `/api/ai-search`)

**Scale/Scope**: 1 sequential SQL migration (`0011_ai_search_cache_and_quota.sql` adding 2 tables + 5 RPCs), 1 approved internal Next.js Route Handler (`web/src/app/api/ai-search/route.ts`), 0 new user-facing page routes (updating `/` `FilterBar` and `/search`), 4 modular AI search domain helpers under `web/src/lib/ai-search/`, and 3 Neo-Brutalist UI components under `web/src/components/search/`

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Constitution Principle | Pre-Research Gate | Post-Design Evaluation (Phase 1) | Status |
|------------------------|-------------------|----------------------------------|--------|
| **I. Architecture & $0/Month Free-Tier First** | Unified `/api/ai-search` Route Handler inside `/web` on Vercel Hobby ($0/mo); Supabase Free PostgreSQL for cache & atomic quota RPCs (no Render Free service, no Upstash Redis); native `fetch` 3-tier failover (`Groq` → `OpenRouter :free` → `Gemini Free Tier`) with zero LLM SDKs; client-island **"Ask AI"** teaser on `/` preserving `revalidate = 3600` ISR. | Verified in [research.md](./research.md), [data-model.md](./data-model.md), and [contracts/ai-search-route-and-ui.md](./contracts/ai-search-route-and-ui.md). `web/src/app/page.tsx` remains 100% cookie-free ISR; `FilterBar` reads client auth context from `useAccountProfile()`. | ✅ PASS |
| **II. Scientific Integrity & Deterministic AI Pipeline** | Retrieval and ranking execute 100% deterministically via `search_studies_hybrid` (`tsvector` + `pgvector` RRF + `quality_score`); synthesis is strictly confined to the top 3–5 retrieved published studies with inline `[S1]`..`[S5]` links, deterministic evidence badges, `Full-Text` vs. `Abstract-Only` transparency badges, and methodological limitations; `/guidelines` is never touched. | Verified in [data-model.md](./data-model.md) Section 3 and [contracts/ai-search-route-and-ui.md](./contracts/ai-search-route-and-ui.md) Section 3.2: `0`-study queries return a deterministic no-match message without calling LLMs (`FR-011`). | ✅ PASS |
| **III. Neo-Brutalist Sky Blue Design System** | Light Mode mandatory default + opt-in Dark Mode parity; `2px solid var(--color-border)`, hard zero-blur offset shadows, `rounded-md`/`rounded-sm` max radii, `#38BDF8` Sky Blue accent with `#0F172A` dark ink, `Space Grotesk` / `Inter` (`65ch–75ch`) / `JetBrains Mono` (`10/10 LEFT TODAY`, `ADMIN • UNLIMITED`), zero purple/violet/indigo hues, and no hero banner on `/`. | Verified in [contracts/ai-search-route-and-ui.md](./contracts/ai-search-route-and-ui.md) Section 5: `<AskAiOAuthPrompt />`, `FilterBar` inline query bar, and `<AiSynthesisPanel />` use exclusively existing `@theme` Neo-Brutalist tokens and semantic badge variants. | ✅ PASS |
| **IV. Performance, Egress & Security Guardrails** | Zero `SELECT *`; `AI_CITATION_STUDY_COLUMNS` excludes `abstract_text` and `embedding`; `<2,000`-token strict prompt context cap; shared 7/30-day TTL cache lookup *before* quota deduction; `401` server auth check on `/api/ai-search`; 100% public standard search; RLS + atomic `check_and_increment_ai_quota` & `refund_ai_quota` RPCs; runtime Zod validation (`AiSearchRequestSchema`). | Verified in [data-model.md](./data-model.md) Sections 1–3 and [contracts/ai-search-route-and-ui.md](./contracts/ai-search-route-and-ui.md) Sections 2–3. Direct client table writes on `ai_search_cache` and `user_ai_daily_quotas` are revoked at the PostgreSQL privilege level. | ✅ PASS |
| **V. Scoped Route Discipline** | Confines user-facing pages strictly to the 8 approved page routes (updating only `/` and `/search`) and internal endpoints strictly to the 2 approved Next.js Route Handlers (`/auth/callback` and `/api/ai-search`). | Verified in Project Structure below and enforced by the automated route-boundary test in `web/tests/ai-search.test.ts` (`SC-006`). | ✅ PASS |
| **VI. Verification & Deterministic Code Quality** | Testable acceptance criteria (`SC-001`–`SC-006`); `tsc --noEmit`, `next lint`, `vitest run` (covering query normalization, `<2,000`-token context budget, `401`/quota/cache-hit/refund guards, and 3-tier `429` failover), and `next build` in `/web`, plus `pytest` regression check in `/pipeline`. | Verified in [quickstart.md](./quickstart.md) Section 3. | ✅ PASS |

## Project Structure

### Documentation (this feature)

```text
specs/005-ai-literature-search/
├── plan.md                                      # This file (/speckit-plan command output)
├── research.md                                  # Phase 0 output (/speckit-plan command)
├── data-model.md                                # Phase 1 output (/speckit-plan command)
├── quickstart.md                                # Phase 1 output (/speckit-plan command)
├── contracts/                                   # Phase 1 output (/speckit-plan command)
│   └── ai-search-route-and-ui.md
└── tasks.md                                     # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
supabase/
├── config.toml
└── migrations/
    ├── 0001_enable_pgvector_and_enums.sql
    ├── 0002_tables_and_indexes.sql
    ├── 0003_rls_policies_and_triggers.sql
    ├── 0004_hybrid_search_rpc.sql
    ├── 0005_seed_guidelines.sql
    ├── 0006_grant_role_privileges.sql
    ├── 0007_grant_service_role_privileges.sql
    ├── 0008_user_profiles_and_storage.sql
    ├── 0009_socialization_aura_friends_chat.sql
    ├── 0010_grant_private_rls_helper_execute.sql
    └── 0011_ai_search_cache_and_quota.sql       # NEW: public.ai_search_cache, public.user_ai_daily_quotas, RLS, grants & atomic quota/cache RPCs

web/
├── package.json                                 # Unchanged dependencies (zero new npm packages or LLM SDKs)
├── tsconfig.json
├── next.config.ts
├── src/
│   ├── app/                                     # Strictly 8 page routes + 2 approved internal Route Handlers
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   ├── page.tsx                             # Page Route 1 (/): ISR revalidate=3600 preserved; FeedClient -> FilterBar hosts client-island "Ask AI"
│   │   ├── study/[id]/page.tsx                  # Page Route 2 (/study/[id]): Unchanged
│   │   ├── guidelines/page.tsx                  # Page Route 3 (/guidelines): Unchanged ISR
│   │   ├── search/page.tsx                      # Page Route 4 (/search): Hydrates initial AI quota for signed-in users & mounts AiSearchWorkspace above study results
│   │   ├── methodology/page.tsx                 # Page Route 5 (/methodology): Unchanged static
│   │   ├── admin/review/page.tsx                # Page Route 6 (/admin/review): Unchanged RBAC queue
│   │   ├── profile/
│   │   │   ├── page.tsx                         # Page Route 7 (/profile): Unchanged
│   │   │   └── [id]/page.tsx                    # Page Route 8 (/profile/[id]): Unchanged
│   │   ├── auth/callback/route.ts               # Internal Route Handler 1: Existing OAuth PKCE callback
│   │   └── api/
│   │       └── ai-search/
│   │           └── route.ts                     # NEW (Internal Route Handler 2): Authenticated GET quota status & POST synthesis with cache, atomic quota & 3-tier SSE failover
│   ├── components/
│   │   ├── feed/
│   │   │   ├── feed-client.tsx
│   │   │   ├── filter-bar.tsx                   # UPDATED: Adds Neo-Brutalist "Ask AI" button, logged-out AskAiOAuthPrompt & signed-in compact query input navigating to /search?q=...&ai=1
│   │   │   └── study-card.tsx
│   │   └── search/
│   │       ├── ask-ai-oauth-prompt.tsx          # NEW: Accessible inline Neo-Brutalist Google/GitHub OAuth prompt for signed-out "Ask AI" clicks on / and /search
│   │       ├── ai-synthesis-panel.tsx           # NEW: Neo-Brutalist synthesis card with monospace quota badge, streaming prose, clickable [S1]..[S5] links & cited study transparency cards
│   │       └── ai-search-workspace.tsx          # NEW: Client controller on /search managing "Ask AI" toggle, pre-submit quota badge display, SSE stream consumption & standard search parity
│   └── lib/
│       ├── ai-search/
│       │   ├── cache-key.ts                     # NEW: Pure deterministic query + filter normalization & SHA-256 hex key generator
│       │   ├── context-builder.ts               # NEW: Top 3-5 study formatter & deterministic <2,000-token context budgeter + citation grounding system prompt
│       │   ├── failover-client.ts               # NEW: Dependency-free native fetch 3-tier streaming client (Groq -> OpenRouter :free -> Gemini Free Tier)
│       │   └── quota-and-cache.ts               # NEW: Server helpers invoking get_my_ai_quota_status, check_and_increment_ai_quota, refund_ai_quota & cache RPCs
│       ├── queries/
│       │   ├── projections.ts                   # UPDATED: Adds AI_CITATION_STUDY_COLUMNS, AiCitationStudy & AiQuotaStatus types (excluding abstract_text & embedding)
│       │   └── studies.ts                       # UPDATED: Adds getAiCitationStudies(params, limit=5) combining search_studies_hybrid with narrow limitations lookup
│       └── validations/
│           ├── search.ts
│           └── ai-search.ts                     # NEW: Runtime Zod schema (AiSearchRequestSchema, 3..300 char query bounds & filter preprocessors)
└── tests/
    ├── projections.test.ts                      # UPDATED: Verifies AI_CITATION_STUDY_COLUMNS excludes abstract_text & embedding
    ├── social.test.ts                           # Existing 8-page-route guard remains green
    └── ai-search.test.ts                        # NEW: Unit tests for query normalization, <2,000-token cap, 401/quota/cache/refund guards, 3-tier 429/timeout failover & route discipline

pipeline/                                        # Unchanged workspace (verified via pytest regression gate)
```

**Structure Decision**: Extends the existing `/web` + `/supabase/migrations` monorepo layout (leaving `/pipeline` untouched). Placing the deterministic normalization, `<2,000`-token context builder, quota/cache RPC wrappers, and native `fetch` 3-tier failover engine in `web/src/lib/ai-search/` keeps `web/src/app/api/ai-search/route.ts` thin and directly unit-testable under Vitest without adding any third-party SDK dependencies or unapproved page routes.

## Complexity Tracking

No Constitution Check violations exist; all 6 core principles in Constitution v1.2.0 pass without exception.
