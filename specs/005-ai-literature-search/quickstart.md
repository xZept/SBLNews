# Quickstart & Validation Guide: Unified Authenticated AI-Assisted Literature Search

**Branch**: `005-ai-literature-search` | **Date**: 2026-11-28 | **Spec**: [spec.md](./spec.md)

This guide documents the database migration setup, environment variables, automated verification commands, and end-to-end validation scenarios for testing citation-grounded multi-study AI synthesis on `/search`, the main-feed (`FilterBar`) **"Ask AI"** entrypoint and logged-out OAuth teaser on `/`, shared 7/30-day TTL answer caching, atomic per-user UTC daily quota enforcement (`10`/day default for standard members, unlimited for admins), and 3-tier `Groq` → `OpenRouter :free` → `Gemini Free Tier` failover.

---

## 1. Prerequisites

- **Node.js**: v20.x+ and `npm`
- **Python**: v3.12+ (for the `/pipeline` regression test suite)
- **Supabase Project (or Local Supabase CLI)**: PostgreSQL 15+ with `pgvector` and migrations `0001`–`0010` applied, plus Google and GitHub OAuth configured in Supabase Auth

---

## 2. Database Migration & Environment Setup

1. **Apply Migration `0011_ai_search_cache_and_quota.sql`**:
   Push the sequential SQL migration in `/supabase/migrations/` to create `public.ai_search_cache`, `public.user_ai_daily_quotas`, RLS policies, least-privilege grants, and the atomic `SECURITY DEFINER` RPCs (`get_my_ai_quota_status`, `check_and_increment_ai_quota`, `refund_ai_quota`, `get_cached_ai_synthesis`, `put_cached_ai_synthesis`) described in [data-model.md](./data-model.md):
   ```bash
   npx supabase db push
   ```

2. **Environment Configuration (`/web/.env.local`)**:
   Configure the Supabase connection and 3-tier AI inference environment variables (all tiers use $0/month recurring free tiers; model slugs and thresholds have built-in defaults if omitted):
   ```dotenv
   NEXT_PUBLIC_SUPABASE_URL=https://<your-project>.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-publishable-anon-key>

   # Quota & Shared Cache TTL Defaults
   AI_DAILY_QUOTA_LIMIT=10
   AI_CACHE_TTL_DAYS=7

   # Tier 1: Groq (Primary Low-Latency Streaming)
   GROQ_API_KEY=<your-groq-api-key>
   AI_TIER1_GROQ_MODEL=openai/gpt-oss-20b
   AI_TIER1_TIMEOUT_MS=6000

   # Tier 2: OpenRouter :free (Fallback 1)
   OPENROUTER_API_KEY=<your-openrouter-api-key>
   AI_TIER2_OPENROUTER_MODEL=nvidia/nemotron-3-ultra-550b-a55b:free
   AI_TIER2_OPENROUTER_ALT_MODEL=nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free
   AI_TIER2_TIMEOUT_MS=7000

   # Tier 3: Google Gemini Free Tier (Fallback 2 + 768-dim Query Embeddings)
   GEMINI_API_KEY=<your-gemini-api-key>
   AI_TIER3_GEMINI_MODEL=gemini-3.5-flash-lite
   AI_TIER3_TIMEOUT_MS=8000
   ```

---

## 3. Automated Verification Gates (Constitution Principle VI)

### 3.1 Frontend Typecheck, Lint, Unit Tests & Route/ISR Build (`/web`)

Run the static analysis, unit test, and Next.js build checks from `/web`:

```bash
cd web
npm run typecheck
npm run lint
npm test
npm run build
```

**Expected Outcomes**:
- `tsc --noEmit` exits `0` under `strict: true`.
- `next lint` reports zero errors or warnings.
- `vitest run` passes all existing suites plus `web/tests/ai-search.test.ts` covering:
  - Deterministic query normalization (`normalizeAiQueryKey`) across casing, extra whitespace, trailing punctuation, and active filter combinations (`FR-006`).
  - `<2,000`-token study context budget enforcement (`buildAiStudyContext`) across 3–5 retrieved studies, including unusually long outcome/limitation strings (`FR-009`, `SC-003`).
  - `401 Unauthorized` boundary guard for unauthenticated callers, pre-quota shared cache hit bypass (`0` quota deducted), `0`-matching-study quota refund (`FR-011`), `10`/day standard member quota cap (`429 QUOTA_EXCEEDED`), and `admin` unlimited bypass (`SC-001`, `SC-004`).
  - Three-tier `429` / `5xx` / timeout failover (`Tier 1 Groq` → `Tier 2 OpenRouter :free` → `Tier 3 Gemini Free Tier`) and atomic quota refund when all three tiers fail (`SC-005`).
  - Egress-safe projection assertions (`AI_CITATION_STUDY_COLUMNS` excluding `abstract_text` and `embedding`) and Constitution Principle V route guard verifying strictly the 8 approved user-facing page routes and 2 internal Route Handlers (`/auth/callback` and `/api/ai-search`) (`SC-006`).
- `next build` succeeds and confirms `/` and `/guidelines` remain ISR (`revalidate = 3600`) while `/methodology` remains static (`○`).

### 3.2 Pipeline Regression Check (`/pipeline`)

Verify zero regressions in the Python ingestion workspace:

```bash
cd pipeline
pytest -v
```

---

## 4. End-to-End Validation Scenarios

Start the local web application (`cd web && npm run dev`) and verify each user story against [contracts/ai-search-route-and-ui.md](./contracts/ai-search-route-and-ui.md):

### 4.1 User Story 1 — Citation-Grounded Multi-Study AI Synthesis on `/search` (`SC-001`, `SC-003`)
1. **Standard Public Search Unchanged**: In an incognito (signed-out) window, open `/search`, enter `"lengthened partials hypertrophy"`, and apply filters (`Meta-Analysis`, `Min Duration: 8`, `Trained lifters only`). Confirm 100% of standard keyword, semantic, and filter searches execute publicly and without daily limits.
2. **Citation-Grounded Synthesis**: Sign in as a standard member on `/search`, click **"Ask AI"**, and submit `"Do lengthened partials build more muscle than full ROM in trained lifters?"`. Verify:
   - The synthesis panel streams progressively above the matching study cards and cites only the top 3–5 deterministically retrieved studies inline (`[S1]`..`[Sn]`), each linking to `/study/[id]`.
   - Every cited study in the panel displays its deterministic evidence badge, `Full-Text` (`#BBF7D0`) vs. `Abstract-Only` (`#FED7AA`) transparency badge, and extracted methodological limitations.
   - `/guidelines` remains completely untouched.
3. **Zero-Match Safety**: Combine a narrow query and strict filter that matches `0` published studies and submit with **"Ask AI"** active. Confirm the panel states that no matching peer-reviewed studies were found in SBL News without offering ungrounded fitness advice and without decrementing the user's daily allowance.

### 4.2 User Story 2 — Main-Feed "Ask AI" Entrypoint & Logged-Out Sign-In Teaser (`SC-001`, `SC-002`, `SC-006`)
1. **Logged-Out OAuth Teaser**: Open `/` and `/search` in an incognito window and click **"Ask AI"**. Verify an inline Neo-Brutalist prompt opens in 1 click offering **Sign in with Google** and **Sign in with GitHub** without dispatching any request to `/api/ai-search`.
2. **Direct Unauthenticated Endpoint Rejection**: Execute a direct unauthenticated POST request:
   ```bash
   curl -i -X POST http://localhost:3000/api/ai-search \
     -H "Content-Type: application/json" \
     -d '{"q":"weekly set volume hypertrophy"}'
   ```
   Verify `/api/ai-search` immediately returns `HTTP/1.1 401 Unauthorized`.
3. **Signed-In `/` → `/search` Flow**: Sign in on `/`, click **"Ask AI"** in the sticky `FilterBar`, type a training question, and submit. Verify navigation to `/search?q=...&ai=1` automatically runs the AI synthesis above the matching study cards while `/` retains its static ISR setup.

### 4.3 User Story 3 — Shared Answer Cache & Fair Daily Member Quota (`SC-004`)
1. **Pre-Submit Quota Badge & Atomic Decrement**: Sign in as Standard Member A (`10/10` remaining), activate **"Ask AI"** on `/search`, and verify `10/10 LEFT TODAY` renders immediately in `JetBrains Mono` *before* submitting. Submit a novel question and confirm the badge updates to `9/10 LEFT TODAY`.
2. **Shared Cache Hit (Zero Quota Deducted)**: Sign in as Standard Member B (`10/10` remaining) and submit the same question with different casing and trailing punctuation (`"  WEEKLY SET VOLUME HYPERTROPHY??? "`). Confirm the cached synthesis and cited studies return in `< 1s` with a `CACHED • 0 QUOTA USED` indicator and Member B's allowance remains `10/10 LEFT TODAY`.
3. **Daily Limit Enforcement & Admin Unlimited Bypass**: Exhaust Member A's 10 uncached syntheses and submit an 11th novel question; verify a clear UTC reset notice is shown while standard study cards and previously cached AI answers remain accessible. Sign in as an `admin` account and confirm the badge displays `ADMIN • UNLIMITED` with no daily cap.

### 4.4 User Story 4 — Three-Tier Failover & Non-Penalizing Failure Recovery (`SC-005`, `SC-006`)
1. **Tier 1 → Tier 2 → Tier 3 Automatic Failover**: Temporarily set an invalid/rate-limited `GROQ_API_KEY` (or simulate a `429` response in tests) and submit an uncached question; verify synthesis completes seamlessly via Tier 2 (`OpenRouter :free`) or Tier 3 (`Gemini Free Tier`) within the same submission.
2. **All-Tier Failure Quota Refund**: Temporarily disable all three provider keys for an uncached query; verify the synthesis panel displays a clear retry notice above the standard deterministic study results, writes nothing to `public.ai_search_cache`, and leaves the user's remaining daily quota unchanged.
3. **Light & Dark Theme Parity**: Toggle between **Light** and **Dark** theme in `AccountBubble` on `/` and `/search` and verify all **"Ask AI"** controls, OAuth prompts, quota badges, and synthesis panels use Neo-Brutalist Sky Blue tokens (`#38BDF8` accent, `#0F172A` / `#0B1120` surfaces, `2px` borders, zero-blur hard shadows) with zero purple, violet, indigo, gradients, or `backdrop-blur`.
