# Web Application & Database Interface Contracts (`/web`)

**Branch**: `001-sbl-news-mvp` | **Date**: 2026-11-26 | **Spec**: [spec.md](../spec.md)

## 1. Scoped MVP Route Contracts (6 Mandatory Routes)

Per Constitution Principle V, `/web` exposes **only** these 6 routes:

| Route | Rendering Strategy | Auth Requirement | Primary Data Contract |
|-------|--------------------|------------------|-----------------------|
| `/` | ISR (`revalidate = 3600` + on-demand) | Public (OAuth required to upvote) | `getFeedStudies()` fetches ISR-cached published study summaries (no `searchParams` read in `page.tsx`); `Daily` (`published_at DESC, quality_score DESC`), `Weekly` (last 7 days by `quality_score DESC, upvote_count DESC`), `Top` (all-time by `upvote_count DESC, quality_score DESC`), and study-type/trained filters run client-side over the cached feed |
| `/study/[id]` | ISR / Dynamic Discussion | Public (OAuth required to comment/upvote) | `getStudyDetail(id)` + `getStudyComments(id)` + `getSecondaryCommentaries(id)` |
| `/guidelines` | ISR (`revalidate = 3600` + on-demand) | Public | `getLivingGuidelines()` returning 3 hubs + 6 indexed variables with anchor citations |
| `/search` | Dynamic Server Component / Route | Public | `searchStudiesHybrid(params)` via PostgreSQL RPC `search_studies_hybrid` |
| `/methodology` | Static (`force-static`) | Public | Static documentation of primary sources, deterministic scoring rubric, inspection badges, HITL governance |
| `/admin/review` | Dynamic (`force-dynamic`) | `role === 'admin'` (enforced server-side + RLS) | `getPendingReviewQueue()` returning `pending` studies and `pending` Consensus Drift alerts |

> **Note**: `web/src/app/auth/callback/route.ts` is a non-UI OAuth PKCE callback route handler supporting `FR-004`, not a 7th user-facing page route.

---

## 2. Egress-Safe Summary Projection Contract (`STUDY_SUMMARY_COLUMNS`)

All feed (`/`), search (`/search`), and related-study list queries **MUST** project only the following summary columns and **MUST NEVER** select `*`, `abstract_text`, or `embedding`:

```typescript
export const STUDY_SUMMARY_COLUMNS = `
  id,
  doi,
  pubmed_id,
  title,
  journal,
  publication_year,
  published_at,
  primary_url,
  study_design,
  population,
  is_trained_population,
  sample_size_n,
  duration_weeks,
  primary_outcome,
  summary_takeaway,
  inspection_depth,
  quality_score,
  upvote_count,
  comment_count
` as const;
```

---

## 3. Runtime Zod Validation Schemas (`/web/src/lib/validations/`)

Every external boundary (search query parameters, server actions, route handlers) validates inputs with Zod before querying Supabase.

### 3.1 Feed & Hybrid Search Query Schema (`SearchQuerySchema`)

```typescript
import { z } from "zod";

export const StudyDesignEnum = z.enum([
  "meta_analysis",
  "systematic_review",
  "rct",
  "controlled_trial",
  "cohort_observational",
  "acute_crossover",
  "review_commentary",
]);

export const FeedFilterSchema = z.object({
  tab: z.enum(["daily", "weekly", "top"]).default("daily"),
  study_design: StudyDesignEnum.optional(),
  trained_only: z.coerce.boolean().default(false),
});

export const HybridSearchSchema = z.object({
  q: z.string().trim().max(200).default(""),
  study_design: StudyDesignEnum.optional(),
  min_duration_weeks: z.coerce.number().int().min(0).max(520).optional(),
  trained_only: z.coerce.boolean().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});
```

### 3.2 Authenticated User Mutation Schemas (Votes & Comments)

```typescript
export const ToggleVoteSchema = z.object({
  studyId: z.string().uuid(),
});

export const CreateCommentSchema = z.object({
  studyId: z.string().uuid(),
  parentCommentId: z.string().uuid().nullable().optional(),
  body: z.string().trim().min(1, "Comment cannot be empty").max(4000, "Comment exceeds 4000 characters"),
});

export const UpdateCommentSchema = z.object({
  commentId: z.string().uuid(),
  body: z.string().trim().min(1).max(4000),
});

export const DeleteCommentSchema = z.object({
  commentId: z.string().uuid(),
});
```

### 3.3 Admin Moderation & Consensus Drift Schemas (`/admin/review`)

All admin server actions verify `session.user` and query `profiles.role === 'admin'` server-side before executing:

```typescript
export const ModerateStudySchema = z.object({
  studyId: z.string().uuid(),
  decision: z.enum(["published", "rejected"]),
});

export const ResolveConsensusDriftSchema = z
  .object({
    alertId: z.string().uuid(),
    decision: z.enum(["approved", "dismissed"]),
    reviewerNotes: z.string().trim().min(5).max(1000),
    updatedEvidenceGrade: z.enum(["A", "B", "C", "D"]).optional(),
    updatedConsensusSummary: z.string().trim().min(10).max(2000).optional(),
    updatedPracticalPrescription: z.string().trim().min(3).max(500).optional(),
  })
  .refine(
    (data) =>
      data.decision === "dismissed" ||
      (Boolean(data.updatedConsensusSummary) && Boolean(data.updatedEvidenceGrade)),
    {
      message: "Approving a Consensus Drift alert requires an updated consensus summary and evidence grade.",
    }
  );

export const AddSecondaryCommentarySchema = z.object({
  studyId: z.string().uuid(),
  platform: z.enum(["YouTube", "Podcast", "Article", "Social"]),
  creatorName: z.string().trim().min(2).max(120),
  title: z.string().trim().min(3).max(200),
  url: z.string().url(),
});
```

> When `ResolveConsensusDriftSchema` is submitted with `decision === "approved"`, the server action also appends `trigger_study_id` to `guidelines.anchor_study_ids` (deduplicated) alongside updating `evidence_grade`, `consensus_summary`, `practical_prescription`, and `changelog`.

---

## 4. PostgreSQL Hybrid Search RPC Contract (`search_studies_hybrid`)

Defined in `/supabase/migrations/` and invoked by `/search`:

```sql
CREATE OR REPLACE FUNCTION public.search_studies_hybrid(
  query_text text DEFAULT '',
  query_embedding vector(768) DEFAULT NULL,
  filter_study_design public.study_design_type DEFAULT NULL,
  filter_min_duration_weeks numeric DEFAULT NULL,
  filter_trained_only boolean DEFAULT NULL,
  match_limit int DEFAULT 20
)
RETURNS TABLE (
  id uuid,
  doi text,
  pubmed_id text,
  title text,
  journal text,
  publication_year int,
  published_at date,
  primary_url text,
  study_design public.study_design_type,
  population text,
  is_trained_population boolean,
  sample_size_n int,
  duration_weeks numeric,
  primary_outcome text,
  summary_takeaway text,
  inspection_depth public.inspection_depth_type,
  quality_score int,
  upvote_count int,
  comment_count int,
  hybrid_score float
)
LANGUAGE sql
STABLE
AS $$ ... $$;
```
