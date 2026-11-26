-- 0001_enable_pgvector_and_enums.sql
-- Enable pgvector extension and define custom domain enums for SBL News MVP.

CREATE EXTENSION IF NOT EXISTS vector;

DO $$ BEGIN
  CREATE TYPE public.user_role AS ENUM ('member', 'admin');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.study_design_type AS ENUM (
    'meta_analysis',
    'systematic_review',
    'rct',
    'controlled_trial',
    'cohort_observational',
    'acute_crossover',
    'animal_in_vitro',
    'review_commentary'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.inspection_depth_type AS ENUM ('Full-Text', 'Abstract-Only');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.publication_status_type AS ENUM ('pending', 'published', 'rejected');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.guideline_hub_type AS ENUM (
    'Hypertrophy',
    'Maximal Strength',
    'Recovery & Nutrition'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.evidence_grade_type AS ENUM ('A', 'B', 'C', 'D');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.drift_alert_status_type AS ENUM ('pending', 'approved', 'dismissed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.commentary_platform_type AS ENUM ('YouTube', 'Podcast', 'Article', 'Social');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
