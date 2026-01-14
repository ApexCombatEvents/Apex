-- Migration: Add event_follows table for users to follow events
-- Run this in your Supabase SQL Editor

-- Create event_follows table
create table if not exists event_follows (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id) on delete cascade,
  event_id uuid not null references events(id) on delete cascade,
  created_at timestamptz default now(),
  unique (profile_id, event_id)
);

-- Enable RLS
alter table event_follows enable row level security;

-- RLS Policies
create policy "Users can view their own event follows" on event_follows
  for select using (profile_id = auth.uid());

-- Allow reading event_follows for a specific event (needed to notify all followers)
-- This allows event organizers to query who is following their events
create policy "Event organizers can view event followers" on event_follows
  for select using (
    exists (
      select 1 from events e 
      where e.id = event_follows.event_id 
      and e.owner_profile_id = auth.uid()
    )
  );

create policy "Users can follow events" on event_follows
  for insert with check (profile_id = auth.uid());

create policy "Users can unfollow events" on event_follows
  for delete using (profile_id = auth.uid());

-- Indexes for better query performance
create index if not exists event_follows_profile_id_idx on event_follows(profile_id);
create index if not exists event_follows_event_id_idx on event_follows(event_id);
create index if not exists event_follows_created_at_idx on event_follows(created_at desc);

-- Optional: Add a comment to the table
comment on table event_follows is 'Tracks which users are following which events for news/updates';

