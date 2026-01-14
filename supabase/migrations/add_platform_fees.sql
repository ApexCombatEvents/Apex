-- Add platform fee tracking to stream_payments and offer_payments

-- Add platform_fee column to stream_payments
ALTER TABLE public.stream_payments
ADD COLUMN IF NOT EXISTS platform_fee INTEGER DEFAULT 0;

COMMENT ON COLUMN public.stream_payments.platform_fee IS 'Platform fee in cents (5% of amount_paid)';

-- Add platform_fee column to offer_payments
ALTER TABLE public.offer_payments
ADD COLUMN IF NOT EXISTS platform_fee INTEGER DEFAULT 0;

COMMENT ON COLUMN public.offer_payments.platform_fee IS 'Platform fee in cents (5% of amount_paid, charged when offer is accepted)';

-- Create index for platform fee queries (if needed for reporting)
CREATE INDEX IF NOT EXISTS idx_stream_payments_platform_fee ON public.stream_payments(platform_fee) WHERE platform_fee > 0;
CREATE INDEX IF NOT EXISTS idx_offer_payments_platform_fee ON public.offer_payments(platform_fee) WHERE platform_fee > 0;
