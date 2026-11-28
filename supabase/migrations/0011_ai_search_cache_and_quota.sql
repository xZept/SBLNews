-- 0011_ai_search_cache_and_quota.sql
-- Shared 7/30-day TTL query-answer cache and atomic per-user UTC daily AI quota
-- ledger, protected by RLS, least-privilege grants, and SECURITY DEFINER RPCs.

-- 1. Shared Query-Answer Cache
CREATE TABLE IF NOT EXISTS public.ai_search_cache (
  cache_key text PRIMARY KEY CHECK (char_length(cache_key) = 64),
  normalized_query text NOT NULL CHECK (
    char_length(btrim(normalized_query)) >= 3
    AND char_length(normalized_query) <= 300
  ),
  filter_signature text NOT NULL,
  answer_markdown text NOT NULL CHECK (
    char_length(btrim(answer_markdown)) >= 1
    AND char_length(answer_markdown) <= 8000
  ),
  citations jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (
    jsonb_typeof(citations) = 'array'
    AND jsonb_array_length(citations) BETWEEN 1 AND 5
  ),
  tier_used text NOT NULL CHECK (tier_used IN ('groq', 'openrouter', 'gemini')),
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL CHECK (expires_at > created_at)
);

CREATE INDEX IF NOT EXISTS idx_ai_search_cache_expires_at
  ON public.ai_search_cache (expires_at);

ALTER TABLE public.ai_search_cache ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ai_search_cache_select_authenticated" ON public.ai_search_cache;
CREATE POLICY "ai_search_cache_select_authenticated"
  ON public.ai_search_cache
  FOR SELECT
  TO authenticated
  USING (expires_at > now());

REVOKE ALL ON TABLE public.ai_search_cache FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.ai_search_cache TO authenticated;
GRANT ALL ON TABLE public.ai_search_cache TO service_role;

-- 2. Per-User UTC Daily Quota Ledger
CREATE TABLE IF NOT EXISTS public.user_ai_daily_quotas (
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  usage_date date NOT NULL DEFAULT (now() AT TIME ZONE 'UTC')::date,
  synthesis_count int NOT NULL DEFAULT 0 CHECK (synthesis_count >= 0),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, usage_date)
);

ALTER TABLE public.user_ai_daily_quotas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_ai_daily_quotas_select_own" ON public.user_ai_daily_quotas;
CREATE POLICY "user_ai_daily_quotas_select_own"
  ON public.user_ai_daily_quotas
  FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

REVOKE ALL ON TABLE public.user_ai_daily_quotas FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.user_ai_daily_quotas TO authenticated;
GRANT ALL ON TABLE public.user_ai_daily_quotas TO service_role;

-- 3. Atomic Quota & Shared Cache SECURITY DEFINER RPCs
CREATE OR REPLACE FUNCTION public.get_my_ai_quota_status(
  p_daily_limit int DEFAULT 10
)
RETURNS TABLE (
  allowed boolean,
  is_admin boolean,
  daily_limit int,
  used_today int,
  remaining_today int,
  resets_at_utc timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id uuid := (select auth.uid());
  v_limit int := GREATEST(1, LEAST(COALESCE(p_daily_limit, 10), 100));
  v_utc_today date := (now() AT TIME ZONE 'UTC')::date;
  v_resets_at timestamptz := ((v_utc_today + 1)::timestamp AT TIME ZONE 'UTC');
  v_is_admin boolean;
  v_used int;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  v_is_admin := public.is_admin();

  SELECT COALESCE(q.synthesis_count, 0)
  INTO v_used
  FROM public.user_ai_daily_quotas q
  WHERE q.user_id = v_user_id
    AND q.usage_date = v_utc_today;

  v_used := COALESCE(v_used, 0);

  IF v_is_admin THEN
    RETURN QUERY SELECT true, true, v_limit, v_used, v_limit, v_resets_at;
  ELSE
    RETURN QUERY SELECT
      (v_used < v_limit),
      false,
      v_limit,
      v_used,
      GREATEST(0, v_limit - v_used),
      v_resets_at;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.check_and_increment_ai_quota(
  p_daily_limit int DEFAULT 10
)
RETURNS TABLE (
  allowed boolean,
  is_admin boolean,
  daily_limit int,
  used_today int,
  remaining_today int,
  resets_at_utc timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id uuid := (select auth.uid());
  v_limit int := GREATEST(1, LEAST(COALESCE(p_daily_limit, 10), 100));
  v_utc_today date := (now() AT TIME ZONE 'UTC')::date;
  v_resets_at timestamptz := ((v_utc_today + 1)::timestamp AT TIME ZONE 'UTC');
  v_is_admin boolean;
  v_new_count int;
  v_current_count int;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  v_is_admin := public.is_admin();

  IF v_is_admin THEN
    INSERT INTO public.user_ai_daily_quotas (user_id, usage_date, synthesis_count, updated_at)
    VALUES (v_user_id, v_utc_today, 1, now())
    ON CONFLICT (user_id, usage_date) DO UPDATE
      SET synthesis_count = public.user_ai_daily_quotas.synthesis_count + 1,
          updated_at = now()
    RETURNING synthesis_count INTO v_new_count;

    RETURN QUERY SELECT true, true, v_limit, v_new_count, v_limit, v_resets_at;
    RETURN;
  END IF;

  INSERT INTO public.user_ai_daily_quotas (user_id, usage_date, synthesis_count, updated_at)
  VALUES (v_user_id, v_utc_today, 1, now())
  ON CONFLICT (user_id, usage_date) DO UPDATE
    SET synthesis_count = public.user_ai_daily_quotas.synthesis_count + 1,
        updated_at = now()
    WHERE public.user_ai_daily_quotas.synthesis_count < v_limit
  RETURNING synthesis_count INTO v_new_count;

  IF v_new_count IS NOT NULL THEN
    RETURN QUERY SELECT
      true,
      false,
      v_limit,
      v_new_count,
      GREATEST(0, v_limit - v_new_count),
      v_resets_at;
  ELSE
    SELECT COALESCE(q.synthesis_count, 0)
    INTO v_current_count
    FROM public.user_ai_daily_quotas q
    WHERE q.user_id = v_user_id
      AND q.usage_date = v_utc_today;

    v_current_count := COALESCE(v_current_count, 0);

    RETURN QUERY SELECT
      false,
      false,
      v_limit,
      v_current_count,
      0,
      v_resets_at;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.refund_ai_quota(
  p_daily_limit int DEFAULT 10
)
RETURNS TABLE (
  allowed boolean,
  is_admin boolean,
  daily_limit int,
  used_today int,
  remaining_today int,
  resets_at_utc timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id uuid := (select auth.uid());
  v_utc_today date := (now() AT TIME ZONE 'UTC')::date;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  UPDATE public.user_ai_daily_quotas
  SET synthesis_count = GREATEST(0, synthesis_count - 1),
      updated_at = now()
  WHERE user_id = v_user_id
    AND usage_date = v_utc_today;

  RETURN QUERY SELECT * FROM public.get_my_ai_quota_status(p_daily_limit);
END;
$$;

CREATE OR REPLACE FUNCTION public.get_cached_ai_synthesis(
  p_cache_key text
)
RETURNS TABLE (
  cache_key text,
  normalized_query text,
  filter_signature text,
  answer_markdown text,
  citations jsonb,
  tier_used text,
  created_at timestamptz,
  expires_at timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF (select auth.uid()) IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  RETURN QUERY
  SELECT
    c.cache_key,
    c.normalized_query,
    c.filter_signature,
    c.answer_markdown,
    c.citations,
    c.tier_used,
    c.created_at,
    c.expires_at
  FROM public.ai_search_cache c
  WHERE c.cache_key = p_cache_key
    AND c.expires_at > now();
END;
$$;

CREATE OR REPLACE FUNCTION public.put_cached_ai_synthesis(
  p_cache_key text,
  p_normalized_query text,
  p_filter_signature text,
  p_answer_markdown text,
  p_citations jsonb,
  p_tier_used text,
  p_ttl_days int DEFAULT 7
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_ttl_days int := CASE WHEN p_ttl_days = 30 THEN 30 ELSE 7 END;
  v_now timestamptz := now();
BEGIN
  IF (select auth.uid()) IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  DELETE FROM public.ai_search_cache
  WHERE cache_key IN (
    SELECT c.cache_key
    FROM public.ai_search_cache c
    WHERE c.expires_at <= v_now
    LIMIT 50
  );

  INSERT INTO public.ai_search_cache (
    cache_key,
    normalized_query,
    filter_signature,
    answer_markdown,
    citations,
    tier_used,
    created_at,
    expires_at
  )
  VALUES (
    p_cache_key,
    p_normalized_query,
    p_filter_signature,
    p_answer_markdown,
    p_citations,
    p_tier_used,
    v_now,
    v_now + make_interval(days => v_ttl_days)
  )
  ON CONFLICT (cache_key) DO UPDATE
    SET normalized_query = EXCLUDED.normalized_query,
        filter_signature = EXCLUDED.filter_signature,
        answer_markdown = EXCLUDED.answer_markdown,
        citations = EXCLUDED.citations,
        tier_used = EXCLUDED.tier_used,
        created_at = EXCLUDED.created_at,
        expires_at = EXCLUDED.expires_at;
END;
$$;

REVOKE ALL ON FUNCTION public.get_my_ai_quota_status(int) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_ai_quota_status(int) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.check_and_increment_ai_quota(int) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.check_and_increment_ai_quota(int) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.refund_ai_quota(int) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.refund_ai_quota(int) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.get_cached_ai_synthesis(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_cached_ai_synthesis(text) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.put_cached_ai_synthesis(text, text, text, text, jsonb, text, int) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.put_cached_ai_synthesis(text, text, text, text, jsonb, text, int) TO authenticated, service_role;
