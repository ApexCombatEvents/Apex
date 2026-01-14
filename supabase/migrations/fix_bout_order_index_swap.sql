-- Migration: Fix bout order_index values to match correct chronological sequence
-- 
-- Current issue: order_index values are swapped (0 and 1 are inverted)
-- Desired sequence:
--   Undercard: joe vs john (0), blue vs red (1)
--   Main Card: koke vs jack (0), jane vs ada (1)
--
-- This SQL swaps order_index 0 ↔ 1 within each card_type for all events

-- Swap 0 and 1 directly within each card_type
UPDATE event_bouts
SET order_index = CASE 
  WHEN order_index = 0 THEN 1
  WHEN order_index = 1 THEN 0
  ELSE order_index
END
WHERE order_index IN (0, 1);
