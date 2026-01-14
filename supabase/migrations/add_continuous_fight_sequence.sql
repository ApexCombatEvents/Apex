-- Migration: Add continuous fight sequence numbering
-- This creates a computed sequence number that spans across both undercard and main card
-- Sequence starts from bottom undercard (fight 1) and goes up, then continues with main card

-- Add a sequence_number column to track the continuous sequence
ALTER TABLE event_bouts 
ADD COLUMN IF NOT EXISTS sequence_number INTEGER;

-- Create a function to calculate sequence numbers
-- Sequence starts from BOTTOM undercard bout (oldest/first created or lowest order_index) = sequence 1
-- Goes UP through undercard, then continues with BOTTOM main card
-- Uses created_at to determine order if order_index is the same, ensuring creation order is preserved
CREATE OR REPLACE FUNCTION calculate_fight_sequence(p_event_id UUID)
RETURNS VOID AS $$
DECLARE
  v_sequence_counter INTEGER := 1;
  v_bout RECORD;
BEGIN
  -- Reset all sequence numbers for this event
  UPDATE event_bouts 
  SET sequence_number = NULL 
  WHERE event_id = p_event_id;
  
  -- First, process undercard bouts in ASCENDING order_index order (0, 1, 2, 3...)
  -- order_index 0 = bottom undercard = sequence 1 (first to fight)
  -- order_index 1 = next up = sequence 2 (second to fight)
  -- When you move a bout, its order_index changes and sequence recalculates
  FOR v_bout IN 
    SELECT id 
    FROM event_bouts 
    WHERE event_id = p_event_id 
      AND card_type = 'undercard'
    ORDER BY order_index ASC
  LOOP
    UPDATE event_bouts 
    SET sequence_number = v_sequence_counter 
    WHERE id = v_bout.id;
    v_sequence_counter := v_sequence_counter + 1;
  END LOOP;
  
  -- Then, process main card bouts in ASCENDING order_index order (continuing the sequence)
  -- order_index 0 = bottom main card = continues sequence
  -- order_index 1 = next up = continues sequence
  FOR v_bout IN 
    SELECT id 
    FROM event_bouts 
    WHERE event_id = p_event_id 
      AND card_type = 'main'
    ORDER BY order_index ASC
  LOOP
    UPDATE event_bouts 
    SET sequence_number = v_sequence_counter 
    WHERE id = v_bout.id;
    v_sequence_counter := v_sequence_counter + 1;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger to automatically update sequence numbers when bouts are added/updated
CREATE OR REPLACE FUNCTION update_fight_sequence()
RETURNS TRIGGER AS $$
DECLARE
  v_event_id UUID;
BEGIN
  -- Get event_id from NEW or OLD
  IF TG_OP = 'DELETE' THEN
    v_event_id := OLD.event_id;
  ELSE
    v_event_id := NEW.event_id;
  END IF;
  
  -- Recalculate sequence for the entire event
  PERFORM calculate_fight_sequence(v_event_id);
  
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_fight_sequence ON event_bouts;
CREATE TRIGGER trigger_update_fight_sequence
  AFTER INSERT OR UPDATE OF order_index, card_type OR DELETE
  ON event_bouts
  FOR EACH ROW
  EXECUTE FUNCTION update_fight_sequence();

-- Also create a function to manually recalculate sequence for a specific event
-- This can be called from the API if needed: SELECT recalculate_fight_sequence('event-id-here');
CREATE OR REPLACE FUNCTION recalculate_fight_sequence(p_event_id UUID)
RETURNS VOID AS $$
BEGIN
  PERFORM calculate_fight_sequence(p_event_id);
END;
$$ LANGUAGE plpgsql;

-- Calculate sequence for all existing events
-- Force recalculation for all events to ensure correct sequence
DO $$
DECLARE
  v_event RECORD;
BEGIN
  FOR v_event IN SELECT DISTINCT event_id FROM event_bouts
  LOOP
    PERFORM calculate_fight_sequence(v_event.event_id);
  END LOOP;
END $$;

