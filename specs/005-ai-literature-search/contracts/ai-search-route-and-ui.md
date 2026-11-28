# Web Routes, `/api/ai-search` Route Handler & UI Contracts (`/web`)

**Branch**: `005-ai-literature-search` | **Date**: 2026-11-28 | **Spec**: [spec.md](../spec.md)

## 1. Approved Route Surface & Rendering Contracts (Constitution Principle V v1.2.0)

Feature scope stays strictly within the **8 approved user-facing page routes** (updating only `/` and `/search`) and the **2 approved internal Next.js Route Handlers** (`/auth/callback` and `/api/ai-search`):

| Route | Kind | Rendering Strategy | Auth & Quota Contract | UI & Data Contract |
|-------|------|--------------------|-----------------------|--------------------|
| `/` | Page Route 1 | **ISR (`revalidate = 3600`)** | Public feed & Top Users rail; client-island **"Ask AI"** control in `FilterBar` | Signed-out click on **"Ask AI"** opens inline `<AskAiOAuthPrompt />` (Google / GitHub OAuth, 0 API calls). Signed-in click expands inline compact query bar (`maxLength={300}`) navigating to `/search?q=...&ai=1` on submit (`FR-002`–`FR-004`). |
| `/search` | Page Route 4 | Dynamic (`force-dynamic`) | Standard keyword/semantic/filter search: **100% public & unlimited** (`FR-001`). **"Ask AI"** mode: authenticated (`10`/UTC day default member quota; `admin` unlimited; cache hits free). | Renders **"Ask AI"** toggle in search controls. Signed-out activation shows inline `<AskAiOAuthPrompt />`. Signed-in activation immediately displays monospace quota badge (`10/10 LEFT TODAY` or `ADMIN • UNLIMITED`) before submit and renders `<AiSynthesisPanel />` above matching `StudyCard` results (`FR-004`, `FR-010`). |
| `/api/ai-search` | Internal Route Handler 2 | Dynamic Route Handler (`GET`, `POST`) | **Server-authenticated (`supabase.auth.getUser()`)**; returns `401 Unauthorized` if signed out (`FR-005`, `SC-001`). | `GET`: returns caller's current `AiQuotaStatus`. `POST`: validates input via Zod, checks shared 7/30-day TTL cache before quota deduction, enforces atomic daily quota, retrieves top 3–5 studies (`<2,000` tokens), and streams synthesis with 3-tier failover (`Groq` → `OpenRouter :free` → `Gemini Free Tier`). |
| `/auth/callback` | Internal Route Handler 1 | Dynamic Route Handler (`GET`) | Public OAuth PKCE code exchange | Existing handler: exchanges Google/GitHub code and redirects to relative `next` URL (including `/search?ai=1&q=...`). |
| `/study/[id]`, `/guidelines`, `/methodology`, `/admin/review`, `/profile`, `/profile/[id]` | Page Routes 2, 3, 5, 6, 7, 8 | Existing strategies (`ISR` on `/guidelines`, `force-static` on `/methodology`) | Unchanged | `/guidelines` is never mutated by `/api/ai-search` (`FR-010`, Principle II). |

---

## 2. Runtime Zod Validation Schemas (`/web/src/lib/validations/ai-search.ts`)

All external inputs to `/api/ai-search` and client **"Ask AI"** forms validate at runtime with Zod (Constitution Principle IV, `FR-005`, `Edge Case 1`):

```typescript
import { z } from "zod";
import { StudyDesignEnum } from "@/lib/validations/search";

export const AI_QUERY_MIN_LENGTH = 3;
export const AI_QUERY_MAX_LENGTH = 300;

export const AiSearchRequestSchema = z.object({
  q: z
    .string()
    .trim()
    .min(
      AI_QUERY_MIN_LENGTH,
      `Question must be at least ${AI_QUERY_MIN_LENGTH} characters.`
    )
    .max(
      AI_QUERY_MAX_LENGTH,
      `Question must be ${AI_QUERY_MAX_LENGTH} characters or fewer.`
    ),
  study_design: z.preprocess(
    (val) => (val === "" || val === null || val === undefined ? undefined : val),
    StudyDesignEnum.optional()
  ),
  min_duration_weeks: z.preprocess(
    (val) => (val === "" || val === null || val === undefined ? undefined : val),
    z.coerce.number().int().min(0).max(520).optional()
  ),
  trained_only: z.preprocess(
    (val) => {
      if (val === "" || val === null || val === undefined) return undefined;
      if (val === true || val === "true" || val === "on" || val === "1") return true;
      if (val === false || val === "false" || val === "0") return false;
      return val;
    },
    z.boolean().optional()
  ),
});

export type AiSearchRequestInput = z.infer<typeof AiSearchRequestSchema>;
```

---

## 3. `/api/ai-search` HTTP & Streaming Protocol Contract

### 3.1 `GET /api/ai-search` — Current User Quota Status

Used when a user signs in client-side or toggles **"Ask AI"** without a server-hydrated quota prop.

- **`401 Unauthorized`** (Unauthenticated caller):
  ```json
  {
    "error": "UNAUTHORIZED",
    "message": "Sign in with Google or GitHub to use Ask AI literature synthesis."
  }
  ```
- **`200 OK`** (Authenticated caller):
  ```json
  {
    "quota": {
      "allowed": true,
      "isAdmin": false,
      "dailyLimit": 10,
      "usedToday": 2,
      "remainingToday": 8,
      "resetsAtUtc": "2026-11-29T00:00:00.000Z"
    }
  }
  ```

### 3.2 `POST /api/ai-search` — Literature Synthesis Endpoint

- **Request Headers**: `Content-Type: application/json` (with standard same-origin Supabase session cookies)
- **Request Body**: `AiSearchRequestInput` (`{ q, study_design?, min_duration_weeks?, trained_only? }`)

#### Error & Guard Responses (`application/json`)

| HTTP Status | `error` Code | Trigger Condition | Quota Effect |
|-------------|--------------|-------------------|--------------|
| `401 Unauthorized` | `"UNAUTHORIZED"` | `supabase.auth.getUser()` returns no user (`FR-005`, `SC-001`) | `0` (rejected before cache/quota check) |
| `400 Bad Request` | `"VALIDATION_ERROR"` | `AiSearchRequestSchema.safeParse` fails (`q < 3` or `> 300` chars, invalid filter) | `0` (rejected before cache/quota check) |
| `429 Too Many Requests` | `"QUOTA_EXCEEDED"` | Cache miss AND `check_and_increment_ai_quota` returns `allowed = false` (`0` left today) (`FR-008`, `US3` Scenario 3) | Unchanged (`0` remaining; includes `quota.resetsAtUtc`) |
| `503 Service Unavailable` | `"ALL_TIERS_FAILED"` | Cache miss where Tier 1 (Groq), Tier 2 (OpenRouter `:free`), and Tier 3 (Gemini) all fail or time out (`FR-013`, `SC-005`) | **Refunded** (`refund_ai_quota()` restores `1` unit; nothing cached) |

#### Instant Single-Payload JSON Responses (`200 OK`, `Content-Type: application/json`)

1. **Shared Cache Hit (`Clarification 3`, `FR-007`, `SC-004`)**:
   ```json
   {
     "mode": "cached",
     "cached": true,
     "tierUsed": "groq",
     "answerMarkdown": "Across retrieved meta-analyses and trained-lifter RCTs, training at longer muscle lengths (`lengthened partials`) produced greater regional and whole-muscle hypertrophy than shortened partials [S1, S2]...",
     "citations": [
       {
         "citation_label": "S1",
         "id": "11111111-1111-4111-8111-111111111111",
         "title": "Lengthened Partials vs Full ROM for Hypertrophy",
         "journal": "Sports Medicine",
         "publication_year": 2025,
         "primary_url": "https://pubmed.ncbi.nlm.nih.gov/12345678/",
         "study_design": "meta_analysis",
         "population": "Resistance-trained adults",
         "is_trained_population": true,
         "sample_size_n": 312,
         "duration_weeks": 10,
         "primary_outcome": "Regional quadriceps and biceps muscle thickness",
         "summary_takeaway": "Lengthened partials elicited small-to-moderate hypertrophy advantages over full ROM.",
         "limitations": ["Heterogeneity in ultrasound measurement sites across included trials"],
         "inspection_depth": "Full-Text",
         "quality_score": 92
       }
     ],
     "quota": {
       "allowed": true,
       "isAdmin": false,
       "dailyLimit": 10,
       "usedToday": 2,
       "remainingToday": 8,
       "resetsAtUtc": "2026-11-29T00:00:00.000Z"
     }
   }
   ```
2. **Zero Matching Published Studies (`FR-011`, `US1` Scenario 4)**:
   ```json
   {
     "mode": "no_matching_studies",
     "cached": false,
     "answerMarkdown": null,
     "citations": [],
     "message": "No matching peer-reviewed studies were found in SBL News for this question and filter combination. Try broadening your query or clearing study-design, duration, or trained-lifter filters.",
     "quota": {
       "allowed": true,
       "isAdmin": false,
       "dailyLimit": 10,
       "usedToday": 2,
       "remainingToday": 8,
       "resetsAtUtc": "2026-11-29T00:00:00.000Z"
     }
   }
   ```

#### Live Uncached Progressive Stream (`200 OK`, `Content-Type: text/event-stream`)

When an uncached query matches `1–5` published studies and an inference tier begins producing tokens (`Clarification 3`, `FR-012`):

- **`event: meta`** (emitted first with cited studies and updated quota):
  `data: {"cached":false,"tierUsed":"groq","citations":[...],"quota":{...},"promptTokenEstimate":1280}\n\n`
- **`event: delta`** (emitted progressively as tokens arrive):
  `data: {"text":"Based on the retrieved trials [S1], "}\n\n`
- **`event: done`** (emitted after full synthesis is persisted in `public.ai_search_cache`):
  `data: {"answerMarkdown":"...","tierUsed":"groq","quota":{...}}\n\n`
- **`event: error`** (emitted only if an active stream drops mid-generation after the first chunk; server calls `refund_ai_quota()` and skips caching):
  `data: {"error":"STREAM_INTERRUPTED","message":"AI synthesis interrupted. Your daily quota was not deducted — please retry.","quota":{...}}\n\n`

---

## 4. Three-Tier Failover & Environment Configuration Contract

| Environment Variable | Default Value | Purpose |
|----------------------|---------------|---------|
| `AI_DAILY_QUOTA_LIMIT` | `10` | Standard member uncached syntheses per UTC day (`Clarification 4`, `FR-008`, `SC-004`) |
| `AI_CACHE_TTL_DAYS` | `7` | Shared query-answer cache retention window (`7` or `30` days; `Clarification 2`, `FR-007`) |
| `GROQ_API_KEY` | *(optional env secret)* | Tier 1 Groq API authentication key |
| `AI_TIER1_GROQ_MODEL` | `"openai/gpt-oss-20b"` | Tier 1 primary low-latency streaming model slug |
| `AI_TIER1_TIMEOUT_MS` | `6000` | Tier 1 connect / first-token timeout before failing over to Tier 2 |
| `OPENROUTER_API_KEY` | *(optional env secret)* | Tier 2 OpenRouter API authentication key |
| `AI_TIER2_OPENROUTER_MODEL` | `"nvidia/nemotron-3-ultra-550b-a55b:free"` | Tier 2 primary OpenRouter `:free` model slug |
| `AI_TIER2_OPENROUTER_ALT_MODEL` | `"nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free"` | Tier 2 secondary OpenRouter `:free` model slug |
| `AI_TIER2_TIMEOUT_MS` | `7000` | Tier 2 connect / first-token timeout before failing over to Tier 3 |
| `GEMINI_API_KEY` | *(existing env secret)* | Tier 3 Google Gemini Free Tier API key (also used for `gemini-embedding-001`) |
| `AI_TIER3_GEMINI_MODEL` | `"gemini-3.5-flash-lite"` | Tier 3 Gemini Free Tier fallback model slug |
| `AI_TIER3_TIMEOUT_MS` | `8000` | Tier 3 connect / first-token timeout |

---

## 5. Neo-Brutalist Sky Blue UI Contracts (`/` & `/search`)

All new UI elements MUST adhere strictly to Constitution Principle III (`2px solid var(--color-border)`, hard zero-blur shadows, `rounded-md`/`rounded-sm` max radii, `#38BDF8` Sky Blue accent with `#0F172A` dark ink, `Space Grotesk` / `Inter` `65ch–75ch` / `JetBrains Mono`, and **zero purple, violet, indigo, gradients, or glassmorphism** across default Light Mode and opt-in Dark Mode):

1. **`FilterBar` "Ask AI" Control & Inline Query Bar on `/` (`web/src/components/feed/filter-bar.tsx`)**:
   - Renders a high-contrast **"Ask AI"** toggle button (`border-2 border-border shadow-control rounded-md font-mono text-xs font-bold`, Sky Blue `bg-accent text-accent-ink` when active) inside the sticky filter bar without adding any hero banner (`FR-002`).
   - **Signed-Out State (`!profile`)**: Clicking **"Ask AI"** expands `<AskAiOAuthPrompt />` inline inside `FilterBar` with **Sign in with Google** and **Sign in with GitHub** buttons (`redirectTo: /auth/callback?next=/search?ai=1`) and a clear note that signed-in members get `10` free AI literature syntheses per day while standard search remains 100% public (`FR-003`, `SC-002`).
   - **Signed-In State (`profile`)**: Clicking **"Ask AI"** expands a compact inline form (`<Input maxLength={300} placeholder="Ask a multi-study training question (e.g., lengthened partials vs full ROM)..." />` + **Synthesize on /search** submit button) that routes to `/search?q=<encoded>&ai=1` (carrying active `study_design` and `trained_only` filters) (`Clarification 1`, `FR-004`).
2. **Search Controls & Quota Allowance Badge on `/search` (`web/src/components/search/ai-search-workspace.tsx`)**:
   - Adds an **"Ask AI"** toggle button alongside the standard **Search** button in the `/search` form card.
   - Standard keyword, semantic, and deterministic filter search executes via `GET /search` without authentication or limits when **"Ask AI"** is inactive (`FR-001`).
   - When a signed-in user activates **"Ask AI"** on `/search` (or arrives via `/search?ai=1`), the header immediately renders their monospace quota badge *before* submission (`Clarification 4`, `FR-004`):
     - Standard Member: `${remainingToday}/${dailyLimit} LEFT TODAY` (`font-mono text-xs font-bold border-[1.5px] border-border rounded-sm px-2 py-0.5`, using `bg-accent text-accent-ink` when `remainingToday > 0` and `bg-badge-abstract text-accent-ink` when `0/10 LEFT TODAY`).
     - Administrator (`isAdmin === true`): `ADMIN • UNLIMITED` (`bg-badge-meta text-accent-ink`).
3. **Citation-Grounded Synthesis Panel (`<AiSynthesisPanel />`)**:
   - Mounted directly above the matching `StudyCard` list on `/search`.
   - Container uses `rounded-md border-2 border-border bg-surface p-4 sm:p-5 shadow-card`.
   - Synthesis prose renders in `Inter` capped at `max-w-[72ch]` (`65ch–75ch`) with inline `[S1]`..`[S5]` citation pills linking directly to `/study/[id]`.
   - Below the synthesis prose, a **Cited Primary Literature (`3–5` Studies)** breakdown lists each cited study (`[S1]`..`[Sn]`) with:
     - Study title linking to `/study/[id]`, journal, publication year, and direct `PubMed / DOI` link.
     - Deterministic evidence design badge (`Meta-Analysis` `#A7F3D0`, `RCT` `#BAE6FD`, etc.), `Trained Population` badge (`#FDE68A`), sample size (`n=...`), duration (`...w`), and mandatory **`Full-Text` (`#BBF7D0`) vs. `Abstract-Only` (`#FED7AA`)** inspection transparency badge (`FR-010`, `SC-003`).
     - Extracted methodological limitations (`limitations[]`) rendered in a scannable callout row.
   - Displays a `CACHED • 0 QUOTA USED` monospace badge when served from the shared TTL cache (`FR-007`).
