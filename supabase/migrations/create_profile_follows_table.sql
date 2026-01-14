-- Migration: Create profile_follows table if it doesn't exist
-- Run this in your Supabase SQL Editor if you're getting "table 'profile_follows' not found" errors

-- Create profile_follows table (if it doesn't exist)
create table if not exists profile_follows (
  follower_id uuid not null references profiles(id) on delete cascade,
  following_id uuid not null references profiles(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (follower_id, following_id)
);

-- Enable RLS
alter table profile_follows enable row level security;

-- RLS Policies (if they don't exist)
do $$
begin
  if not exists (
    select 1 from pg_policies 
    where tablename = 'profile_follows' 
    and policyname = 'Public profile_follows read'
  ) then
    create policy "Public profile_follows read" on profile_follows for select using (true);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies 
    where tablename = 'profile_follows' 
    and policyname = 'Own profile_follow insert'
  ) then
    create policy "Own profile_follow insert" on profile_follows for insert with check (follower_id = auth.uid());
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies 
    where tablename = 'profile_follows' 
    and policyname = 'Own profile_follow delete'
  ) then
    create policy "Own profile_follow delete" on profile_follows for delete using (follower_id = auth.uid());
  end if;
end $$;

-- Create indexes for better performance
create index if not exists profile_follows_follower_id_idx on profile_follows(follower_id);
create index if not exists profile_follows_following_id_idx on profile_follows(following_id);

