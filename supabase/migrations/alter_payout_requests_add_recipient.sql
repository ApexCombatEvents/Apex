-- Generalize payout_requests for organizer payouts
-- Adds recipient columns and policies to support both fighters and organizers

-- Add new recipient columns
ALTER TABLE public.payout_requests
ADD COLUMN IF NOT EXISTS recipient_type text CHECK (recipient_type IN ('fighter', 'organizer')) DEFAULT 'fighter';

ALTER TABLE public.payout_requests
ADD COLUMN IF NOT EXISTS recipient_profile_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE;

-- Backfill recipient_profile_id from fighter_id where available
UPDATE public.payout_requests
SET recipient_profile_id = COALESCE(recipient_profile_id, fighter_id)
WHERE recipient_profile_id IS NULL;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_payout_requests_recipient_profile_id ON public.payout_requests(recipient_profile_id);
CREATE INDEX IF NOT EXISTS idx_payout_requests_recipient_type ON public.payout_requests(recipient_type);

-- RLS: Drop old per-fighter policy and replace with recipient-based
DROP POLICY IF EXISTS "Fighters can view their own payout requests" ON public.payout_requests;
DROP POLICY IF EXISTS "Fighters can create their own payout requests" ON public.payout_requests;

-- Recipients (fighters or organizers) can view their own payout requests
CREATE POLICY "Recipients can view their own payout requests" ON public.payout_requests
  FOR SELECT USING (auth.uid() = recipient_profile_id);

-- Fighters can create their own payout requests (for events they participated in via allocations/tips)
CREATE POLICY "Fighters can create payout requests" ON public.payout_requests
  FOR INSERT WITH CHECK (
    recipient_type = 'fighter'
    AND recipient_profile_id = auth.uid()
  );

-- Organizers can create payout requests for their own events
CREATE POLICY "Organizers can create payout requests" ON public.payout_requests
  FOR INSERT WITH CHECK (
    recipient_type = 'organizer'
    AND recipient_profile_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = payout_requests.event_id
      AND (e.owner_profile_id = auth.uid() OR e.profile_id = auth.uid())
    )
  );

-- Admins can view all payout requests (optional broader visibility)
DROP POLICY IF EXISTS "Admins can view all payout requests" ON public.payout_requests;
CREATE POLICY "Admins can view all payout requests" ON public.payout_requests
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'ADMIN')
  );



