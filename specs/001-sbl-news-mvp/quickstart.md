# Quickstart & Validation Guide: SBL News MVP

**Branch**: `001-sbl-news-mvp` | **Date**: 2026-11-26 | **Spec**: [spec.md](./spec.md)

This guide defines the runnable setup and end-to-end validation scenarios for verifying both workspaces (`/web` and `/pipeline`) and the database migrations (`/supabase/migrations`).

---

## 1. Prerequisites

- **Node.js**: v20.x+ and `npm` (or `pnpm`)
- **Python**: v3.12+ with `venv` / `uv`
- **Supabase Project (or Supabase CLI)**: PostgreSQL 15+ with `pgvector` extension enabled and Google/GitHub OAuth providers configured
- **Google Gemini API Key**: Free tier key supporting `gemini-3.5-flash-lite` and Gemini embeddings (`text-embedding-004`)

---

## 2. Environment & Database Setup

1. **Apply Sequential SQL Migrations**:
   Apply the migrations in `/supabase/migrations/` to initialize enums, tables, `pgvector` indexes, RLS policies, hybrid search RPC (`search_studies_hybrid`), and initial Living Evidence Matrix seed data (see [data-model.md](./data-model.md)).
   ```bash
   npx supabase db push
   ```

2. **Configure `/web/.env.local`**:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
   REVALIDATION_SECRET=<shared-secret>
   ```

3. **Configure `/pipeline/.env`**:
   ```env
   SUPABASE_URL=https://<project-ref>.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
   GEMINI_API_KEY=<gemini-api-key>
   PUBMED_EMAIL=maintainer@example.com
   OPENALEX_MAILTO=maintainer@example.com
   ```

---

## 3. Workspace Verification Gates (Principle VI)

### 3.1 Verify `/pipeline` Schema & Deterministic Scoring (`pytest`)

Run the automated Python test suite to verify Pydantic extraction validation (`StudyExtractionSchema`), deterministic evidence scoring (`compute_deterministic_score`), deduplication, and Consensus Drift alert generation (see [contracts/pipeline-extraction-and-scoring.md](./contracts/pipeline-extraction-and-scoring.md)):

```bash
cd pipeline
python -m venv .venv
# Windows PowerShell: .\.venv\Scripts\Activate.ps1 | Unix: source .venv/bin/activate
pip install -e ".[dev]"
pytest -v
```

**Expected Outcome**:
- 100% pass rate verifying:
  - Human meta-analyses (`>= 85`) and `>= 8`-week resistance-trained human RCTs (`90+`) rank above short/untrained trials.
  - Animal studies (`is_human=False` or `animal_in_vitro`) receive `quality_score = 10` and `publication_status = "rejected"`.
  - Acute EMG-only studies (`is_acute_emg_only=True`) receive the `-45` penalty and do not auto-publish to the main feed.
  - Missing sample sizes or durations remain `None` without fabrication.
  - Guideline-matching systematic reviews / meta-analyses create a `pending` `Consensus Drift` alert without mutating `guidelines`.

### 3.2 Run Manual / Dry-Run Ingestion Batch

```bash
cd pipeline
python -m src.cli ingest --lookback-days 3 --max-papers 10 --dry-run
```

**Expected Outcome**:
- Fetches and deduplicates primary records from PubMed, OpenAlex, and targeted exercise-science journal RSS feeds.
- Assigns `Full-Text` vs. `Abstract-Only` inspection depth badges accurately.
- Validates structured extraction against `StudyExtractionSchema`.

### 3.3 Verify `/web` Type-Safety, Linting & Build (`tsc --noEmit`)

```bash
cd web
npm install
npx tsc --noEmit
npm run lint
npm run build
```

**Expected Outcome**:
- Zero TypeScript errors under `strict: true`.
- Clean ESLint execution.
- Production build succeeds with `/` and `/guidelines` configured for ISR and `/methodology` statically generated.

---

## 4. End-to-End Route & Guardrail Validation Scenarios

Start the local web application (`cd web && npm run dev`) and verify the 6 core MVP routes (see [contracts/web-routes-and-rpc.md](./contracts/web-routes-and-rpc.md)):

1. **Main Research Feed (`/`)**:
   - Opens directly into the sticky filter bar (`Daily | Weekly | Top` tabs + study-type filter pills) with **no marketing hero banner**.
   - Study cards display the Neo-Brutalist Sky Blue palette (`#F8FAFC` canvas, `#FFFFFF` cards, `2px solid #0F172A` borders, `4px 4px 0px #0F172A` shadows, `#38BDF8` active accents), monospace evidence badges, and an explicit `Full-Text` (`#BBF7D0`) or `Abstract-Only` (`#FED7AA`) badge.
   - Network/database query inspection confirms `STUDY_SUMMARY_COLUMNS` projection (excluding `abstract_text` and `embedding`).
2. **Study Detail & Discussion (`/study/[id]`)**:
   - Displays all structured extraction fields (`study_design`, `population`, `sample_size_n`, `duration_weeks`, `primary_outcome`, `summary_takeaway`, `limitations`), inspection transparency badge, and primary `PubMed/DOI` link.
   - Secondary creator videos/commentary render strictly in a separate secondary section.
   - Unauthenticated users can read comments; clicking upvote or post prompts Google/GitHub OAuth login. Authenticated users can upvote once and post/edit/delete only their own comments.
3. **Living Evidence Matrix (`/guidelines`)**:
   - Displays the 3-column core evidence hubs (*Hypertrophy*, *Maximal Strength*, *Recovery & Nutrition*) and 4-column indexed directory (*Weekly Volume*, *RIR / Failure*, *Frequency*, *Rest Intervals*, *Lengthened Partials*, *Protein Intake*) with evidence grades (`A`–`D`), anchor meta-analysis citations, and changelog entries.
4. **Hybrid Search (`/search`)**:
   - Entering a query (e.g., `"lengthened partials hypertrophy"`) returns ranked studies combining full-text keyword relevance and `pgvector` semantic similarity.
   - Applying `study_design`, `min_duration_weeks`, and `trained_only` filters deterministically narrows results.
5. **Transparency Hub (`/methodology`)**:
   - Statically renders documentation of primary literature sources, deterministic scoring rubric, `Full-Text` vs. `Abstract-Only` inspection rules, and HITL guideline governance.
6. **Moderation & Drift Queue (`/admin/review`)**:
   - Accessing `/admin/review` or invoking admin server actions as an unauthenticated visitor or `role = 'member'` user is rejected server-side (`403` / redirect).
   - Signing in as an `admin` user allows approving/rejecting `pending` studies and resolving `Consensus Drift` alerts with a timestamped changelog note that updates `/guidelines`.
