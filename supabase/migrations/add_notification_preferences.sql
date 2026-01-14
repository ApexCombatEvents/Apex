-- Migration: Add notification preferences table and policies
-- Run this in your Supabase SQL Editor

create table if not exists notification_preferences (
  profile_id uuid primary key references profiles(id) on delete cascade,
  -- in-app notifications
  notify_event_follow boolean not null default true,
  notify_event_bout_matched boolean not null default true,
  notify_post_comment boolean not null default true,
  notify_new_message boolean not null default true,
  -- product/marketing
  notify_product_updates boolean not null default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table notification_preferences enable row level security;

create policy "Own notification preferences read"
  on notification_preferences
  for select
  using (profile_id = auth.uid());

create policy "Own notification preferences insert"
  on notification_preferences
  for insert
  with check (profile_id = auth.uid());

create policy "Own notification preferences update"
  on notification_preferences
  for update
  using (profile_id = auth.uid());

create index if not exists notification_preferences_profile_id_idx
  on notification_preferences(profile_id);


