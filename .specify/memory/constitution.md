<!--
Sync Impact Report
- Version change: 1.1.0 -> 1.2.0
- Modified principles:
  - I. Architecture & $0/Month Free-Tier First -> I. Architecture & $0/Month Free-Tier First (replaced decoupled Render Free RAG note with unified `/api/ai-search` Next.js Route Handler on Vercel Hobby, native `fetch` 3-tier Groq -> OpenRouter `:free` -> Gemini failover chain, optional one-time $10 OpenRouter credit allowance at $0/month recurring cost, and client-island ISR preservation on `/`)
  - II. Scientific Integrity & Deterministic AI Pipeline -> II. Scientific Integrity & Deterministic AI Pipeline (distinguished `/pipeline` Pydantic structured extraction from `/api/ai-search` citation-grounded synthesis over top 3-5 deterministically retrieved studies)
  - III. Neo-Brutalist Sky Blue Design System -> III. Neo-Brutalist Sky Blue Design System (documented Neo-Brutalist "Ask AI" entrypoint and logged-out OAuth teaser in the sticky filter/search bar across Light and Dark themes)
  - IV. Performance, Egress & Security Guardrails -> IV. Performance, Egress & Security Guardrails (added `<2,000`-token synthesis context budget, shared 7/30-day TTL query-answer cache lookup prior to quota deduction, `401` Supabase Auth boundary on `/api/ai-search` with 100% public standard search, and atomic `check_and_increment_ai_quota` Postgres RPC with admin bypass)
  - V. Scoped Route Discipline -> V. Scoped Route Discipline (preserved the 8 approved user-facing page routes, updated `/` and `/search` descriptions for "Ask AI" teaser/synthesis, and explicitly codified the approved internal Next.js Route Handlers `/auth/callback` and `/api/ai-search`)
  - VI. Verification & Deterministic Code Quality -> VI. Verification & Deterministic Code Quality (added automated `/web` unit test requirements for deterministic query normalization, `<2,000`-token context capping, quota/auth guards, and 3-tier `429` failover)
- Added sections:
  - Approved Internal Route Handlers (`/auth/callback` and `/api/ai-search`) sub-list under Principle V
- Removed sections:
  - Optional Render Free FastAPI/RAG service allowance (superseded by unified `/api/ai-search` Route Handler)
- Templates requiring updates:
  - ✅ .specify/templates/plan-template.md (aligned; Constitution Check consumes this file dynamically)
  - ✅ .specify/templates/spec-template.md (aligned; reads governance at runtime)
  - ✅ .specify/templates/tasks-template.md (aligned; reads quality gates at runtime)
- Follow-up TODOs: None
-->
# SBL News (Science-Based Lifting News) Constitution

## Core Principles

### I. Architecture & $0/Month Free-Tier First (NON-NEGOTIABLE)

SBL News MUST operate as a sustainable $0/month recurring hobby-tier system with clean workload boundaries and zero always-on compute dependencies for core reading, literature search, and daily ingestion:

- **Monorepo Separation**: The repository MUST cleanly isolate the web application (`/web`) and the automated research ingestion worker (`/pipeline`) within a single monorepo.
- **Web Application (`/web`)**: `/web` MUST use Next.js (App Router, TypeScript `strict: true`), Tailwind CSS v4, and shadcn/ui deployed on Vercel Hobby ($0/month). Public feeds (`/`) and training guidelines (`/guidelines`) MUST use Incremental Static Regeneration (ISR) so public reads remain fast and NEVER block on serverless or external cold starts. Interactive search or `"Ask AI"` controls on `/` MUST execute inside client-side islands (`FeedClient` / `FilterBar`) and MUST NOT convert `/` into a dynamic per-request server render.
- **Database, Storage & Authentication**: Persistence, hybrid search, AI query-answer caching, per-user AI quota tracking, and avatar object storage MUST run on Supabase Free ($0/month) using PostgreSQL with `pgvector` for semantic search and Supabase Storage for compact user avatar thumbnails. Every database schema, RPC function, storage bucket, or policy change MUST be authored and versioned via Git-first SQL migrations. User authentication MUST use OAuth (Google and GitHub) via Supabase Auth and MUST NOT rely on Supabase's built-in email mailer for user signups.
- **Scheduled Ingestion Worker (`/pipeline`)**: Daily literature ingestion MUST be implemented in Python with Pydantic and executed via GitHub Actions scheduled cron ($0/month). Ingestion MUST NOT require an always-on backend server.
- **AI Extraction & Unified Literature Synthesis (`/api/ai-search`)**: Structured metadata extraction in `/pipeline` and `768`-dimensional study/query embedding generation MUST use the Google Gemini API Free Tier (`gemini-3.5-flash-lite` and `gemini-embedding-001`). Authenticated on-demand AI literature synthesis MUST run inside the unified `/web` Next.js runtime via the `/api/ai-search` Route Handler on Vercel Hobby—MUST NOT deploy a separate Render Free backend or external Redis service—and MUST execute inference via native `fetch` (zero additional LLM SDK dependencies) with tight per-tier connect/TTFB timeouts and automatic failover on HTTP `429` rate-limit or transient `5xx`/timeout errors across three environment-configurable tiers:
  1. **Tier 1 (Primary)**: Groq (`openai/gpt-oss-20b`) for low-latency token streaming.
  2. **Tier 2 (Fallback 1)**: OpenRouter `:free` models (`nvidia/nemotron-3-ultra-550b-a55b:free` or `nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free`, which MAY rely on an optional one-time $10 OpenRouter credit balance while maintaining $0/month recurring inference spend).
  3. **Tier 3 (Fallback 2)**: Google Gemini API Free Tier (`GEMINI_API_KEY`).
- **Stack & Dependency Discipline**: Specifications, plans, and implementations MUST NOT introduce paid recurring third-party services, external rate-limiting clusters (such as Upstash Redis), ORMs, LLM client SDKs, or extra UI component libraries outside this defined stack without explicit owner approval and a formal constitution amendment.

**Rationale**: Unifying ISR-cached public pages and the `/api/ai-search` Route Handler on Vercel + Supabase eliminates Render Free 30–60s cold starts while preserving $0/month recurring operational predictability through 3-tier free-tier failover.

### II. Scientific Integrity & Deterministic AI Pipeline (NON-NEGOTIABLE)

Evidence synthesis and feed curation MUST ground every claim in peer-reviewed primary literature and separate stochastic LLM generation from deterministic evidence scoring and retrieval:

- **Primary Sources First**: `/pipeline` MUST ingest primary peer-reviewed literature exclusively from the PubMed E-utilities API, OpenAlex API, and targeted exercise-science journal RSS feeds. Social media posts and YouTube creator videos MUST be stored and rendered strictly as secondary commentary attached to existing study threads and MUST NEVER serve as primary feed sources.
- **Extraction vs. Scoring Separation**: During `/pipeline` ingestion, LLMs MUST be invoked strictly with Pydantic structured JSON outputs to extract objective study metadata (`study_design`, `population`, `sample_size_n`, `duration_weeks`, `primary_outcome`, `summary_takeaway`, `limitations`). Across both `/pipeline` and `/web`, an LLM MUST NEVER arbitrarily judge, rank, or score study quality. All study ranking, hybrid retrieval (`search_studies_hybrid`), filtering, and quality scoring MUST execute deterministically in Python/SQL code—explicitly prioritizing human meta-analyses/systematic reviews and >=8-week randomized controlled trials (RCTs) on resistance-trained lifters while downranking or filtering animal studies and acute EMG-only studies.
- **Citation-Grounded Search Synthesis (`/api/ai-search`)**: Authenticated AI search synthesis MUST ground every synthesized statement exclusively in the top 3–5 published studies deterministically retrieved from `public.studies` via hybrid PostgreSQL full-text + `pgvector` search (`search_studies_hybrid`). Responses MUST cite the retrieved studies inline alongside their deterministic evidence badges, `Full-Text` vs. `Abstract-Only` inspection depth, and methodological limitations, and MUST NOT fabricate citations, maintain ungrounded multi-turn chat personas, or answer general fitness questions unsupported by retrieved primary studies.
- **Inspection Transparency Badges**: Every study record MUST explicitly persist in PostgreSQL and display in the UI (including study cards paired with AI search syntheses) its source inspection depth (`Full-Text` vs. `Abstract-Only`) alongside its extracted study-design and population badges.
- **Human-in-the-Loop (HITL) Living Guidelines**: Automated pipelines and `/api/ai-search` syntheses MUST NEVER directly overwrite, mutate, or publish updates to `/guidelines`. When a newly ingested systematic review or meta-analysis matches an active guideline topic, `/pipeline` MUST only insert a `Consensus Drift` alert into `/admin/review` for manual administrator verification and approval.

**Rationale**: Enforcing deterministic SQL/Python ranking, strict citation grounding over retrieved primary studies, and mandatory human review prevents LLM hallucination from distorting scientific evidence hierarchies or silently altering training recommendations.

### III. Neo-Brutalist Sky Blue Design System (NON-NEGOTIABLE)

Every screen in `/web` MUST implement the high-contrast Neo-Brutalist Sky Blue visual language (combining Hugging Face Daily Papers feed density with Examine evidence organization) and reject generic AI styling patterns:

- **Anti-Vibecoding & Anti-Purple Guardrails**: The UI (including `"Ask AI"` toggles, OAuth sign-in prompts, quota badges, and AI synthesis panels) MUST NOT use purple, violet, or indigo hues (even where Examine or generic AI tools use purple/sparkles), color gradients, mesh backgrounds, glassmorphism (`backdrop-blur`), blurry drop-shadows, or dark-mode-by-default themes. Light Mode MUST always be the default theme for new and unauthenticated visitors, while an opt-in user-selectable Neo-Brutalist Dark Theme is supported via the top-right account menu and `/profile` settings.
- **Tailwind CSS v4 Namespace Reset**: `/web` (`globals.css`) MUST clear default Tailwind color namespaces (`--color-*: initial;` inside `@theme`) so only explicitly defined Neo-Brutalist Sky Blue tokens exist as utility classes.
- **Primitive-Level shadcn/ui Overrides**: Default shadcn/ui soft borders, rings, and diffused shadows MUST be overridden directly at the primitive component level (`Card`, `Badge`, `Button`, `Input`, `Tabs`) so no unstyled default primitives appear anywhere in the app.
- **Color Tokens**:
  - **Default Light Theme**: Page canvas MUST use `#F8FAFC`; card and container surfaces MUST use `#FFFFFF`; primary accent (active tabs, primary CTAs, active upvote state, `"Ask AI"` active/accent controls) MUST use `#38BDF8` (Sky Blue) paired with `#0F172A` ink text; primary ink and structural borders MUST use `#0F172A`; muted secondary text MUST use `#475569`.
  - **Opt-In Neo-Brutalist Dark Theme (`[data-theme="dark"]`)**: Page canvas MUST use `#0B1120`; card and container surfaces MUST use `#1E293B`; primary ink MUST use `#F8FAFC`; muted secondary text MUST use `#94A3B8`; primary accent MUST remain `#38BDF8` (Sky Blue) paired with `#0F172A` ink text; structural borders and hard offset shadows MUST use high-contrast `#38BDF8` or `#E2E8F0` (`#020617` shadow offset) with zero blur and zero purple/violet/indigo hues.
  - **Semantic Evidence & Transparency Badges**: MUST use `1.5px solid #0F172A` borders, `#0F172A` dark ink text, `JetBrains Mono` font, and solid pastel fills in both themes: Meta-Analysis / Systematic Review `#A7F3D0`, RCT (>=8 weeks, Human) `#BAE6FD`, Trained Population `#FDE68A`, Open-Access Full Text `#BBF7D0`, and Abstract-Only Warning `#FED7AA`.
- **Borders, Corners & Hard Elevation**: Cards, AI synthesis panels, filter bars, popovers, inputs, and buttons MUST render `2px solid` structural borders (`var(--color-border)`). Primary cards and synthesis containers MUST use hard zero-blur offset shadows (`var(--shadow-card)`); buttons, avatars, and filter pills MUST use `var(--shadow-control)` with a `translate(2px, 2px)` active press state. Corner radii MUST NOT exceed `rounded-md` (`6px`) on cards/containers and `rounded-sm` (`4px`) on metadata badges—NEVER `rounded-2xl` or pill-shaped cards.
- **Typography**: Headings and brand wordmark MUST use `Space Grotesk` (`700`/`800` weight, tight tracking). Body copy, AI synthesis prose, and study takeaways MUST use `Inter` capped at a `65ch-75ch` line measure. Study metrics, quota counters (`4/5 LEFT`, `ADMIN • UNLIMITED`), and counts (`n=42`, `10w`, `p<0.05`, upvote counts, dates, avatar initials) MUST use `JetBrains Mono`.
- **Hybrid Page Layout Geometry**:
  - **Main Feed (`/`)**: MUST follow the Hugging Face Daily Papers layout in a Neo-Brutalist skin—opening directly into a sticky top filter/search bar (`Daily | Weekly | Top` tabs, study-type filter pills, and the client-side `"Ask AI"` entrypoint/logged-out OAuth teaser) with NO marketing hero banner. Studies MUST render as high-contrast cards with a left upvote column, bold title, journal/year, monospace metadata badges, a concise 2-sentence takeaway, and direct `Discussion` plus `PubMed/DOI` actions.
  - **Training Guidelines (`/guidelines`)**: MUST follow the Examine information architecture in a Neo-Brutalist skin—rendering a top 3-column grid of core evidence hubs (*Hypertrophy*, *Maximal Strength*, *Recovery & Nutrition*) followed by a 4-column indexed directory of specific training variables (*Weekly Volume*, *RIR / Failure*, *Frequency*, *Rest Intervals*, *Protein Intake*), each displaying an evidence grade badge and anchor meta-analysis citations.

**Rationale**: Locking tokens at the CSS `@theme` and primitive component layers enforces unmistakable editorial clarity, accessible contrast across default light and opt-in dark themes, and zero drift into generic purple/gradient AI aesthetics even on AI-assisted search surfaces.

### IV. Performance, Egress & Security Guardrails (NON-NEGOTIABLE)

All database queries, storage uploads, API routes, AI synthesis pipelines, and mutations MUST defend free-tier bandwidth/token quotas and enforce defense-in-depth access control:

- **Egress, Context Budget & Shared Cache Protection**: List, feed, search, and profile activity endpoints MUST NEVER execute `SELECT *`. Queries MUST explicitly project only required summary columns and MUST exclude raw full-text payloads and `pgvector` embedding vectors from feed/list/profile responses to stay well within Supabase Free's 5 GB monthly egress cap. `/api/ai-search` MUST retrieve at most the top 3–5 published studies and cap total assembled prompt context strictly below **2,000 tokens** per request (protecting Groq's 8,000 TPM free-tier limit and database egress). Incoming AI queries MUST be deterministically normalized (lowercased, whitespace/punctuation collapsed, paired with active deterministic filter state) and checked against a shared Supabase query-answer cache table with an environment-configurable **7- or 30-day TTL** (defaulting to 7 days) *before* generating query embeddings, calling upstream LLMs, or deducting user quota. User-uploaded profile photos MUST be downscaled client-side to compact square thumbnails (`<= 256x256` WebP/JPEG, max `200 KB`) in a size- and MIME-restricted Supabase Storage bucket (`<= 500 KB` hard bucket limit).
- **Public Search vs. Authenticated AI Quota & RBAC**: Standard keyword, `pgvector` semantic, and deterministic study-design filter search MUST remain 100% public and unlimited for all visitors. `/api/ai-search` MUST verify caller authentication server-side via Supabase Auth (`supabase.auth.getUser()`), immediately returning `401 Unauthorized` for unauthenticated requests. On shared cache misses, `/api/ai-search` MUST enforce an environment-configurable daily per-user cap (default `5` uncached syntheses/day for standard members; unlimited when `public.is_admin()` / `profiles.role = 'admin'`) via an atomic PostgreSQL RPC (`check_and_increment_ai_quota`); cache hits MUST bypass quota deduction, and complete failure across all three LLM tiers MUST NOT permanently penalize a user's daily quota.
- **Row-Level Security**: PostgreSQL Row-Level Security (RLS) MUST be enabled on all tables (including AI quota and shared query-answer cache tables) and storage buckets. Unauthenticated public users MUST have read-only access restricted to published studies, published guidelines, public comments, and public profile fields (`display_name`, `avatar_url`, community role tag, bio); authenticated users MUST have scoped write access limited to their own profile row (`public.profiles`), their own avatar storage objects (`avatars/{user_id}/*`), and their own comments, social actions, and votes, while AI quota mutations and shared cache writes MUST execute strictly through server-verified RPCs or service boundaries so clients CANNOT tamper with daily usage counts or poison cached syntheses. Private account metadata (such as email or internal preferences) MUST NOT be exposed on public profile views (`/profile/[id]`). All moderation, study approval, and guideline publishing routes (`/admin/review`) MUST enforce strict server-side Role-Based Access Control (RBAC) alongside RLS policies.
- **Boundary Input Validation**: Every external API boundary, route handler (including `/api/ai-search`), server action, profile update, and ingestion interface MUST validate inputs at runtime using Zod in TypeScript (`/web`) and Pydantic in Python (`/pipeline`).

**Rationale**: Explicit column projection, `<2,000`-token context caps, pre-quota shared TTL caching, and atomic Postgres quota RPCs protect free-tier egress and LLM token budgets without external Redis infrastructure, while layered Supabase Auth + RLS + Zod validation prevents unauthorized token drain or privilege escalation.

### V. Scoped Route Discipline

Product specifications, implementation plans, and task breakdowns MUST confine user-facing application pages to the 8 approved page routes and internal server endpoints to the 2 approved Next.js Route Handlers:

- **Approved User-Facing Page Routes (8)**:
  - **`/` (Main Research Feed)**: `Daily` / `Weekly` / `Top` tabs, structured Neo-Brutalist study cards, deterministic badge filters, and client-side `"Ask AI"` entrypoint (presenting an inline OAuth sign-in prompt for logged-out visitors while preserving ISR).
  - **`/study/[id]` (Study Detail & Discussion)**: Structured AI metadata breakdown, `Full-Text` vs. `Abstract-Only` transparency badge, primary `PubMed/DOI` link, optional secondary creator video links, and nested discussion thread with clickable commenter avatars/names linking to `/profile/[id]`.
  - **`/guidelines` (Living Evidence Matrix)**: Practical training guidelines organized into the 3-column hub grid and 4-column variable directory with evidence strength grades, anchor meta-analyses, and last-updated changelog.
  - **`/search` (Hybrid & AI-Assisted Search)**: Unlimited public hybrid keyword + `pgvector` semantic search paired with deterministic SQL filters (study type, minimum duration in weeks, training status), plus the `"Ask AI"` synthesis mode (inline OAuth sign-in prompt for logged-out visitors; citation-grounded multi-study AI synthesis panel with monospace daily quota badge and supporting study cards for authenticated users).
  - **`/methodology` (Transparency Hub)**: Static documentation of primary literature ingestion sources, deterministic scoring rubric, inspection-level rules, and HITL guideline governance.
  - **`/admin/review` (Moderation & Drift Queue)**: Server-side RBAC-protected queue for approving ingested studies and reviewing `Consensus Drift` alerts.
  - **`/profile` (Authenticated User Profile & Account Settings)**: Dedicated profile and account management route reached from the top-right account menu bubble where signed-in users manage their profile photo (with 2-letter name initials fallback), display name, training/professional role tag, short bio/credentials, theme preference (`Light` / `Dark`), and upvoted study / comment activity history.
  - **`/profile/[id]` (Public Commenter Profile View)**: Read-only public profile route reached by clicking a commenter's name or avatar in study discussions, displaying their public avatar (or initials badge), display name, training/professional role badge, bio/credentials, and public comment history.
- **Approved Internal Next.js Route Handlers (2)**:
  - **`/auth/callback` (OAuth Callback Handler)**: Exchanges Google and GitHub OAuth authorization codes for Supabase Auth sessions and redirects safely to the caller's intended internal destination.
  - **`/api/ai-search` (Authenticated AI Literature Synthesis Handler)**: Server-authenticated (`supabase.auth.getUser()`) Route Handler executing Zod input validation, shared 7/30-day TTL cache lookup, atomic daily per-user quota enforcement (`check_and_increment_ai_quota` with admin bypass), `<2,000`-token hybrid study retrieval (`search_studies_hybrid`), and native `fetch` 3-tier `429` failover (`Groq` -> `OpenRouter :free` -> `Google Gemini Free Tier`).

**Rationale**: Explicitly governing both the 8 user-facing page routes and the 2 internal Route Handlers prevents uncontrolled page/API sprawl while accommodating unified Next.js OAuth and cold-start-free AI literature synthesis.

### VI. Verification & Deterministic Code Quality (NON-NEGOTIABLE)

No specification, task, or pull request may be marked complete without objective, automated verification across both workspaces:

- **Verifiable Acceptance Criteria**: Every feature spec MUST define concrete, testable acceptance scenarios covering functional behavior, design-system compliance, and free-tier constraints.
- **Frontend Type, Lint & Unit Gates (`/web`)**: All TypeScript code MUST pass `tsc --noEmit` under strict mode and clean linter execution before task completion. Deterministic `/web` domain logic—including `/api/ai-search` query normalization, `<2,000`-token prompt context truncation, `401`/daily-quota guardrails, cache-hit quota bypass, and 3-tier HTTP `429`/timeout failover—MUST be covered by automated unit tests.
- **Pipeline Schema & Scoring Unit Tests (`/pipeline`)**: All Pydantic extraction schemas and deterministic study scoring/filtering functions MUST be covered by automated unit tests verifying ranking priority (human meta-analyses and >=8-week trained RCTs) and downranking/exclusion rules (animal and acute EMG-only studies).

**Rationale**: Automated static analysis and deterministic unit tests across both `/web` and `/pipeline` catch schema drift, token/quota regressions, failover bugs, and scoring errors before code reaches production.

## Stack, Design Token & Route Reference

| Layer | Mandated Choice | Monthly Cost | Key Constraint |
|-------|-----------------|--------------|----------------|
| Monorepo Layout | `/web` + `/pipeline` | $0 | Strict workspace boundary; no coupled runtime or Render Free service |
| Frontend (`/web`) | Next.js App Router, TS Strict, Tailwind v4, shadcn/ui | $0 (Vercel Hobby) | ISR for `/` (with client-island `"Ask AI"` teaser) and `/guidelines`; no ORMs, extra UI libs, or LLM SDK bloat |
| Database, Storage & Auth | Supabase PostgreSQL + `pgvector` + Storage + OAuth (Google/GitHub) | $0 (Supabase Free) | Git-first SQL migrations; RLS on all tables & `avatars` bucket; atomic `check_and_increment_ai_quota` RPC + shared 7/30d cache; no built-in email mailer or external Redis |
| Ingestion (`/pipeline`) | Python + Pydantic on GitHub Actions Cron | $0 | Scheduled batch only; no always-on worker server |
| AI Layer | Gemini Free Tier (`/pipeline` extraction + `768`-dim embeddings); Groq (`openai/gpt-oss-20b`) -> OpenRouter `:free` -> Gemini Free Tier (`/api/ai-search`) | $0/mo recurring (optional one-time $10 OpenRouter credit) | Structured `/pipeline` extraction; `<2,000`-token citation-grounded `/api/ai-search` synthesis via native `fetch` 3-tier `429` failover; `5`/day member quota (admin unlimited, cache hits free) |

| Token Category | Token Role | Normative Value |
|----------------|------------|-----------------|
| Surface (Default Light) | Page Canvas / Card Surface | `#F8FAFC` / `#FFFFFF` |
| Ink & Accent (Default Light) | Primary Ink & Borders / Sky Blue Accent / Muted Text | `#0F172A` / `#38BDF8` (with `#0F172A` text) / `#475569` |
| Surface & Ink (Opt-In Dark) | Page Canvas / Card Surface / Primary Ink / Border / Muted Text | `#0B1120` / `#1E293B` / `#F8FAFC` / `#E2E8F0` / `#94A3B8` (Accent remains `#38BDF8` with `#0F172A` text) |
| Evidence Badges | Meta-Analysis / >=8w Human RCT / Trained Pop. | `#A7F3D0` / `#BAE6FD` / `#FDE68A` (`1.5px solid #0F172A`, `#0F172A` text, `JetBrains Mono`) |
| Transparency Badges | Open-Access Full Text / Abstract-Only Warning | `#BBF7D0` / `#FED7AA` (`1.5px solid #0F172A`, `#0F172A` text, `JetBrains Mono`) |
| Geometry | Borders / Card Shadow / Control Shadow & Active Press | `2px solid var(--color-border)` / `4px 4px 0px` hard offset / `2px 2px 0px` hard offset + `translate(2px, 2px)` |
| Radii & Fonts | Max Radius (Card / Badge) / Headings / Body / Metrics | `6px` (`rounded-md`) / `4px` (`rounded-sm`) / `Space Grotesk` / `Inter` (`65ch-75ch`) / `JetBrains Mono` |

## Development Workflow & Quality Gates

1. **Constitution Check Gate**: Every `/speckit-plan` artifact MUST evaluate compliance against Principles I-VI before Phase 0 research and again after Phase 1 design. Any proposed deviation (paid recurring service, external Redis, ORM, LLM SDK, unapproved route outside the 8 page routes and 2 internal Route Handlers, AI prompt context >= 2,000 tokens, non-token color, or `SELECT *` feed/profile query) MUST be rejected or halted pending a constitution amendment.
2. **Database & Migration Workflow**: Schema updates, storage bucket definitions, indexes, `pgvector` functions, AI quota/cache RPCs, and RLS policies MUST be committed as sequential SQL migration files before dependent `/web` or `/pipeline` code merges.
3. **Editorial & HITL Safety**: `/pipeline` jobs write newly extracted studies in a pending/staged state or deterministic publish threshold per spec, and MUST route all guideline-matching systematic reviews/meta-analyses exclusively to `/admin/review` as `Consensus Drift` alerts—never mutating published `/guidelines` rows directly.
4. **Definition of Done**: A task or PR is complete ONLY when acceptance criteria are verified, `tsc --noEmit`, linting, and deterministic `/web` unit tests pass, `pytest` unit/schema tests pass for deterministic scoring in `/pipeline`, and UI components pass visual inspection against Principle III anti-vibecoding and anti-purple rules across both default light and opt-in dark themes.

## Governance

This Constitution is the supreme technical, scientific, and design authority for SBL News and supersedes conflicting conventions, third-party defaults, or ad-hoc implementation shortcuts.

- **Amendment Procedure**: Any change to stack components, free-tier budgets, evidence-scoring rules, Neo-Brutalist Sky Blue tokens, or approved route scope MUST be proposed via an explicit amendment updating `.specify/memory/constitution.md`, accompanied by rationale, impact assessment across `/web` and `/pipeline`, and project owner approval prior to implementation.
- **Versioning Policy**: Constitution versions follow Semantic Versioning (`MAJOR.MINOR.PATCH`):
  - `MAJOR`: Backward-incompatible removals or redefinitions of non-negotiable architectural, scientific, security, or design-system principles.
  - `MINOR`: Addition of a new principle, new approved post-MVP route/capability, or material expansion of governance guidance.
  - `PATCH`: Wording clarifications, formatting improvements, or non-semantic refinements.
- **Compliance Review**: Every specification (`/speckit-specify`), plan (`/speckit-plan`), task list (`/speckit-tasks`), consistency audit (`/speckit-analyze`), and code review (`/speckit-implement`) MUST verify strict adherence to all six core principles.

**Version**: 1.2.0 | **Ratified**: 2026-11-26 | **Last Amended**: 2026-11-28
