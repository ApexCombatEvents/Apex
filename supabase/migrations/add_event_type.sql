-- Add event_type column to distinguish fight events from general events
-- Existing events default to 'fight' to preserve backward compatibility
ALTER TABLE events
ADD COLUMN IF NOT EXISTS event_type TEXT NOT NULL DEFAULT 'fight'
CHECK (event_type IN ('fight', 'general'));

-- Add hide_sponsor_section column so organizers can hide the sponsor slot
-- Existing events default to false (sponsor section visible)
ALTER TABLE events
ADD COLUMN IF NOT EXISTS hide_sponsor_section BOOLEAN NOT NULL DEFAULT false;
