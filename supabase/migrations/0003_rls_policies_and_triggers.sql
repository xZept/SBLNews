-- 0003_rls_policies_and_triggers.sql
-- Enable Row-Level Security on all 7 tables, add OAuth profile-sync trigger,
-- role-protection trigger, and atomic upvote_count / comment_count triggers.

-- Enable RLS on all 7 tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.studies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.secondary_commentaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guidelines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consensus_drift_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

-- Helper to check admin role without RLS recursion
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
      AND role = 'admin'
  );
$$;

-- 1. profiles policies
CREATE POLICY "profiles_select_public"
  ON public.profiles FOR SELECT
  USING (true);

CREATE POLICY "profiles_update_own"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Prevent non-admin / non-service_role users from elevating their own role
CREATE OR REPLACE FUNCTION public.protect_profile_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    IF current_setting('role', true) <> 'service_role' AND NOT public.is_admin() THEN
      RAISE EXCEPTION 'Only administrators may modify profile roles';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_profile_role ON public.profiles;
CREATE TRIGGER trg_protect_profile_role
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_profile_role();

-- 2. studies policies
CREATE POLICY "studies_select_published_or_admin"
  ON public.studies FOR SELECT
  USING (publication_status = 'published' OR public.is_admin());

CREATE POLICY "studies_insert_admin"
  ON public.studies FOR INSERT
  WITH CHECK (public.is_admin());

CREATE POLICY "studies_update_admin"
  ON public.studies FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "studies_delete_admin"
  ON public.studies FOR DELETE
  USING (public.is_admin());

-- 3. secondary_commentaries policies
CREATE POLICY "secondary_commentaries_select_public"
  ON public.secondary_commentaries FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.studies s
      WHERE s.id = study_id
        AND (s.publication_status = 'published' OR public.is_admin())
    )
  );

CREATE POLICY "secondary_commentaries_insert_admin"
  ON public.secondary_commentaries FOR INSERT
  WITH CHECK (public.is_admin());

CREATE POLICY "secondary_commentaries_update_admin"
  ON public.secondary_commentaries FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "secondary_commentaries_delete_admin"
  ON public.secondary_commentaries FOR DELETE
  USING (public.is_admin());

-- 4. guidelines policies (read-only for public; strictly admin-only writes)
CREATE POLICY "guidelines_select_public"
  ON public.guidelines FOR SELECT
  USING (true);

CREATE POLICY "guidelines_insert_admin"
  ON public.guidelines FOR INSERT
  WITH CHECK (public.is_admin());

CREATE POLICY "guidelines_update_admin"
  ON public.guidelines FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "guidelines_delete_admin"
  ON public.guidelines FOR DELETE
  USING (public.is_admin());

-- 5. consensus_drift_alerts policies (admin-only read/write; pipeline uses service_role)
CREATE POLICY "drift_alerts_select_admin"
  ON public.consensus_drift_alerts FOR SELECT
  USING (public.is_admin());

CREATE POLICY "drift_alerts_insert_admin"
  ON public.consensus_drift_alerts FOR INSERT
  WITH CHECK (public.is_admin());

CREATE POLICY "drift_alerts_update_admin"
  ON public.consensus_drift_alerts FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "drift_alerts_delete_admin"
  ON public.consensus_drift_alerts FOR DELETE
  USING (public.is_admin());

-- 6. votes policies
CREATE POLICY "votes_select_public"
  ON public.votes FOR SELECT
  USING (true);

CREATE POLICY "votes_insert_own"
  ON public.votes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "votes_delete_own"
  ON public.votes FOR DELETE
  USING (auth.uid() = user_id);

-- 7. comments policies
CREATE POLICY "comments_select_public"
  ON public.comments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.studies s
      WHERE s.id = study_id
        AND (s.publication_status = 'published' OR public.is_admin())
    )
  );

CREATE POLICY "comments_insert_own"
  ON public.comments FOR INSERT
  WITH CHECK (auth.uid() = author_id);

CREATE POLICY "comments_update_own_or_admin"
  ON public.comments FOR UPDATE
  USING (auth.uid() = author_id OR public.is_admin())
  WITH CHECK (auth.uid() = author_id OR public.is_admin());

CREATE POLICY "comments_delete_own_or_admin"
  ON public.comments FOR DELETE
  USING (auth.uid() = author_id OR public.is_admin());

-- OAuth profile-sync trigger on auth.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_display_name text;
  v_avatar_url text;
BEGIN
  v_display_name := coalesce(
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'name',
    NEW.raw_user_meta_data->>'user_name',
    split_part(coalesce(NEW.email, 'lifter'), '@', 1),
    'Lifter'
  );
  v_avatar_url := NEW.raw_user_meta_data->>'avatar_url';

  INSERT INTO public.profiles (id, display_name, avatar_url, role)
  VALUES (NEW.id, v_display_name, v_avatar_url, 'member')
  ON CONFLICT (id) DO UPDATE
    SET display_name = EXCLUDED.display_name,
        avatar_url = coalesce(EXCLUDED.avatar_url, public.profiles.avatar_url);

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Atomic upvote_count trigger
CREATE OR REPLACE FUNCTION public.sync_study_upvote_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.studies
      SET upvote_count = upvote_count + 1
      WHERE id = NEW.study_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.studies
      SET upvote_count = GREATEST(0, upvote_count - 1)
      WHERE id = OLD.study_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_study_upvote_count ON public.votes;
CREATE TRIGGER trg_sync_study_upvote_count
  AFTER INSERT OR DELETE ON public.votes
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_study_upvote_count();

-- Atomic comment_count trigger
CREATE OR REPLACE FUNCTION public.sync_study_comment_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.studies
      SET comment_count = comment_count + 1
      WHERE id = NEW.study_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.studies
      SET comment_count = GREATEST(0, comment_count - 1)
      WHERE id = OLD.study_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_study_comment_count ON public.comments;
CREATE TRIGGER trg_sync_study_comment_count
  AFTER INSERT OR DELETE ON public.comments
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_study_comment_count();
