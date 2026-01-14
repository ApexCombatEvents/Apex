-- Create payout_requests table for manual payout requests from fighters
CREATE TABLE IF NOT EXISTS public.payout_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fighter_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  amount_requested INTEGER NOT NULL, -- in cents
  status text CHECK (status IN ('pending', 'approved', 'processed', 'rejected', 'cancelled')) DEFAULT 'pending',
  stripe_transfer_id text, -- Stripe transfer ID after processing
  rejection_reason text,
  requested_at timestamp with time zone DEFAULT now() NOT NULL,
  processed_at timestamp with time zone,
  processed_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL, -- organizer who processed it
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_payout_requests_fighter_id ON public.payout_requests(fighter_id);
CREATE INDEX IF NOT EXISTS idx_payout_requests_event_id ON public.payout_requests(event_id);
CREATE INDEX IF NOT EXISTS idx_payout_requests_status ON public.payout_requests(status);

-- Enable RLS
ALTER TABLE public.payout_requests ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Fighters can view their own payout requests" ON public.payout_requests;
DROP POLICY IF EXISTS "Event organizers can view payout requests for their events" ON public.payout_requests;
DROP POLICY IF EXISTS "Fighters can create their own payout requests" ON public.payout_requests;
DROP POLICY IF EXISTS "Event organizers can update payout requests for their events" ON public.payout_requests;

-- Fighters can view their own payout requests
CREATE POLICY "Fighters can view their own payout requests" ON public.payout_requests
  FOR SELECT USING (auth.uid() = fighter_id);

-- Event organizers can view payout requests for their events
CREATE POLICY "Event organizers can view payout requests for their events" ON public.payout_requests
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = payout_requests.event_id
      AND (e.owner_profile_id = auth.uid() OR e.profile_id = auth.uid())
    )
  );

-- Fighters can create their own payout requests
CREATE POLICY "Fighters can create their own payout requests" ON public.payout_requests
  FOR INSERT WITH CHECK (auth.uid() = fighter_id);

-- Event organizers can update payout requests for their events (to approve/reject/process)
CREATE POLICY "Event organizers can update payout requests for their events" ON public.payout_requests
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = payout_requests.event_id
      AND (e.owner_profile_id = auth.uid() OR e.profile_id = auth.uid())
    )
  );

-- Add Stripe Connect columns to profiles if they don't exist (for fighters)
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS stripe_account_id text;

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS stripe_account_status text;

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS stripe_onboarding_completed boolean DEFAULT false;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_profiles_stripe_account_id ON public.profiles(stripe_account_id) WHERE stripe_account_id IS NOT NULL;

COMMENT ON COLUMN public.payout_requests.fighter_id IS 'Fighter requesting the payout';
COMMENT ON COLUMN public.payout_requests.event_id IS 'Event the earnings are from';
COMMENT ON COLUMN public.payout_requests.amount_requested IS 'Amount requested in cents';
COMMENT ON COLUMN public.payout_requests.status IS 'Status: pending, approved, processed, rejected, cancelled';
COMMENT ON COLUMN public.payout_requests.stripe_transfer_id IS 'Stripe transfer ID after successful payout';
COMMENT ON COLUMN public.payout_requests.processed_by IS 'Organizer who processed the payout';


