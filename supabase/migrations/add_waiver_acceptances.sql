-- Migration: add_waiver_acceptances
-- Records every waiver a user has accepted, with version + timestamp for legal audit trail.

CREATE TABLE IF NOT EXISTS public.waiver_acceptances (
  id            UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id       UUID        REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  waiver_type   TEXT        NOT NULL CHECK (waiver_type IN ('signup', 'event-creation', 'bout-acceptance')),
  waiver_version TEXT       NOT NULL DEFAULT 'v1.0',
  accepted_at   TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  ip_address    TEXT,
  metadata      JSONB
);

ALTER TABLE public.waiver_acceptances ENABLE ROW LEVEL SECURITY;

-- Users can record their own acceptances
CREATE POLICY "Users can insert own waiver acceptances"
  ON public.waiver_acceptances FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can view their own acceptance history
CREATE POLICY "Users can view own waiver acceptances"
  ON public.waiver_acceptances FOR SELECT
  USING (auth.uid() = user_id);

-- Admins can view all acceptances for audit purposes
CREATE POLICY "Admins can view all waiver acceptances"
  ON public.waiver_acceptances FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE INDEX idx_waiver_acceptances_user_id    ON public.waiver_acceptances(user_id);
CREATE INDEX idx_waiver_acceptances_type       ON public.waiver_acceptances(waiver_type);
CREATE INDEX idx_waiver_acceptances_accepted_at ON public.waiver_acceptances(accepted_at);
