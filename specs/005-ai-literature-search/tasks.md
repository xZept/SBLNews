# Tasks: Unified Authenticated AI-Assisted Literature Search

**Input**: Design documents from `/specs/005-ai-literature-search/`
**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/ai-search-route-and-ui.md](./contracts/ai-search-route-and-ui.md), [quickstart.md](./quickstart.md)

**Tests**: Unit tests for deterministic query normalization, `<2,000`-token study context capping, `401`/quota/cache/refund guards, 3-tier `429`/timeout failover, egress-safe column projections, and the Constitution Principle V route boundary are included per Constitution Principle VI and `quickstart.md`.

**Organization**: Tasks are grouped by user story (`US1`–`US4`) in priority order (`P1` → `P2`) so each increment can be implemented and validated independently.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: Which user story this task belongs to (`[US1]`, `[US2]`, `[US3]`, `[US4]`)
- Exact file paths are included in every task description

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Verify clean workspace baseline before schema, API, and UI feature work

- [X] T001 Verify clean baseline checks (`npm run typecheck`, `npm run lint`, `npm test` in `web/`, and `pytest -v` in `pipeline/`) and confirm `web/src/app/page.tsx` retains `revalidate = 3600` ISR

---

## Phase 2: Foundational (Blocking Database Migration, Projections, Validation & Config)

**Purpose**: Core PostgreSQL tables, RLS policies, atomic quota/cache RPCs, egress-safe projections, Zod schemas, and runtime tier configuration required before any user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T002 Author sequential SQL migration `supabase/migrations/0011_ai_search_cache_and_quota.sql` implementing: (a) `public.ai_search_cache` (`cache_key text PRIMARY KEY CHECK (char_length(cache_key) = 64)`, `normalized_query text NOT NULL CHECK (char_length(btrim(normalized_query)) >= 3 AND char_length(normalized_query) <= 300)`, `filter_signature text NOT NULL`, `answer_markdown text NOT NULL CHECK (char_length(btrim(answer_markdown)) >= 1 AND char_length(answer_markdown) <= 8000)`, `citations jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(citations) = 'array' AND jsonb_array_length(citations) BETWEEN 1 AND 5)`, `tier_used text NOT NULL CHECK (tier_used IN ('groq', 'openrouter', 'gemini'))`, `created_at timestamptz NOT NULL DEFAULT now()`, `expires_at timestamptz NOT NULL CHECK (expires_at > created_at)`), `idx_ai_search_cache_expires_at`, RLS (`ai_search_cache_select_authenticated` `USING (expires_at > now())`), and `REVOKE ALL` / `GRANT SELECT TO authenticated`; (b) `public.user_ai_daily_quotas` (`user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE`, `usage_date date NOT NULL DEFAULT (now() AT TIME ZONE 'UTC')::date`, `synthesis_count int NOT NULL DEFAULT 0 CHECK (synthesis_count >= 0)`, `updated_at timestamptz NOT NULL DEFAULT now()`, `PRIMARY KEY (user_id, usage_date)`), RLS (`user_ai_daily_quotas_select_own`), and `REVOKE ALL` / `GRANT SELECT TO authenticated`; and (c) `SECURITY DEFINER SET search_path = ''` RPCs (`REVOKE EXECUTE FROM PUBLIC, anon; GRANT EXECUTE TO authenticated, service_role`): `public.get_my_ai_quota_status(p_daily_limit int DEFAULT 10)`, `public.check_and_increment_ai_quota(p_daily_limit int DEFAULT 10)` (with `public.is_admin()` unlimited bypass + atomic `ON CONFLICT ... DO UPDATE ... WHERE synthesis_count < v_limit`), `public.refund_ai_quota(p_daily_limit int DEFAULT 10)`, `public.get_cached_ai_synthesis(p_cache_key text)`, and `public.put_cached_ai_synthesis(...)` (clamping `p_ttl_days` to `7` or `30` days and pruning up to 50 expired rows)
- [X] T003 [P] Extend egress-safe column projections and TypeScript interfaces in `web/src/lib/queries/projections.ts` adding `AI_CITATION_STUDY_COLUMNS` (`STUDY_SUMMARY_COLUMNS` + `limitations`, strictly excluding `abstract_text` and `embedding`), `AiCitationLabel`, `AiTierName`, `AiCitationStudy`, and `AiQuotaStatus`
- [X] T004 [P] Create runtime Zod validation schema in `web/src/lib/validations/ai-search.ts` (`AI_QUERY_MIN_LENGTH = 3`, `AI_QUERY_MAX_LENGTH = 300`, and `AiSearchRequestSchema` reusing `StudyDesignEnum` and filter preprocessors for `study_design`, `min_duration_weeks` `0..520`, and `trained_only`)
- [X] T005 [P] Create environment-configurable AI search settings helper in `web/src/lib/ai-search/config.ts` reading `AI_DAILY_QUOTA_LIMIT` (default `10`, clamped `1..100`), `AI_CACHE_TTL_DAYS` (default `7`, supporting `7` or `30`), and 3-tier inference configs (`GROQ_API_KEY` / `AI_TIER1_GROQ_MODEL="openai/gpt-oss-20b"` / `AI_TIER1_TIMEOUT_MS=6000`, `OPENROUTER_API_KEY` / `AI_TIER2_OPENROUTER_MODEL="nvidia/nemotron-3-ultra-550b-a55b:free"` / `AI_TIER2_OPENROUTER_ALT_MODEL="nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free"` / `AI_TIER2_TIMEOUT_MS=7000`, `GEMINI_API_KEY` / `AI_TIER3_GEMINI_MODEL="gemini-3.5-flash-lite"` / `AI_TIER3_TIMEOUT_MS=8000`)

**Checkpoint**: Foundation ready — user story implementation can now begin in parallel or priority order

---

## Phase 3: User Story 1 - Citation-Grounded Multi-Study AI Synthesis on `/search` (Priority: P1) 🎯 MVP

**Goal**: Enable signed-in readers on `/search` to submit natural-language training questions with **"Ask AI"** active and receive a progressive, citation-grounded synthesis over only the top 3–5 deterministically retrieved studies (`<2,000` tokens), complete with inline `[S1]`..`[S5]` links to `/study/[id]`, deterministic evidence badges, `Full-Text` vs. `Abstract-Only` transparency badges, and methodological limitations, while keeping standard search 100% public and unlimited.

**Independent Test**: Sign in on `/search`, activate **"Ask AI"**, submit a multi-study training question, and verify a synthesis panel streams above the matching study cards citing only the top 3–5 retrieved studies with evidence and `Full-Text` / `Abstract-Only` badges; test a 0-match query to confirm a deterministic "no matching studies" message with zero ungrounded advice; sign out and confirm standard keyword/semantic/filter search remains completely open.

- [X] T006 [P] [US1] Add `getAiCitationStudies(params, limit = 5)` in `web/src/lib/queries/studies.ts` calling `search_studies_hybrid` (`match_limit` `3..5`) and projecting `limitations` via `AI_CITATION_STUDY_COLUMNS` (strictly excluding `abstract_text` and `embedding`)
- [X] T007 [P] [US1] Create deterministic `<2,000`-token study context builder and scientific grounding system prompt in `web/src/lib/ai-search/context-builder.ts` (`buildAiStudyContext`, capping per-study text fields, estimating tokens via `Math.ceil(chars / 3.5)`, trimming/dropping beyond top 3 studies if needed to stay strictly `< 2,000` tokens, and enforcing `[S1]`..`[Sn]` inline citations + prompt-injection resistance)
- [X] T008 [US1] Implement `POST /api/ai-search` core synthesis handler in `web/src/app/api/ai-search/route.ts` enforcing server-side `supabase.auth.getUser()` (`401 Unauthorized`), `AiSearchRequestSchema` (`400 Bad Request`), `getAiCitationStudies`, deterministic `0`-match `no_matching_studies` JSON response (`FR-011`), and progressive `text/event-stream` (`meta`, `delta`, `done`, `error`) streaming
- [X] T009 [P] [US1] Build `<AiSynthesisPanel />` in `web/src/components/search/ai-synthesis-panel.tsx` with Neo-Brutalist Sky Blue styling (`border-2 border-border shadow-card rounded-md`, `Inter` `max-w-[72ch]` prose, clickable `[S1]`..`[S5]` links to `/study/[id]`, deterministic evidence badges, `Full-Text` `#BBF7D0` vs. `Abstract-Only` `#FED7AA` inspection badges, and methodological limitations) across Light and Dark themes
- [X] T010 [US1] Build `<AiSearchWorkspace />` in `web/src/components/search/ai-search-workspace.tsx` and integrate it into `web/src/app/search/page.tsx` with an **"Ask AI"** toggle beside standard **Search** (preserving 100% public, unlimited standard search) and SSE stream rendering above matching `StudyCard` results
- [X] T011 [P] [US1] Add unit tests in `web/tests/projections.test.ts` and `web/tests/ai-search.test.ts` covering `AI_CITATION_STUDY_COLUMNS` egress guards, `AiSearchRequestSchema` bounds (`3`–`300` chars), `<2,000`-token context capping with oversized study fields, `401 Unauthorized` rejection, and `0`-study deterministic handling

**Checkpoint**: User Story 1 (MVP) is independently functional and verifiable

---

## Phase 4: User Story 2 - Main-Feed "Ask AI" Entrypoint & Logged-Out Sign-In Teaser on `/` and `/search` (Priority: P1)

**Goal**: Surface a Neo-Brutalist **"Ask AI"** control inside the sticky `FilterBar` on `/` (preserving `revalidate = 3600` ISR and zero marketing hero banner) and on `/search`, showing an inline Google/GitHub OAuth sign-in prompt to signed-out visitors (with zero calls to `/api/ai-search`) and expanding an inline query bar for signed-in users on `/` that routes directly to `/search?q=...&ai=1`.

**Independent Test**: Open `/` and `/search` while signed out, click **"Ask AI"**, and confirm `<AskAiOAuthPrompt />` appears with Google/GitHub sign-in buttons and zero `/api/ai-search` requests; sign in on `/`, click **"Ask AI"** in `FilterBar`, submit a training question, and confirm navigation to `/search?q=...&ai=1` automatically runs AI synthesis while `/` remains ISR-cached.

- [X] T012 [P] [US2] Build `<AskAiOAuthPrompt />` in `web/src/components/search/ask-ai-oauth-prompt.tsx` using Neo-Brutalist Sky Blue Light/Dark tokens (`2px solid var(--color-border)`, `shadow-card`, `rounded-md`, zero purple/gradients/blur) with **Sign in with Google** and **Sign in with GitHub** actions routing through `/auth/callback?next=...` with encoded `/search?ai=1&q=...` return destination
- [X] T013 [US2] Update `web/src/components/feed/filter-bar.tsx` to add the client-island **"Ask AI"** toggle button (reading auth state from `useAccountProfile()` so `web/src/app/page.tsx` remains cookie-free `revalidate = 3600` ISR), rendering `<AskAiOAuthPrompt />` when signed out and expanding a compact inline query form (`maxLength={300}`) navigating to `/search?q=...&ai=1` (preserving active `study_design` and `trained_only` filters) when signed in
- [X] T014 [US2] Update `<AiSearchWorkspace />` in `web/src/components/search/ai-search-workspace.tsx` to display `<AskAiOAuthPrompt />` when signed-out visitors activate **"Ask AI"** on `/search` (with zero `/api/ai-search` calls) and auto-trigger synthesis on `/search?q=...&ai=1` arrival

**Checkpoint**: User Stories 1 AND 2 both work independently across `/` and `/search`

---

## Phase 5: User Story 3 - Shared Answer Caching & Fair Daily Member Quota Enforcement (Priority: P2)

**Goal**: Deduplicate equivalent community questions via deterministic query normalization and a shared 7/30-day TTL cache (`< 1s` cache hits with `0` quota deducted), display the user's remaining daily allowance (`10/10 LEFT TODAY` or `ADMIN • UNLIMITED`) immediately upon activating **"Ask AI"** on `/search`, and atomically enforce the daily UTC cap for standard members while keeping `admin` accounts unlimited.

**Independent Test**: Activate **"Ask AI"** on `/search` as Standard Member A (`10/10 LEFT TODAY` visible before submit), submit a novel question (`9/10 LEFT TODAY`), then sign in as Standard Member B and submit the same question with different casing/punctuation to confirm an instant cached response (`0` quota deducted); exhaust Member A's 10 uncached syntheses to verify `429` UTC reset notice while standard search and cached AI answers still work; verify an `admin` account shows `ADMIN • UNLIMITED`.

- [X] T015 [P] [US3] Create deterministic query + filter normalizer and SHA-256 hex digest generator in `web/src/lib/ai-search/cache-key.ts` (`normalizeAiQueryKey`, trimming, lowercasing, collapsing whitespace, stripping leading/trailing punctuation runs, and canonicalizing `study_design`, `min_duration_weeks`, and `trained_only`)
- [X] T016 [P] [US3] Create server quota & shared cache RPC wrappers in `web/src/lib/ai-search/quota-and-cache.ts` (`getMyAiQuotaStatus`, `checkAndIncrementAiQuota`, `refundAiQuota`, `getCachedAiSynthesis`, `putCachedAiSynthesis`)
- [X] T017 [US3] Wire pre-quota shared cache lookup (`mode: "cached"` instant JSON), atomic `check_and_increment_ai_quota` (`429 QUOTA_EXCEEDED` with `resetsAtUtc`), `refund_ai_quota` on `0`-study matches, `put_cached_ai_synthesis` on stream completion, and `GET /api/ai-search` quota status into `web/src/app/api/ai-search/route.ts`
- [X] T018 [US3] Hydrate initial `AiQuotaStatus` server-side in `web/src/app/search/page.tsx` for signed-in users and update `web/src/components/search/ai-search-workspace.tsx` and `web/src/components/search/ai-synthesis-panel.tsx` to display `10/10 LEFT TODAY` / `ADMIN • UNLIMITED` immediately on **"Ask AI"** activation, update remaining count after uncached synthesis, render `CACHED • 0 QUOTA USED` on cache hits, and show the UTC reset notice on `429`
- [X] T019 [P] [US3] Add unit tests in `web/tests/ai-search.test.ts` covering `normalizeAiQueryKey` equivalence, shared cache-hit quota bypass, `10`/day standard member cap (`429`), `admin` unlimited bypass, and `0`-study quota refund

**Checkpoint**: Shared TTL caching and atomic daily quota enforcement are independently functional and tested

---

## Phase 6: User Story 4 - Multi-Tier AI Service Continuity & Non-Penalizing Failure Recovery (Priority: P2)

**Goal**: Stream live uncached syntheses via dependency-free native `fetch` with automatic `429`/timeout/`5xx` failover across Tier 1 (`Groq` `openai/gpt-oss-20b`) → Tier 2 (`OpenRouter :free`) → Tier 3 (`Google Gemini Free Tier`), and atomically refund user quota without caching if all three tiers fail.

**Independent Test**: Simulate `429`/timeout on Tier 1 and verify seamless completion via Tier 2; simulate `429`/timeout on Tier 1 and Tier 2 and verify completion via Tier 3; simulate failures across all three tiers and verify `503 ALL_TIERS_FAILED` triggers `refund_ai_quota()`, writes nothing to `public.ai_search_cache`, and renders an actionable retry notice above standard study cards.

- [X] T020 [US4] Create dependency-free native `fetch` 3-tier streaming failover client in `web/src/lib/ai-search/failover-client.ts` (`synthesizeWithFailover`) supporting Groq SSE, OpenRouter `:free` SSE (with alt model fallback), and Gemini `streamGenerateContent?alt=sse` with per-tier `AbortSignal.timeout` and pre-stream first-token commit boundary
- [X] T021 [US4] Wire `synthesizeWithFailover` into `web/src/app/api/ai-search/route.ts` with `refund_ai_quota()` + `503 ALL_TIERS_FAILED` when all three tiers fail (and mid-stream `error` refund without caching) and surface the retry notice banner in `web/src/components/search/ai-search-workspace.tsx`
- [X] T022 [P] [US4] Add unit tests in `web/tests/ai-search.test.ts` simulating Tier 1 `429`/timeout → Tier 2 → Tier 3 automatic failover and verifying `refund_ai_quota()` + zero cache writes when all three tiers fail

**Checkpoint**: All 4 user stories are independently functional, resilient, and unit-tested

---

## Phase 7: Polish & Cross-Cutting Verification

**Purpose**: Route-boundary enforcement, Light/Dark Neo-Brutalist visual parity, and final automated verification gates

- [X] T023 [P] Add Constitution Principle V route-boundary test in `web/tests/ai-search.test.ts` asserting strictly the 8 approved user-facing `page.tsx` routes and strictly the 2 approved internal `route.ts` handlers (`/auth/callback` and `/api/ai-search`)
- [X] T024 Run full verification gates across `/web` (`npm run typecheck`, `npm run lint`, `npm test`, `npm run build`) and `/pipeline` (`pytest -v`), and validate `specs/005-ai-literature-search/quickstart.md` scenarios across default Light Mode and opt-in Dark Mode (confirming zero purple/violet/indigo hues, zero gradients, and zero `backdrop-blur`)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: Starts immediately
- **Foundational (Phase 2)**: Depends on Phase 1 (`T001`); `T003`, `T004`, and `T005` can run in parallel with `T002` — **BLOCKS** all user stories
- **User Story 1 (Phase 3, P1 🎯 MVP)**: Depends on Phase 2 (`T002`–`T005`)
- **User Story 2 (Phase 4, P1)**: Depends on Phase 2 and `<AiSearchWorkspace />` from Phase 3 (`T010`), while `T012` (`<AskAiOAuthPrompt />`) can be built in parallel
- **User Story 3 (Phase 5, P2)**: Depends on Phase 2 (`T002`, `T005`) and Phase 3 (`T008`, `T010`); `T015` and `T016` can run in parallel
- **User Story 4 (Phase 6, P2)**: Depends on Phase 3 (`T008`) and Phase 5 (`T016`, `T017`)
- **Polish (Phase 7)**: Depends on all desired user stories (`T001`–`T022`)

### Parallel Opportunities

- **Phase 2**: `T003` (`projections.ts`), `T004` (`validations/ai-search.ts`), and `T005` (`ai-search/config.ts`) in parallel alongside `T002` (`0011_ai_search_cache_and_quota.sql`)
- **Phase 3 (US1)**: `T006` (`studies.ts`), `T007` (`context-builder.ts`), and `T009` (`ai-synthesis-panel.tsx`) in parallel
- **Phase 4 (US2)**: `T012` (`ask-ai-oauth-prompt.tsx`) in parallel with `T013` (`filter-bar.tsx`)
- **Phase 5 (US3)**: `T015` (`cache-key.ts`) and `T016` (`quota-and-cache.ts`) in parallel

---

## Parallel Example: User Story 1

```bash
# Launch independent US1 modules in parallel after Phase 2:
Task: "Add getAiCitationStudies in web/src/lib/queries/studies.ts" (T006)
Task: "Create <2,000-token context builder in web/src/lib/ai-search/context-builder.ts" (T007)
Task: "Build <AiSynthesisPanel /> in web/src/components/search/ai-synthesis-panel.tsx" (T009)
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1 (`T001`) + Phase 2 (`T002`–`T005`).
2. Complete Phase 3 (`T006`–`T011`) for authenticated, citation-grounded multi-study AI synthesis on `/search`.
3. **STOP and VALIDATE**: Confirm `401` auth guard, `<2,000`-token context cap, `0`-match safety, and 100% public standard search.

### Incremental Delivery

1. **MVP (`US1`)**: `/search` citation-grounded AI synthesis.
2. **Discovery & Sign-In Conversion (`US2`)**: `/` sticky `FilterBar` **"Ask AI"** entrypoint + logged-out `<AskAiOAuthPrompt />`.
3. **Free-Tier Protection (`US3`)**: Deterministic query normalization, shared 7/30-day TTL cache, and atomic `10`/day quota + `admin` unlimited bypass.
4. **Resilience (`US4`)**: 3-tier `Groq` → `OpenRouter :free` → `Gemini Free Tier` failover + non-penalizing quota refunds.
5. **Final Gate (`Phase 7`)**: Route-boundary checks, `tsc --noEmit`, `next lint`, `vitest run`, `next build`, and `pytest -v`.
