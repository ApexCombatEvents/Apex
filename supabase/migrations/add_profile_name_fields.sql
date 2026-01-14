-- Migration: Add username and full_name columns to profiles table
-- Run this in your Supabase SQL Editor

-- Add username column (nullable, can be used as profile handle)
alter table profiles add column if not exists username text;

-- Add full_name column (nullable, for display name)
alter table profiles add column if not exists full_name text;

-- Create index on username for faster lookups
create index if not exists profiles_username_idx on profiles(username) where username is not null;

-- Optional: Copy handle to username for existing records if username is null
-- Uncomment the line below if you want to migrate existing handle values to username
-- update profiles set username = handle where username is null and handle is not null;

