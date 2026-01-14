-- Backfill platform fees for existing payments
-- This calculates 5% platform fee for all existing stream_payments that have platform_fee = 0

-- Update stream_payments: Calculate 5% platform fee for all payments where platform_fee is 0
UPDATE public.stream_payments
SET platform_fee = ROUND((amount_paid * 5) / 100)
WHERE platform_fee = 0 
  AND amount_paid > 0;

-- Verify the update
SELECT 
  COUNT(*) as total_payments,
  SUM(platform_fee) as total_platform_fees_cents,
  SUM(amount_paid) as total_revenue_cents,
  CASE 
    WHEN SUM(amount_paid) > 0 
    THEN ROUND(SUM(platform_fee)::numeric / SUM(amount_paid)::numeric * 100, 2)
    ELSE 0
  END as fee_percentage
FROM public.stream_payments
WHERE amount_paid > 0;

-- Show a sample of updated records
SELECT 
  id,
  event_id,
  amount_paid,
  platform_fee,
  ROUND((platform_fee::numeric / amount_paid::numeric * 100), 2) as fee_percentage_check
FROM public.stream_payments
WHERE amount_paid > 0
ORDER BY created_at DESC
LIMIT 10;
