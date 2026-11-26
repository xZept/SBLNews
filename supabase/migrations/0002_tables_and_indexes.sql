-- 0002_tables_and_indexes.sql
-- Core schema: 7 tables with vector(768) embeddings, generated search_tsv,
-- canonical identifier CHECK constraints, and HNSW / GIN / feed indexes.

-- 1. profiles
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text NOT NULL,
  avatar_url text NULL,
  role public.user_role NOT NULL DEFAULT 'member',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 2. studies
CREATE TABLE IF NOT EXISTS public.studies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  doi text UNIQUE NULL,
  pubmed_id text UNIQUE NULL,
  openalex_id text UNIQUE NULL,
  title text NOT NULL,
  journal text NOT NULL,
  publication_year int NOT NULL CHECK (publication_year >= 1900),
  published_at date NOT NULL,
  primary_url text NOT NULL,
  study_design public.study_design_type NOT NULL,
  population text NOT NULL,
  is_human boolean NOT NULL DEFAULT true,
  is_trained_population boolean NOT NULL DEFAULT false,
  is_acute_emg_only boolean NOT NULL DEFAULT false,
  sample_size_n int NULL CHECK (sample_size_n IS NULL OR sample_size_n > 0),
  duration_weeks numeric(5, 1) NULL CHECK (duration_weeks IS NULL OR duration_weeks >= 0),
  primary_outcome text NOT NULL,
  summary_takeaway text NOT NULL,
  limitations jsonb NOT NULL DEFAULT '[]'::jsonb,
  inspection_depth public.inspection_depth_type NOT NULL,
  quality_score int NOT NULL CHECK (quality_score BETWEEN 0 AND 100),
  publication_status public.publication_status_type NOT NULL DEFAULT 'pending',
  upvote_count int NOT NULL DEFAULT 0 CHECK (upvote_count >= 0),
  comment_count int NOT NULL DEFAULT 0 CHECK (comment_count >= 0),
  abstract_text text NULL,
  embedding vector(768) NULL,
  search_tsv tsvector GENERATED ALWAYS AS (
    setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(primary_outcome, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(summary_takeaway, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(population, '')), 'C')
  ) STORED,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT studies_canonical_id_check CHECK (
    doi IS NOT NULL OR pubmed_id IS NOT NULL OR openalex_id IS NOT NULL
  )
);

CREATE INDEX IF NOT EXISTS idx_studies_feed
  ON public.studies (publication_status, published_at DESC, quality_score DESC, upvote_count DESC);

CREATE INDEX IF NOT EXISTS idx_studies_filters
  ON public.studies (publication_status, study_design, is_trained_population, duration_weeks);

CREATE INDEX IF NOT EXISTS idx_studies_search_tsv
  ON public.studies USING GIN (search_tsv);

CREATE INDEX IF NOT EXISTS idx_studies_embedding
  ON public.studies USING hnsw (embedding vector_cosine_ops);

-- 3. secondary_commentaries
CREATE TABLE IF NOT EXISTS public.secondary_commentaries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  study_id uuid NOT NULL REFERENCES public.studies(id) ON DELETE CASCADE,
  platform public.commentary_platform_type NOT NULL,
  creator_name text NOT NULL,
  title text NOT NULL,
  url text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_secondary_commentaries_study_id
  ON public.secondary_commentaries (study_id);

-- 4. guidelines
CREATE TABLE IF NOT EXISTS public.guidelines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  hub public.guideline_hub_type NOT NULL,
  variable_name text NOT NULL,
  display_order int NOT NULL,
  evidence_grade public.evidence_grade_type NOT NULL,
  consensus_summary text NOT NULL,
  practical_prescription text NOT NULL,
  anchor_study_ids uuid[] NOT NULL DEFAULT '{}',
  changelog jsonb NOT NULL DEFAULT '[]'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 5. consensus_drift_alerts
CREATE TABLE IF NOT EXISTS public.consensus_drift_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  guideline_id uuid NOT NULL REFERENCES public.guidelines(id) ON DELETE CASCADE,
  trigger_study_id uuid NOT NULL REFERENCES public.studies(id) ON DELETE CASCADE,
  drift_rationale text NOT NULL,
  status public.drift_alert_status_type NOT NULL DEFAULT 'pending',
  reviewer_id uuid NULL REFERENCES public.profiles(id),
  reviewer_notes text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz NULL,
  CONSTRAINT consensus_drift_alerts_unique_pair UNIQUE (guideline_id, trigger_study_id)
);

CREATE INDEX IF NOT EXISTS idx_consensus_drift_alerts_status
  ON public.consensus_drift_alerts (status, created_at DESC);

-- 6. votes
CREATE TABLE IF NOT EXISTS public.votes (
  study_id uuid NOT NULL REFERENCES public.studies(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (study_id, user_id)
);

-- 7. comments
CREATE TABLE IF NOT EXISTS public.comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  study_id uuid NOT NULL REFERENCES public.studies(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  parent_comment_id uuid NULL REFERENCES public.comments(id) ON DELETE CASCADE,
  body text NOT NULL CHECK (char_length(trim(body)) BETWEEN 1 AND 4000),
  is_deleted boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_comments_study_id
  ON public.comments (study_id, created_at ASC);
