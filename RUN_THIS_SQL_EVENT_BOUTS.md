# SQL Migration for event_bouts Table

The code expects an `event_bouts` table with specific columns. Run this SQL in your Supabase SQL Editor to ensure the table and all required columns exist.

## Instructions

1. Open your Supabase Dashboard
2. Go to SQL Editor
3. Copy and paste the SQL below
4. Run it

## SQL Code

```sql
-- Create event_bouts table if it doesn't exist
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

-- Add missing columns if table already exists (safe to run multiple times)
-- Note: CHECK constraints need to be added separately after column creation
DO $$ 
BEGIN
  -- Add columns without constraints first
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'event_bouts' AND column_name = 'card_type') THEN
    ALTER TABLE event_bouts ADD COLUMN card_type text default 'main';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'event_bouts' AND column_name = 'order_index') THEN
    ALTER TABLE event_bouts ADD COLUMN order_index integer default 0;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'event_bouts' AND column_name = 'red_name') THEN
    ALTER TABLE event_bouts ADD COLUMN red_name text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'event_bouts' AND column_name = 'blue_name') THEN
    ALTER TABLE event_bouts ADD COLUMN blue_name text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'event_bouts' AND column_name = 'red_fighter_id') THEN
    ALTER TABLE event_bouts ADD COLUMN red_fighter_id uuid references profiles(id) on delete set null;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'event_bouts' AND column_name = 'blue_fighter_id') THEN
    ALTER TABLE event_bouts ADD COLUMN blue_fighter_id uuid references profiles(id) on delete set null;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'event_bouts' AND column_name = 'weight') THEN
    ALTER TABLE event_bouts ADD COLUMN weight text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'event_bouts' AND column_name = 'bout_details') THEN
    ALTER TABLE event_bouts ADD COLUMN bout_details text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'event_bouts' AND column_name = 'red_looking_for_opponent') THEN
    ALTER TABLE event_bouts ADD COLUMN red_looking_for_opponent boolean default false;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'event_bouts' AND column_name = 'blue_looking_for_opponent') THEN
    ALTER TABLE event_bouts ADD COLUMN blue_looking_for_opponent boolean default false;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'event_bouts' AND column_name = 'winner_side') THEN
    ALTER TABLE event_bouts ADD COLUMN winner_side text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'event_bouts' AND column_name = 'result_method') THEN
    ALTER TABLE event_bouts ADD COLUMN result_method text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'event_bouts' AND column_name = 'result_round') THEN
    ALTER TABLE event_bouts ADD COLUMN result_round integer;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'event_bouts' AND column_name = 'result_time') THEN
    ALTER TABLE event_bouts ADD COLUMN result_time text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'event_bouts' AND column_name = 'is_live') THEN
    ALTER TABLE event_bouts ADD COLUMN is_live boolean default false;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'event_bouts' AND column_name = 'updated_at') THEN
    ALTER TABLE event_bouts ADD COLUMN updated_at timestamptz default now();
  END IF;
END $$;

-- Add CHECK constraints if they don't exist
DO $$
BEGIN
  -- Check if constraint exists before adding
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'event_bouts_card_type_check'
  ) THEN
    ALTER TABLE event_bouts ADD CONSTRAINT event_bouts_card_type_check 
      CHECK (card_type IN ('main', 'undercard'));
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'event_bouts_winner_side_check'
  ) THEN
    ALTER TABLE event_bouts ADD CONSTRAINT event_bouts_winner_side_check 
      CHECK (winner_side IS NULL OR winner_side IN ('red', 'blue', 'draw', 'no_contest'));
  END IF;
END $$;

-- Create indexes for better query performance
create index if not exists idx_event_bouts_event_id on event_bouts(event_id);
create index if not exists idx_event_bouts_red_fighter_id on event_bouts(red_fighter_id);
create index if not exists idx_event_bouts_blue_fighter_id on event_bouts(blue_fighter_id);
create index if not exists idx_event_bouts_is_live on event_bouts(is_live) where is_live = true;
create index if not exists idx_event_bouts_event_order on event_bouts(event_id, card_type, order_index);

-- Enable RLS if not already enabled
alter table event_bouts enable row level security;
```

## After Running

After running this SQL, try saving your bout again. The 400 error should be resolved.

