---

description: "Actionable, dependency-ordered implementation tasks for SBL News MVP"
---

# Tasks: SBL News MVP

**Input**: Design documents from `/specs/001-sbl-news-mvp/`  
**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/web-routes-and-rpc.md](./contracts/web-routes-and-rpc.md), [contracts/pipeline-extraction-and-scoring.md](./contracts/pipeline-extraction-and-scoring.md), [quickstart.md](./quickstart.md)

**Tests**: Included for `/pipeline` Pydantic schemas, deterministic scoring, deduplication, and Consensus Drift alerts (mandated by Constitution Principle VI) and `/web` egress-projection & Zod boundary validation tests.

**Organization**: Tasks are grouped by user story in priority order (`P1` → `P2` → `P3`) to enable independent implementation and testing of each increment.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (`US1`–`US7`)
- Exact file paths are included in every task description

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Initialize the two-workspace monorepo (`/web`, `/pipeline`), Supabase config, and CI verification workflow.

- [X] T001 Create monorepo directory structure (`/web`, `/pipeline`, `/supabase/migrations`, `.github/workflows`) and base `supabase/config.toml` per [plan.md](./plan.md)
- [X] T002 Initialize Next.js App Router project with TypeScript (`strict: true`), Tailwind CSS v4, `@supabase/supabase-js`, `@supabase/ssr`, `zod`, `lucide-react`, Radix primitives, and `vitest` (devDependency + `"test": "vitest run"`) in `web/package.json`, `web/tsconfig.json`, `web/next.config.ts`, and `web/postcss.config.mjs`
- [X] T003 [P] Initialize Python 3.12+ package with `pydantic>=2`, `google-genai`, `httpx`, `feedparser`, `supabase`, and `pytest` dev dependencies in `pipeline/pyproject.toml`
- [X] T004 [P] Configure CI verification workflow running `tsc --noEmit`, `npm run lint`, `npm test` (Vitest), and `pytest` on pull requests in `.github/workflows/ci-verify.yml`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Database schema, RLS policies, hybrid search RPC, seed guidelines, Tailwind v4 Neo-Brutalist Sky Blue token reset, overridden `shadcn/ui` primitives, auth/admin guards, and egress-safe projections.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [X] T005 Create `pgvector` extension (`vector`) and custom PostgreSQL enums (`user_role`, `study_design_type`, `inspection_depth_type`, `publication_status_type`, `guideline_hub_type`, `evidence_grade_type`, `drift_alert_status_type`, `commentary_platform_type`) in `supabase/migrations/0001_enable_pgvector_and_enums.sql`
- [X] T006 Create all 7 tables (`profiles`, `studies`, `secondary_commentaries`, `guidelines`, `consensus_drift_alerts`, `votes`, `comments` including `is_deleted boolean NOT NULL DEFAULT false`) with `vector(768)` embedding, generated `search_tsv`, canonical identifier `CHECK` constraints, and HNSW/GIN/feed indexes in `supabase/migrations/0002_tables_and_indexes.sql`
- [X] T007 Enable Row-Level Security (RLS) on all 7 tables, create OAuth profile-sync trigger on `auth.users`, and add atomic `upvote_count` / `comment_count` triggers in `supabase/migrations/0003_rls_policies_and_triggers.sql`
- [X] T008 [P] Implement `search_studies_hybrid` PostgreSQL RPC using Reciprocal Rank Fusion (RRF) over `search_tsv` and `embedding` cosine similarity projecting summary columns only in `supabase/migrations/0004_hybrid_search_rpc.sql`
- [X] T009 [P] Seed initial 3 core hubs (*Hypertrophy*, *Maximal Strength*, *Recovery & Nutrition*) and 6 training variables (*Weekly Volume*, *RIR / Failure*, *Frequency*, *Rest Intervals*, *Lengthened Partials*, *Protein Intake*) in `supabase/migrations/0005_seed_guidelines.sql`
- [X] T010 Configure Tailwind CSS v4 `@theme` with `--color-*: initial;` namespace reset and Neo-Brutalist Sky Blue tokens (`#F8FAFC` canvas, `#FFFFFF` card, `#0F172A` ink/border, `#38BDF8` accent, `#475569` muted, and semantic badge pastels `#A7F3D0`, `#BAE6FD`, `#FDE68A`, `#BBF7D0`, `#FED7AA`) in `web/src/app/globals.css`
- [X] T011 [P] Implement overridden `shadcn/ui` primitives (`Badge`, `Button`, `Card`, `Input`, `Tabs`) with `2px solid #0F172A` borders, hard zero-blur offset shadows (`4px 4px 0px #0F172A` / `2px 2px 0px #0F172A` + `translate(2px, 2px)` active press), and max `rounded-md` (`6px`) / `rounded-sm` (`4px`) radii in `web/src/components/ui/badge.tsx`, `web/src/components/ui/button.tsx`, `web/src/components/ui/card.tsx`, `web/src/components/ui/input.tsx`, and `web/src/components/ui/tabs.tsx`
- [X] T012 [P] Implement Supabase browser client, SSR cookie server client, and server-side RBAC admin guard (`role === 'admin'`) in `web/src/lib/supabase/client.ts`, `web/src/lib/supabase/server.ts`, and `web/src/lib/supabase/admin-guard.ts`
- [X] T013 [P] Implement Google/GitHub OAuth PKCE callback route handler in `web/src/app/auth/callback/route.ts`
- [X] T014 [P] Define egress-safe `STUDY_SUMMARY_COLUMNS` projection constant (explicitly excluding `abstract_text` and `embedding`) and shared TypeScript domain types in `web/src/lib/queries/projections.ts`
- [X] T015 Implement root layout loading `Space Grotesk` (`700`/`800`), `Inter` (`65ch-75ch` measure), and `JetBrains Mono` fonts with sticky Neo-Brutalist top navigation (`Feed`, `Guidelines`, `Search`, `Methodology`, OAuth sign-in/out) in `web/src/app/layout.tsx`

**Checkpoint**: Foundation ready — database schema, design tokens, overridden primitives, auth, and egress projections are in place.

---

## Phase 3: User Story 1 - Browse & Filter Daily Resistance-Training Research Feed (Priority: P1) 🎯 MVP

**Goal**: Deliver the primary research feed (`/`) styled after Hugging Face Daily Papers in Neo-Brutalist Sky Blue with `Daily | Weekly | Top` tabs, deterministic study-type filter pills, monospace evidence/transparency badges, and authenticated upvoting.

**Independent Test**: Open `/` unauthenticated, switch `Daily | Weekly | Top` tabs, apply study-type filter pills, verify summary-only projections and `Full-Text` / `Abstract-Only` badges, and verify upvote prompts OAuth when signed out and toggles once per user when signed in.

- [ ] T016 [P] [US1] Create `FeedFilterSchema` and `ToggleVoteSchema` Zod validators in `web/src/lib/validations/search.ts` and `web/src/lib/validations/mutations.ts`
- [ ] T017 [US1] Implement `getFeedStudies()` projecting `STUDY_SUMMARY_COLUMNS` and filtering `publication_status = 'published'` (supporting `Daily`, `Weekly`, `Top` deterministic sorting) in `web/src/lib/queries/studies.ts`
- [ ] T018 [US1] Implement `toggleVoteAction` server action with `ToggleVoteSchema` validation and authenticated user check in `web/src/lib/actions/votes.ts`
- [ ] T019 [P] [US1] Build `UpvoteButton` client component (`#38BDF8` active state, `#0F172A` ink, OAuth prompt when signed out) in `web/src/components/feed/upvote-button.tsx`
- [ ] T020 [P] [US1] Build sticky `FilterBar` (`Daily | Weekly | Top` tabs + study-type filter pills + trained-lifter toggle) in `web/src/components/feed/filter-bar.tsx`
- [ ] T021 [US1] Build `StudyCard` component displaying upvote column, title, journal/year, `JetBrains Mono` evidence & `Full-Text`/`Abstract-Only` badges, 2-sentence takeaway, and `Discussion` + `PubMed/DOI` actions in `web/src/components/feed/study-card.tsx`
- [ ] T022 [US1] Implement Main Research Feed page (`/`) with ISR (`export const revalidate = 3600`, no `searchParams` read so ISR stays active), client-side tab/filter state, and zero marketing hero banner in `web/src/app/page.tsx`

**Checkpoint**: User Story 1 (`/`) is independently functional and deployable as the core MVP increment.

---

## Phase 4: User Story 2 - Inspect Study Details, Transparency Badges & Community Discussion (Priority: P1)

**Goal**: Deliver `/study/[id]` with full structured study metadata, `Full-Text` vs. `Abstract-Only` transparency badge, primary `PubMed/DOI` link, separated secondary creator commentary section, and nested community discussion threads.

**Independent Test**: Navigate to `/study/[id]` for both `Full-Text` and `Abstract-Only` studies, verify secondary commentary is visually separated from primary evidence, and verify authenticated users can post/reply and edit/delete only their own comments while unauthenticated visitors see read-only threads.

- [ ] T023 [P] [US2] Add `CreateCommentSchema`, `UpdateCommentSchema`, and `DeleteCommentSchema` (`body` 1–4000 chars) to `web/src/lib/validations/mutations.ts`
- [ ] T024 [US2] Implement `getStudyDetail(id)`, `getStudyComments(studyId)`, and `getSecondaryCommentaries(studyId)` queries in `web/src/lib/queries/studies.ts`
- [ ] T025 [US2] Implement `createCommentAction`, `updateCommentAction`, and `deleteCommentAction` (soft-deleting via `is_deleted = true` when child replies exist, hard-deleting otherwise) server actions enforcing author ownership and Zod validation in `web/src/lib/actions/comments.ts`
- [ ] T026 [P] [US2] Build `MetadataBreakdown` component rendering structured fields (`study_design`, `population`, `sample_size_n`, `duration_weeks`, `primary_outcome`, `summary_takeaway`, `limitations`) and transparency badge in `web/src/components/study/metadata-breakdown.tsx`
- [ ] T027 [P] [US2] Build `SecondaryCommentaryList` component clearly separated from primary peer-reviewed evidence in `web/src/components/study/secondary-commentary-list.tsx`
- [ ] T028 [US2] Build `DiscussionThread` component supporting nested replies, `[deleted]` placeholder rendering for soft-deleted parents with replies, OAuth prompt for signed-out visitors, and owner-only edit/delete controls in `web/src/components/study/discussion-thread.tsx`
- [ ] T029 [US2] Implement Study Detail & Discussion page (`/study/[id]`) in `web/src/app/study/[id]/page.tsx`

**Checkpoint**: User Stories 1 and 2 are both independently functional.

---

## Phase 5: User Story 3 - Automated Daily Literature Ingestion & Deterministic Evidence Scoring (Priority: P1)

**Goal**: Deliver the `/pipeline` Python worker and GitHub Actions daily cron that fetches primary literature (PubMed/PMC, OpenAlex, Journal RSS), deduplicates by canonical IDs, extracts objective metadata via `gemini-3.5-flash-lite` structured outputs, generates 768-dim embeddings, computes deterministic evidence scores in Python, and creates `Consensus Drift` alerts without mutating `/guidelines`.

**Independent Test**: Run `pytest -v` in `/pipeline` to verify `StudyExtractionSchema`, deterministic ranking (human meta-analyses & `>=8w` trained RCTs above animal & acute EMG-only studies), canonical deduplication, and `Consensus Drift` alert generation; run `python -m src.cli ingest --dry-run`.

### Unit & Contract Tests for User Story 3 (Mandated by Constitution Principle VI)

- [ ] T030 [P] [US3] Write Pydantic schema validation and null-safety tests (`sample_size_n` / `duration_weeks` remain `None` when unreported) in `pipeline/tests/test_models.py`
- [ ] T031 [P] [US3] Write deterministic scoring unit tests verifying human meta-analysis (`>=85`), `>=8w` trained RCT (`>=90`), and `>=8w` `controlled_trial` (`65` base) priority over animal (`10`, `rejected`) and acute EMG-only (`-45`) studies in `pipeline/tests/test_scoring.py`
- [ ] T032 [P] [US3] Write canonical identifier deduplication (`doi`, `pubmed_id`, `openalex_id`) and `Consensus Drift` alert creation tests (asserting zero `guidelines` mutations) in `pipeline/tests/test_deduplication.py` and `pipeline/tests/test_drift_alerts.py`

### Implementation for User Story 3

- [ ] T033 [P] [US3] Implement validated environment settings (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `GEMINI_API_KEY`, `PUBMED_EMAIL`, `OPENALEX_MAILTO`) in `pipeline/src/config.py`
- [ ] T034 [P] [US3] Implement `RawLiteratureRecord` and `StudyExtractionSchema` (using `is_trained_population` and omitting any LLM quality score field) in `pipeline/src/models.py`
- [ ] T035 [US3] Implement 100% deterministic `compute_deterministic_score` (including `controlled_trial` `>=8w` = `65`) and `Consensus Drift` trigger evaluation in `pipeline/src/scoring.py`
- [ ] T036 [P] [US3] Implement canonical identifier normalization and deduplication helper in `pipeline/src/deduplication.py`
- [ ] T037 [P] [US3] Implement PubMed E-utilities + PMC Open Access XML full-text fetcher (`Full-Text` vs `Abstract-Only` detection) in `pipeline/src/fetchers/pubmed.py`
- [ ] T038 [P] [US3] Implement OpenAlex API fetcher in `pipeline/src/fetchers/openalex.py`
- [ ] T039 [P] [US3] Implement targeted exercise-science journal RSS fetcher in `pipeline/src/fetchers/rss.py`
- [ ] T040 [P] [US3] Implement Gemini 3.5 Flash Lite (`gemini-3.5-flash-lite`) structured JSON extractor and 768-dim Gemini embedding generator in `pipeline/src/extraction/gemini_extractor.py` and `pipeline/src/extraction/embeddings.py`
- [ ] T041 [US3] Implement Supabase storage client upserting `studies` and inserting `pending` `consensus_drift_alerts` (prohibited from mutating `guidelines`) in `pipeline/src/storage/supabase_store.py`
- [ ] T042 [US3] Implement CLI entrypoint (`ingest --lookback-days --max-papers --dry-run`) in `pipeline/src/cli.py` and daily scheduled GitHub Actions workflow (`0 6 * * *` UTC) in `.github/workflows/daily-ingestion.yml`

**Checkpoint**: All three `P1` stories (`/`, `/study/[id]`, and `/pipeline`) are complete and verified.

---

## Phase 6: User Story 4 - Explore Living Evidence Matrix & Training Guidelines (Priority: P2)

**Goal**: Deliver `/guidelines` styled after Examine in Neo-Brutalist Sky Blue with the 3-column core evidence hubs (*Hypertrophy*, *Maximal Strength*, *Recovery & Nutrition*) and 4-column indexed variable directory (*Weekly Volume*, *RIR / Failure*, *Frequency*, *Rest Intervals*, *Lengthened Partials*, *Protein Intake*) displaying evidence grades, anchor meta-analyses, and changelogs.

**Independent Test**: Navigate to `/guidelines` and verify the 3-column hub grid and 4-column variable directory render with evidence grade badges, clickable anchor citations linking to `/study/[id]`, and last-updated changelogs.

- [ ] T043 [US4] Implement `getLivingGuidelines()` query fetching published guidelines and linked anchor study summaries in `web/src/lib/queries/guidelines.ts`
- [ ] T044 [P] [US4] Build `HubGrid` 3-column core evidence hubs component in `web/src/components/guidelines/hub-grid.tsx`
- [ ] T045 [P] [US4] Build `VariableDirectory` 4-column indexed directory component with evidence grade badges, anchor citations, and changelog display in `web/src/components/guidelines/variable-directory.tsx`
- [ ] T046 [US4] Implement Living Evidence Matrix page (`/guidelines`) with ISR (`export const revalidate = 3600`) in `web/src/app/guidelines/page.tsx`

**Checkpoint**: User Story 4 (`/guidelines`) is independently functional.

---

## Phase 7: User Story 5 - Search Literature with Hybrid Keyword + Semantic Discovery & Filters (Priority: P2)

**Goal**: Deliver `/search` combining full-text keyword matching and `pgvector` semantic similarity via `search_studies_hybrid` with deterministic filters (`study_design`, `min_duration_weeks`, `trained_only`).

**Independent Test**: Open `/search`, submit a query, apply combinations of `study_design`, `min_duration_weeks`, and `trained_only` filters, verify summary-only projections return, and verify empty state + filter reset.

- [ ] T047 [P] [US5] Add `HybridSearchSchema` (`q` max 200 chars, `min_duration_weeks` 0–520, `limit` 1–50) to `web/src/lib/validations/search.ts`
- [ ] T048 [US5] Implement server-side Gemini query-embedding helper (via native `fetch` with `GEMINI_API_KEY`, falling back to `query_embedding = NULL` keyword search on empty query or API error) and `searchStudiesHybrid(params)` calling `search_studies_hybrid` RPC in `web/src/lib/queries/studies.ts`
- [ ] T049 [US5] Implement Hybrid Search page (`/search`) with search input, deterministic filter controls, summary `StudyCard` results, and empty-state reset in `web/src/app/search/page.tsx`

**Checkpoint**: User Story 5 (`/search`) is independently functional.

---

## Phase 8: User Story 7 - Moderate Ingested Studies & Resolve Consensus Drift Alerts (Priority: P2)

**Goal**: Deliver server-side RBAC-protected `/admin/review` allowing administrators to approve/reject `pending` studies and approve (with changelog note + `/guidelines` ISR revalidation) or dismiss `Consensus Drift` alerts.

**Independent Test**: Verify unauthenticated and `role = 'member'` requests to `/admin/review` or moderation actions are rejected server-side; sign in as `admin`, approve a pending study, and approve a `Consensus Drift` alert verifying `/guidelines` updates.

- [ ] T050 [P] [US7] Create `ModerateStudySchema`, `ResolveConsensusDriftSchema`, and `AddSecondaryCommentarySchema` Zod validators in `web/src/lib/validations/moderation.ts`
- [ ] T051 [US7] Implement `getPendingReviewQueue()` admin query guarded by `requireAdmin()` in `web/src/lib/queries/admin.ts`
- [ ] T052 [US7] Implement `moderateStudyAction`, `resolveConsensusDriftAction` (deduplicating and appending `trigger_study_id` to `guidelines.anchor_study_ids` on approval), and `addSecondaryCommentaryAction` server actions enforcing `requireAdmin()`, updating `studies`/`consensus_drift_alerts`/`guidelines`/`secondary_commentaries`, and calling `revalidatePath('/')`, `revalidatePath('/guidelines')`, and `revalidatePath('/study/[id]')` in `web/src/lib/actions/moderation.ts`
- [ ] T053 [P] [US7] Build `PendingStudiesTable`, `ConsensusDriftCard`, and secondary-commentary attachment form in `web/src/components/admin/pending-studies-table.tsx` and `web/src/components/admin/consensus-drift-card.tsx`
- [ ] T054 [US7] Implement RBAC-protected Moderation & Drift Queue page (`/admin/review`, `export const dynamic = "force-dynamic"`) in `web/src/app/admin/review/page.tsx`

**Checkpoint**: User Story 7 (`/admin/review`) is independently functional and enforces server-side RBAC.

---

## Phase 9: User Story 6 - Review Methodology & Transparency Standards (Priority: P3)

**Goal**: Deliver static `/methodology` page documenting primary literature sources, deterministic scoring rubric, `Full-Text` vs. `Abstract-Only` inspection rules, and HITL guideline governance.

**Independent Test**: Navigate to `/methodology` and verify all four transparency pillars render statically with Neo-Brutalist Sky Blue formatting and `65ch-75ch` prose measure.

- [ ] T055 [US6] Implement static Transparency Hub page (`/methodology`, `export const dynamic = "force-static"`) documenting primary sources, deterministic scoring rubric, inspection badges, and HITL governance in `web/src/app/methodology/page.tsx`

**Checkpoint**: All 6 core MVP routes and the daily ingestion pipeline are implemented.

---

## Phase 10: Polish & Cross-Cutting Concerns

**Purpose**: Final verification gates (`tsc --noEmit`, lint, `pytest`, egress/validation unit tests, and Neo-Brutalist design-token audit).

- [ ] T056 [P] Add unit tests verifying `STUDY_SUMMARY_COLUMNS` excludes `abstract_text` and `embedding` and Zod boundary schemas reject invalid inputs in `web/tests/projections.test.ts` and `web/tests/validations.test.ts`
- [ ] T057 [P] Audit all `/web/src` components and CSS against Constitution Principle III (zero purple/violet/indigo hues, no gradients or blur shadows, `2px solid #0F172A` borders, `65ch-75ch` body measure)
- [ ] T058 Run full `quickstart.md` validation gates (`npx tsc --noEmit`, `npm run lint`, `npm test`, `npm run build` in `/web`, and `pytest -v` in `/pipeline`)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately.
- **Foundational (Phase 2)**: Depends on Phase 1 — **BLOCKS** all user stories (`US1`–`US7`).
- **User Story 1 (`P1`, Phase 3)**: Depends on Phase 2.
- **User Story 2 (`P1`, Phase 4)**: Depends on Phase 2 (reuses `UpvoteButton` / `STUDY_SUMMARY_COLUMNS` from Phase 2/3).
- **User Story 3 (`P1`, Phase 5)**: Depends on Phase 2 (`supabase/migrations`); runs in parallel with `US1`/`US2` frontend work.
- **User Story 4 (`P2`, Phase 6)**: Depends on Phase 2 (`0005_seed_guidelines.sql` and overridden UI primitives).
- **User Story 5 (`P2`, Phase 7)**: Depends on Phase 2 (`0004_hybrid_search_rpc.sql`) and `StudyCard` from Phase 3.
- **User Story 7 (`P2`, Phase 8)**: Depends on Phase 2 (`admin-guard.ts`) and `US1`/`US4` ISR paths.
- **User Story 6 (`P3`, Phase 9)**: Depends on Phase 2 (`layout.tsx`, `globals.css`).
- **Polish (Phase 10)**: Depends on completion of all desired user stories.

### Parallel Opportunities

- **Foundational**: `T008`, `T009`, `T011`, `T012`, `T013`, `T014` can execute in parallel once `T006` and `T010` are defined.
- **Cross-Workspace Parallelism**: Once Phase 2 finishes, `/pipeline` (`US3`: `T030`–`T042`) can be built completely in parallel with `/web` (`US1`, `US2`, `US4`).
- **Within `US3`**: `T030`, `T031`, `T032` (tests), `T033`, `T034`, `T036`, `T037`, `T038`, `T039`, `T040` touch independent files and can run in parallel.

---

## Implementation Strategy

### MVP First (User Story 1 + Pipeline Core)

1. Complete Phase 1 (Setup) + Phase 2 (Foundational).
2. Complete Phase 3 (`US1`: `/` feed) and Phase 5 (`US3`: `/pipeline` ingestion & deterministic scoring) in parallel.
3. **STOP and VALIDATE**: Verify `pytest -v`, `tsc --noEmit`, and `/` ISR feed rendering with real ingested studies.
4. Incrementally layer `US2` (`/study/[id]`), `US4` (`/guidelines`), `US5` (`/search`), `US7` (`/admin/review`), and `US6` (`/methodology`).
