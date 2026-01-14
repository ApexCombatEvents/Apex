-- Add is_live field to event_bouts table
-- This allows event organizers to mark which bout is currently live

alter table event_bouts
add column if not exists is_live boolean default false;

-- Create index for faster queries when finding live bouts
create index if not exists idx_event_bouts_is_live on event_bouts(is_live) where is_live = true;

-- Add comment
comment on column event_bouts.is_live is 'Whether this bout is currently live during the event';

