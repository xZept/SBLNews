# Data Model: SBL News MVP

**Branch**: `001-sbl-news-mvp` | **Date**: 2026-11-26 | **Spec**: [spec.md](./spec.md)

## Overview

Persistence runs on **Supabase PostgreSQL** with the `vector` (`pgvector`) extension enabled. All tables enforce **Row-Level Security (RLS)** and use explicit column projections to protect Supabase Free's 5 GB monthly egress quota.

---

## Enums & Custom Types

- `user_role`: `'member' | 'admin'`
- `study_design_type`: `'meta_analysis' | 'systematic_review' | 'rct' | 'controlled_trial' | 'cohort_observational' | 'acute_crossover' | 'animal_in_vitro' | 'review_commentary'`
- `inspection_depth_type`: `'Full-Text' | 'Abstract-Only'`
- `publication_status_type`: `'pending' | 'published' | 'rejected'`
- `guideline_hub_type`: `'Hypertrophy' | 'Maximal Strength' | 'Recovery & Nutrition'`
- `evidence_grade_type`: `'A' | 'B' | 'C' | 'D'`
- `drift_alert_status_type`: `'pending' | 'approved' | 'dismissed'`
- `commentary_platform_type`: `'YouTube' | 'Podcast' | 'Article' | 'Social'`

---

## Entities & PostgreSQL Schema Definitions

### 1. `profiles` (User Profile / Role)

Linked 1:1 with `auth.users` via a PostgreSQL trigger on OAuth login (Google / GitHub).

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `uuid` | `PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE` | Authenticated Supabase user ID |
| `display_name` | `text` | `NOT NULL` | Public display name from OAuth provider |
| `avatar_url` | `text` | `NULL` | OAuth avatar URL |
| `role` | `user_role` | `NOT NULL DEFAULT 'member'` | Authorization role (`member` or `admin`) |
| `created_at` | `timestamptz` | `NOT NULL DEFAULT now()` | Account creation timestamp |

**RLS Policies**:
- `SELECT`: Public read (`true`) for `id`, `display_name`, `avatar_url`, `role` (used to attribute discussion comments).
- `UPDATE`: Authenticated users may update only their own `display_name` / `avatar_url` (`auth.uid() = id`); `role` changes are restricted via trigger/policy to database administrators (`service_role` or existing `admin`).

---

### 2. `studies` (Study)

Stores primary peer-reviewed literature records, structured metadata extracted by Gemini 3.5 Flash Lite, deterministic quality scores, and `pgvector` embeddings.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `uuid` | `PRIMARY KEY DEFAULT gen_random_uuid()` | Internal study identifier |
| `doi` | `text` | `UNIQUE NULL` | Normalized DOI (e.g., `10.1519/jsc.0000000000004812`) |
| `pubmed_id` | `text` | `UNIQUE NULL` | PubMed PMID |
| `openalex_id` | `text` | `UNIQUE NULL` | OpenAlex Work ID |
| `title` | `text` | `NOT NULL` | Primary paper title |
| `journal` | `text` | `NOT NULL` | Journal name |
| `publication_year` | `int` | `NOT NULL CHECK (publication_year >= 1900)` | Year of publication |
| `published_at` | `date` | `NOT NULL` | Publication date |
| `primary_url` | `text` | `NOT NULL` | Canonical PubMed or DOI URL |
| `study_design` | `study_design_type` | `NOT NULL` | Extracted study design classification |
| `population` | `text` | `NOT NULL` | Concise description of subjects (e.g., `"Resistance-trained men & women"`) |
| `is_human` | `boolean` | `NOT NULL DEFAULT true` | Deterministic flag for human vs. animal/in-vitro |
| `is_trained_population` | `boolean` | `NOT NULL DEFAULT false` | True if subjects have structured resistance-training history |
| `is_acute_emg_only` | `boolean` | `NOT NULL DEFAULT false` | True if study measures only acute single-session EMG/markers |
| `sample_size_n` | `int` | `NULL CHECK (sample_size_n IS NULL OR sample_size_n > 0)` | Sample size (`n`), null if unreported in abstract |
| `duration_weeks` | `numeric(5,1)` | `NULL CHECK (duration_weeks IS NULL OR duration_weeks >= 0)` | Intervention duration in weeks, null if unreported/NA |
| `primary_outcome` | `text` | `NOT NULL` | Primary hypertrophy/strength/recovery endpoint |
| `summary_takeaway` | `text` | `NOT NULL` | Concise 2-sentence evidence takeaway |
| `limitations` | `jsonb` | `NOT NULL DEFAULT '[]'::jsonb` | Array of methodological limitation strings |
| `inspection_depth` | `inspection_depth_type` | `NOT NULL` | `'Full-Text'` or `'Abstract-Only'` transparency badge |
| `quality_score` | `int` | `NOT NULL CHECK (quality_score BETWEEN 0 AND 100)` | Deterministically computed evidence score |
| `publication_status` | `publication_status_type` | `NOT NULL DEFAULT 'pending'` | `'pending'`, `'published'`, or `'rejected'` |
| `upvote_count` | `int` | `NOT NULL DEFAULT 0 CHECK (upvote_count >= 0)` | Denormalized upvote counter maintained by DB trigger |
| `comment_count` | `int` | `NOT NULL DEFAULT 0 CHECK (comment_count >= 0)` | Denormalized comment counter maintained by DB trigger |
| `abstract_text` | `text` | `NULL` | Raw abstract (EXCLUDED from feed/search list queries) |
| `embedding` | `vector(768)` | `NULL` | Gemini semantic embedding (EXCLUDED from all client responses) |
| `search_tsv` | `tsvector` | `GENERATED ALWAYS AS (...) STORED` | Weighted full-text search vector over title, takeaway, outcome, population |
| `created_at` | `timestamptz` | `NOT NULL DEFAULT now()` | Ingestion timestamp |
| `updated_at` | `timestamptz` | `NOT NULL DEFAULT now()` | Last modified timestamp |

**Constraints & Indexes**:
- At least one canonical identifier required: `CHECK (doi IS NOT NULL OR pubmed_id IS NOT NULL OR openalex_id IS NOT NULL)`
- Feed index: `CREATE INDEX idx_studies_feed ON studies (publication_status, published_at DESC, quality_score DESC, upvote_count DESC);`
- Filter index: `CREATE INDEX idx_studies_filters ON studies (publication_status, study_design, is_trained_population, duration_weeks);`
- Full-text GIN index: `CREATE INDEX idx_studies_search_tsv ON studies USING GIN (search_tsv);`
- HNSW vector index: `CREATE INDEX idx_studies_embedding ON studies USING hnsw (embedding vector_cosine_ops);`

**RLS Policies**:
- `SELECT`: Public users (`anon`, `authenticated`) can read rows where `publication_status = 'published'`. Users with `profiles.role = 'admin'` can read all rows (`pending`, `published`, `rejected`).
- `INSERT` / `UPDATE` / `DELETE`: Restricted to `service_role` (ingestion pipeline) and users with `profiles.role = 'admin'`.

---

### 3. `secondary_commentaries` (Secondary Commentary)

Stores optional creator videos or social media threads attached to an existing study on `/study/[id]`. Never displayed as standalone feed items.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `uuid` | `PRIMARY KEY DEFAULT gen_random_uuid()` | Commentary record ID |
| `study_id` | `uuid` | `NOT NULL REFERENCES studies(id) ON DELETE CASCADE` | Parent study ID |
| `platform` | `commentary_platform_type` | `NOT NULL` | `'YouTube'`, `'Podcast'`, `'Article'`, or `'Social'` |
| `creator_name` | `text` | `NOT NULL` | Creator or channel name |
| `title` | `text` | `NOT NULL` | Video or commentary title |
| `url` | `text` | `NOT NULL` | External URL |
| `created_at` | `timestamptz` | `NOT NULL DEFAULT now()` | Timestamp |

**RLS Policies**:
- `SELECT`: Public read when parent study is `published` (or viewer is `admin`).
- `INSERT` / `UPDATE` / `DELETE`: Restricted to `admin` and `service_role`.

---

### 4. `guidelines` (Living Evidence Matrix Guideline)

Represents the 3 core hubs (*Hypertrophy*, *Maximal Strength*, *Recovery & Nutrition*) and 6 indexed training variables (*Weekly Volume*, *RIR / Failure*, *Frequency*, *Rest Intervals*, *Lengthened Partials*, *Protein Intake*).

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `uuid` | `PRIMARY KEY DEFAULT gen_random_uuid()` | Guideline ID |
| `slug` | `text` | `UNIQUE NOT NULL` | URL-safe slug (e.g., `'weekly-volume'`, `'rir-failure'`) |
| `hub` | `guideline_hub_type` | `NOT NULL` | `'Hypertrophy'`, `'Maximal Strength'`, or `'Recovery & Nutrition'` |
| `variable_name` | `text` | `NOT NULL` | Display title (e.g., `'Weekly Volume'`) |
| `display_order` | `int` | `NOT NULL` | Deterministic grid sort order |
| `evidence_grade` | `evidence_grade_type` | `NOT NULL` | `'A'`, `'B'`, `'C'`, or `'D'` |
| `consensus_summary` | `text` | `NOT NULL` | Actionable evidence-based recommendation |
| `practical_prescription` | `text` | `NOT NULL` | Concise numeric/target prescription (e.g., `'10–20 hard sets/muscle/week'`) |
| `anchor_study_ids` | `uuid[]` | `NOT NULL DEFAULT '{}'` | Array of anchor meta-analysis/systematic review study IDs |
| `changelog` | `jsonb` | `NOT NULL DEFAULT '[]'::jsonb` | Ordered array of `{ "updated_at": "...", "summary": "...", "study_id": "..." }` |
| `updated_at` | `timestamptz` | `NOT NULL DEFAULT now()` | Last human-approved update timestamp |

**RLS Policies**:
- `SELECT`: Public read (`true`).
- `UPDATE` / `INSERT`: Strictly restricted to authenticated users with `profiles.role = 'admin'`. The ingestion pipeline (`service_role` in `/pipeline`) is prohibited by application architecture and test gates from mutating `guidelines` after initial seeding.

---

### 5. `consensus_drift_alerts` (Consensus Drift Alert)

Created automatically by `/pipeline` whenever a newly ingested systematic review or meta-analysis matches an active guideline variable slug. Resolved exclusively by an administrator in `/admin/review`.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `uuid` | `PRIMARY KEY DEFAULT gen_random_uuid()` | Alert ID |
| `guideline_id` | `uuid` | `NOT NULL REFERENCES guidelines(id) ON DELETE CASCADE` | Affected guideline |
| `trigger_study_id` | `uuid` | `NOT NULL REFERENCES studies(id) ON DELETE CASCADE` | Newly ingested meta-analysis / systematic review |
| `drift_rationale` | `text` | `NOT NULL` | Summary of why the study touches this guideline topic |
| `status` | `drift_alert_status_type` | `NOT NULL DEFAULT 'pending'` | `'pending'`, `'approved'`, or `'dismissed'` |
| `reviewer_id` | `uuid` | `NULL REFERENCES profiles(id)` | Admin user who resolved the alert |
| `reviewer_notes` | `text` | `NULL` | Changelog note or dismissal reason |
| `created_at` | `timestamptz` | `NOT NULL DEFAULT now()` | Alert creation timestamp |
| `resolved_at` | `timestamptz` | `NULL` | Resolution timestamp |

**Unique Constraint**: `UNIQUE (guideline_id, trigger_study_id)` to prevent duplicate drift alerts on re-runs.

**RLS Policies**:
- `SELECT` / `UPDATE`: Restricted strictly to users with `profiles.role = 'admin'`.
- `INSERT`: Restricted to `service_role` (`/pipeline`) and `admin`.

---

### 6. `votes` (Study Upvote)

Tracks unique user upvotes on a study (`1` vote per user per study).

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `study_id` | `uuid` | `NOT NULL REFERENCES studies(id) ON DELETE CASCADE` | Voted study |
| `user_id` | `uuid` | `NOT NULL REFERENCES profiles(id) ON DELETE CASCADE` | Authenticated voter |
| `created_at` | `timestamptz` | `NOT NULL DEFAULT now()` | Vote timestamp |

**Primary Key**: `PRIMARY KEY (study_id, user_id)`

**Triggers**:
- `AFTER INSERT OR DELETE ON votes`: Atomically increments or decrements `studies.upvote_count`.

**RLS Policies**:
- `SELECT`: Public read (`true`).
- `INSERT` / `DELETE`: Authenticated users only, restricted to their own rows (`auth.uid() = user_id`).

---

### 7. `comments` (Nested Study Discussion)

Stores nested community discussion threads on `/study/[id]`.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `uuid` | `PRIMARY KEY DEFAULT gen_random_uuid()` | Comment ID |
| `study_id` | `uuid` | `NOT NULL REFERENCES studies(id) ON DELETE CASCADE` | Study being discussed |
| `author_id` | `uuid` | `NOT NULL REFERENCES profiles(id) ON DELETE CASCADE` | Comment author |
| `parent_comment_id` | `uuid` | `NULL REFERENCES comments(id) ON DELETE CASCADE` | Optional parent comment for nested replies |
| `body` | `text` | `NOT NULL CHECK (char_length(trim(body)) BETWEEN 1 AND 4000)` | Validated comment text |
| `is_deleted` | `boolean` | `NOT NULL DEFAULT false` | Soft-delete flag so deleting a parent comment preserves child replies as `[deleted]` |
| `created_at` | `timestamptz` | `NOT NULL DEFAULT now()` | Creation timestamp |
| `updated_at` | `timestamptz` | `NOT NULL DEFAULT now()` | Last edit timestamp |

**Triggers**:
- `AFTER INSERT OR DELETE ON comments`: Atomically increments or decrements `studies.comment_count`.

**RLS Policies**:
- `SELECT`: Public read (`true`) for comments on published studies.
- `INSERT`: Authenticated users only (`auth.uid() = author_id`).
- `UPDATE` / `DELETE`: Authenticated comment owner (`auth.uid() = author_id`) or `admin`.

---

## State Transitions

### Study Publication Lifecycle
```text
[Ingested by /pipeline]
   ├── Deterministic Score >= 60 (Human Study, Complete Extraction) ──> [published]
   ├── Deterministic Score 35..59 (Borderline / Incomplete Metric)  ──> [pending] ──(Admin /admin/review)──> [published] | [rejected]
   └── Animal Study or Score < 35 (Acute EMG-Only Noise)            ──> [rejected]
```

### Consensus Drift Alert Lifecycle
```text
[New Meta-Analysis / Systematic Review matches Guideline Slug]
   └── Inserts consensus_drift_alerts(status='pending')
          ├── Admin Approves in /admin/review (+ Changelog Note) ──> status='approved', guidelines row + changelog updated, /guidelines ISR revalidated
          └── Admin Dismisses in /admin/review (+ Reviewer Note) ──> status='dismissed', guidelines row unchanged
```
