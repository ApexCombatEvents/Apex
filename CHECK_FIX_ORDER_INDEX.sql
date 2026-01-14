-- Check and potentially fix order_index values for event_bouts
-- Run this in your Supabase SQL Editor

-- First, check the current order_index values for a specific event
-- Replace 'YOUR_EVENT_ID' with the actual event ID
SELECT 
  id,
  card_type,
  order_index,
  red_name,
  blue_name,
  is_live
FROM event_bouts
WHERE event_id = 'YOUR_EVENT_ID'  -- Replace with your event ID
ORDER BY card_type DESC, order_index ASC;

-- If the order_index values are wrong, you can fix them with:
-- For main card: bottom fight (first to fight) should have order_index 0, top fight (main event) should have highest
-- For undercard: bottom fight (first to fight) should have order_index 0, top fight should have highest

-- Example fix (adjust based on your actual bout IDs):
-- UPDATE event_bouts SET order_index = 0 WHERE id = 'bout-id-for-josh-vs-rival';
-- UPDATE event_bouts SET order_index = 1 WHERE id = 'bout-id-for-luke-vs-miguel';
-- UPDATE event_bouts SET order_index = 2 WHERE id = 'bout-id-for-jay-vs-josh';

-- Or reset all order_index values for an event based on current order:
-- WITH ranked_bouts AS (
--   SELECT 
--     id,
--     card_type,
--     ROW_NUMBER() OVER (PARTITION BY card_type ORDER BY order_index ASC) - 1 AS new_order
--   FROM event_bouts
--   WHERE event_id = 'YOUR_EVENT_ID'
-- )
-- UPDATE event_bouts
-- SET order_index = ranked_bouts.new_order
-- FROM ranked_bouts
-- WHERE event_bouts.id = ranked_bouts.id;

