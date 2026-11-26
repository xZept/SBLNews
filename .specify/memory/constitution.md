<!--
Sync Impact Report
- Version change: N/A (uninitialized template) -> 1.0.0
- Modified principles:
  - Template Principle 1 -> I. Architecture & $0/Month Free-Tier First (NON-NEGOTIABLE)
  - Template Principle 2 -> II. Scientific Integrity & Deterministic AI Pipeline (NON-NEGOTIABLE)
  - Template Principle 3 -> III. Neo-Brutalist Sky Blue Design System (NON-NEGOTIABLE)
  - Template Principle 4 -> IV. Performance, Egress & Security Guardrails (NON-NEGOTIABLE)
  - Template Principle 5 -> V. Scoped MVP Route Discipline
- Added sections:
  - Principle VI. Verification & Deterministic Code Quality (NON-NEGOTIABLE)
  - Stack, Design Token & Route Reference (populated template Section 2)
  - Development Workflow & Quality Gates (populated template Section 3)
- Removed sections: None
- Templates requiring updates:
  - ✅ .specify/templates/plan-template.md (aligned; Constitution Check consumes this file dynamically)
  - ✅ .specify/templates/spec-template.md (aligned; reads governance at runtime)
  - ✅ .specify/templates/tasks-template.md (aligned; reads quality gates at runtime)
- Follow-up TODOs: None
-->
# SBL News (Science-Based Lifting News) Constitution

## Core Principles

### I. Architecture & $0/Month Free-Tier First (NON-NEGOTIABLE)

SBL News MUST operate as a sustainable $0/month hobby-tier system with clean workload boundaries and zero always-on compute dependencies for core reading and daily ingestion:

- **Monorepo Separation**: The repository MUST cleanly isolate the web application (`/web`) and the automated research ingestion worker (`/pipeline`) within a single monorepo.
- **Web Application (`/web`)**: `/web` MUST use Next.js (App Router, TypeScript `strict: true`), Tailwind CSS v4, and shadcn/ui deployed on Vercel Hobby ($0/month). Public feeds (`/`) and training guidelines (`/guidelines`) MUST use Incremental Static Regeneration (ISR) so public reads remain fast and NEVER block on serverless or external cold starts.
- **Database & Authentication**: Persistence and search MUST run on Supabase Free ($0/month) using PostgreSQL with `pgvector` for semantic search. Every database schema or policy change MUST be authored and versioned via Git-first SQL migrations. User authentication MUST use OAuth (Google and GitHub) via Supabase Auth and MUST NOT rely on Supabase's built-in email mailer for user signups.
- **Scheduled Ingestion Worker (`/pipeline`)**: Daily literature ingestion MUST be implemented in Python with Pydantic and executed via GitHub Actions scheduled cron ($0/month). Ingestion MUST NOT require an always-on backend server.
- **AI Extraction & Decoupled RAG**: Structured extraction and embedding generation MUST use the Google Gemini API Free Tier (`gemini-3.5-flash-lite` plus Gemini embeddings). Any future on-demand RAG or FastAPI service hosted on Render Free MUST be strictly decoupled from the main feed (`/`) and guidelines (`/guidelines`) pages so cold starts or service unavailability NEVER degrade core browsing.
- **Stack & Dependency Discipline**: Specifications, plans, and implementations MUST NOT introduce paid third-party services, ORMs, or extra UI component libraries outside this defined stack without explicit owner approval and a formal constitution amendment.

**Rationale**: Decoupling ISR-cached public reads from scheduled GitHub Actions ingestion guarantees near-instant UX and strict $0/month operational predictability within free-tier quotas.

### II. Scientific Integrity & Deterministic AI Pipeline (NON-NEGOTIABLE)

Evidence synthesis and feed curation MUST ground every claim in peer-reviewed primary literature and separate stochastic LLM extraction from deterministic evidence scoring:

- **Primary Sources First**: `/pipeline` MUST ingest primary peer-reviewed literature exclusively from the PubMed E-utilities API, OpenAlex API, and targeted exercise-science journal RSS feeds. Social media posts and YouTube creator videos MUST be stored and rendered strictly as secondary commentary attached to existing study threads and MUST NEVER serve as primary feed sources.
- **Extraction vs. Scoring Separation**: LLMs MUST be invoked strictly with Pydantic structured JSON outputs to extract objective study metadata (`study_design`, `population`, `sample_size_n`, `duration_weeks`, `primary_outcome`, `summary_takeaway`, `limitations`). An LLM MUST NEVER arbitrarily judge, rank, or score study quality. All study ranking, filtering, and quality scoring MUST execute deterministically in Python/SQL code—explicitly prioritizing human meta-analyses/systematic reviews and >=8-week randomized controlled trials (RCTs) on resistance-trained lifters while downranking or filtering animal studies and acute EMG-only studies.
- **Inspection Transparency Badges**: Every study record MUST explicitly persist in PostgreSQL and display in the UI its source inspection depth (`Full-Text` vs. `Abstract-Only`) alongside its extracted study-design and population badges.
- **Human-in-the-Loop (HITL) Living Guidelines**: Automated pipelines MUST NEVER directly overwrite, mutate, or publish updates to `/guidelines`. When a newly ingested systematic review or meta-analysis matches an active guideline topic, `/pipeline` MUST only insert a `Consensus Drift` alert into `/admin/review` for manual administrator verification and approval.

**Rationale**: Enforcing deterministic scoring and mandatory human review prevents LLM hallucination from distorting scientific evidence hierarchies or silently altering training recommendations.

### III. Neo-Brutalist Sky Blue Design System (NON-NEGOTIABLE)

Every screen in `/web` MUST implement the high-contrast Neo-Brutalist Sky Blue visual language (combining Hugging Face Daily Papers feed density with Examine evidence organization) and reject generic AI styling patterns:

- **Anti-Vibecoding & Anti-Purple Guardrails**: The UI MUST NOT use purple, violet, or indigo hues (even where Examine uses purple), color gradients, mesh backgrounds, glassmorphism (`backdrop-blur`), blurry drop-shadows, or dark-mode-by-default themes.
- **Tailwind CSS v4 Namespace Reset**: `/web` (`globals.css`) MUST clear default Tailwind color namespaces (`--color-*: initial;` inside `@theme`) so only explicitly defined Neo-Brutalist Sky Blue tokens exist as utility classes.
- **Primitive-Level shadcn/ui Overrides**: Default shadcn/ui soft borders, rings, and diffused shadows MUST be overridden directly at the primitive component level (`Card`, `Badge`, `Button`, `Input`, `Tabs`) so no unstyled default primitives appear anywhere in the app.
- **Color Tokens**: Page canvas MUST use `#F8FAFC`; card and container surfaces MUST use `#FFFFFF`; primary accent (active tabs, primary CTAs, active upvote state) MUST use `#38BDF8` (Sky Blue) paired with `#0F172A` ink text; primary ink and structural borders MUST use `#0F172A`; muted secondary text MUST use `#475569`. Semantic evidence badges MUST use `1.5px solid #0F172A` borders, `JetBrains Mono` text, and solid pastel fills: Meta-Analysis / Systematic Review `#A7F3D0`, RCT (>=8 weeks, Human) `#BAE6FD`, Trained Population `#FDE68A`, Open-Access Full Text `#BBF7D0`, and Abstract-Only Warning `#FED7AA`.
- **Borders, Corners & Hard Elevation**: Cards, filter bars, inputs, and buttons MUST render `2px solid #0F172A` borders. Primary cards MUST use hard zero-blur offset shadows (`4px 4px 0px #0F172A`); buttons and filter pills MUST use `2px 2px 0px #0F172A` with a `translate(2px, 2px)` active press state. Corner radii MUST NOT exceed `rounded-md` (`6px`) on cards/containers and `rounded-sm` (`4px`) on metadata badges—NEVER `rounded-2xl` or pill-shaped cards.
- **Typography**: Headings and brand wordmark MUST use `Space Grotesk` (`700`/`800` weight, tight tracking). Body copy and study takeaways MUST use `Inter` capped at a `65ch-75ch` line measure. Study metrics and counts (`n=42`, `10w`, `p<0.05`, upvote counts, dates) MUST use `JetBrains Mono`.
- **Hybrid Page Layout Geometry**:
  - **Main Feed (`/`)**: MUST follow the Hugging Face Daily Papers layout in a light Neo-Brutalist skin—opening directly into a sticky top filter/search bar (`Daily | Weekly | Top` tabs plus study-type filter pills) with NO marketing hero banner. Studies MUST render as high-contrast cards with a left upvote column, bold title, journal/year, monospace metadata badges, a concise 2-sentence takeaway, and direct `Discussion` plus `PubMed/DOI` actions.
  - **Training Guidelines (`/guidelines`)**: MUST follow the Examine information architecture in a Neo-Brutalist skin—rendering a top 3-column grid of core evidence hubs (*Hypertrophy*, *Maximal Strength*, *Recovery & Nutrition*) followed by a 4-column indexed directory of specific training variables (*Weekly Volume*, *RIR / Failure*, *Frequency*, *Rest Intervals*, *Protein Intake*), each displaying an evidence grade badge and anchor meta-analysis citations.

**Rationale**: Locking tokens at the CSS `@theme` and primitive component layers enforces unmistakable editorial clarity, accessible contrast, and zero drift into generic AI aesthetics.

### IV. Performance, Egress & Security Guardrails (NON-NEGOTIABLE)

All database queries, API routes, and mutations MUST defend free-tier bandwidth quotas and enforce defense-in-depth access control:

- **Egress Protection**: List, feed, and search endpoints MUST NEVER execute `SELECT *`. Queries MUST explicitly project only required summary columns and MUST exclude raw abstracts, full-text payloads, and `pgvector` embedding vectors from feed/list queries to stay well within Supabase Free's 5 GB monthly egress cap.
- **Row-Level Security & RBAC**: PostgreSQL Row-Level Security (RLS) MUST be enabled on all tables. Unauthenticated public users MUST have read-only access restricted to published studies and guidelines; authenticated users MUST have scoped write access limited to their own comments and votes. All moderation, study approval, and guideline publishing routes (`/admin/review`) MUST enforce strict server-side Role-Based Access Control (RBAC) alongside RLS policies.
- **Boundary Input Validation**: Every external API boundary, route handler, server action, and ingestion interface MUST validate inputs at runtime using Zod in TypeScript (`/web`) and Pydantic in Python (`/pipeline`).

**Rationale**: Explicit column projection prevents vector/text egress exhaustion, while layered RLS + server-side RBAC + schema validation eliminates privilege escalation and malformed state.

### V. Scoped MVP Route Discipline

Initial product specifications, implementation plans, and task breakdowns MUST confine application surface area to the 6 core MVP routes:

- **`/` (Main Research Feed)**: `Daily` / `Weekly` / `Top` tabs, structured Neo-Brutalist study cards, and deterministic badge filters.
- **`/study/[id]` (Study Detail & Discussion)**: Structured AI metadata breakdown, `Full-Text` vs. `Abstract-Only` transparency badge, primary `PubMed/DOI` link, optional secondary creator video links, and nested discussion thread.
- **`/guidelines` (Living Evidence Matrix)**: Practical training guidelines organized into the 3-column hub grid and 4-column variable directory with evidence strength grades, anchor meta-analyses, and last-updated changelog.
- **`/search` (Hybrid Search)**: Hybrid keyword + `pgvector` semantic search paired with deterministic SQL filters (study type, minimum duration in weeks, training status).
- **`/methodology` (Transparency Hub)**: Static documentation of primary literature ingestion sources, deterministic scoring rubric, inspection-level rules, and HITL guideline governance.
- **`/admin/review` (Moderation & Drift Queue)**: Server-side RBAC-protected queue for approving ingested studies and reviewing `Consensus Drift` alerts.

**Rationale**: Enforcing a strict 6-route boundary prevents scope creep and ensures every core scientific discovery and review workflow ships complete and verified.

### VI. Verification & Deterministic Code Quality (NON-NEGOTIABLE)

No specification, task, or pull request may be marked complete without objective, automated verification across both workspaces:

- **Verifiable Acceptance Criteria**: Every feature spec MUST define concrete, testable acceptance scenarios covering functional behavior, design-system compliance, and free-tier constraints.
- **Frontend Type & Lint Gates (`/web`)**: All TypeScript code MUST pass `tsc --noEmit` under strict mode and clean linter execution before task completion.
- **Pipeline Schema & Scoring Unit Tests (`/pipeline`)**: All Pydantic extraction schemas and deterministic study scoring/filtering functions MUST be covered by automated unit tests verifying ranking priority (human meta-analyses and >=8-week trained RCTs) and downranking/exclusion rules (animal and acute EMG-only studies).

**Rationale**: Automated static analysis and deterministic unit tests catch schema drift and scoring regressions before code reaches production or mutates ingested records.

## Stack, Design Token & Route Reference

| Layer | Mandated Choice | Monthly Cost | Key Constraint |
|-------|-----------------|--------------|----------------|
| Monorepo Layout | `/web` + `/pipeline` | $0 | Strict workspace boundary; no coupled runtime |
| Frontend (`/web`) | Next.js App Router, TS Strict, Tailwind v4, shadcn/ui | $0 (Vercel Hobby) | ISR for `/` and `/guidelines`; no ORMs or extra UI libs |
| Database & Auth | Supabase PostgreSQL + `pgvector` + OAuth (Google/GitHub) | $0 (Supabase Free) | Git-first SQL migrations; RLS on all tables; no built-in email signup mailer |
| Ingestion (`/pipeline`) | Python + Pydantic on GitHub Actions Cron | $0 | Scheduled batch only; no always-on worker server |
| AI Layer | Gemini API Free Tier (`gemini-3.5-flash-lite` + embeddings) | $0 | Structured extraction only; optional Render Free RAG strictly decoupled |

| Token Category | Token Role | Normative Value |
|----------------|------------|-----------------|
| Surface | Page Canvas / Card Surface | `#F8FAFC` / `#FFFFFF` |
| Ink & Accent | Primary Ink & Borders / Sky Blue Accent / Muted Text | `#0F172A` / `#38BDF8` (with `#0F172A` text) / `#475569` |
| Evidence Badges | Meta-Analysis / >=8w Human RCT / Trained Pop. | `#A7F3D0` / `#BAE6FD` / `#FDE68A` (`1.5px solid #0F172A`, `JetBrains Mono`) |
| Transparency Badges | Open-Access Full Text / Abstract-Only Warning | `#BBF7D0` / `#FED7AA` (`1.5px solid #0F172A`, `JetBrains Mono`) |
| Geometry | Borders / Card Shadow / Control Shadow & Active Press | `2px solid #0F172A` / `4px 4px 0px #0F172A` / `2px 2px 0px #0F172A` + `translate(2px, 2px)` |
| Radii & Fonts | Max Radius (Card / Badge) / Headings / Body / Metrics | `6px` (`rounded-md`) / `4px` (`rounded-sm`) / `Space Grotesk` / `Inter` (`65ch-75ch`) / `JetBrains Mono` |

## Development Workflow & Quality Gates

1. **Constitution Check Gate**: Every `/speckit-plan` artifact MUST evaluate compliance against Principles I-VI before Phase 0 research and again after Phase 1 design. Any proposed deviation (paid service, ORM, additional route, non-token color, or `SELECT *` feed query) MUST be rejected or halted pending a constitution amendment.
2. **Database & Migration Workflow**: Schema updates, indexes, `pgvector` functions, and RLS policies MUST be committed as sequential SQL migration files before dependent `/web` or `/pipeline` code merges.
3. **Editorial & HITL Safety**: `/pipeline` jobs write newly extracted studies in a pending/staged state or deterministic publish threshold per spec, and MUST route all guideline-matching systematic reviews/meta-analyses exclusively to `/admin/review` as `Consensus Drift` alerts—never mutating published `/guidelines` rows directly.
4. **Definition of Done**: A task or PR is complete ONLY when acceptance criteria are verified, `tsc --noEmit` and linting pass in `/web`, `pytest` unit/schema tests pass for deterministic scoring in `/pipeline`, and UI components pass visual inspection against Principle III anti-vibecoding and anti-purple rules.

## Governance

This Constitution is the supreme technical, scientific, and design authority for SBL News and supersedes conflicting conventions, third-party defaults, or ad-hoc implementation shortcuts.

- **Amendment Procedure**: Any change to stack components, free-tier budgets, evidence-scoring rules, Neo-Brutalist Sky Blue tokens, or MVP route scope MUST be proposed via an explicit amendment updating `.specify/memory/constitution.md`, accompanied by rationale, impact assessment across `/web` and `/pipeline`, and project owner approval prior to implementation.
- **Versioning Policy**: Constitution versions follow Semantic Versioning (`MAJOR.MINOR.PATCH`):
  - `MAJOR`: Backward-incompatible removals or redefinitions of non-negotiable architectural, scientific, security, or design-system principles.
  - `MINOR`: Addition of a new principle, new approved post-MVP route/capability, or material expansion of governance guidance.
  - `PATCH`: Wording clarifications, formatting improvements, or non-semantic refinements.
- **Compliance Review**: Every specification (`/speckit-specify`), plan (`/speckit-plan`), task list (`/speckit-tasks`), consistency audit (`/speckit-analyze`), and code review (`/speckit-implement`) MUST verify strict adherence to all six core principles.

**Version**: 1.0.1 | **Ratified**: 2026-11-26 | **Last Amended**: 2026-11-26
