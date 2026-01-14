-- This migration helps identify and fix fight sequence order issues
-- The sequence should be: undercard fights first (order_index 0, 1, 2...), then main card fights (order_index 0, 1, 2...)

-- View to check current fight order for an event
-- Replace 'YOUR_EVENT_ID' with the actual event ID
CREATE OR REPLACE VIEW fight_sequence_check AS
SELECT 
  eb.id,
  eb.event_id,
  eb.card_type,
  eb.order_index,
  eb.red_name,
  eb.blue_name,
  eb.is_live,
  -- Calculate the sequence position
  ROW_NUMBER() OVER (
    PARTITION BY eb.event_id 
    ORDER BY 
      CASE WHEN eb.card_type = 'undercard' THEN 0 ELSE 1 END, -- undercard first
      eb.order_index ASC -- then by order_index ascending
  ) as sequence_position
FROM event_bouts eb
ORDER BY 
  eb.event_id,
  CASE WHEN eb.card_type = 'undercard' THEN 0 ELSE 1 END,
  eb.order_index ASC;

-- Example query to see the sequence for a specific event:
-- SELECT * FROM fight_sequence_check WHERE event_id = 'YOUR_EVENT_ID' ORDER BY sequence_position;

-- To fix the order_index values, you would need to update them manually based on the desired sequence
-- Example (adjust event_id and bout IDs as needed):
-- UPDATE event_bouts SET order_index = 0 WHERE id = 'bout-id-for-first-fight' AND event_id = 'event-id';
-- UPDATE event_bouts SET order_index = 1 WHERE id = 'bout-id-for-second-fight' AND event_id = 'event-id';
-- etc.



