-- 0012_revoke_client_ai_mutation_rpcs.sql
-- Security hardening: revoke direct authenticated client EXECUTE privileges on
-- mutating AI quota and shared cache-write RPCs, scoping them strictly to
-- service_role with explicit p_user_id parameters.

-- 1. Drop old authenticated-callable mutating quota RPC signatures
DROP FUNCTION IF EXISTS public.check_and_increment_ai_quota(int);
DROP FUNCTION IF EXISTS public.refund_ai_quota(int);

-- 2. Server-only atomic quota check & increment (service_role only)
CREATE OR REPLACE FUNCTION public.check_and_increment_ai_quota(
  p_user_id uuid,
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
  v_limit int := GREATEST(1, LEAST(COALESCE(p_daily_limit, 10), 100));
  v_utc_today date := (now() AT TIME ZONE 'UTC')::date;
  v_resets_at timestamptz := ((v_utc_today + 1)::timestamp AT TIME ZONE 'UTC');
  v_is_admin boolean;
  v_new_count int;
  v_current_count int;
BEGIN
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'User ID required';
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = p_user_id
      AND p.role = 'admin'
  ) INTO v_is_admin;

  IF v_is_admin THEN
    INSERT INTO public.user_ai_daily_quotas (user_id, usage_date, synthesis_count, updated_at)
    VALUES (p_user_id, v_utc_today, 1, now())
    ON CONFLICT (user_id, usage_date) DO UPDATE
      SET synthesis_count = public.user_ai_daily_quotas.synthesis_count + 1,
          updated_at = now()
    RETURNING synthesis_count INTO v_new_count;

    RETURN QUERY SELECT true, true, v_limit, v_new_count, v_limit, v_resets_at;
    RETURN;
  END IF;

  INSERT INTO public.user_ai_daily_quotas (user_id, usage_date, synthesis_count, updated_at)
  VALUES (p_user_id, v_utc_today, 1, now())
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
    WHERE q.user_id = p_user_id
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

-- 3. Server-only atomic quota refund (service_role only)
CREATE OR REPLACE FUNCTION public.refund_ai_quota(
  p_user_id uuid,
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
  v_limit int := GREATEST(1, LEAST(COALESCE(p_daily_limit, 10), 100));
  v_utc_today date := (now() AT TIME ZONE 'UTC')::date;
  v_resets_at timestamptz := ((v_utc_today + 1)::timestamp AT TIME ZONE 'UTC');
  v_is_admin boolean;
  v_used int;
BEGIN
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'User ID required';
  END IF;

  UPDATE public.user_ai_daily_quotas
  SET synthesis_count = GREATEST(0, synthesis_count - 1),
      updated_at = now()
  WHERE user_id = p_user_id
    AND usage_date = v_utc_today;

  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = p_user_id
      AND p.role = 'admin'
  ) INTO v_is_admin;

  SELECT COALESCE(q.synthesis_count, 0)
  INTO v_used
  FROM public.user_ai_daily_quotas q
  WHERE q.user_id = p_user_id
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

-- 4. Server-only shared cache write (service_role only; does not require auth.uid())
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

-- 5. Restrict EXECUTE on all mutating AI quota & cache RPCs strictly to service_role
REVOKE ALL ON FUNCTION public.check_and_increment_ai_quota(uuid, int) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.check_and_increment_ai_quota(uuid, int) TO service_role;

REVOKE ALL ON FUNCTION public.refund_ai_quota(uuid, int) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.refund_ai_quota(uuid, int) TO service_role;

REVOKE ALL ON FUNCTION public.put_cached_ai_synthesis(text, text, text, text, jsonb, text, int) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.put_cached_ai_synthesis(text, text, text, text, jsonb, text, int) TO service_role;
