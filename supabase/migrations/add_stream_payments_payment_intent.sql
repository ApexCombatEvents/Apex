-- Add missing columns to stream_payments table
ALTER TABLE public.stream_payments
ADD COLUMN IF NOT EXISTS payment_intent_id TEXT,
ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'paid';

CREATE INDEX IF NOT EXISTS idx_stream_payments_payment_intent 
ON public.stream_payments(payment_intent_id) 
WHERE payment_intent_id IS NOT NULL;

COMMENT ON COLUMN public.stream_payments.payment_intent_id IS 'Stripe Payment Intent ID for tracking and refunds';
COMMENT ON COLUMN public.stream_payments.payment_status IS 'Payment status: paid, pending, refunded';

