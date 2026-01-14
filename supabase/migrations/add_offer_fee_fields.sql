-- Add offer fee/deposit fields to event_bouts table
-- This allows event creators to require a refundable fee for sending bout offers

ALTER TABLE public.event_bouts
ADD COLUMN IF NOT EXISTS offer_fee INTEGER DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_event_bouts_offer_fee ON public.event_bouts(offer_fee) WHERE offer_fee IS NOT NULL;

COMMENT ON COLUMN public.event_bouts.offer_fee IS 'Fee in cents required to send an offer for this bout (null = no fee required). Refunded if offer is declined.';

-- Create table to track offer payments and refunds
CREATE TABLE IF NOT EXISTS public.offer_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_id UUID NOT NULL REFERENCES public.event_bout_offers(id) ON DELETE CASCADE,
  bout_id UUID NOT NULL REFERENCES public.event_bouts(id) ON DELETE CASCADE,
  payer_profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount_paid INTEGER NOT NULL, -- in cents
  payment_status TEXT NOT NULL CHECK (payment_status IN ('pending', 'paid', 'refunded', 'failed')),
  refund_status TEXT DEFAULT NULL CHECK (refund_status IN ('pending', 'refunded', 'failed')),
  payment_intent_id TEXT, -- For payment processor (Stripe, etc.)
  refund_id TEXT, -- For refund tracking
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_offer_payments_offer_id ON public.offer_payments(offer_id);
CREATE INDEX IF NOT EXISTS idx_offer_payments_bout_id ON public.offer_payments(bout_id);
CREATE INDEX IF NOT EXISTS idx_offer_payments_payer ON public.offer_payments(payer_profile_id);
CREATE INDEX IF NOT EXISTS idx_offer_payments_status ON public.offer_payments(payment_status);

-- Enable RLS
ALTER TABLE public.offer_payments ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own payments
DROP POLICY IF EXISTS "Users can view their own offer payments" ON public.offer_payments;
CREATE POLICY "Users can view their own offer payments" ON public.offer_payments
  FOR SELECT USING (auth.uid() = payer_profile_id);

-- Policy: Event organizers can view payments for their event bouts
DROP POLICY IF EXISTS "Event organizers can view bout offer payments" ON public.offer_payments;
CREATE POLICY "Event organizers can view bout offer payments" ON public.offer_payments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.event_bouts eb
      JOIN public.events e ON e.id = eb.event_id
      WHERE eb.id = offer_payments.bout_id
      AND (e.owner_profile_id = auth.uid() OR e.profile_id = auth.uid())
    )
  );

-- Policy: Users can insert their own payments
DROP POLICY IF EXISTS "Users can insert their own offer payments" ON public.offer_payments;
CREATE POLICY "Users can insert their own offer payments" ON public.offer_payments
  FOR INSERT WITH CHECK (auth.uid() = payer_profile_id);

-- Policy: System can update payment/refund status (for now, allow event organizers)
DROP POLICY IF EXISTS "Event organizers can update payment status" ON public.offer_payments;
CREATE POLICY "Event organizers can update payment status" ON public.offer_payments
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.event_bouts eb
      JOIN public.events e ON e.id = eb.event_id
      WHERE eb.id = offer_payments.bout_id
      AND (e.owner_profile_id = auth.uid() OR e.profile_id = auth.uid())
    )
  );

-- Update trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_offer_payments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_offer_payments_updated_at ON public.offer_payments;
CREATE TRIGGER update_offer_payments_updated_at
BEFORE UPDATE ON public.offer_payments
FOR EACH ROW
EXECUTE FUNCTION public.update_offer_payments_updated_at();



