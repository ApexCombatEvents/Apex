-- Migration: Create follows table if it doesn't exist
-- Run this in your Supabase SQL Editor if you're getting "table 'follows' not found" errors

-- Create follows table
create table if not exists follows (
  follower_id uuid not null references profiles(id) on delete cascade,
  following_id uuid not null references profiles(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (follower_id, following_id)
);

-- Enable RLS
alter table follows enable row level security;

-- RLS Policies (if they don't exist)
do $$
begin
  if not exists (
    select 1 from pg_policies 
    where tablename = 'follows' 
    and policyname = 'Public follows read'
  ) then
    create policy "Public follows read" on follows for select using (true);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies 
    where tablename = 'follows' 
    and policyname = 'Own follow insert'
  ) then
    create policy "Own follow insert" on follows for insert with check (follower_id = auth.uid());
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies 
    where tablename = 'follows' 
    and policyname = 'Own follow delete'
  ) then
    create policy "Own follow delete" on follows for delete using (follower_id = auth.uid());
  end if;
end $$;

-- Create index for better performance
create index if not exists follows_follower_id_idx on follows(follower_id);
create index if not exists follows_following_id_idx on follows(following_id);

