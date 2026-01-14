-- Add live event state fields to events table
-- This allows events to be marked as "live" and track if they've started

-- First, add 'live' to the status enum (if it doesn't exist, we'll need to recreate the constraint)
-- For simplicity, we'll add a separate boolean field instead to avoid enum migration complexity

alter table events
add column if not exists is_live boolean default false;

alter table events
add column if not exists is_started boolean default false;

-- Create index for faster queries when finding live events
create index if not exists idx_events_is_live on events(is_live) where is_live = true;

-- Add comments
comment on column events.is_live is 'Whether this event is currently live';
comment on column events.is_started is 'Whether this live event has started (first bout is active)';

