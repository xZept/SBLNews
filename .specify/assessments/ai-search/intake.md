# Idea Intake: Authenticated AI-Assisted Search

- **Slug**: ai-search
- **Created**: 2026-11-28T16:19:15+08:00
- **Source**: pasted text
- **Type**: new-capability

## Idea (as captured)

> Build an authenticated AI-assisted search feature for SBL News exposed via a Next.js Route Handler (`/api/ai-search`) on Vercel (rather than a Render free-tier backend) to eliminate cold starts and keep the application stack unified.
>
> ### Access Control & User UX
> - **Public vs. Authenticated Boundaries:** Keep standard keyword and filter search completely public and unlimited by default. Restrict AI synthesis strictly to authenticated users verified via Supabase Auth (`supabase.auth.getUser()`), returning `401 Unauthorized` for unauthenticated API calls.
> - **Unauthenticated Teaser UX:** Keep the **"Ask AI"** toggle or button visible on the main feed for logged-out visitors; clicking it triggers a sign-in prompt or OAuth login flow instead of executing a search.
> - **Per-User Daily Quota:** Enforce a daily per-user query cap (e.g., 5 AI queries/day) via an atomic Supabase Postgres RPC (`check_and_increment_ai_quota`), removing the need for external IP rate-limiting or Upstash Redis. Optionally bypass quota deduction on cache hits. But admins can have unlimited daily queries.
>
> ### Retrieval & Caching Pipeline
> - **Zero-Token Hybrid Retrieval:** Run Postgres full-text search combined with `pgvector` embeddings in Supabase against the `studies` table to retrieve only the top 3–5 study abstracts or key takeaways.
> - **Context Budget:** Cap total retrieved context strictly under **2,000 tokens** per request so concurrent authenticated traffic stays within Groq's 8,000 TPM free-tier limit.
> - **Shared Query-Answer Cache:** Store normalized query-answer pairs in a Supabase cache table with a configurable **7- or 30-day TTL** so recurring lifting questions (e.g., optimal weekly sets for hypertrophy, creatine timing, rest intervals) return instant responses without consuming LLM quota.
>
> ### LLM Provider & Failover Chain
> - Implement an OpenAI-compatible inference client with automatic `429` rate-limit failover across three tiers:
>   1. **Primary:** Groq (`openai/gpt-oss-20b`) for low-latency token streaming (~1,000 tokens/sec).
>   2. **Fallback 1:** OpenRouter `:free` models (`nvidia/nemotron-3-ultra-550b-a55b:free` or `nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free`, leveraging the 1,000 RPD `:free` tier unlocked via a one-time $10 credit balance).
>   3. **Fallback 2:** Google Gemini free-tier API key.

## Restated

Add an authenticated AI-assisted search and synthesis endpoint (`/api/ai-search`) as a Next.js Route Handler on Vercel, backed by Supabase Auth, per-user daily quota enforcement, hybrid Postgres full-text + `pgvector` study retrieval with a shared TTL cache, and a three-tier LLM failover chain (Groq, OpenRouter `:free`, and Google Gemini). Standard keyword/filter search remains public and unlimited, while logged-out visitors see an "Ask AI" teaser that prompts sign-in.

## Origin & Context

- **Raised by**: [NEEDS CLARIFICATION: Who requested or originated this feature proposal?]
- **Trigger**: [NEEDS CLARIFICATION: What prompted this proposal (e.g., user demand, avoiding Render free-tier cold starts, stack unification)?]

## First-Glance Unknowns

- [NEEDS CLARIFICATION: Does the `studies` table in Supabase already have `pgvector` embeddings and full-text search indexes populated, or is an ingestion/embedding pipeline also required?]
- [NEEDS CLARIFICATION: How will query embeddings be generated at request time to support hybrid `pgvector` retrieval without exceeding latency or free-tier limits?]
- [NEEDS CLARIFICATION: How are admin users identified in Supabase (e.g., role column, app_metadata, or allowlist) for unlimited daily queries?]
- [NEEDS CLARIFICATION: Should cache hits bypass the user's daily quota deduction, and should the cache TTL default to 7 days or 30 days?]
- [NEEDS CLARIFICATION: How should queries be normalized for the shared cache (exact normalized text match vs. semantic similarity) and how will cache invalidation work when new studies are added?]
- [NEEDS CLARIFICATION: Which OpenRouter `:free` model should be used first, and are the Groq, OpenRouter (with $10 credit), and Gemini API keys/quotas already provisioned?]
- [NEEDS CLARIFICATION: What response format and UX are expected on the frontend (streaming vs. non-streaming, study citations, error/quota-exceeded states)?]
