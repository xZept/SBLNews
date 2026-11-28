# Feature Specification: Unified Authenticated AI-Assisted Literature Search

**Feature Branch**: `005-ai-literature-search`  
**Created**: 2026-11-28  
**Status**: Draft  
**Input**: User description: "use the handoff summary in c:\Users\allen\Documents\SBLNews\.specify\assessments\ai-search\decision.md."

## Clarifications

### Session 2026-11-28

- Q: How should the "Ask AI" control on the main feed (`/`) behave when a signed-in user activates it? → A: Expand a compact AI query input in the `/` sticky bar and navigate to `/search` with the query and AI synthesis active on submit.
- Q: What default retention window and invalidation policy should govern the shared query-answer cache? → A: 7-day default TTL (configurable up to 30 days) relying solely on natural expiration.
- Q: How should `/api/ai-search` deliver synthesized answers to the `/search` UI for live vs. cached queries? → A: Stream text progressively on live uncached calls; return cached hits immediately in a single payload.
- Q: When should a signed-in user's remaining daily AI synthesis allowance badge appear on `/search` (and what is the daily limit)? → A: Display remaining allowance as soon as a signed-in user activates "Ask AI" on `/search` (before submitting), with a default daily limit of 10 uncached syntheses per UTC day.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Citation-Grounded Multi-Study AI Synthesis on `/search` (Priority: P1)

Signed-in lifters, coaches, clinicians, and researchers visiting `/search` want direct, evidence-based answers to multi-study training questions (such as weekly set volume thresholds, lengthened partials, rest intervals, or creatine timing) without manually reading up to 20 separate study cards. By activating **"Ask AI"** on `/search` and submitting a natural-language question—optionally combined with deterministic study filters (study type, minimum duration in weeks, and training status)—the reader receives a concise synthesis grounded exclusively in the top 3–5 matching published studies, complete with inline citations, deterministic evidence badges, `Full-Text` vs. `Abstract-Only` inspection transparency badges, and methodological limitations alongside the matching study cards.

**Why this priority**: Delivering accurate, citation-grounded multi-study synthesis on `/search` without cold-start delays solves the core reader problem while preserving scientific integrity and keeping standard literature search 100% public and unlimited.

**Independent Test**: Sign in as a standard member on `/search`, enter a multi-study training question with **"Ask AI"** active, and verify that a synthesis panel renders above the matching study cards citing only the top 3–5 deterministically retrieved studies, displaying each cited study's evidence and `Full-Text` / `Abstract-Only` transparency badges, and never mutating `/guidelines`; then sign out and verify standard keyword, semantic, and filter search on `/search` works without restriction.

**Acceptance Scenarios**:

1. **Given** a signed-in user on `/search` with **"Ask AI"** active, **When** they submit a natural-language training question (with or without study-design, duration, or training-status filters), **Then** the system retrieves the top 3–5 matching published studies using deterministic relevance ranking and displays a synthesis panel whose claims cite only those retrieved studies inline with clickable links to `/study/[id]`.
2. **Given** an AI synthesis panel is displayed on `/search`, **When** a reader inspects the answer and cited references, **Then** every cited study displays its deterministic evidence classification, `Full-Text` vs. `Abstract-Only` inspection badge, and key methodological limitations, without overriding or re-scoring any study's deterministic quality rank.
3. **Given** any visitor (signed in or signed out) uses `/search` with **"Ask AI"** inactive, **When** they run keyword, semantic, or deterministic filter searches, **Then** 100% of standard searches execute publicly and without daily usage limits.
4. **Given** a signed-in user submits an **"Ask AI"** question that matches zero published studies under the active filters, **When** the search completes, **Then** the synthesis panel clearly states that no matching peer-reviewed studies were found in SBL News (offering no ungrounded fitness advice) and does not consume any of the user's daily AI synthesis allowance.

---

### User Story 2 - Main-Feed "Ask AI" Entrypoint & Logged-Out Sign-In Teaser on `/` and `/search` (Priority: P1)

Visitors browsing the main research feed (`/`) or `/search` see a high-contrast **"Ask AI"** control inside the sticky top filter/search bar without adding a marketing hero banner or slowing down cached public feed delivery. When a signed-out visitor clicks **"Ask AI"**, an inline sign-in prompt appears offering Google or GitHub sign-in and explaining that signed-in members receive daily AI-synthesized literature answers. When a signed-in reader activates **"Ask AI"** on `/`, they can submit a natural-language training question directly from the sticky bar to open `/search` with AI synthesis active.

**Why this priority**: Surfaces AI-assisted literature synthesis on the highest-traffic entry page (`/`) to drive account sign-ins while strictly protecting unauthenticated requests and instant cached main-feed load performance.

**Independent Test**: Open `/` and `/search` as a signed-out visitor, click **"Ask AI"**, and confirm an inline Google/GitHub sign-in prompt appears without sending an AI synthesis request or slowing initial page delivery; confirm direct unauthenticated requests to the AI synthesis endpoint are rejected; then sign in on `/`, submit a question via **"Ask AI"**, and confirm navigation to `/search` automatically runs the AI synthesis.

**Acceptance Scenarios**:

1. **Given** a signed-out visitor on `/` or `/search`, **When** they click **"Ask AI"**, **Then** an accessible inline Neo-Brutalist sign-in prompt opens with Google and GitHub sign-in actions (preserving their intended search destination upon completion) and zero AI synthesis requests are dispatched.
2. **Given** an unauthenticated caller sends a direct request to the AI synthesis endpoint, **When** the server evaluates the session, **Then** the request is immediately rejected before checking the answer cache, modifying quotas, or invoking AI generation.
3. **Given** a signed-in user on `/`, **When** they activate **"Ask AI"** in the sticky filter bar and submit a training question, **Then** they are navigated to `/search` with their question populated and AI synthesis active, while `/` itself remains fast and pre-rendered for all public visitors with no cold-start delay.
4. **Given** a user switches between default Light Mode and opt-in Dark Mode on `/` or `/search`, **When** viewing the **"Ask AI"** toggle, inline sign-in prompt, quota badge, and synthesis panel, **Then** all controls maintain full Neo-Brutalist Sky Blue contrast and styling parity without purple, violet, indigo, gradients, or blurred shadows.

---

### User Story 3 - Shared Answer Caching & Fair Daily Member Quota Enforcement (Priority: P2)

Recurring training questions asked across the SBL News community (normalized for capitalization, spacing, trailing punctuation, and active study filters) are served instantaneously from a shared answer cache so popular questions do not waste AI capacity or deduct from a reader's daily synthesis allowance. When a signed-in member asks a novel uncached question, the system atomically tracks and enforces their daily synthesis allowance (defaulting to `10` uncached syntheses per UTC day for standard members, and unlimited for administrators) and displays their remaining allowance in a clear monospace badge as soon as **"Ask AI"** is activated on `/search`.

**Why this priority**: Protects zero-dollar operational sustainability and upstream token budgets against burst usage or abuse while rewarding readers with instant, free-of-quota answers on previously synthesized training topics.

**Independent Test**: Sign in as Standard User A (10/10 remaining), activate **"Ask AI"** on `/search` and confirm `10/10 LEFT TODAY` appears before submitting; submit a novel question and confirm the badge updates to `9/10 LEFT TODAY`; sign in as Standard User B (10/10 remaining), submit the same question with different casing/whitespace, and confirm an instant cached synthesis is returned while User B remains at `10/10 LEFT TODAY`; exhaust User A's 10 uncached syntheses, confirm an 11th novel question is blocked with a clear UTC reset notice while standard search still works, and confirm an administrator account displays `ADMIN • UNLIMITED` and is never capped.

**Acceptance Scenarios**:

1. **Given** Signed-In User A previously generated an AI synthesis for a question and filter combination within the active cache retention window, **When** Signed-In User B submits an equivalent question (differing only in casing, extra whitespace, or trailing punctuation) with the same study filters, **Then** the cached synthesis and cited studies are returned immediately and User B's remaining daily allowance is unchanged.
2. **Given** a signed-in standard member activates **"Ask AI"** on `/search` with remaining daily syntheses (default `10` per UTC day), **When** the panel opens and after they submit a valid uncached question that produces a synthesis, **Then** their current remaining count (`e.g., 10/10 LEFT TODAY`) is shown immediately upon activation and atomically decremented by `1` upon uncached synthesis (`9/10 LEFT TODAY`), even under concurrent tabs/requests.
3. **Given** a signed-in standard member has `0` uncached syntheses remaining for the current UTC day, **When** they submit an uncached AI question, **Then** the system declines AI generation with a clear message showing when their daily allowance resets, while still displaying the standard matching study cards (and still serving already-cached AI answers without deduction).
4. **Given** a signed-in user with administrator privileges uses **"Ask AI"**, **When** they activate **"Ask AI"** or submit any number of uncached questions in a day, **Then** the synthesis header displays `ADMIN • UNLIMITED` and no daily cap blocks their requests.

---

### User Story 4 - Multi-Tier AI Service Continuity & Non-Penalizing Failure Recovery (Priority: P2)

Signed-in readers asking uncached questions receive uninterrupted syntheses even when the primary AI inference provider encounters rate limits, transient errors, or timeouts. Behind the scenes, live requests stream answer text progressively when served by a streaming tier and automatically fail over across a three-tier AI provider chain (primary low-latency tier, first fallback tier, and second fallback tier). If all three providers fail on a single request, the reader's daily allowance is not consumed and standard search results remain fully usable.

**Why this priority**: Free-tier AI providers enforce strict per-minute and daily rate limits; automatic multi-tier failover and quota protection keep the reader experience reliable and fair without paid recurring infrastructure.

**Independent Test**: Simulate a rate-limit or timeout response on Tier 1 and verify the synthesis completes seamlessly via Tier 2; simulate simultaneous rate-limit/timeout failures on Tier 1 and Tier 2 and verify completion via Tier 3; simulate failures across all three tiers and verify the user sees a clear retry notice alongside standard study results with their daily remaining quota unchanged and no failed response stored in the shared cache.

**Acceptance Scenarios**:

1. **Given** an uncached AI synthesis request where the primary AI tier returns a rate-limit error, transient failure, or exceeds its response timeout, **When** the system handles the failure, **Then** it automatically retries via Fallback Tier 1 (and, if Fallback Tier 1 similarly fails, via Fallback Tier 2) and returns a grounded synthesis without requiring the user to resubmit.
2. **Given** all three AI inference tiers fail or time out before producing a valid synthesis, **When** the request concludes, **Then** the user's daily AI synthesis allowance is preserved (not permanently decremented), nothing is written to the shared answer cache, and the synthesis panel shows an actionable retry message above the standard deterministic study results.

---

### Edge Cases

- What happens when a user submits an empty, whitespace-only, excessively short, or overly long **"Ask AI"** query? Input validation rejects blank/too-short queries and enforces a clear maximum query length (e.g., `300` characters) with inline feedback before calling the server or consuming quota.
- What happens when a user asks a general medical, supplement-dosing, or off-topic question unrelated to exercise-science studies in SBL News (or attempts prompt injection to ignore study context)? The synthesis strictly confines its answer to what the retrieved studies actually test—explicitly noting if the retrieved studies do not address the user's specific claim—and ignores instructions inside queries to fabricate citations or abandon scientific grounding.
- What happens when the top 3–5 retrieved studies have unusually long outcome or limitation summaries? The context builder deterministically trims per-study text fields while preserving core metadata, badges, and citations so the total study context stays strictly below the `2,000`-token ceiling.
- What happens when two signed-in users submit the exact same uncached query simultaneously, or one user double-clicks submit? Client controls prevent duplicate in-flight submissions from the same tab, atomic server-side quota checks prevent exceeding daily limits via race conditions, and subsequent requests reuse the newly cached answer.
- What happens when new peer-reviewed studies are approved and published via `/admin/review` or scheduled ingestion? Cached syntheses naturally refresh once their configured retention window (`7` days by default) expires without wiping the entire community cache on every daily study ingestion run, and `/guidelines` remains completely untouched by AI search syntheses.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST keep all standard keyword, semantic, and deterministic filter searches (`study type`, `minimum duration in weeks`, `training status`) 100% public, unauthenticated, and unlimited across `/` and `/search`.
- **FR-002**: System MUST render a high-contrast **"Ask AI"** control inside the sticky filter/search bar on `/` (preserving cached static main-feed delivery with zero cold-start delay and no marketing hero banner) and inside the search controls on `/search`.
- **FR-003**: When a signed-out visitor activates **"Ask AI"** on `/` or `/search`, the system MUST present an inline sign-in prompt offering Google and GitHub sign-in (preserving the user's intended search query and return destination) without invoking the AI synthesis endpoint.
- **FR-004**: When a signed-in user activates **"Ask AI"** on `/`, the sticky filter bar MUST expand a compact inline AI query input that, upon submission, navigates to `/search` with the query and AI synthesis mode active; on `/search`, activating **"Ask AI"** MUST immediately display the user's monospace daily allowance indicator (`e.g., 10/10 LEFT TODAY` or `ADMIN • UNLIMITED`) before submission, and submitting a question MUST display the AI synthesis panel above the matching study cards.
- **FR-005**: The internal AI synthesis endpoint MUST verify user authentication on the server for every request, immediately rejecting unauthenticated callers before performing cache lookups, quota updates, or AI inference, and MUST validate query text and filter inputs at the request boundary.
- **FR-006**: System MUST deterministically normalize incoming AI questions (lowercased text, collapsed whitespace, trimmed trailing punctuation, paired with canonical active filter values) and look up a valid unexpired entry in the shared query-answer cache *before* deducting user quota or invoking AI inference.
- **FR-007**: Shared cache hits MUST return the synthesized answer and its cited study metadata immediately without decrementing the caller's daily synthesis allowance; shared cache entries MUST expire via natural TTL expiration using a configurable retention setting supporting `7` or `30` days (defaulting to `7` days, without automatic cache purges on study publication).
- **FR-008**: On shared cache misses where at least one matching published study exists, the system MUST atomically enforce a configurable daily synthesis cap per standard user (defaulting to `10` uncached syntheses per UTC day) while granting unlimited syntheses to verified `admin` users, preventing client-side tampering with usage counts or cached entries.
- **FR-009**: For uncached syntheses, the system MUST retrieve only the top 3–5 matching published studies using SBL News's deterministic hybrid relevance ranking and active filters, projecting only structured study summary fields (excluding raw full texts and embedding vectors) and capping total assembled study context strictly below `2,000` tokens per request.
- **FR-010**: Every synthesized answer MUST ground all statements exclusively in the retrieved 3–5 published studies, render inline citations linking to `/study/[id]`, display each cited study's deterministic evidence classification, `Full-Text` vs. `Abstract-Only` inspection transparency badge, and methodological limitations, and MUST NEVER fabricate citations, re-score study quality, support multi-turn ungrounded chat, or mutate `/guidelines`.
- **FR-011**: If zero published studies match the query and active filters, the system MUST return a deterministic "no matching studies" state without calling AI inference, writing an ungrounded answer, or consuming the user's daily synthesis allowance.
- **FR-012**: On uncached syntheses, the system MUST stream synthesized answer text progressively to the client (while returning shared cache hits immediately in a single payload) and automatically fail over across three ordered, environment-configurable AI inference tiers (primary low-latency tier -> Fallback Tier 1 -> Fallback Tier 2) with bounded per-tier timeouts whenever an upstream tier returns a rate-limit error, transient service failure, or timeout.
- **FR-013**: If all three AI inference tiers fail to generate a valid synthesis, the system MUST NOT permanently consume the user's daily synthesis allowance, MUST NOT cache the failed response, and MUST surface a clear retry message while preserving standard deterministic study search results.
- **FR-014**: Feature scope MUST stay strictly within the 8 approved user-facing page routes (updating only `/` and `/search`) plus the single approved internal AI search endpoint, and all new UI elements MUST comply with the Neo-Brutalist Sky Blue design system across default Light Mode and opt-in Dark Mode (`2px` structural borders, zero-blur hard offset shadows, `rounded-md`/`rounded-sm` max radii, `#38BDF8` Sky Blue accent with `#0F172A` dark ink, `Space Grotesk` / `Inter` `65ch–75ch` / `JetBrains Mono` typography, and zero purple, violet, indigo, gradients, or glassmorphism).

### Key Entities

- **Normalized Synthesis Query**: Canonical representation of a reader's natural-language lifting question (trimmed, lowercased, collapsed whitespace/punctuation, capped length) combined with active deterministic study filters (`study type`, `minimum duration in weeks`, `training status`) used to match equivalent community questions.
- **Shared Cached Synthesis**: Stored synthesis record linking a canonical query key to the generated markdown/cited synthesis text, the ordered list of 3–5 cited published study identifiers and summary metadata, the creation timestamp, and the expiration timestamp governed by the configured cache retention window.
- **Daily User Synthesis Quota**: Per-user daily usage ledger tracking the authenticated user identifier, UTC usage date, and count of uncached AI syntheses consumed that day against the configured daily member limit (bypassed for `admin` role accounts).
- **Cited Study Context**: Compact, token-bounded summary projection of one of the top 3–5 deterministically retrieved published studies (study identifier, title, journal, publication year, study design, population, sample size, duration in weeks, primary outcome, summary takeaway, limitations, and `Full-Text` vs. `Abstract-Only` inspection depth).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of unauthenticated AI synthesis requests are rejected before any cache lookup, quota change, or AI generation, while 100% of standard keyword, semantic, and filter searches on `/` and `/search` remain open and unlimited for all visitors.
- **SC-002**: Signed-out visitors clicking **"Ask AI"** on `/` or `/search` see an inline Google/GitHub sign-in prompt in 1 click without degrading main-feed initial load speed or introducing cold-start delays.
- **SC-003**: 100% of AI syntheses cite only the top 3–5 deterministically retrieved published studies (displaying each cited study's evidence and `Full-Text` / `Abstract-Only` transparency badges), and 100% of assembled study contexts stay strictly below `2,000` tokens.
- **SC-004**: Standard signed-in members are accurately capped at the configured daily limit (default `10` uncached syntheses per UTC day) even under concurrent requests, `admin` accounts remain uncapped, and 100% of valid shared cache hits return in under 1 second without deducting from any user's daily allowance.
- **SC-005**: When Tier 1 or both Tier 1 and Tier 2 AI providers experience rate limits or timeouts, 100% of requests with at least one healthy fallback tier still complete and return a grounded synthesis within a single user submission; if all three tiers fail, 0 daily quota units are permanently lost.
- **SC-006**: All updated surfaces on `/` and `/search` preserve the 8-route boundary and pass Light Mode and Dark Mode visual parity checks with zero purple/violet/indigo hues, zero gradients, and zero blurred shadows.

## Assumptions

- **Default 7-Day Shared Cache Retention (`7` vs. `30` Days)**: The shared query-answer cache defaults to a `7`-day retention window (configurable via environment settings to `30` days) and relies on natural TTL expiration rather than purging the cache on every daily literature ingestion run, balancing fresh weekly research coverage against high cache hit rates.
- **Delivery & Quota Refund Behavior**: Live uncached syntheses stream progressively to the synthesis panel (while cached hits render immediately in a single payload), and quota is either committed only upon valid synthesis start/completion or atomically refunded if all three inference tiers fail so users never lose daily allowance to provider outages.
- **Main-Feed (`/`) to `/search` Flow for Signed-In Users**: Activating **"Ask AI"** on `/` reveals a compact query input in the sticky filter bar for signed-in users that navigates to `/search` with the query and AI mode active, keeping `/` focused on the scannable `Daily | Weekly | Top` literature feed while centralizing full synthesis + supporting study cards on `/search`.
- **Configurable Thresholds & Provider Identifiers**: Daily member quota (`10`/day default), cache retention days (`7` days default), per-tier response timeouts, and the three inference tier model identifiers are runtime-configurable via environment settings so maintainers can adjust free-tier models or limits without redeploying structural code changes.
