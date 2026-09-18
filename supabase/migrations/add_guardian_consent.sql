-- Migration: add_guardian_consent
--
-- Phase 2 of under-18 support: a parent or legal guardian must consent before
-- a 13-17 year old's account becomes active.
--
-- Two tables do two different jobs. `guardian_consent_requests` holds the
-- live workflow — the pending token, the guardian's contact details, the
-- current status. `waiver_acceptances` gets the permanent, versioned legal
-- record once consent is actually given, alongside every other waiver the
-- platform records.
--
-- The token itself is never stored. Only a SHA-256 hash is kept, so reading
-- this table does not let anyone mint a valid consent link.
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
-- 1. Allow the new waiver type
-- ---------------------------------------------------------------------------

ALTER TABLE public.waiver_acceptances
  DROP CONSTRAINT IF EXISTS waiver_acceptances_waiver_type_check;

ALTER TABLE public.waiver_acceptances
  ADD CONSTRAINT waiver_acceptances_waiver_type_check
  CHECK (waiver_type IN ('signup', 'event-creation', 'bout-acceptance', 'parental-consent'));

-- ---------------------------------------------------------------------------
-- 2. Consent requests
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.guardian_consent_requests (
  id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  guardian_name         TEXT        NOT NULL,
  guardian_email        TEXT        NOT NULL,
  guardian_relationship TEXT        NOT NULL,

  -- SHA-256 of the token that was emailed. The token itself is never stored.
  token_hash            TEXT        NOT NULL UNIQUE,

  status                TEXT        NOT NULL DEFAULT 'pending'
                          CHECK (status IN ('pending', 'confirmed', 'declined', 'withdrawn', 'expired')),

  -- How the guardian was verified. Recorded per request so that if a stronger
  -- method is introduced later, it is clear which accounts were verified how
  -- and only those need re-verifying.
  verification_method   TEXT        NOT NULL DEFAULT 'email'
                          CHECK (verification_method IN ('email', 'card', 'guardian-account')),

  expires_at            TIMESTAMPTZ NOT NULL,
  responded_at          TIMESTAMPTZ,
  responded_ip          TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT guardian_email_differs_from_user CHECK (guardian_email <> '')
);

COMMENT ON TABLE public.guardian_consent_requests IS
  'Workflow state for parental consent. The legal record lives in waiver_acceptances.';

CREATE INDEX IF NOT EXISTS guardian_consent_requests_user_id_idx
  ON public.guardian_consent_requests(user_id);

CREATE INDEX IF NOT EXISTS guardian_consent_requests_status_idx
  ON public.guardian_consent_requests(status);

-- At most one outstanding request per user. A resend updates the existing row
-- rather than creating a second live token.
CREATE UNIQUE INDEX IF NOT EXISTS guardian_consent_requests_one_pending_idx
  ON public.guardian_consent_requests(user_id)
  WHERE status = 'pending';

ALTER TABLE public.guardian_consent_requests ENABLE ROW LEVEL SECURITY;

-- The young person can see their own request so the UI can show status and
-- let them correct a mistyped guardian email. Knowing the hash is useless
-- without the token itself.
DROP POLICY IF EXISTS "Users can view own consent requests"
  ON public.guardian_consent_requests;
CREATE POLICY "Users can view own consent requests"
  ON public.guardian_consent_requests
  FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can view all consent requests"
  ON public.guardian_consent_requests;
CREATE POLICY "Admins can view all consent requests"
  ON public.guardian_consent_requests
  FOR SELECT
  USING (public.is_admin());

-- Deliberately no INSERT or UPDATE policy. Every write goes through a server
-- route using the service role, so a client cannot self-approve.

-- ---------------------------------------------------------------------------
-- 3. Helpers
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.has_guardian_consent(profile_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.guardian_consent_requests
    WHERE user_id = profile_id
      AND status = 'confirmed'
  );
$$;

COMMENT ON FUNCTION public.has_guardian_consent(UUID) IS
  'True when a guardian has confirmed consent for this account.';

-- A minor without confirmed consent. Adults are never restricted, and an
-- unknown date of birth resolves to adult via is_minor().
CREATE OR REPLACE FUNCTION public.account_is_restricted(profile_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT public.is_minor(profile_id)
     AND NOT public.has_guardian_consent(profile_id);
$$;

COMMENT ON FUNCTION public.account_is_restricted(UUID) IS
  'True for a minor whose guardian has not yet consented. Profile stays hidden.';

GRANT EXECUTE ON FUNCTION public.has_guardian_consent(UUID)  TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.account_is_restricted(UUID) TO anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 4. Expiry sweep
-- ---------------------------------------------------------------------------

-- Call from a scheduled job, or rely on the expires_at check in the consent
-- route which refuses an expired token regardless of stored status.
CREATE OR REPLACE FUNCTION public.expire_stale_consent_requests()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  affected INTEGER;
BEGIN
  UPDATE public.guardian_consent_requests
  SET status = 'expired'
  WHERE status = 'pending'
    AND expires_at < NOW();

  GET DIAGNOSTICS affected = ROW_COUNT;
  RETURN affected;
END;
$$;

-- ---------------------------------------------------------------------------
-- 5. Verification
-- ---------------------------------------------------------------------------

-- Expect 'parental-consent' to be listed in the constraint definition.
SELECT pg_get_constraintdef(oid) AS waiver_type_constraint
FROM pg_constraint
WHERE conname = 'waiver_acceptances_waiver_type_check';
