# Concept: Unified Next.js Authenticated AI-Assisted Literature Search

- **Slug**: ai-search
- **Created**: 2026-11-28T16:31:35+08:00
- **Recommended option**: Option B — Unified Next.js AI-Assisted Search with Main-Feed Teaser, Shared TTL Cache, Atomic Quota & 3-Tier Failover

## Options

### Option A — Minimal Single-Provider Synthesis on `/search` Only (Smallest Thing That Could Work)
- **Sketch**: Adds an authenticated "Synthesize Top Studies" button strictly on `/search` backed by a single free-tier provider (Google Gemini Free Tier, reusing the existing `GEMINI_API_KEY`) and a basic daily counter, with no shared query-answer cache, no multi-provider failover chain, and no "Ask AI" entrypoint on the main feed (`/`).
- **Appetite**: small (days)
- **Trade-offs**: Wins on minimal moving parts and zero additional API keys. Sacrifices the user's explicit requirements for a main-feed (`/`) "Ask AI" teaser toggle for logged-out visitors, ultra-low-latency Groq generation with 3-tier `429` failover (Groq -> OpenRouter `:free` -> Gemini), and the shared 7/30-day TTL query-answer cache that prevents recurring lifting questions from burning LLM tokens and daily user quotas.
- **Rabbit holes**: Single-provider `429` rate limits immediately surface as user-facing errors under concurrent load, and popular lifting queries repeatedly consume LLM quota for identical questions.

### Option B — Unified Next.js AI-Assisted Search with Main-Feed Teaser, Shared TTL Cache, Atomic Quota & 3-Tier Failover
- **Sketch**: Delivers the full authenticated AI-assisted search experience inside the unified Next.js (`/web`) + Supabase Free stack on Vercel while keeping standard keyword/filter search 100% public and preserving ISR on `/`:
  1. **Public Search Boundary & Logged-Out "Ask AI" Teaser (`/` and `/search`)**: Standard keyword, `pgvector` semantic, and study-design filter search remains completely public and unlimited. Both the main feed's sticky filter bar (`/`) and the search page (`/search`) display a high-contrast Neo-Brutalist **"Ask AI"** toggle/button. When a logged-out visitor clicks **"Ask AI"**, the UI presents an inline Neo-Brutalist sign-in prompt with one-click Google / GitHub OAuth sign-in (preserving their return destination) instead of calling the API. When a signed-in user activates **"Ask AI"**, they can submit a natural-language lifting question and see a citation-grounded AI synthesis panel paired with the supporting study cards and their remaining daily quota badge (e.g., `4/5 AI searches left today` or `ADMIN • UNLIMITED`).
  2. **Authenticated Next.js Route Handler (`/api/ai-search`) & Atomic Daily Quota**: Verifies the caller via Supabase Auth (`supabase.auth.getUser()`), returning `401 Unauthorized` for unauthenticated requests. Checks the shared cache first (so cache hits bypass quota deduction and return instantaneously), and on a cache miss enforces the daily per-user cap (default 5 queries/day, unlimited for `admin` users) via an atomic Supabase Postgres RPC (`check_and_increment_ai_quota`).
  3. **<2,000-Token Hybrid Retrieval & Shared 7/30-Day TTL Cache**: Normalizes incoming queries (lowercasing, whitespace/punctuation collapsing, and active deterministic filter fingerprint) against a shared Supabase query-answer cache table with a configurable 7- or 30-day TTL (defaulting to 7 days via environment config). On a cache miss, executes hybrid Postgres full-text + `pgvector` retrieval (`search_studies_hybrid`) to select only the top 3–5 published studies and assembles their structured metadata, primary outcomes, takeaways, and limitations under a hard **<2,000-token context budget**. Every synthesized response explicitly cites the retrieved studies alongside their deterministic evidence and inspection badges (`Meta-Analysis`, `RCT`, `Trained Population`, `Full-Text` vs. `Abstract-Only`).
  4. **Three-Tier OpenAI-Compatible Failover Chain**: Executes inference via native `fetch` (zero bloated SDK dependencies) with automatic failover on HTTP `429` rate-limit (or transient provider failure/timeout) across:
     - **Tier 1 (Primary)**: Groq (`openai/gpt-oss-20b`) for low-latency token streaming.
     - **Tier 2 (Fallback 1)**: OpenRouter `:free` models (`nvidia/nemotron-3-ultra-550b-a55b:free` or `nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free`).
     - **Tier 3 (Fallback 2)**: Google Gemini Free Tier API (`GEMINI_API_KEY`).
- **Appetite**: medium (weeks)
- **Trade-offs**: Meets every requirement in the intake and problem definition—eliminating Render Free cold starts, keeping the stack unified on Vercel + Supabase, protecting Groq's 8,000 TPM budget via the <2,000-token context cap and shared cache, and guaranteeing high availability via 3-tier failover. Requires a MINOR Constitution amendment (Principles I and V) to document `/api/ai-search` and the Groq / OpenRouter `:free` / Gemini failover stack.
- **Rabbit holes**:
  - Letting upstream provider timeouts stack across all three tiers and exceed Vercel Hobby's function timeout (each tier must enforce a strict per-provider connect/TTFB timeout before failing over).
  - Deducting a user's daily quota on a cache hit or when all three upstream providers fail (cache hits should bypass quota deduction, and total provider exhaustion should not permanently penalize the user's quota).
  - Over-engineering query normalization with fuzzy vector cache matching instead of fast, deterministic normalized query keys.
  - Breaking ISR on `/` by checking auth server-side on the home page instead of keeping the "Ask AI" teaser inside the existing client-side `FeedClient` / `FilterBar` island.

### Option C — Separate Render Free FastAPI RAG Service with Multi-Turn Conversational Chat
- **Sketch**: Builds a standalone Python FastAPI RAG backend hosted on Render Free with multi-turn chat sessions, external Upstash Redis rate limiting, and cross-origin streaming to the Next.js frontend.
- **Appetite**: large (months)
- **Trade-offs**: Keeps Python and LLM orchestration in a separate service, but directly contradicts the intake's primary architectural goal (avoiding Render Free's 30–60s cold starts and keeping the application stack unified on Vercel + Supabase) while adding unnecessary external infrastructure (Render + Upstash Redis).
- **Rabbit holes**: 30–60s cold-start delays on Render Free after 15 minutes of inactivity, cross-origin Supabase JWT verification plumbing, and dual-service deployment maintenance.

## Recommendation

**Option B — Unified Next.js AI-Assisted Search with Main-Feed Teaser, Shared TTL Cache, Atomic Quota & 3-Tier Failover** is recommended.

Why Option B best achieves the defined problem goals and metrics:
1. **Zero Cold Starts & Unified Stack**: Running `/api/ai-search` as a Next.js Route Handler on Vercel Hobby alongside the existing `/web` app eliminates Render Free's 30–60s spin-up delay and keeps authentication, hybrid retrieval, caching, and quota enforcement unified against the existing Supabase PostgreSQL + `pgvector` instance.
2. **Reuses Existing Hybrid Retrieval & Auth Primitives**: SBL News already has `public.search_studies_hybrid` (`0004_hybrid_search_rpc.sql`), `generateQueryEmbedding` (`web/src/lib/queries/embeddings.ts`), `public.is_admin()` (`0003_rls_policies_and_triggers.sql`), and Google/GitHub OAuth login triggers (`TopNav`). Option B builds directly on those proven primitives.
3. **Strict Budget & Scientific Integrity Protection**: Capping context strictly below 2,000 tokens (top 3–5 studies), caching normalized query-answer pairs for 7–30 days, bypassing quota deduction on cache hits, and failing over across Groq -> OpenRouter `:free` -> Gemini maximizes free-tier resilience while keeping every synthesized answer grounded in deterministically ranked primary literature.

## Out of Scope (for the recommended option)

- Gating or rate-limiting standard keyword, `pgvector` semantic, or deterministic study-design filter search for public or signed-in users.
- Deploying or maintaining a separate Render Free backend service or external Upstash Redis cluster.
- Multi-turn conversational chat history or answering general fitness questions unconnected to retrieved studies in `public.studies`.
- Automated mutation of `/guidelines` or bypassing `/admin/review` human-in-the-loop governance (Constitution Principle II).
- Adding new top-level user-facing page routes outside the 8 Constitution-approved page routes (AI search surfaces live inside `/` and `/search`, backed by the internal `/api/ai-search` Route Handler).

## Assumptions to Validate

- **Cache hits bypass daily quota deduction**: Serving a normalized query from the shared query-answer cache does not consume LLM tokens and therefore should not decrement a signed-in user's 5/day allowance.
- **Configurable 7- or 30-day cache TTL**: The shared cache TTL defaults to 7 days (or 30 days via environment configuration) so newly published studies surface in fresh syntheses within a reasonable window.
- **Main-feed "Ask AI" UX connects cleanly to `/search`**: Clicking "Ask AI" on `/` prompts OAuth sign-in for logged-out visitors, and for signed-in users either expands an inline AI query bar in `FilterBar` or routes directly into `/search` with AI synthesis enabled, preserving ISR (`revalidate = 3600`) on `/`.
- **Environment-configurable model slugs**: The 3-tier failover chain defaults to Groq (`openai/gpt-oss-20b`) -> OpenRouter `:free` (`nvidia/nemotron-3-ultra-550b-a55b:free`, fallback `nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free`) -> Google Gemini Free Tier, with model names and daily quota cap overrideable via environment variables.
- **MINOR Constitution Amendment**: Amending Constitution Principle I & V to reflect the unified `/api/ai-search` Route Handler and Groq / OpenRouter `:free` / Gemini failover stack is acceptable to the project owner.
