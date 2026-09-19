-- Migration: add_guardian_consent_withdrawal
--
-- The waiver tells guardians they can withdraw permission at any time, and
-- until now that meant emailing support and an admin editing a row by hand.
-- This gives them a link of their own, sent in the confirmation email.
--
-- The withdrawal link is a second capability URL, separate from the consent
-- token, because the consent token is spent the moment it is used. It is
-- stored as a hash for the same reason: reading the database must not let
-- anyone revoke a child's account.
--
-- Unlike the consent link this one does not expire. A guardian's right to
-- withdraw does not lapse after seven days.
--
-- No status values are added. 'withdrawn' is already permitted, and
-- has_guardian_consent() only counts 'confirmed', so a withdrawal
-- automatically re-restricts the account and re-hides the profile with no
-- further changes.
--
-- Safe to run more than once. Run this in the Supabase SQL Editor.

-- ---------------------------------------------------------------------------
-- 0. Dependency check
-- ---------------------------------------------------------------------------

DO $$
BEGIN
  IF to_regclass('public.guardian_consent_requests') IS NULL THEN
    RAISE EXCEPTION
      'public.guardian_consent_requests is missing. Run add_guardian_consent.sql first.';
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 1. Columns
-- ---------------------------------------------------------------------------

ALTER TABLE public.guardian_consent_requests
  ADD COLUMN IF NOT EXISTS withdrawal_token_hash TEXT,
  ADD COLUMN IF NOT EXISTS withdrawn_at          TIMESTAMPTZ;

COMMENT ON COLUMN public.guardian_consent_requests.withdrawal_token_hash IS
  'SHA-256 of the guardian''s standing withdrawal link. Issued on consent, does not expire.';

COMMENT ON COLUMN public.guardian_consent_requests.withdrawn_at IS
  'When the guardian withdrew permission, if they have.';

-- Lookup is by hash on every withdrawal attempt.
CREATE UNIQUE INDEX IF NOT EXISTS guardian_consent_withdrawal_token_idx
  ON public.guardian_consent_requests (withdrawal_token_hash)
  WHERE withdrawal_token_hash IS NOT NULL;

-- ---------------------------------------------------------------------------
-- 2. Verification
-- ---------------------------------------------------------------------------

SELECT
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'guardian_consent_requests'
  AND column_name IN ('withdrawal_token_hash', 'withdrawn_at')
ORDER BY column_name;
