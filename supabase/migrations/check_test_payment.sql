-- Check if test payment was recorded
-- Run this after making a test payment

-- Check stream payments (most recent first)
SELECT 
  id,
  event_id,
  user_id,
  amount_paid,
  payment_intent_id,
  created_at,
  CASE 
    WHEN amount_paid > 0 THEN CONCAT('$', (amount_paid::numeric / 100)::text)
    ELSE 'Free'
  END AS amount_display
FROM stream_payments
ORDER BY created_at DESC
LIMIT 5;

-- Check if payment was for a specific event (replace 'your-event-id' with actual event ID)
-- SELECT * FROM stream_payments WHERE event_id = 'your-event-id' ORDER BY created_at DESC;

-- Verify the user can access the stream
-- This checks if the payment record exists for the user and event
SELECT 
  sp.id as payment_id,
  sp.event_id,
  sp.user_id,
  e.title as event_title,
  e.name as event_name,
  sp.amount_paid,
  sp.created_at as payment_date
FROM stream_payments sp
LEFT JOIN events e ON e.id = sp.event_id
ORDER BY sp.created_at DESC
LIMIT 5;

