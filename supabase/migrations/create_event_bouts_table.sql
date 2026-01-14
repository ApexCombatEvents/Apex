-- Create event_bouts table if it doesn't exist
-- This table stores bouts for events with flexible fighter assignment

create table if not exists event_bouts (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events(id) on delete cascade,
  card_type text check (card_type in ('main', 'undercard')) not null default 'main',
  order_index integer not null default 0,
  
  -- Fighter names (for name-only fighters not in the system)
  red_name text,
  blue_name text,
  
  -- Fighter IDs (for fighters with profiles in the system)
  red_fighter_id uuid references profiles(id) on delete set null,
  blue_fighter_id uuid references profiles(id) on delete set null,
  
  -- Bout details
  weight text,
  bout_details text,
  
  -- Looking for opponent flags
  red_looking_for_opponent boolean default false,
  blue_looking_for_opponent boolean default false,
  
  -- Results
  winner_side text check (winner_side in ('red', 'blue', 'draw', 'no_contest')),
  result_method text,
  result_round integer,
  result_time text,
  
  -- Live status
  is_live boolean default false,
  
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Create indexes for better query performance
create index if not exists idx_event_bouts_event_id on event_bouts(event_id);
create index if not exists idx_event_bouts_red_fighter_id on event_bouts(red_fighter_id);
create index if not exists idx_event_bouts_blue_fighter_id on event_bouts(blue_fighter_id);
create index if not exists idx_event_bouts_is_live on event_bouts(is_live) where is_live = true;
create index if not exists idx_event_bouts_event_order on event_bouts(event_id, card_type, order_index);

-- Enable RLS
alter table event_bouts enable row level security;

-- Add comments
comment on table event_bouts is 'Bouts for events, supporting both profile-linked fighters and name-only fighters';
comment on column event_bouts.red_name is 'Name for red corner fighter if not in system (red_fighter_id is null)';
comment on column event_bouts.blue_name is 'Name for blue corner fighter if not in system (blue_fighter_id is null)';
comment on column event_bouts.is_live is 'Whether this bout is currently live during the event';

