-- 0009_socialization_aura_friends_chat.sql
-- Lightweight socialization layer:
--   (a) Domain enums for activity visibility, friendship lifecycle, and share channels
--   (b) Non-exposed `private` schema with RLS predicates & deterministic Aura engine
--   (c) `public.profiles` Aura & opt-in visibility columns, indexes, grants & get_my_account_profile()
--   (d) `public.comments.helpful_count`, `public.comment_endorsements`, `public.study_shares` & Aura triggers
--   (e) `public.votes` visibility RLS, `public.recent_study_views` (<=20 RPC) & `get_profile_social_context`
--   (f) Canonical-pair `public.friendships` + RPCs & mutual-friend `public.direct_messages` + read-receipt RPC

-- =============================================================================
-- (a) Domain Enums
-- =============================================================================
DO $$
BEGIN
  CREATE TYPE public.activity_visibility_type AS ENUM ('private', 'friends', 'public');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE public.friendship_status_type AS ENUM ('pending', 'accepted', 'blocked');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE public.share_channel_type AS ENUM (
    'copy_citation',
    'x',
    'reddit',
    'whatsapp',
    'discord',
    'web_share',
    'friend_chat'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- =============================================================================
-- (b) Non-Exposed `private` Schema & Core Predicates
-- =============================================================================
CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon, authenticated;

-- Note: `private.are_accepted_friends`, `private.is_blocked_pair`,
-- `private.can_view_user_upvotes`, `private.can_view_user_recent_views`, and
-- `private.recompute_user_aura` are created right after the tables they reference
-- (`public.profiles` columns, `public.friendships`, `public.comment_endorsements`,
-- `public.study_shares`) so PostgreSQL validates all table/column references cleanly.

-- =============================================================================
-- (c) Extend `public.profiles` (Aura & Activity Visibility)
-- =============================================================================
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS aura_score int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS aura_updated_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS upvoted_studies_visibility public.activity_visibility_type NOT NULL DEFAULT 'private',
  ADD COLUMN IF NOT EXISTS viewed_studies_visibility public.activity_visibility_type NOT NULL DEFAULT 'private';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'profiles_aura_score_non_negative'
      AND conrelid = 'public.profiles'::regclass
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_aura_score_non_negative CHECK (aura_score >= 0);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_profiles_aura_leaderboard
  ON public.profiles (aura_score DESC, display_name ASC, id ASC)
  WHERE aura_score > 0;

CREATE INDEX IF NOT EXISTS idx_profiles_display_name_lower
  ON public.profiles (lower(display_name) text_pattern_ops, aura_score DESC);

-- Column-level privacy grants: `aura_score` is public-read, NOT client-updatable
REVOKE SELECT, UPDATE ON TABLE public.profiles FROM anon, authenticated;
GRANT SELECT (id, display_name, avatar_url, affiliation_role, bio, aura_score)
  ON TABLE public.profiles TO anon, authenticated;
GRANT UPDATE (
  display_name,
  avatar_url,
  affiliation_role,
  bio,
  theme_preference,
  upvoted_studies_visibility,
  viewed_studies_visibility,
  updated_at
) ON TABLE public.profiles TO authenticated;

-- Update `get_my_account_profile()` return signature with Aura & visibility settings
DROP FUNCTION IF EXISTS public.get_my_account_profile();
CREATE OR REPLACE FUNCTION public.get_my_account_profile()
RETURNS TABLE (
  id uuid,
  display_name text,
  avatar_url text,
  affiliation_role public.community_role_type,
  bio text,
  aura_score int,
  theme_preference public.theme_preference_type,
  upvoted_studies_visibility public.activity_visibility_type,
  viewed_studies_visibility public.activity_visibility_type,
  role public.user_role,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p.id,
    p.display_name,
    p.avatar_url,
    p.affiliation_role,
    p.bio,
    p.aura_score,
    p.theme_preference,
    p.upvoted_studies_visibility,
    p.viewed_studies_visibility,
    p.role,
    p.created_at,
    p.updated_at
  FROM public.profiles p
  WHERE p.id = (select auth.uid());
$$;

REVOKE EXECUTE ON FUNCTION public.get_my_account_profile() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_account_profile() TO authenticated, service_role;

-- =============================================================================
-- (d) Comment Endorsements, Study Shares & Deterministic Aura Triggers
-- =============================================================================
ALTER TABLE public.comments
  ADD COLUMN IF NOT EXISTS helpful_count int NOT NULL DEFAULT 0;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'comments_helpful_count_non_negative'
      AND conrelid = 'public.comments'::regclass
  ) THEN
    ALTER TABLE public.comments
      ADD CONSTRAINT comments_helpful_count_non_negative CHECK (helpful_count >= 0);
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.comment_endorsements (
  comment_id uuid NOT NULL REFERENCES public.comments(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (comment_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_comment_endorsements_user_id
  ON public.comment_endorsements (user_id);

ALTER TABLE public.comment_endorsements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "comment_endorsements_select_own" ON public.comment_endorsements;
CREATE POLICY "comment_endorsements_select_own"
  ON public.comment_endorsements FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "comment_endorsements_insert_own" ON public.comment_endorsements;
CREATE POLICY "comment_endorsements_insert_own"
  ON public.comment_endorsements FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "comment_endorsements_delete_own" ON public.comment_endorsements;
CREATE POLICY "comment_endorsements_delete_own"
  ON public.comment_endorsements FOR DELETE
  TO authenticated
  USING ((select auth.uid()) = user_id);

GRANT SELECT, INSERT, DELETE ON TABLE public.comment_endorsements TO authenticated;
GRANT ALL ON TABLE public.comment_endorsements TO service_role;

-- Study shares (deduplicated per user, study, UTC day)
CREATE TABLE IF NOT EXISTS public.study_shares (
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  study_id uuid NOT NULL REFERENCES public.studies(id) ON DELETE CASCADE,
  channel public.share_channel_type NOT NULL,
  shared_on date NOT NULL DEFAULT (now() AT TIME ZONE 'UTC')::date,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, study_id, shared_on)
);

CREATE INDEX IF NOT EXISTS idx_study_shares_user_day
  ON public.study_shares (user_id, shared_on DESC);

CREATE INDEX IF NOT EXISTS idx_study_shares_study_id
  ON public.study_shares (study_id);

ALTER TABLE public.study_shares ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "study_shares_select_own" ON public.study_shares;
CREATE POLICY "study_shares_select_own"
  ON public.study_shares FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "study_shares_insert_own" ON public.study_shares;
CREATE POLICY "study_shares_insert_own"
  ON public.study_shares FOR INSERT
  TO authenticated
  WITH CHECK (
    (select auth.uid()) = user_id
    AND EXISTS (
      SELECT 1 FROM public.studies s
      WHERE s.id = study_id
        AND s.publication_status = 'published'
    )
  );

GRANT SELECT, INSERT ON TABLE public.study_shares TO authenticated;
GRANT ALL ON TABLE public.study_shares TO service_role;

-- =============================================================================
-- (e) Recent Study Views & (f) Friendships / Direct Messages Tables
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.recent_study_views (
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  study_id uuid NOT NULL REFERENCES public.studies(id) ON DELETE CASCADE,
  viewed_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, study_id)
);

CREATE INDEX IF NOT EXISTS idx_recent_study_views_user_recent
  ON public.recent_study_views (user_id, viewed_at DESC, study_id DESC);

CREATE INDEX IF NOT EXISTS idx_recent_study_views_study_id
  ON public.recent_study_views (study_id);

CREATE TABLE IF NOT EXISTS public.friendships (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  requester_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  addressee_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  user_low_id uuid GENERATED ALWAYS AS (LEAST(requester_id, addressee_id)) STORED,
  user_high_id uuid GENERATED ALWAYS AS (GREATEST(requester_id, addressee_id)) STORED,
  status public.friendship_status_type NOT NULL DEFAULT 'pending',
  blocked_by_id uuid NULL DEFAULT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT friendships_no_self_check CHECK (requester_id <> addressee_id),
  CONSTRAINT friendships_canonical_pair_unique UNIQUE (user_low_id, user_high_id),
  CONSTRAINT friendships_blocked_by_consistency CHECK (
    (status = 'blocked' AND blocked_by_id IN (requester_id, addressee_id))
    OR (status <> 'blocked' AND blocked_by_id IS NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_friendships_requester_status
  ON public.friendships (requester_id, status, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_friendships_addressee_status
  ON public.friendships (addressee_id, status, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_friendships_blocked_by_id
  ON public.friendships (blocked_by_id)
  WHERE blocked_by_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.direct_messages (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  recipient_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  pair_low_id uuid GENERATED ALWAYS AS (LEAST(sender_id, recipient_id)) STORED,
  pair_high_id uuid GENERATED ALWAYS AS (GREATEST(sender_id, recipient_id)) STORED,
  body text NULL DEFAULT NULL,
  study_id uuid NULL DEFAULT NULL REFERENCES public.studies(id) ON DELETE SET NULL,
  has_study_attachment boolean NOT NULL DEFAULT false,
  read_at timestamptz NULL DEFAULT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT direct_messages_no_self_check CHECK (sender_id <> recipient_id),
  CONSTRAINT direct_messages_body_length_check CHECK (
    body IS NULL OR (char_length(btrim(body)) >= 1 AND char_length(body) <= 1000)
  ),
  CONSTRAINT direct_messages_content_present_check CHECK (
    body IS NOT NULL OR has_study_attachment = true
  ),
  CONSTRAINT direct_messages_study_note_length_check CHECK (
    NOT has_study_attachment OR body IS NULL OR char_length(body) <= 240
  )
);

CREATE INDEX IF NOT EXISTS idx_direct_messages_pair_thread
  ON public.direct_messages (pair_low_id, pair_high_id, created_at DESC, id DESC);

CREATE INDEX IF NOT EXISTS idx_direct_messages_recipient_unread
  ON public.direct_messages (recipient_id, sender_id, created_at DESC)
  WHERE read_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_direct_messages_sender_id
  ON public.direct_messages (sender_id);

CREATE INDEX IF NOT EXISTS idx_direct_messages_study_id
  ON public.direct_messages (study_id)
  WHERE study_id IS NOT NULL;

-- =============================================================================
-- Private Schema Helper Functions & Deterministic Aura Engine
-- =============================================================================
CREATE OR REPLACE FUNCTION private.are_accepted_friends(
  p_user_a uuid,
  p_user_b uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT
    p_user_a IS NOT NULL
    AND p_user_b IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.friendships f
      WHERE f.user_low_id = LEAST(p_user_a, p_user_b)
        AND f.user_high_id = GREATEST(p_user_a, p_user_b)
        AND f.status = 'accepted'
    );
$$;

CREATE OR REPLACE FUNCTION private.is_blocked_pair(
  p_user_a uuid,
  p_user_b uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT
    p_user_a IS NOT NULL
    AND p_user_b IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.friendships f
      WHERE f.user_low_id = LEAST(p_user_a, p_user_b)
        AND f.user_high_id = GREATEST(p_user_a, p_user_b)
        AND f.status = 'blocked'
    );
$$;

CREATE OR REPLACE FUNCTION private.can_view_user_upvotes(
  p_target_user_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = p_target_user_id
      AND (
        (select auth.uid()) = p_target_user_id
        OR p.upvoted_studies_visibility = 'public'
        OR (
          p.upvoted_studies_visibility = 'friends'
          AND private.are_accepted_friends((select auth.uid()), p_target_user_id)
        )
      )
  );
$$;

CREATE OR REPLACE FUNCTION private.can_view_user_recent_views(
  p_target_user_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = p_target_user_id
      AND (
        (select auth.uid()) = p_target_user_id
        OR p.viewed_studies_visibility = 'public'
        OR (
          p.viewed_studies_visibility = 'friends'
          AND private.are_accepted_friends((select auth.uid()), p_target_user_id)
        )
      )
  );
$$;

CREATE OR REPLACE FUNCTION private.recompute_user_aura(p_user_id uuid)
RETURNS int
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_comment_aura int := 0;
  v_endorsement_aura int := 0;
  v_vote_aura int := 0;
  v_share_aura int := 0;
  v_total int := 0;
BEGIN
  IF p_user_id IS NULL THEN
    RETURN 0;
  END IF;

  -- +5 per non-deleted comment on published studies, capped at 25/UTC day
  SELECT COALESCE(SUM(LEAST(day_count * 5, 25)), 0)::int
  INTO v_comment_aura
  FROM (
    SELECT (c.created_at AT TIME ZONE 'UTC')::date AS utc_day, COUNT(*) AS day_count
    FROM public.comments c
    JOIN public.studies s ON s.id = c.study_id
    WHERE c.author_id = p_user_id
      AND c.is_deleted = false
      AND s.publication_status = 'published'
    GROUP BY 1
  ) c_days;

  -- +2 per endorsement received on non-deleted comments on published studies, capped at 20/UTC day
  SELECT COALESCE(SUM(LEAST(day_count * 2, 20)), 0)::int
  INTO v_endorsement_aura
  FROM (
    SELECT (ce.created_at AT TIME ZONE 'UTC')::date AS utc_day, COUNT(*) AS day_count
    FROM public.comment_endorsements ce
    JOIN public.comments c ON c.id = ce.comment_id
    JOIN public.studies s ON s.id = c.study_id
    WHERE c.author_id = p_user_id
      AND c.is_deleted = false
      AND ce.user_id <> p_user_id
      AND s.publication_status = 'published'
    GROUP BY 1
  ) e_days;

  -- +1 per study upvote on published studies, capped at 10/UTC day
  SELECT COALESCE(SUM(LEAST(day_count * 1, 10)), 0)::int
  INTO v_vote_aura
  FROM (
    SELECT (v.created_at AT TIME ZONE 'UTC')::date AS utc_day, COUNT(*) AS day_count
    FROM public.votes v
    JOIN public.studies s ON s.id = v.study_id
    WHERE v.user_id = p_user_id
      AND s.publication_status = 'published'
    GROUP BY 1
  ) v_days;

  -- +2 per distinct study shared per UTC day on published studies, capped at 10/UTC day
  SELECT COALESCE(SUM(LEAST(day_count * 2, 10)), 0)::int
  INTO v_share_aura
  FROM (
    SELECT ss.shared_on AS utc_day, COUNT(DISTINCT ss.study_id) AS day_count
    FROM public.study_shares ss
    JOIN public.studies s ON s.id = ss.study_id
    WHERE ss.user_id = p_user_id
      AND s.publication_status = 'published'
    GROUP BY 1
  ) s_days;

  v_total := GREATEST(0, v_comment_aura + v_endorsement_aura + v_vote_aura + v_share_aura);

  UPDATE public.profiles
  SET aura_score = v_total,
      aura_updated_at = now()
  WHERE id = p_user_id;

  RETURN v_total;
END;
$$;

REVOKE ALL ON FUNCTION private.are_accepted_friends(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.is_blocked_pair(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.can_view_user_upvotes(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.can_view_user_recent_views(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.recompute_user_aura(uuid) FROM PUBLIC, anon, authenticated;

-- =============================================================================
-- Triggers for Comment Endorsements & Aura Recomputation
-- =============================================================================
CREATE OR REPLACE FUNCTION private.validate_comment_endorsement()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_author_id uuid;
  v_is_deleted boolean;
  v_pub_status public.publication_status_type;
BEGIN
  SELECT c.author_id, c.is_deleted, s.publication_status
  INTO v_author_id, v_is_deleted, v_pub_status
  FROM public.comments c
  JOIN public.studies s ON s.id = c.study_id
  WHERE c.id = NEW.comment_id;

  IF v_author_id IS NULL THEN
    RAISE EXCEPTION 'Target comment does not exist';
  END IF;

  IF v_author_id = NEW.user_id THEN
    RAISE EXCEPTION 'Users cannot endorse their own comments';
  END IF;

  IF v_is_deleted THEN
    RAISE EXCEPTION 'Deleted comments cannot be endorsed';
  END IF;

  IF v_pub_status <> 'published' THEN
    RAISE EXCEPTION 'Comments on unpublished studies cannot be endorsed';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_comment_endorsement ON public.comment_endorsements;
CREATE TRIGGER trg_validate_comment_endorsement
  BEFORE INSERT ON public.comment_endorsements
  FOR EACH ROW
  EXECUTE FUNCTION private.validate_comment_endorsement();

CREATE OR REPLACE FUNCTION private.sync_comment_helpful_and_aura()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_comment_id uuid;
  v_author_id uuid;
BEGIN
  v_comment_id := COALESCE(NEW.comment_id, OLD.comment_id);

  IF TG_OP = 'INSERT' THEN
    UPDATE public.comments
    SET helpful_count = helpful_count + 1
    WHERE id = v_comment_id
    RETURNING author_id INTO v_author_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.comments
    SET helpful_count = GREATEST(0, helpful_count - 1)
    WHERE id = v_comment_id
    RETURNING author_id INTO v_author_id;
  END IF;

  IF v_author_id IS NOT NULL THEN
    PERFORM private.recompute_user_aura(v_author_id);
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_comment_helpful_and_aura ON public.comment_endorsements;
CREATE TRIGGER trg_sync_comment_helpful_and_aura
  AFTER INSERT OR DELETE ON public.comment_endorsements
  FOR EACH ROW
  EXECUTE FUNCTION private.sync_comment_helpful_and_aura();

CREATE OR REPLACE FUNCTION private.sync_comment_author_aura()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM private.recompute_user_aura(NEW.author_id);
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM private.recompute_user_aura(OLD.author_id);
  ELSIF TG_OP = 'UPDATE' AND (NEW.is_deleted IS DISTINCT FROM OLD.is_deleted) THEN
    PERFORM private.recompute_user_aura(NEW.author_id);
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_comment_author_aura ON public.comments;
CREATE TRIGGER trg_sync_comment_author_aura
  AFTER INSERT OR UPDATE OF is_deleted OR DELETE ON public.comments
  FOR EACH ROW
  EXECUTE FUNCTION private.sync_comment_author_aura();

CREATE OR REPLACE FUNCTION private.sync_vote_user_aura()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM private.recompute_user_aura(NEW.user_id);
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM private.recompute_user_aura(OLD.user_id);
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_vote_user_aura ON public.votes;
CREATE TRIGGER trg_sync_vote_user_aura
  AFTER INSERT OR DELETE ON public.votes
  FOR EACH ROW
  EXECUTE FUNCTION private.sync_vote_user_aura();

CREATE OR REPLACE FUNCTION private.sync_share_user_aura()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM private.recompute_user_aura(NEW.user_id);
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM private.recompute_user_aura(OLD.user_id);
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_share_user_aura ON public.study_shares;
CREATE TRIGGER trg_sync_share_user_aura
  AFTER INSERT OR DELETE ON public.study_shares
  FOR EACH ROW
  EXECUTE FUNCTION private.sync_share_user_aura();

-- =============================================================================
-- Visibility RLS on `public.votes` & `public.recent_study_views`
-- =============================================================================
DROP POLICY IF EXISTS "votes_select_own" ON public.votes;
DROP POLICY IF EXISTS "votes_select_by_visibility" ON public.votes;
CREATE POLICY "votes_select_by_visibility"
  ON public.votes FOR SELECT
  TO anon, authenticated
  USING ((select private.can_view_user_upvotes(user_id)));

GRANT SELECT ON TABLE public.votes TO anon, authenticated;

ALTER TABLE public.recent_study_views ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "recent_study_views_select_by_visibility" ON public.recent_study_views;
CREATE POLICY "recent_study_views_select_by_visibility"
  ON public.recent_study_views FOR SELECT
  TO anon, authenticated
  USING ((select private.can_view_user_recent_views(user_id)));

DROP POLICY IF EXISTS "recent_study_views_delete_own" ON public.recent_study_views;
CREATE POLICY "recent_study_views_delete_own"
  ON public.recent_study_views FOR DELETE
  TO authenticated
  USING ((select auth.uid()) = user_id);

GRANT SELECT ON TABLE public.recent_study_views TO anon, authenticated;
GRANT DELETE ON TABLE public.recent_study_views TO authenticated;
GRANT ALL ON TABLE public.recent_study_views TO service_role;

CREATE OR REPLACE FUNCTION public.record_study_view(p_study_id uuid)
RETURNS boolean
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id uuid;
  v_visibility public.activity_visibility_type;
  v_is_published boolean;
BEGIN
  v_user_id := (select auth.uid());
  IF v_user_id IS NULL OR p_study_id IS NULL THEN
    RETURN false;
  END IF;

  SELECT p.viewed_studies_visibility
  INTO v_visibility
  FROM public.profiles p
  WHERE p.id = v_user_id;

  IF v_visibility IS NULL OR v_visibility = 'private' THEN
    RETURN false;
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.studies s
    WHERE s.id = p_study_id
      AND s.publication_status = 'published'
  ) INTO v_is_published;

  IF NOT v_is_published THEN
    RETURN false;
  END IF;

  INSERT INTO public.recent_study_views (user_id, study_id, viewed_at)
  VALUES (v_user_id, p_study_id, now())
  ON CONFLICT (user_id, study_id) DO UPDATE
    SET viewed_at = EXCLUDED.viewed_at;

  DELETE FROM public.recent_study_views rsv
  WHERE rsv.user_id = v_user_id
    AND rsv.study_id NOT IN (
      SELECT top_views.study_id
      FROM public.recent_study_views top_views
      WHERE top_views.user_id = v_user_id
      ORDER BY top_views.viewed_at DESC, top_views.study_id DESC
      LIMIT 20
    );

  RETURN true;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.record_study_view(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_study_view(uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.get_profile_social_context(p_target_user_id uuid)
RETURNS TABLE (
  can_view_upvotes boolean,
  can_view_recent_views boolean,
  friendship_state text,
  friendship_id uuid
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_viewer_id uuid;
  v_row public.friendships%ROWTYPE;
  v_state text := 'none';
  v_fid uuid := NULL;
BEGIN
  v_viewer_id := (select auth.uid());

  IF v_viewer_id IS NOT NULL AND v_viewer_id = p_target_user_id THEN
    v_state := 'self';
  ELSIF v_viewer_id IS NOT NULL AND p_target_user_id IS NOT NULL THEN
    SELECT *
    INTO v_row
    FROM public.friendships f
    WHERE f.user_low_id = LEAST(v_viewer_id, p_target_user_id)
      AND f.user_high_id = GREATEST(v_viewer_id, p_target_user_id);

    IF FOUND THEN
      IF v_row.status = 'accepted' THEN
        v_state := 'friends';
        v_fid := v_row.id;
      ELSIF v_row.status = 'pending' THEN
        v_fid := v_row.id;
        IF v_row.requester_id = v_viewer_id THEN
          v_state := 'outgoing_pending';
        ELSE
          v_state := 'incoming_pending';
        END IF;
      ELSIF v_row.status = 'blocked' THEN
        IF v_row.blocked_by_id = v_viewer_id THEN
          v_state := 'blocked_by_me';
          v_fid := v_row.id;
        ELSE
          v_state := 'unavailable';
          v_fid := NULL;
        END IF;
      END IF;
    END IF;
  END IF;

  RETURN QUERY
  SELECT
    private.can_view_user_upvotes(p_target_user_id),
    private.can_view_user_recent_views(p_target_user_id),
    v_state,
    v_fid;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_profile_social_context(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_profile_social_context(uuid) TO anon, authenticated, service_role;

-- =============================================================================
-- Friendships RLS, RPCs & Direct Messages RLS, Read-Receipt RPC
-- =============================================================================
ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "friendships_select_participant" ON public.friendships;
CREATE POLICY "friendships_select_participant"
  ON public.friendships FOR SELECT
  TO authenticated
  USING (
    ((select auth.uid()) IN (requester_id, addressee_id))
    AND (status <> 'blocked' OR blocked_by_id = (select auth.uid()))
  );

GRANT SELECT ON TABLE public.friendships TO authenticated;
GRANT ALL ON TABLE public.friendships TO service_role;

CREATE OR REPLACE FUNCTION public.search_profiles_for_social(
  p_query text,
  p_limit int DEFAULT 15
)
RETURNS TABLE (
  id uuid,
  display_name text,
  avatar_url text,
  affiliation_role public.community_role_type,
  aura_score int,
  friendship_state text,
  friendship_id uuid
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_viewer_id uuid;
  v_clean_query text;
  v_safe_limit int;
BEGIN
  v_viewer_id := (select auth.uid());
  IF v_viewer_id IS NULL THEN
    RETURN;
  END IF;

  v_clean_query := lower(btrim(coalesce(p_query, '')));
  IF char_length(v_clean_query) < 2 THEN
    RETURN;
  END IF;

  v_safe_limit := LEAST(GREATEST(COALESCE(p_limit, 15), 1), 15);

  RETURN QUERY
  SELECT
    p.id,
    p.display_name,
    p.avatar_url,
    p.affiliation_role,
    p.aura_score,
    CASE
      WHEN f.id IS NULL THEN 'none'
      WHEN f.status = 'accepted' THEN 'friends'
      WHEN f.status = 'pending' AND f.requester_id = v_viewer_id THEN 'outgoing_pending'
      WHEN f.status = 'pending' AND f.addressee_id = v_viewer_id THEN 'incoming_pending'
      ELSE 'none'
    END AS friendship_state,
    f.id AS friendship_id
  FROM public.profiles p
  LEFT JOIN public.friendships f
    ON f.user_low_id = LEAST(v_viewer_id, p.id)
   AND f.user_high_id = GREATEST(v_viewer_id, p.id)
  WHERE p.id <> v_viewer_id
    AND lower(p.display_name) LIKE v_clean_query || '%'
    AND NOT private.is_blocked_pair(v_viewer_id, p.id)
  ORDER BY p.aura_score DESC, p.display_name ASC, p.id ASC
  LIMIT v_safe_limit;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.search_profiles_for_social(text, int) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.search_profiles_for_social(text, int) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.send_friend_request(p_target_user_id uuid)
RETURNS TABLE (
  friendship_id uuid,
  state text
)
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_viewer_id uuid;
  v_row public.friendships%ROWTYPE;
BEGIN
  v_viewer_id := (select auth.uid());
  IF v_viewer_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF p_target_user_id IS NULL OR p_target_user_id = v_viewer_id THEN
    RAISE EXCEPTION 'Cannot send a friend request to yourself';
  END IF;

  IF private.is_blocked_pair(v_viewer_id, p_target_user_id) THEN
    RAISE EXCEPTION 'Friend request cannot be sent to this user';
  END IF;

  SELECT *
  INTO v_row
  FROM public.friendships f
  WHERE f.user_low_id = LEAST(v_viewer_id, p_target_user_id)
    AND f.user_high_id = GREATEST(v_viewer_id, p_target_user_id);

  IF FOUND THEN
    IF v_row.status = 'accepted' THEN
      RETURN QUERY SELECT v_row.id, 'friends'::text;
      RETURN;
    ELSIF v_row.status = 'pending' THEN
      IF v_row.requester_id = v_viewer_id THEN
        RETURN QUERY SELECT v_row.id, 'outgoing_pending'::text;
        RETURN;
      ELSE
        RETURN QUERY SELECT v_row.id, 'incoming_pending'::text;
        RETURN;
      END IF;
    END IF;
  END IF;

  INSERT INTO public.friendships (requester_id, addressee_id, status)
  VALUES (v_viewer_id, p_target_user_id, 'pending')
  RETURNING * INTO v_row;

  RETURN QUERY SELECT v_row.id, 'outgoing_pending'::text;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.send_friend_request(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.send_friend_request(uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.respond_friend_request(
  p_friendship_id uuid,
  p_decision text
)
RETURNS TABLE (
  friendship_id uuid,
  state text
)
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_viewer_id uuid;
  v_row public.friendships%ROWTYPE;
BEGIN
  v_viewer_id := (select auth.uid());
  IF v_viewer_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT *
  INTO v_row
  FROM public.friendships f
  WHERE f.id = p_friendship_id
    AND f.status = 'pending';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pending friend request not found';
  END IF;

  IF p_decision = 'accept' THEN
    IF v_row.addressee_id <> v_viewer_id THEN
      RAISE EXCEPTION 'Only the recipient can accept a friend request';
    END IF;
    UPDATE public.friendships
    SET status = 'accepted',
        updated_at = now()
    WHERE id = v_row.id;
    RETURN QUERY SELECT v_row.id, 'friends'::text;
    RETURN;
  ELSIF p_decision = 'decline' THEN
    IF v_row.addressee_id <> v_viewer_id THEN
      RAISE EXCEPTION 'Only the recipient can decline a friend request';
    END IF;
    DELETE FROM public.friendships WHERE id = v_row.id;
    RETURN QUERY SELECT v_row.id, 'none'::text;
    RETURN;
  ELSIF p_decision = 'cancel' THEN
    IF v_row.requester_id <> v_viewer_id THEN
      RAISE EXCEPTION 'Only the sender can cancel an outgoing friend request';
    END IF;
    DELETE FROM public.friendships WHERE id = v_row.id;
    RETURN QUERY SELECT v_row.id, 'none'::text;
    RETURN;
  ELSE
    RAISE EXCEPTION 'Invalid friend request decision';
  END IF;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.respond_friend_request(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.respond_friend_request(uuid, text) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.remove_or_unblock_friendship(p_target_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_viewer_id uuid;
  v_deleted_count int := 0;
BEGIN
  v_viewer_id := (select auth.uid());
  IF v_viewer_id IS NULL OR p_target_user_id IS NULL THEN
    RETURN false;
  END IF;

  DELETE FROM public.friendships f
  WHERE f.user_low_id = LEAST(v_viewer_id, p_target_user_id)
    AND f.user_high_id = GREATEST(v_viewer_id, p_target_user_id)
    AND (
      f.status = 'accepted'
      OR (f.status = 'blocked' AND f.blocked_by_id = v_viewer_id)
    );

  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  RETURN v_deleted_count > 0;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.remove_or_unblock_friendship(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.remove_or_unblock_friendship(uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.block_user(p_target_user_id uuid)
RETURNS uuid
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_viewer_id uuid;
  v_fid uuid;
BEGIN
  v_viewer_id := (select auth.uid());
  IF v_viewer_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF p_target_user_id IS NULL OR p_target_user_id = v_viewer_id THEN
    RAISE EXCEPTION 'Cannot block yourself';
  END IF;

  INSERT INTO public.friendships (requester_id, addressee_id, status, blocked_by_id)
  VALUES (v_viewer_id, p_target_user_id, 'blocked', v_viewer_id)
  ON CONFLICT (user_low_id, user_high_id) DO UPDATE
    SET status = 'blocked',
        blocked_by_id = v_viewer_id,
        updated_at = now()
  RETURNING id INTO v_fid;

  UPDATE public.direct_messages
  SET read_at = now()
  WHERE recipient_id = v_viewer_id
    AND sender_id = p_target_user_id
    AND read_at IS NULL;

  RETURN v_fid;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.block_user(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.block_user(uuid) TO authenticated, service_role;

ALTER TABLE public.direct_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "direct_messages_select_participant" ON public.direct_messages;
CREATE POLICY "direct_messages_select_participant"
  ON public.direct_messages FOR SELECT
  TO authenticated
  USING (
    ((select auth.uid()) IN (sender_id, recipient_id))
    AND NOT (select private.is_blocked_pair(sender_id, recipient_id))
  );

DROP POLICY IF EXISTS "direct_messages_insert_mutual_friends" ON public.direct_messages;
CREATE POLICY "direct_messages_insert_mutual_friends"
  ON public.direct_messages FOR INSERT
  TO authenticated
  WITH CHECK (
    (select auth.uid()) = sender_id
    AND (select private.are_accepted_friends(sender_id, recipient_id))
    AND (
      NOT has_study_attachment
      OR (
        study_id IS NOT NULL
        AND EXISTS (
          SELECT 1 FROM public.studies s
          WHERE s.id = study_id
            AND s.publication_status = 'published'
        )
      )
    )
  );

GRANT SELECT, INSERT ON TABLE public.direct_messages TO authenticated;
GRANT ALL ON TABLE public.direct_messages TO service_role;

CREATE OR REPLACE FUNCTION public.mark_thread_messages_read(p_friend_id uuid)
RETURNS int
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_viewer_id uuid;
  v_updated_count int := 0;
BEGIN
  v_viewer_id := (select auth.uid());
  IF v_viewer_id IS NULL OR p_friend_id IS NULL THEN
    RETURN 0;
  END IF;

  UPDATE public.direct_messages
  SET read_at = now()
  WHERE recipient_id = v_viewer_id
    AND sender_id = p_friend_id
    AND read_at IS NULL;

  GET DIAGNOSTICS v_updated_count = ROW_COUNT;
  RETURN v_updated_count;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.mark_thread_messages_read(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mark_thread_messages_read(uuid) TO authenticated, service_role;

-- Backfill deterministic Aura scores for existing profiles
DO $$
DECLARE
  v_profile record;
BEGIN
  FOR v_profile IN SELECT id FROM public.profiles LOOP
    PERFORM private.recompute_user_aura(v_profile.id);
  END LOOP;
END $$;
