# Phase 0 Research: Unified Authenticated AI-Assisted Literature Search

**Branch**: `005-ai-literature-search` | **Date**: 2026-11-28 | **Spec**: [spec.md](./spec.md)

## 1. Unified Next.js Route Handler (`/api/ai-search`) vs. Decoupled Backend

- **Decision**:
  - Implement authenticated AI literature synthesis inside the existing `/web` Next.js App Router runtime via the internal Route Handler `web/src/app/api/ai-search/route.ts` deployed on Vercel Hobby ($0/month), backed by Supabase Free PostgreSQL (`search_studies_hybrid`, shared TTL cache table, and atomic daily quota RPCs).
  - Support two delivery modes from `/api/ai-search` (`Clarification 3`, `FR-007`, `FR-012`):
    1. **Instant Single-Payload JSON (`application/json`)**: Returned for `GET` quota status checks, shared cache hits (`< 1s` latency, zero quota deduction), and deterministic `"no_matching_studies"` responses (`0` matching published studies, zero quota deduction).
    2. **Progressive Server-Sent Events Stream (`text/event-stream`)**: Returned for live uncached syntheses (`event: meta`, `event: delta`, `event: done`, `event: error`) once an upstream inference tier yields its first valid token delta.
- **Rationale**:
  - Eliminates the 30–60 second cold-start spin-up delay of a separate Render Free FastAPI service while keeping recurring infrastructure cost at $0/month (Constitution Principle I).
  - Running inside the same Next.js origin allows `/api/ai-search` to read the caller's Supabase Auth session cookies directly on the server via `createClient()` (`supabase.auth.getUser()`), rejecting unauthenticated requests with `401 Unauthorized` before any cache lookup, quota mutation, or external API call (`FR-005`, `SC-001`).
- **Alternatives Considered**:
  - *Separate Render Free FastAPI / RAG microservice*: Rejected because free-tier container sleep introduces 30–60s cold starts on the first search question and duplicates Supabase Auth verification across runtimes.
  - *Next.js Server Action for AI synthesis*: Rejected because standard Server Actions buffer return payloads rather than exposing a standard HTTP `text/event-stream` response with explicit HTTP status codes (`401`, `400`, `429`, `503`) and `AbortController` cancellation semantics.

## 2. Deterministic Query Normalization & Shared 7/30-Day TTL Cache

- **Decision**:
  - Create a pure deterministic query normalizer `normalizeAiQueryKey(input)` in `web/src/lib/ai-search/cache-key.ts` that:
    1. Trims and lowercases `q`, collapses consecutive whitespace into a single space, and strips leading/trailing punctuation runs (`?`, `.`, `!`, `,`, `;`, `:`, quotes) so `"  Lengthened Partials Hypertrophy?? "` and `"lengthened partials hypertrophy"` produce the exact same normalized query text.
    2. Serializes the canonical filter state (`study_design ?? "all"`, `min_duration_weeks ?? 0`, `trained_only ? "true" : "false"`) alongside the normalized query string.
    3. Computes a SHA-256 hex digest (`cache_key`) of `${normalizedQuery}||design=${design}|min_weeks=${minWeeks}|trained=${trainedOnly}`.
  - Persist shared cached syntheses in `public.ai_search_cache` (`cache_key PRIMARY KEY`, `normalized_query`, `filter_signature`, `answer_markdown`, `citations jsonb`, `tier_used`, `created_at`, `expires_at`) with Row-Level Security enabled and zero direct client table write privileges.
  - Configure cache retention via `AI_CACHE_TTL_DAYS` (clamped to `7` or `30` days, defaulting to `7` days per `Clarification 2` and `FR-007`), relying strictly on natural TTL expiration (`expires_at > now()`) without wiping the community cache on daily study ingestion runs.
- **Rationale**:
  - Checking `public.ai_search_cache` *before* quota deduction, query embedding generation, or LLM invocation (`FR-006`, `FR-007`) makes popular lifting questions instant (`< 1s`, `SC-004`), free of user quota cost, and free of upstream LLM token consumption.
  - Natural 7-day default TTL (configurable up to 30 days) balances literature freshness against community cache hit rates without complex cross-workspace cache-invalidation hooks (`Edge Case 5`).
- **Alternatives Considered**:
  - *Upstash Redis / Vercel KV external cache*: Rejected per Constitution Principle I stack discipline (avoids external Redis services and third-party account dependencies when Supabase PostgreSQL indexed primary-key lookups execute in `< 5 ms`).
  - *Purging all cached rows whenever `/pipeline` or `/admin/review` publishes a study*: Rejected because daily ingestion would flush the entire cache every 24 hours, negating community cache efficiency.

## 3. Atomic Per-User UTC Daily Quota & Non-Penalizing Refund RPCs

- **Decision**:
  - Track daily uncached synthesis consumption in `public.user_ai_daily_quotas` (`user_id uuid`, `usage_date date DEFAULT (now() AT TIME ZONE 'UTC')::date`, `synthesis_count int NOT NULL DEFAULT 0`, `updated_at timestamptz`, `PRIMARY KEY (user_id, usage_date)`).
  - Provide three `SECURITY DEFINER` PostgreSQL RPCs in migration `0011_ai_search_cache_and_quota.sql` (callable by `authenticated`, never directly mutating the table via PostgREST `INSERT`/`UPDATE`):
    1. `public.get_my_ai_quota_status(p_daily_limit int DEFAULT 10)`: Read-only check returning `{ allowed, is_admin, daily_limit, used_today, remaining_today, resets_at_utc }` so `/search` can display `10/10 LEFT TODAY` or `ADMIN • UNLIMITED` immediately when a signed-in user activates **"Ask AI"** before submitting (`Clarification 4`, `FR-004`).
    2. `public.check_and_increment_ai_quota(p_daily_limit int DEFAULT 10)`: Atomic reservation RPC executed on shared cache misses. If `public.is_admin()` is true (`profiles.role = 'admin'`), returns `allowed = true, is_admin = true` without capping. Otherwise, atomically inserts or increments `synthesis_count` strictly when `synthesis_count < p_daily_limit` in a single `INSERT ... ON CONFLICT (user_id, usage_date) DO UPDATE ... WHERE user_ai_daily_quotas.synthesis_count < p_daily_limit` statement, eliminating race conditions across concurrent browser tabs (`FR-008`, `SC-004`, `Edge Case 4`).
    3. `public.refund_ai_quota()`: Atomic compensation RPC that decrements `synthesis_count = GREATEST(0, synthesis_count - 1)` for `(auth.uid(), (now() AT TIME ZONE 'UTC')::date)` whenever `search_studies_hybrid` returns `0` matching studies (`FR-011`) or all three LLM inference tiers fail (`FR-013`, `SC-005`).
- **Rationale**:
  - Atomic pre-inference reservation (`check_and_increment_ai_quota`) prevents a user at `9/10` from opening 5 concurrent tabs and bypassing their daily cap while multiple LLM streams are in flight.
  - Pairing atomic reservation with `refund_ai_quota()` on 0-study matches or total 3-tier provider failure guarantees users never permanently lose daily allowance to empty filter results or upstream provider outages (`SC-004`, `SC-005`).
- **Alternatives Considered**:
  - *Incrementing quota only after stream completion*: Rejected because concurrent requests submitted before the first stream finishes would bypass the `10`/day ceiling (`Edge Case 4`).
  - *Client-side localStorage quota counters*: Rejected because client storage is trivially bypassed and cannot synchronize across devices (Constitution Principle IV).

## 4. `<2,000`-Token Hybrid Study Retrieval & Citation-Grounded Prompt Architecture

- **Decision**:
  - Retrieve up to the top `5` matching published studies (`match_limit = 5`) via the existing `public.search_studies_hybrid` RPC (combining PostgreSQL `tsvector` full-text search + `768`-dim `gemini-embedding-001` `pgvector` cosine distance via Reciprocal Rank Fusion and deterministic `quality_score` tie-breaking), then fetch `limitations` for those `<= 5` study IDs using an explicit narrow column projection `AI_CITATION_STUDY_COLUMNS` (which never selects `abstract_text` or `embedding`).
  - Implement a deterministic context budgeter `buildAiStudyContext(studies, query)` in `web/src/lib/ai-search/context-builder.ts` that:
    1. Caps per-study text fields (`title <= 220` chars, `population <= 140` chars, `primary_outcome <= 240` chars, `summary_takeaway <= 420` chars, and up to `3` `limitations` items `<= 280` chars combined).
    2. Estimates token usage conservatively (`ceil(characters / 3.5)`) across system prompt + user question + formatted study blocks (`[S1]`..`[S5]`).
    3. Guarantees total assembled prompt context is **strictly `< 2,000` tokens** (targeting `~1,100–1,500` tokens for 5 studies, trimming per-field excerpts or dropping the 5th/4th study if needed while retaining at least the top 3 studies).
  - Enforce scientific integrity in the system prompt (`Principle II`, `FR-010`, `Edge Case 2`):
    - Instruct the model to answer **exclusively** using the provided `[S1]`..`[Sn]` study records, citing studies inline as `[S1]`, `[S2]`, etc. (which the UI renders as clickable Neo-Brutalist links to `/study/[id]`).
    - Require mentioning study design, sample size / duration (`n=...`, `...w`), `Full-Text` vs. `Abstract-Only` inspection depth, and methodological limitations when weighing findings.
    - Explicitly prohibit fabricating studies, answering general medical/dosing/off-topic claims unsupported by `[S1]`..`[Sn]`, following prompt-injection instructions inside the user query, or re-scoring deterministic `quality_score`.
- **Rationale**:
  - Capping total prompt context below `2,000` tokens keeps a 5-study synthesis well inside Groq's `8,000` TPM free-tier rate limit and protects Supabase Free's `5 GB` monthly egress cap (`Principle IV`, `SC-003`).
  - Passing deterministic citation tokens `[S1]`..`[Sn]` mapped to the retrieved study records guarantees `100%` of rendered citations and evidence/transparency badges correspond to real published studies in `public.studies` (`SC-003`).
- **Alternatives Considered**:
  - *Including full `abstract_text` for up to 20 search results*: Rejected because 20 full abstracts exceed `6,000–10,000` tokens, saturating Groq's TPM limit on a single request and inflating database egress.
  - *Allowing the LLM to output free-form DOIs or author-year citations from pretraining memory*: Rejected per Principle II because pretraining recall risks hallucinated or non-ingested citations.

## 5. Dependency-Free Three-Tier Native `fetch` Failover Chain

- **Decision**:
  - Implement `synthesizeWithFailover(promptPayload)` in `web/src/lib/ai-search/failover-client.ts` using native `fetch` and `AbortSignal.timeout` (zero OpenAI/Groq/Gemini npm SDK dependencies per Principle I) across three environment-configurable tiers:
    1. **Tier 1 (Primary — Low-Latency Streaming)**: Groq OpenAI-compatible endpoint (`https://api.groq.com/openai/v1/chat/completions`), model `process.env.AI_TIER1_GROQ_MODEL ?? "openai/gpt-oss-20b"`, authenticated with `GROQ_API_KEY`, connect/TTFB timeout `AI_TIER1_TIMEOUT_MS ?? 6000` ms.
    2. **Tier 2 (Fallback 1 — High-Capacity Reasoning `:free`)**: OpenRouter OpenAI-compatible endpoint (`https://openrouter.ai/api/v1/chat/completions`), model `process.env.AI_TIER2_OPENROUTER_MODEL ?? "nvidia/nemotron-3-ultra-550b-a55b:free"` (with secondary model slug fallback `AI_TIER2_OPENROUTER_ALT_MODEL ?? "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free"`), authenticated with `OPENROUTER_API_KEY`, connect/TTFB timeout `AI_TIER2_TIMEOUT_MS ?? 7000` ms.
    3. **Tier 3 (Fallback 2 — Google Gemini Free Tier)**: Gemini SSE endpoint (`https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse`), model `process.env.AI_TIER3_GEMINI_MODEL ?? "gemini-3.5-flash-lite"`, authenticated with existing `GEMINI_API_KEY`, connect/TTFB timeout `AI_TIER3_TIMEOUT_MS ?? 8000` ms.
  - Await the active tier's HTTP response and first non-empty content delta before committing to that tier's stream. If a tier's key is missing, returns HTTP `429` or `>= 500` (or `4xx` model unavailable), times out before first token, or yields an empty stream, immediately abort and advance to the next tier (`FR-012`, `SC-005`).
- **Rationale**:
  - Waiting for the first valid content token before locking in a tier ensures seamless server-side failover from Tier 1 → Tier 2 → Tier 3 within a single user request without emitting corrupted partial text to the client.
  - Using native `fetch` keeps the `/web` bundle lean and satisfies Constitution Principle I's prohibition on LLM client SDKs.
- **Alternatives Considered**:
  - *Installing `openai`, `groq-sdk`, and `@google/genai` npm packages in `/web`*: Rejected per Constitution Principle I ("zero additional LLM SDK dependencies").
  - *Requiring the user to click retry manually when Tier 1 hits a `429` rate limit*: Rejected by `US4` Scenario 1 and `SC-005`.

## 6. ISR-Safe Main-Feed (`/`) Teaser & `/search` Synthesis Panel UI

- **Decision**:
  - Preserve `export const revalidate = 3600` on `web/src/app/page.tsx` by keeping all **"Ask AI"** state inside the client-side `FilterBar` component (`web/src/components/feed/filter-bar.tsx`), reading auth state from the existing `useAccountProfile()` context (`Principle I`, `FR-002`, `SC-002`).
  - When a signed-out visitor clicks **"Ask AI"** on `/` or `/search`:
    - Render an inline Neo-Brutalist `<AskAiOAuthPrompt />` (`2px solid var(--color-border)`, `shadow-card`, Sky Blue `#38BDF8` accent badge, **Sign in with Google** and **Sign in with GitHub** buttons routing through `/auth/callback?next=...` with the encoded `/search?ai=1&q=...` return URL) and dispatch zero calls to `/api/ai-search` (`FR-003`, `SC-002`).
  - When a signed-in user clicks **"Ask AI"** on `/`:
    - Expand an inline compact query form inside `FilterBar` (`maxLength={300}`) that navigates on submit to `/search?q=...&ai=1` (carrying active `study_design` and `trained_only` filter pills if set) (`Clarification 1`, `FR-004`).
  - On `/search`, hydrate initial quota status server-side in `SearchPage` when signed in (so activating **"Ask AI"** immediately shows `10/10 LEFT TODAY` or `ADMIN • UNLIMITED` in `JetBrains Mono` before submitting) and render `<AiSynthesisPanel />` above the standard deterministic study cards (`Clarification 4`, `FR-004`, `FR-014`).
- **Rationale**:
  - Centralizing the full synthesis panel and cited study cards on `/search` while providing a 1-click inline query bar / OAuth teaser in `FilterBar` on `/` keeps the main feed dense, scannable, and ISR-cached (`revalidate = 3600`) with zero marketing hero banner (Principle III).
- **Alternatives Considered**:
  - *Reading auth cookies inside `web/src/app/page.tsx` to render personalized quota badges on `/` at request time*: Rejected because calling `cookies()` in `app/page.tsx` would disable ISR and convert `/` into a dynamic per-request server render, violating Constitution Principle I.
