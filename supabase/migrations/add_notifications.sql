-- Migration: Add notifications table and policies
-- Run this in your Supabase SQL Editor

-- Create notifications table
create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id) on delete cascade,
  type text not null,
  actor_profile_id uuid references profiles(id) on delete set null,
  data jsonb,
  is_read boolean default false,
  created_at timestamptz default now()
);

-- Enable RLS
alter table notifications enable row level security;

-- RLS Policies
create policy "Own notifications read" on notifications for select using (profile_id = auth.uid());
create policy "Insert notifications" on notifications for insert with check (true);
create policy "Update own notifications" on notifications for update using (profile_id = auth.uid());

-- Indexes for better query performance
create index if not exists notifications_profile_id_idx on notifications(profile_id);
create index if not exists notifications_profile_id_created_at_idx on notifications(profile_id, created_at desc);
create index if not exists notifications_profile_id_is_read_idx on notifications(profile_id, is_read) where is_read = false;

-- Optional: Add a comment to the table
comment on table notifications is 'User notifications for follows, messages, likes, comments, bout offers, etc.';

