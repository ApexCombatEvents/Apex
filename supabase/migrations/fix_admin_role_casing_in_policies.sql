-- Migration: fix_admin_role_casing_in_policies
--
-- Ten RLS policies compare `role = 'admin'` in lowercase. The application
-- stores and compares the uppercase form: types/supabase.ts declares the role
-- union as 'FIGHTER' | 'COACH' | 'GYM' | 'PROMOTION' | 'ADMIN', and the admin
-- pages check `profile.role === "ADMIN"`. The lowercase policies therefore
-- never match and every admin action they were meant to permit fails silently.
--
-- Affected policies:
--   waiver_acceptances    Admins can view all waiver acceptances
--   content_reports       Users can view their own reports
--   content_reports       Admins can update reports
--   posts                 Admins can delete any post
--   comments              Admins can delete comments
--   profile_post_comments Admins can delete profile post comments
--   event_comments        Admins can delete event comments
--   events                Admins can update any event
--   events                Admins can delete events
--   bout_scores           Admins can score any bout
--
-- The fix routes every check through one `public.is_admin()` helper that
-- compares case-insensitively, so it holds whichever casing a given row
-- actually carries and no profiles data has to be rewritten.
--
-- Safe to run more than once. Run this in the Supabase SQL Editor.

-- ---------------------------------------------------------------------------
-- 1. Shared admin predicate
-- ---------------------------------------------------------------------------

-- SECURITY DEFINER so the lookup does not depend on the caller's own read
-- access to profiles, which also keeps a future admin policy on profiles from
-- recursing back into this function.
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
      AND upper(role) = 'ADMIN'
  );
$$;

COMMENT ON FUNCTION public.is_admin() IS
  'True when the current user is an admin. Case-insensitive on profiles.role.';

-- Policies are evaluated as the querying role, so anon needs EXECUTE too or
-- signed-out reads against these tables will error instead of returning false.
GRANT EXECUTE ON FUNCTION public.is_admin() TO anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 2. waiver_acceptances
-- ---------------------------------------------------------------------------

DO $$
BEGIN
  IF to_regclass('public.waiver_acceptances') IS NOT NULL THEN
    DROP POLICY IF EXISTS "Admins can view all waiver acceptances"
      ON public.waiver_acceptances;

    CREATE POLICY "Admins can view all waiver acceptances"
      ON public.waiver_acceptances
      FOR SELECT
      USING (public.is_admin());
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 3. content_reports
-- ---------------------------------------------------------------------------

DO $$
BEGIN
  IF to_regclass('public.content_reports') IS NOT NULL THEN
    DROP POLICY IF EXISTS "Users can view their own reports"
      ON public.content_reports;

    CREATE POLICY "Users can view their own reports"
      ON public.content_reports
      FOR SELECT
      USING (auth.uid() = reporter_id OR public.is_admin());

    DROP POLICY IF EXISTS "Admins can update reports"
      ON public.content_reports;

    CREATE POLICY "Admins can update reports"
      ON public.content_reports
      FOR UPDATE
      USING (public.is_admin());
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 4. posts
-- ---------------------------------------------------------------------------

DO $$
BEGIN
  IF to_regclass('public.posts') IS NOT NULL THEN
    DROP POLICY IF EXISTS "Admins can delete any post" ON public.posts;

    CREATE POLICY "Admins can delete any post"
      ON public.posts
      FOR DELETE
      USING (public.is_admin());
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 5. Comment tables
-- ---------------------------------------------------------------------------

DO $$
BEGIN
  IF to_regclass('public.comments') IS NOT NULL THEN
    DROP POLICY IF EXISTS "Admins can delete comments" ON public.comments;

    CREATE POLICY "Admins can delete comments"
      ON public.comments
      FOR DELETE
      USING (public.is_admin());
  END IF;

  IF to_regclass('public.profile_post_comments') IS NOT NULL THEN
    DROP POLICY IF EXISTS "Admins can delete profile post comments"
      ON public.profile_post_comments;

    CREATE POLICY "Admins can delete profile post comments"
      ON public.profile_post_comments
      FOR DELETE
      USING (public.is_admin());
  END IF;

  IF to_regclass('public.event_comments') IS NOT NULL THEN
    DROP POLICY IF EXISTS "Admins can delete event comments"
      ON public.event_comments;

    CREATE POLICY "Admins can delete event comments"
      ON public.event_comments
      FOR DELETE
      USING (public.is_admin());
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 6. events
-- ---------------------------------------------------------------------------

DO $$
BEGIN
  IF to_regclass('public.events') IS NOT NULL THEN
    DROP POLICY IF EXISTS "Admins can update any event" ON public.events;

    CREATE POLICY "Admins can update any event"
      ON public.events
      FOR UPDATE
      USING (public.is_admin());

    DROP POLICY IF EXISTS "Admins can delete events" ON public.events;

    CREATE POLICY "Admins can delete events"
      ON public.events
      FOR DELETE
      USING (public.is_admin());
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 7. bout_scores
-- ---------------------------------------------------------------------------

-- FOR ALL with USING only, matching the original. Postgres reuses the USING
-- expression as the INSERT check when WITH CHECK is omitted.
DO $$
BEGIN
  IF to_regclass('public.bout_scores') IS NOT NULL THEN
    DROP POLICY IF EXISTS "Admins can score any bout" ON public.bout_scores;

    CREATE POLICY "Admins can score any bout"
      ON public.bout_scores
      FOR ALL
      USING (public.is_admin());
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 8. Verification
-- ---------------------------------------------------------------------------

-- Expect zero rows. Any row returned is a policy still comparing lowercase.
SELECT schemaname, tablename, policyname
FROM pg_policies
WHERE schemaname = 'public'
  AND (qual LIKE '%''admin''%' OR with_check LIKE '%''admin''%')
ORDER BY tablename, policyname;
