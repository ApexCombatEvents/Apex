-- Detailed verification of the test payment
-- This checks all the important fields

SELECT 
  id as payment_id,
  event_id,
  user_id,
  amount_paid,
  payment_intent_id,
  fighter_allocations,
  created_at,
  -- Format amount for display
  CASE 
    WHEN amount_paid > 0 THEN CONCAT('$', (amount_paid::numeric / 100)::text)
    ELSE 'Free'
  END AS amount_display,
  -- Check if payment_intent_id exists (should start with 'pi_')
  CASE 
    WHEN payment_intent_id IS NOT NULL AND payment_intent_id LIKE 'pi_%' THEN '✅ Valid'
    WHEN payment_intent_id IS NULL THEN '⚠️ Missing'
    ELSE '⚠️ Invalid format'
  END AS payment_intent_status
FROM stream_payments
WHERE user_id = '4b728abc-ad5f-45f6-9106-165f72c37e44'
ORDER BY created_at DESC
LIMIT 1;

