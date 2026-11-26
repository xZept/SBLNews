-- 0004_hybrid_search_rpc.sql
-- Hybrid keyword (tsvector) + semantic (pgvector cosine) search RPC using
-- Reciprocal Rank Fusion (RRF), projecting summary columns only.

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
AS $$
  WITH params AS (
    SELECT
      nullif(trim(coalesce(query_text, '')), '') AS clean_query,
      greatest(1, least(coalesce(match_limit, 20), 50)) AS safe_limit,
      60.0::float AS rrf_k
  ),
  filtered AS (
    SELECT
      s.id,
      s.doi,
      s.pubmed_id,
      s.title,
      s.journal,
      s.publication_year,
      s.published_at,
      s.primary_url,
      s.study_design,
      s.population,
      s.is_trained_population,
      s.sample_size_n,
      s.duration_weeks,
      s.primary_outcome,
      s.summary_takeaway,
      s.inspection_depth,
      s.quality_score,
      s.upvote_count,
      s.comment_count,
      s.search_tsv,
      s.embedding
    FROM public.studies s
    WHERE s.publication_status = 'published'
      AND (filter_study_design IS NULL OR s.study_design = filter_study_design)
      AND (filter_min_duration_weeks IS NULL OR (s.duration_weeks IS NOT NULL AND s.duration_weeks >= filter_min_duration_weeks))
      AND (filter_trained_only IS NOT TRUE OR s.is_trained_population = true)
  ),
  fts_ranked AS (
    SELECT
      f.id,
      row_number() OVER (
        ORDER BY ts_rank_cd(f.search_tsv, websearch_to_tsquery('english', p.clean_query)) DESC,
                 f.quality_score DESC,
                 f.published_at DESC
      ) AS fts_rank
    FROM filtered f
    CROSS JOIN params p
    WHERE p.clean_query IS NOT NULL
      AND f.search_tsv @@ websearch_to_tsquery('english', p.clean_query)
    LIMIT 100
  ),
  vec_ranked AS (
    SELECT
      f.id,
      row_number() OVER (
        ORDER BY f.embedding <=> query_embedding ASC,
                 f.quality_score DESC
      ) AS vec_rank
    FROM filtered f
    WHERE query_embedding IS NOT NULL
      AND f.embedding IS NOT NULL
    LIMIT 100
  ),
  scored AS (
    SELECT
      f.id,
      CASE
        WHEN p.clean_query IS NULL AND query_embedding IS NULL THEN
          (f.quality_score::float / 100.0)
        ELSE
          coalesce(1.0 / (p.rrf_k + fr.fts_rank), 0.0) +
          coalesce(1.0 / (p.rrf_k + vr.vec_rank), 0.0)
      END AS hybrid_score
    FROM filtered f
    CROSS JOIN params p
    LEFT JOIN fts_ranked fr ON fr.id = f.id
    LEFT JOIN vec_ranked vr ON vr.id = f.id
    WHERE
      (p.clean_query IS NULL AND query_embedding IS NULL)
      OR fr.id IS NOT NULL
      OR vr.id IS NOT NULL
  )
  SELECT
    f.id,
    f.doi,
    f.pubmed_id,
    f.title,
    f.journal,
    f.publication_year,
    f.published_at,
    f.primary_url,
    f.study_design,
    f.population,
    f.is_trained_population,
    f.sample_size_n,
    f.duration_weeks,
    f.primary_outcome,
    f.summary_takeaway,
    f.inspection_depth,
    f.quality_score,
    f.upvote_count,
    f.comment_count,
    sc.hybrid_score
  FROM scored sc
  JOIN filtered f ON f.id = sc.id
  CROSS JOIN params p
  ORDER BY sc.hybrid_score DESC, f.quality_score DESC, f.published_at DESC
  LIMIT (SELECT safe_limit FROM params);
$$;
