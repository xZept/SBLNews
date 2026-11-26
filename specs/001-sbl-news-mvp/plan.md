# Implementation Plan: SBL News MVP

**Branch**: `001-sbl-news-mvp` | **Date**: 2026-11-26 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-sbl-news-mvp/spec.md`

## Summary

Deliver the SBL News (Science-Based Lifting News) MVP as a zero-cost ($0/month free-tier) two-workspace monorepo (`/web` and `/pipeline`) backed by Supabase PostgreSQL + `pgvector` + OAuth (Google/GitHub):

1. **`/web` (Next.js App Router, TypeScript strict)**: Implements the 6 scoped MVP routes (`/`, `/study/[id]`, `/guidelines`, `/search`, `/methodology`, `/admin/review`) using Tailwind CSS v4 with cleared default color namespaces (`--color-*: initial;` in `@theme`) and primitive-level overridden `shadcn/ui` components implementing the Neo-Brutalist Sky Blue design system. Public feeds (`/`) and Living Evidence Matrix guidelines (`/guidelines`) use Incremental Static Regeneration (ISR), while list/search queries strictly project summary columns (`STUDY_SUMMARY_COLUMNS`) to safeguard Supabase Free's 5 GB monthly egress quota.
2. **`/pipeline` (Python 3.12+ & Pydantic v2 on GitHub Actions Cron)**: Fetches daily primary peer-reviewed literature from PubMed E-utilities (plus PMC Open Access XML when available), OpenAlex, and targeted exercise-science journal RSS feeds; deduplicates by canonical identifiers (`doi`, `pubmed_id`, `openalex_id`); extracts factual study metadata using Gemini 3.5 Flash Lite (`gemini-3.5-flash-lite`) structured outputs; generates 768-dim Gemini semantic embeddings; computes evidence quality scores 100% deterministically in Python; and routes guideline-matching systematic reviews/meta-analyses to `/admin/review` as `Consensus Drift` alerts without mutating published guidelines.

## Technical Context

**Language/Version**: TypeScript 5.x (`strict: true`, Node.js 20+) in `/web`; Python 3.12+ in `/pipeline`; SQL (PostgreSQL 15+) in `/supabase/migrations`

**Primary Dependencies**:
- `/web`: Next.js (App Router), React 19, Tailwind CSS v4, overridden `shadcn/ui` primitives (Radix UI primitives + `class-variance-authority`), `@supabase/supabase-js`, `@supabase/ssr`, `zod`, `lucide-react`, and `vitest` (devDependency); server-side `/search` query embedding calls Gemini Embedding REST API via native `fetch` using server-only `GEMINI_API_KEY` (falling back to keyword-only search if absent or rate-limited)
- `/pipeline`: `pydantic` (v2), `google-genai` (`gemini-3.5-flash-lite` + Gemini embeddings), `httpx`, `feedparser`, `supabase` (Python client)

**Storage**: Supabase Free PostgreSQL with `pgvector` (`vector(768)`) and Row-Level Security (RLS) enabled on all tables, managed via sequential Git-first SQL migrations in `/supabase/migrations`

**Testing**:
- `/web`: TypeScript static typecheck (`tsc --noEmit`), ESLint, Vitest unit/contract tests for Zod schemas and UI badge/token helpers
- `/pipeline`: `pytest` unit test suite for Pydantic extraction schemas, deterministic scoring hierarchy (`scoring.py`), deduplication, and `Consensus Drift` alert rules

**Target Platform**: Vercel Hobby ($0/month) for `/web`; GitHub Actions scheduled cron ($0/month) for `/pipeline`; Supabase Free ($0/month) for PostgreSQL + `pgvector` + Auth

**Project Type**: Monorepo web application (`/web`) + scheduled batch ingestion worker (`/pipeline`) + declarative SQL migrations (`/supabase/migrations`)

**Performance Goals**:
- ISR-cached `/` and `/guidelines` render immediately without cold-start blocking (first-time visitor filter + source navigation < 15s per SC-001)
- Feed and hybrid search list payloads < 50 KB per request (strictly excluding raw abstracts, full text, and `vector(768)` embeddings)

**Constraints**:
- Strict $0/month free-tier ceiling (Supabase 5 GB monthly egress cap, Gemini API free-tier rate limits, Vercel Hobby deployment, GitHub Actions cron)
- Neo-Brutalist Sky Blue token lock (`--color-*: initial;` in Tailwind v4 `@theme`, `2px solid #0F172A` borders, hard `4px`/`2px` offset shadows, max `6px`/`4px` border radii, zero purple/violet/indigo hues or blur shadows)
- Strict 6-route MVP scope (`/`, `/study/[id]`, `/guidelines`, `/search`, `/methodology`, `/admin/review`)

**Scale/Scope**: 6 web routes, 7 PostgreSQL tables + 1 hybrid search RPC function, 3 primary literature ingestion connectors (PubMed, OpenAlex, Journal RSS), 3 core evidence hubs + 6 indexed training guideline variables

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Constitution Principle | Pre-Research Gate | Post-Design Evaluation (Phase 1) | Status |
|------------------------|-------------------|----------------------------------|--------|
| **I. Architecture & $0/Month Free-Tier First** | Monorepo isolates `/web` (Vercel Hobby, Next.js App Router, TS strict, ISR on `/` & `/guidelines`) and `/pipeline` (Python + Pydantic on GitHub Actions cron); Supabase Free PostgreSQL + `pgvector` + Google/GitHub OAuth (no built-in email signup mailer); Gemini API Free Tier (`gemini-3.5-flash-lite` + embeddings); no ORMs or extra UI libs. | Confirmed in [research.md](./research.md), [data-model.md](./data-model.md), and project tree below. No ORM introduced; sequential SQL migrations live in `/supabase/migrations`. | ✅ PASS |
| **II. Scientific Integrity & Deterministic AI Pipeline** | Primary literature only (PubMed, OpenAlex, Journal RSS); secondary video/social commentary strictly attached to existing study threads; Gemini 3.5 Flash Lite restricted to Pydantic extraction (`StudyExtractionSchema`); quality scoring executed 100% deterministically in Python (`scoring.py`); `Full-Text` vs. `Abstract-Only` persisted and badged; HITL `Consensus Drift` alerts routed to `/admin/review` without mutating `/guidelines`. | Confirmed in [contracts/pipeline-extraction-and-scoring.md](./contracts/pipeline-extraction-and-scoring.md) and [data-model.md](./data-model.md). `StudyExtractionSchema` omits score fields; `compute_deterministic_score` enforces meta-analysis / `>=8w` trained RCT priority and animal/acute-EMG downranking. | ✅ PASS |
| **III. Neo-Brutalist Sky Blue Design System** | Tailwind CSS v4 `globals.css` clears `--color-*: initial;` inside `@theme`; defines only Sky Blue (`#38BDF8`), Slate Ink (`#0F172A`), Canvas (`#F8FAFC`), White (`#FFFFFF`), Muted (`#475569`), and semantic badge pastels (`#A7F3D0`, `#BAE6FD`, `#FDE68A`, `#BBF7D0`, `#FED7AA`); overrides `shadcn/ui` primitives (`Card`, `Badge`, `Button`, `Input`, `Tabs`); `Space Grotesk`, `Inter` (`65ch-75ch`), `JetBrains Mono`; Hugging Face Daily Papers feed layout on `/` (no hero banner) and Examine 3-hub + 4-column directory layout on `/guidelines`. | Confirmed in [research.md](./research.md) and `/web/src/components/ui/` structure. Zero purple/violet/indigo tokens, gradients, or blurred shadows exist in `@theme`. | ✅ PASS |
| **IV. Performance, Egress & Security Guardrails** | Feed and search endpoints never run `SELECT *` and explicitly exclude `abstract_text`, `full_text_content`, and `embedding`; RLS enabled on all 7 tables; `/admin/review` enforces server-side RBAC (`role === 'admin'`) alongside RLS; runtime validation via Zod (`/web`) and Pydantic (`/pipeline`). | Confirmed in [contracts/web-routes-and-rpc.md](./contracts/web-routes-and-rpc.md) (`STUDY_SUMMARY_COLUMNS`, Zod schemas, `search_studies_hybrid` return table) and [data-model.md](./data-model.md) (RLS policies for all 7 tables; raw full text is inspected transiently in `/pipeline` and not persisted in PostgreSQL, while `abstract_text` and `embedding` are excluded from list projections). | ✅ PASS |
| **V. Scoped MVP Route Discipline** | Confined strictly to `/`, `/study/[id]`, `/guidelines`, `/search`, `/methodology`, and `/admin/review`. | Confirmed in `/web/src/app/` directory layout and [contracts/web-routes-and-rpc.md](./contracts/web-routes-and-rpc.md). No extra routes introduced. | ✅ PASS |
| **VI. Verification & Deterministic Code Quality** | Testable acceptance criteria; `tsc --noEmit` and ESLint gates in `/web`; `pytest` unit tests for Pydantic extraction schemas and deterministic scoring rules in `/pipeline`. | Confirmed in [quickstart.md](./quickstart.md) and `/pipeline/tests/` + `/web/tests/` structure. | ✅ PASS |

## Project Structure

### Documentation (this feature)

```text
specs/001-sbl-news-mvp/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/           # Phase 1 output (/speckit-plan command)
│   ├── web-routes-and-rpc.md
│   └── pipeline-extraction-and-scoring.md
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
.github/
└── workflows/
    ├── ci-verify.yml                    # Runs tsc --noEmit, lint, and pytest on PRs
    └── daily-ingestion.yml              # Scheduled GitHub Actions cron (0 6 * * * UTC) for /pipeline

supabase/
├── config.toml
└── migrations/
    ├── 0001_enable_pgvector_and_enums.sql
    ├── 0002_tables_and_indexes.sql
    ├── 0003_rls_policies_and_triggers.sql
    ├── 0004_hybrid_search_rpc.sql
    └── 0005_seed_guidelines.sql

web/
├── package.json
├── tsconfig.json                        # strict: true
├── next.config.ts
├── postcss.config.mjs
├── src/
│   ├── app/
│   │   ├── globals.css                  # Tailwind v4 @theme with --color-*: initial; & Neo-Brutalist tokens
│   │   ├── layout.tsx                   # Space Grotesk, Inter, JetBrains Mono fonts + sticky header
│   │   ├── page.tsx                     # Route 1: / (Main Research Feed, ISR, HF Daily Papers layout)
│   │   ├── study/
│   │   │   └── [id]/
│   │   │       └── page.tsx             # Route 2: /study/[id] (Study Detail, Badges, Secondary Links, Discussion)
│   │   ├── guidelines/
│   │   │   └── page.tsx                 # Route 3: /guidelines (Living Evidence Matrix, ISR, 3-Hub + 4-Col Grid)
│   │   ├── search/
│   │   │   └── page.tsx                 # Route 4: /search (Hybrid Keyword + pgvector Search & Deterministic Filters)
│   │   ├── methodology/
│   │   │   └── page.tsx                 # Route 5: /methodology (Static Transparency Hub)
│   │   ├── admin/
│   │   │   └── review/
│   │   │       └── page.tsx             # Route 6: /admin/review (Server-Side RBAC Moderation & Drift Queue)
│   │   └── auth/
│   │       └── callback/
│   │           └── route.ts             # Supabase OAuth PKCE callback handler (Google/GitHub)
│   ├── components/
│   │   ├── ui/                          # Overridden shadcn/ui primitives (2px borders, hard offset shadows)
│   │   │   ├── badge.tsx
│   │   │   ├── button.tsx
│   │   │   ├── card.tsx
│   │   │   ├── input.tsx
│   │   │   └── tabs.tsx
│   │   ├── feed/
│   │   │   ├── filter-bar.tsx           # Sticky Daily|Weekly|Top tabs + study-type filter pills
│   │   │   ├── study-card.tsx           # High-contrast card with upvote button & evidence/transparency badges
│   │   │   └── upvote-button.tsx
│   │   ├── study/
│   │   │   ├── metadata-breakdown.tsx
│   │   │   ├── secondary-commentary-list.tsx
│   │   │   └── discussion-thread.tsx
│   │   ├── guidelines/
│   │   │   ├── hub-grid.tsx             # 3-column core evidence hubs
│   │   │   └── variable-directory.tsx   # 4-column indexed training variables + changelog drawer/panel
│   │   └── admin/
│   │       ├── pending-studies-table.tsx
│   │       └── consensus-drift-card.tsx
│   └── lib/
│       ├── supabase/
│       │   ├── client.ts
│       │   ├── server.ts
│       │   └── admin-guard.ts           # Enforces server-side role === 'admin' check
│       ├── queries/
│       │   ├── projections.ts           # STUDY_SUMMARY_COLUMNS egress guard
│       │   ├── studies.ts
│       │   ├── guidelines.ts
│       │   └── admin.ts
│       ├── actions/
│       │   ├── votes.ts
│       │   ├── comments.ts
│       │   └── moderation.ts
│       └── validations/
│           ├── search.ts
│           ├── mutations.ts
│           └── moderation.ts
└── tests/
    ├── projections.test.ts              # Verifies STUDY_SUMMARY_COLUMNS excludes abstract_text & embedding
    └── validations.test.ts              # Verifies Zod boundary schemas

pipeline/
├── pyproject.toml
├── src/
│   ├── __init__.py
│   ├── cli.py                           # CLI entrypoint for daily ingestion & dry-run
│   ├── config.py                        # Validated environment settings
│   ├── models.py                        # RawLiteratureRecord & StudyExtractionSchema (Pydantic v2)
│   ├── scoring.py                       # 100% deterministic quality scoring & Consensus Drift evaluation
│   ├── deduplication.py                 # Canonical identifier (DOI / PMID / OpenAlex) deduplication
│   ├── fetchers/
│   │   ├── pubmed.py                    # PubMed E-utilities + PMC Open Access full-text inspection
│   │   ├── openalex.py                  # OpenAlex API fetcher
│   │   └── rss.py                       # Exercise-science journal RSS fetcher
│   ├── extraction/
│   │   ├── gemini_extractor.py          # Gemini 3.5 Flash Lite structured output client
│   │   └── embeddings.py                # Gemini 768-dim vector embedding generator
│   └── storage/
│       └── supabase_store.py            # Upserts studies & inserts consensus_drift_alerts (never mutates guidelines)
└── tests/
    ├── test_models.py                   # Pydantic schema validation & null-safety tests
    ├── test_scoring.py                  # Deterministic ranking priority & animal/acute-EMG exclusion tests
    ├── test_deduplication.py            # DOI / PMID / OpenAlex canonical deduplication tests
    └── test_drift_alerts.py             # Verifies Consensus Drift alert creation & zero guideline mutation
```

**Structure Decision**: Selected the two-workspace monorepo structure (`/web` and `/pipeline`) plus `/supabase/migrations` as mandated by Constitution Principle I. This cleanly separates the Vercel Hobby Next.js frontend from the GitHub Actions Python batch ingestion worker while sharing versioned PostgreSQL + `pgvector` migrations.

## Complexity Tracking

No Constitution Check violations exist; all 6 core principles pass without exception.
