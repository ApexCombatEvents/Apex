# Database Migration - Run This SQL

**IMPORTANT:** Copy and paste this SQL code into your Supabase SQL Editor and run it to add the `is_live` and `is_started` columns to the events table.

## Steps:

1. Open your **Supabase Dashboard**
2. Go to **SQL Editor** (in the left sidebar)
3. Click **New Query**
4. Copy and paste the SQL code below
5. Click **Run** (or press Ctrl+Enter / Cmd+Enter)

## SQL Code:

```sql
-- Add live event state fields to events table
alter table events
add column if not exists is_live boolean default false;

alter table events
add column if not exists is_started boolean default false;

-- Create index for faster queries when finding live events
create index if not exists idx_events_is_live on events(is_live) where is_live = true;

-- Add comments
comment on column events.is_live is 'Whether this event is currently live';
comment on column events.is_started is 'Whether this live event has started (first bout is active)';
```

After running this, refresh your browser and the "Go Live" button should work properly!

