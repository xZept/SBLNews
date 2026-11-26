-- 0008_user_profiles_and_storage.sql
-- Extend public.profiles with community role tag, bio, theme preference, and updated_at;
-- enforce column-level privacy grants and get_my_account_profile() RPC;
-- harden public.votes RLS; add keyset-pagination indexes for profile activity;
-- and provision the public `avatars` Storage bucket with owner-scoped RLS.

-- 1. Domain enums
DO $$
BEGIN
  CREATE TYPE public.community_role_type AS ENUM (
    'Lifter',
    'Strength Coach',
    'Exercise Researcher',
    'Clinician',
    'Student'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE public.theme_preference_type AS ENUM ('light', 'dark');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- 2. Extend public.profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS affiliation_role public.community_role_type NULL DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS bio text NULL DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS theme_preference public.theme_preference_type NOT NULL DEFAULT 'light',
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- Normalize existing display_name values before applying length check
UPDATE public.profiles
SET display_name = CASE
  WHEN char_length(btrim(display_name)) < 2 THEN 'Lifter'
  WHEN char_length(btrim(display_name)) > 50 THEN left(btrim(display_name), 50)
  ELSE btrim(display_name)
END
WHERE display_name IS DISTINCT FROM CASE
  WHEN char_length(btrim(display_name)) < 2 THEN 'Lifter'
  WHEN char_length(btrim(display_name)) > 50 THEN left(btrim(display_name), 50)
  ELSE btrim(display_name)
END;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'profiles_display_name_length_check'
      AND conrelid = 'public.profiles'::regclass
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_display_name_length_check
      CHECK (char_length(btrim(display_name)) BETWEEN 2 AND 50);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'profiles_bio_length_check'
      AND conrelid = 'public.profiles'::regclass
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_bio_length_check
      CHECK (bio IS NULL OR char_length(bio) <= 160);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'profiles_avatar_url_length_check'
      AND conrelid = 'public.profiles'::regclass
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_avatar_url_length_check
      CHECK (avatar_url IS NULL OR char_length(avatar_url) <= 500);
  END IF;
END $$;

-- 3. Timestamp trigger on public.profiles
CREATE OR REPLACE FUNCTION public.set_profiles_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_profiles_set_updated_at ON public.profiles;
CREATE TRIGGER trg_profiles_set_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.set_profiles_updated_at();

-- 4. Update handle_new_user() to default avatar_url = NULL and preserve existing profiles
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_raw_name text;
  v_display_name text;
BEGIN
  v_raw_name := coalesce(
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'name',
    NEW.raw_user_meta_data->>'user_name',
    split_part(coalesce(NEW.email, 'lifter'), '@', 1),
    'Lifter'
  );
  v_display_name := left(btrim(v_raw_name), 50);
  IF char_length(v_display_name) < 2 THEN
    v_display_name := 'Lifter';
  END IF;

  INSERT INTO public.profiles (id, display_name, avatar_url, role, theme_preference)
  VALUES (NEW.id, v_display_name, NULL, 'member', 'light')
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;

-- 5. Column-level privacy grants & RLS on public.profiles
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = id)
  WITH CHECK ((select auth.uid()) = id);

REVOKE SELECT, UPDATE ON TABLE public.profiles FROM anon, authenticated;
GRANT SELECT (id, display_name, avatar_url, affiliation_role, bio) ON TABLE public.profiles TO anon, authenticated;
GRANT UPDATE (display_name, avatar_url, affiliation_role, bio, theme_preference, updated_at) ON TABLE public.profiles TO authenticated;

-- Authenticated self-profile RPC returning private settings & role
CREATE OR REPLACE FUNCTION public.get_my_account_profile()
RETURNS TABLE (
  id uuid,
  display_name text,
  avatar_url text,
  affiliation_role public.community_role_type,
  bio text,
  theme_preference public.theme_preference_type,
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
    p.theme_preference,
    p.role,
    p.created_at,
    p.updated_at
  FROM public.profiles p
  WHERE p.id = (select auth.uid());
$$;

REVOKE EXECUTE ON FUNCTION public.get_my_account_profile() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_account_profile() TO authenticated, service_role;

-- 6. Harden public.votes RLS & add activity pagination indexes
DROP POLICY IF EXISTS "votes_select_public" ON public.votes;
DROP POLICY IF EXISTS "votes_select_own" ON public.votes;
CREATE POLICY "votes_select_own"
  ON public.votes FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

REVOKE SELECT ON TABLE public.votes FROM anon;

CREATE INDEX IF NOT EXISTS idx_votes_user_history
  ON public.votes (user_id, created_at DESC, study_id DESC);

CREATE INDEX IF NOT EXISTS idx_comments_author_history
  ON public.comments (author_id, created_at DESC, id DESC)
  WHERE is_deleted = false;

-- 7. Provision public `avatars` Storage bucket & owner-scoped RLS
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  true,
  512000,
  ARRAY['image/webp', 'image/jpeg', 'image/png']
)
ON CONFLICT (id) DO UPDATE
  SET public = EXCLUDED.public,
      file_size_limit = EXCLUDED.file_size_limit,
      allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "avatars_select_public" ON storage.objects;
CREATE POLICY "avatars_select_public"
  ON storage.objects FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "avatars_insert_own" ON storage.objects;
CREATE POLICY "avatars_insert_own"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = (select auth.uid())::text
  );

DROP POLICY IF EXISTS "avatars_update_own" ON storage.objects;
CREATE POLICY "avatars_update_own"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = (select auth.uid())::text
  )
  WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = (select auth.uid())::text
  );

DROP POLICY IF EXISTS "avatars_delete_own" ON storage.objects;
CREATE POLICY "avatars_delete_own"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = (select auth.uid())::text
  );
