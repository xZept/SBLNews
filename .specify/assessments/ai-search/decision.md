# Decision: Unified Next.js Authenticated AI-Assisted Literature Search

- **Slug**: ai-search
- **Decided**: 2026-11-28T16:37:15+08:00
- **Verdict**: go
- **Artifacts reviewed**: intake.md, research.md, problem.md, concept.md

## Scorecard

| Criterion | Rating | Justification |
|-----------|--------|---------------|
| Problem validity | strong | Codebase verification confirms `/search` only lists individual study cards (`web/src/app/search/page.tsx`), `/guidelines` covers only 5 static variables, `/` lacks any search or AI teaser (`filter-bar.tsx`), and deploying RAG on Render Free would incur 30–60s spin-up cold starts. |
| Evidence strength | adequate | High-confidence repository evidence (`0002_tables_and_indexes.sql`, `0004_hybrid_search_rpc.sql`, `embeddings.ts`, `admin-guard.ts`, `constitution.md`) validates the hybrid retrieval, auth, and <2,000-token math, while demand volume rests on product owner direction rather than production telemetry. |
| Value vs. inaction | strong | Delivers instant, citation-grounded multi-study synthesis without Render cold starts, preserves 100% public standard search, adds a logged-out OAuth sign-in teaser on `/`, and avoids redundant LLM calls via a shared TTL cache. |
| Feasibility / appetite | strong | Option B fits cleanly within a `medium` (weeks) appetite by building directly on existing `search_studies_hybrid`, `generateQueryEmbedding`, `public.is_admin()`, and Google/GitHub OAuth flows with zero new npm SDK bloat. |
| Strategic fit | adequate | Preserves $0/month recurring hosting, `/` ISR (`revalidate = 3600`), Principle II primary-literature grounding, Principle III Neo-Brutalist Sky Blue Light/Dark parity, and Principle IV RLS/egress caps; requires only a MINOR Constitution amendment (Principles I & V) to replace the Render Free RAG note with `/api/ai-search` and the Groq/OpenRouter/Gemini failover chain. |
| Risk posture | strong | Major risks (Groq 8,000 TPM limit, provider `429` errors, free-tier model slug churn, Vercel Hobby timeouts, and quota loss on cache hits) are mitigated via the <2,000-token context cap, pre-quota shared cache lookup, tight per-tier timeouts across 3 failover tiers, and env-configurable model IDs. |

## Verdict & Rationale

**Verdict: `go`**. Problem validity (`strong`), value vs. inaction (`strong`), feasibility (`strong`), and risk posture (`strong`) are supported by `adequate`+ evidence strength and strategic fit, with **Option B** explicitly confirmed by the project owner. Running authenticated AI synthesis via a Next.js Route Handler (`/api/ai-search`) on Vercel backed by Supabase Postgres (`search_studies_hybrid`, atomic quota RPC, and shared TTL cache) and a 3-tier OpenAI-compatible failover chain eliminates Render Free cold starts, keeps the stack unified at $0/month recurring cost, and protects scientific integrity by grounding every answer in deterministically retrieved primary studies.

## If needs-clarification

- N/A (Verdict is `go`; remaining configuration details are carried forward into `/speckit-specify` and `/speckit-clarify` with concrete defaults.)

## If go — Handoff to `/speckit-specify`

- **Problem**: Lifters, coaches, and researchers using SBL News must manually scan up to 20 individual study cards on `/search` to answer multi-study training questions outside the 5 static `/guidelines` variables, while logged-out visitors on `/` see no AI synthesis teaser and a separate Render Free RAG backend would introduce 30–60s cold starts.
- **Chosen approach**: **Option B — Unified Next.js AI-Assisted Search with Main-Feed Teaser, Shared TTL Cache, Atomic Quota & 3-Tier Failover**:
  1. **Public vs. Authenticated Boundary & Logged-Out "Ask AI" Teaser (`/` & `/search`)**:
     - Keep standard keyword, `pgvector` semantic, and deterministic filter search completely public and unlimited.
     - Surface a Neo-Brutalist **"Ask AI"** toggle/button in the sticky `FilterBar` on `/` (as a client island preserving `revalidate = 3600` ISR) and on `/search`.
     - For logged-out visitors, clicking **"Ask AI"** displays an inline Neo-Brutalist sign-in prompt / Google & GitHub OAuth flow instead of calling `/api/ai-search`.
     - For signed-in users, activating **"Ask AI"** enables submitting natural-language lifting questions (routing from `/` to `/search` with AI synthesis active, or executing directly on `/search`) and displays a citation-grounded synthesis panel with remaining daily quota (`e.g., 4/5 left today` or `ADMIN • UNLIMITED`).
  2. **Authenticated Route Handler (`/api/ai-search`) & Atomic Daily Quota RPC**:
     - Verify Supabase Auth session server-side via `supabase.auth.getUser()`, returning `401 Unauthorized` for unauthenticated callers and validating request payloads with Zod.
     - Check the shared query-answer cache *before* quota deduction so cache hits return immediately without consuming a user's daily allowance or invoking embedding/LLM APIs.
     - On cache misses, enforce a per-user daily cap (default `5` queries/day, unlimited when `profiles.role = 'admin'` / `public.is_admin()`) via an atomic Postgres RPC (`check_and_increment_ai_quota`), removing any need for Upstash Redis or IP rate-limiting.
  3. **<2,000-Token Hybrid Retrieval & Shared 7/30-Day TTL Cache**:
     - Store normalized query + filter keys and synthesized answers + cited study metadata in a Supabase cache table with a configurable 7- or 30-day TTL (e.g., `AI_CACHE_TTL_DAYS`, default `7` or `30`).
     - Retrieve only the top 3–5 published studies via `search_studies_hybrid` (Postgres FTS + `pgvector` RRF) and assemble structured fields (`title`, `journal`, `publication_year`, `study_design`, `population`, `sample_size_n`, `duration_weeks`, `primary_outcome`, `summary_takeaway`, `limitations`, `inspection_depth`) strictly under **2,000 tokens** total context to stay well within Groq's 8,000 TPM ceiling and Supabase Free's 5 GB egress cap.
     - Enforce strict scientific grounding (Principle II): cite retrieved studies inline, surface their deterministic evidence and `Full-Text` / `Abstract-Only` badges, and never fabricate citations or override deterministic `quality_score`.
  4. **Three-Tier OpenAI-Compatible Failover Chain**:
     - Implement a dependency-free `fetch` inference client with tight per-tier connect/TTFB timeouts and automatic failover on HTTP `429` (and transient `5xx`/timeout) across:
       1. **Primary**: Groq (`openai/gpt-oss-20b`) for low-latency token streaming.
       2. **Fallback 1**: OpenRouter `:free` (`nvidia/nemotron-3-ultra-550b-a55b:free` or `nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free`).
       3. **Fallback 2**: Google Gemini Free Tier API (`GEMINI_API_KEY`).
     - Make model slugs and quota/TTL thresholds configurable via environment variables with sensible defaults.
- **In scope / out of scope**:
  - *In scope*: `/api/ai-search` Next.js Route Handler; Supabase SQL migration + RLS for daily AI quota table/RPC (`check_and_increment_ai_quota` with admin bypass) and shared query-answer cache table; <2,000-token hybrid retrieval context builder; 3-tier Groq -> OpenRouter `:free` -> Gemini failover client; Neo-Brutalist "Ask AI" teaser on `/` + full AI synthesis panel on `/search` with Light/Dark theme parity; MINOR `constitution.md` amendment (Principles I & V) + automated unit/typecheck/lint verification.
  - *Out of scope*: Rate-limiting or gating standard public search; Render Free backend or Upstash Redis; multi-turn chat sessions or ungrounded non-study Q&A; automated `/guidelines` mutation; new user-facing page routes beyond the 8 approved page routes.
- **Success metrics**:
  - `100%` of unauthenticated calls to `/api/ai-search` return `401 Unauthorized`; `100%` of public keyword/filter searches remain unrestricted.
  - Standard members are atomically capped at the configured daily limit (e.g., 5/day) on uncached syntheses, cache hits bypass quota deduction, and `admin` users have unlimited queries.
  - Assembled study prompt context never exceeds `2,000` tokens across 3–5 retrieved studies.
  - Simulated `429` responses on Tier 1 (Groq) and Tier 2 (OpenRouter `:free`) automatically fail over to Tier 2 / Tier 3 (Gemini) and return a valid grounded synthesis.
  - `/` retains ISR (`revalidate = 3600`), and `/web` passes `tsc --noEmit`, ESLint, and Vitest unit tests.
- **Carried-forward open questions**:
  - Default cache TTL preference (`7` days vs. `30` days, configurable via `AI_CACHE_TTL_DAYS`) and whether publishing a new study in `/admin/review` or `/pipeline` should optionally purge/expire cached entries or rely purely on TTL.
  - Exact streaming vs. buffered delivery behavior on `/api/ai-search` (e.g., SSE token streaming on live LLM calls + instant single-chunk/JSON delivery on cache hits, and refunding/avoiding quota increment if all three tiers fail before producing an answer).
  - Exact main-feed (`/`) interaction when a signed-in user clicks **"Ask AI"** (inline query bar in `FilterBar` that navigates to `/search?q=...&ai=1` vs. rendering the synthesis inline above the feed).
