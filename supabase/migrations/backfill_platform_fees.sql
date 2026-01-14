-- Backfill platform fees for existing payments
-- This calculates 5% platform fee for all existing stream_payments that have platform_fee = 0

-- Update stream_payments: Calculate 5% platform fee for all payments
UPDATE public.stream_payments
SET platform_fee = ROUND((amount_paid * 5) / 100)
WHERE platform_fee = 0 
  AND amount_paid > 0;

-- Verify the update
SELECT 
  COUNT(*) as total_payments,
  SUM(platform_fee) as total_platform_fees_cents,
  SUM(amount_paid) as total_revenue_cents,
  ROUND(SUM(platform_fee)::numeric / SUM(amount_paid)::numeric * 100, 2) as fee_percentage
FROM public.stream_payments
WHERE amount_paid > 0;
