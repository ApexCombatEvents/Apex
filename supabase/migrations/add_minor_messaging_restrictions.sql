-- Migration: add_minor_messaging_restrictions
--
-- Phase 3a of under-18 support: private messaging is switched off entirely
-- for accounts belonging to under-18s, in both directions.
--
-- These are RESTRICTIVE policies, which are ANDed with whatever permissive
-- policies already exist rather than ORed alongside them. That means they can
-- only ever subtract permission, so existing messaging behaviour for adults is
-- untouched and no current policy has to be located or rewritten.
--
-- Scope note: app/api/messages/send inserts chat_messages with the service
-- role, which bypasses RLS altogether. For that path the server-side
-- canMessage() check is the real enforcement and this policy is defence in
-- depth against direct client writes.
--
-- This migration deliberately does NOT enable row level security on either
-- table. Turning RLS on where it is currently off would deny all access by
-- default and break messaging for everyone. The verification query at the
-- bottom reports whether these policies are actually in force.
--
-- Depends on add_profile_date_of_birth.sql for is_minor().
-- Safe to run more than once. Run this in the Supabase SQL Editor.

-- ---------------------------------------------------------------------------
-- 0. Dependency check
-- ---------------------------------------------------------------------------

DO $$
BEGIN
  IF to_regprocedure('public.is_minor(uuid)') IS NULL THEN
    RAISE EXCEPTION
      'public.is_minor(uuid) is missing. Run add_profile_date_of_birth.sql first.';
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 1. No thread may be opened with an under-18 on either side
-- ---------------------------------------------------------------------------

DO $$
BEGIN
  IF to_regclass('public.message_threads') IS NOT NULL THEN
    DROP POLICY IF EXISTS "Block threads involving minors" ON public.message_threads;

    CREATE POLICY "Block threads involving minors"
      ON public.message_threads
      AS RESTRICTIVE
      FOR INSERT
      WITH CHECK (
        NOT public.is_minor(profile_a)
        AND NOT public.is_minor(profile_b)
      );
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 2. No message may be sent into a thread that has an under-18 participant
-- ---------------------------------------------------------------------------

-- Covers threads that already existed before this rule came in, so a minor
-- cannot keep using a conversation opened earlier.
DO $$
BEGIN
  IF to_regclass('public.chat_messages') IS NOT NULL
     AND to_regclass('public.message_threads') IS NOT NULL THEN
    DROP POLICY IF EXISTS "Block messages involving minors" ON public.chat_messages;

    CREATE POLICY "Block messages involving minors"
      ON public.chat_messages
      AS RESTRICTIVE
      FOR INSERT
      WITH CHECK (
        NOT EXISTS (
          SELECT 1
          FROM public.message_threads t
          WHERE t.id = chat_messages.thread_id
            AND (public.is_minor(t.profile_a) OR public.is_minor(t.profile_b))
        )
      );
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 3. Verification
-- ---------------------------------------------------------------------------

-- rls_enabled must be true for the policy on that table to have any effect.
-- If it reports false, the server-side check in canMessage() is the only thing
-- enforcing this rule on that table.
SELECT
  c.relname        AS table_name,
  c.relrowsecurity AS rls_enabled,
  p.policyname,
  p.permissive
FROM pg_class c
LEFT JOIN pg_policies p
  ON p.tablename = c.relname
 AND p.schemaname = 'public'
 AND p.policyname IN ('Block threads involving minors', 'Block messages involving minors')
WHERE c.relname IN ('message_threads', 'chat_messages')
ORDER BY c.relname;
