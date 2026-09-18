-- Migration: add_minor_profile_visibility
--
-- Phase 4 of under-18 support: a young person's profile stays hidden until
-- their parent or guardian has actually given permission. Until now the
-- account was fully public the moment it was created, which is the one part
-- of the consent promise that was not being kept.
--
-- Hidden means hidden from everyone: signed out visitors and signed in users
-- alike. The only exceptions are the account holder, who must still be able
-- to use their own profile while waiting, and admins, who need to moderate.
--
-- Approved minors are treated differently again. Once a guardian consents the
-- account becomes usable, but it is not made public: it is visible to signed
-- in users only. That keeps young people out of reach of signed out scrapers
-- and search engine indexing, while still letting the gyms, coaches and
-- promoters who have actually registered find them.
--
-- So there are three tiers:
--   adult                     visible to everyone
--   minor, consent given      visible to signed in users only
--   minor, awaiting consent   visible to the account holder and admins only
--
-- Blast radius: RESTRICTIVE policies are ANDed with existing permissive ones,
-- so this can only ever subtract rows, never grant access. It subtracts only
-- where account_is_restricted() is true, which is false for every account
-- with no date of birth on file — that is, every existing user. Queries for
-- everyone else return exactly what they returned before.
--
-- Not covered: any code path using the service role bypasses RLS entirely,
-- which is intended. Signup, the guardian consent page and the Stripe webhook
-- all need to read these rows while the account is still restricted.
--
-- This migration deliberately does NOT enable row level security on profiles.
-- Turning RLS on where it is currently off would deny all access by default
-- and take the whole site down. The verification query at the bottom reports
-- whether the policy is actually in force.
--
-- Depends on add_guardian_consent.sql for account_is_restricted(), which in
-- turn needs is_minor(), and on fix_admin_role_casing_in_policies.sql for
-- is_admin(). Safe to run more than once. Run this in the Supabase SQL Editor.

-- ---------------------------------------------------------------------------
-- 0. Dependency checks
-- ---------------------------------------------------------------------------

DO $$
BEGIN
  IF to_regprocedure('public.account_is_restricted(uuid)') IS NULL THEN
    RAISE EXCEPTION
      'public.account_is_restricted(uuid) is missing. Run add_guardian_consent.sql first.';
  END IF;

  IF to_regprocedure('public.is_admin()') IS NULL THEN
    RAISE EXCEPTION
      'public.is_admin() is missing. Run fix_admin_role_casing_in_policies.sql first.';
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 1. Supporting index
-- ---------------------------------------------------------------------------

-- account_is_restricted() is evaluated per row on every profiles query, and
-- it looks for a confirmed row per user. Without this the lookup is a
-- sequential scan on each call.
CREATE INDEX IF NOT EXISTS guardian_consent_requests_user_status_idx
  ON public.guardian_consent_requests (user_id, status);

-- ---------------------------------------------------------------------------
-- 2. Limit who can see a young person's profile
-- ---------------------------------------------------------------------------

DO $$
BEGIN
  IF to_regclass('public.profiles') IS NOT NULL THEN
    DROP POLICY IF EXISTS "Limit visibility of under 18 profiles" ON public.profiles;

    CREATE POLICY "Limit visibility of under 18 profiles"
      ON public.profiles
      AS RESTRICTIVE
      FOR SELECT
      USING (
        CASE
          -- Awaiting permission: the account holder, and admins who need to
          -- moderate accounts nobody else can see. Nobody else at all.
          WHEN public.account_is_restricted(id)
            THEN COALESCE(id = auth.uid(), FALSE) OR public.is_admin()

          -- Permission given: signed in users only, which covers the account
          -- holder and admins too. Keeps young people out of search engine
          -- indexing and away from signed out scraping.
          WHEN public.is_minor(id)
            THEN auth.uid() IS NOT NULL

          -- Everyone else, including every account with no date of birth on
          -- file, is unaffected.
          ELSE TRUE
        END
      );
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 3. Verification
-- ---------------------------------------------------------------------------

-- rls_enabled must be true for this policy to have any effect. If it reports
-- false, restricted profiles are still publicly visible and nothing has
-- changed.
SELECT
  c.relname        AS table_name,
  c.relrowsecurity AS rls_enabled,
  p.policyname,
  p.permissive,
  p.cmd
FROM pg_class c
LEFT JOIN pg_policies p
  ON p.tablename = c.relname
 AND p.schemaname = 'public'
 AND p.policyname = 'Limit visibility of under 18 profiles'
WHERE c.relname = 'profiles';

-- Every account this policy affects, and how. Anyone appearing here who is
-- not genuinely a young person means a date of birth was recorded against an
-- account that should not have one.
SELECT
  p.id,
  p.username,
  p.full_name,
  CASE
    WHEN public.account_is_restricted(p.id) THEN 'hidden until guardian consents'
    ELSE 'signed in users only'
  END AS visibility
FROM public.profiles p
WHERE public.is_minor(p.id)
ORDER BY visibility, p.username;
