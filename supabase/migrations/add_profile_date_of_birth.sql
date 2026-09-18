-- Migration: add_profile_date_of_birth
--
-- Phase 1 of under-18 support: know how old an account holder is.
--
-- Date of birth is deliberately NOT a column on `profiles`. Public profile
-- pages read that table with `select("*")` against an arbitrary handle (see
-- app/profile/[handle]/coaches/page.tsx), and Postgres RLS is row-level, not
-- column-level — a DOB column would be served to any visitor. Revoking the
-- column instead would break every `select("*")` in the app. A separate table
-- with its own policies keeps DOB out of the public payload permanently, and
-- it cannot leak later when someone adds a new `select("*")`.
--
-- Age is always derived from the stored date, never stored as a number. A
-- stored age or `is_minor` flag goes stale silently and restrictions would
-- never lift when someone turns 18.
--
-- Safe to run more than once. Run this in the Supabase SQL Editor.

-- ---------------------------------------------------------------------------
-- 0. Dependency check
-- ---------------------------------------------------------------------------

DO $$
BEGIN
  IF to_regprocedure('public.is_admin()') IS NULL THEN
    RAISE EXCEPTION
      'public.is_admin() is missing. Run fix_admin_role_casing_in_policies.sql first.';
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 1. Private profile data
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.profile_private (
  user_id       UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  date_of_birth DATE        NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Sanity bound only. The real minimum-age rule depends on the current date,
  -- which cannot appear in a CHECK constraint, so it is enforced in the signup
  -- route via validateDateOfBirth().
  CONSTRAINT profile_private_dob_plausible CHECK (date_of_birth > DATE '1900-01-01')
);

COMMENT ON TABLE public.profile_private IS
  'Private per-user data that must never appear in a public profile payload.';
COMMENT ON COLUMN public.profile_private.date_of_birth IS
  'Used to derive age. Never exposed publicly; at most an age bracket is shown.';

ALTER TABLE public.profile_private ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own private data" ON public.profile_private;
CREATE POLICY "Users can view own private data"
  ON public.profile_private
  FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own private data" ON public.profile_private;
CREATE POLICY "Users can insert own private data"
  ON public.profile_private
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own private data" ON public.profile_private;
CREATE POLICY "Users can update own private data"
  ON public.profile_private
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Admins need read access to handle reports and verify consent records.
-- No admin write policy: nobody should be editing a date of birth by hand.
DROP POLICY IF EXISTS "Admins can view all private data" ON public.profile_private;
CREATE POLICY "Admins can view all private data"
  ON public.profile_private
  FOR SELECT
  USING (public.is_admin());

-- ---------------------------------------------------------------------------
-- 2. updated_at maintenance
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.set_profile_private_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profile_private_set_updated_at ON public.profile_private;
CREATE TRIGGER profile_private_set_updated_at
  BEFORE UPDATE ON public.profile_private
  FOR EACH ROW
  EXECUTE FUNCTION public.set_profile_private_updated_at();

-- ---------------------------------------------------------------------------
-- 3. Age helpers
-- ---------------------------------------------------------------------------

-- STABLE rather than IMMUTABLE: the result depends on current_date.
CREATE OR REPLACE FUNCTION public.age_years(dob DATE)
RETURNS INTEGER
LANGUAGE sql
STABLE
AS $$
  SELECT date_part('year', age(current_date, dob))::int;
$$;

COMMENT ON FUNCTION public.age_years(DATE) IS
  'Whole years between dob and today. NULL when dob is NULL.';

-- SECURITY DEFINER so callers can ask whether a user is a minor without being
-- able to read the underlying date of birth themselves.
CREATE OR REPLACE FUNCTION public.has_date_of_birth(profile_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profile_private WHERE user_id = profile_id
  );
$$;

COMMENT ON FUNCTION public.has_date_of_birth(UUID) IS
  'True when a date of birth is on file. Use to distinguish unknown from adult.';

-- An unknown date of birth resolves to false, i.e. treated as an adult, so
-- existing accounts are unaffected until the backfill lands. Call
-- has_date_of_birth() alongside this when unknown needs handling separately.
CREATE OR REPLACE FUNCTION public.is_minor(profile_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT COALESCE(
    (
      SELECT public.age_years(pp.date_of_birth) < 18
      FROM public.profile_private pp
      WHERE pp.user_id = profile_id
    ),
    false
  );
$$;

COMMENT ON FUNCTION public.is_minor(UUID) IS
  'True when the user is under 18. Unknown date of birth resolves to false.';

GRANT EXECUTE ON FUNCTION public.age_years(DATE)          TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.has_date_of_birth(UUID)  TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_minor(UUID)           TO anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 4. Verification
-- ---------------------------------------------------------------------------

-- Expect four rows: the three self-service policies plus the admin read.
SELECT policyname, cmd
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'profile_private'
ORDER BY policyname;
