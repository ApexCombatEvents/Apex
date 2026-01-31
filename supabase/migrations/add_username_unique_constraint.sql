-- Migration: Add unique constraint on username column
-- Run this in your Supabase SQL Editor

-- First, check for any duplicate usernames that need to be resolved
-- This query shows duplicates if any exist:
SELECT username, COUNT(*) as count 
FROM profiles 
WHERE username IS NOT NULL 
GROUP BY username 
HAVING COUNT(*) > 1;

-- If there are duplicates, you'll need to manually resolve them before adding the constraint
-- You can update duplicate usernames with something like:
-- UPDATE profiles SET username = username || '_' || id::text WHERE id IN (SELECT id FROM duplicates);

-- Add unique constraint on username (case-insensitive)
-- First, create a unique index on lowercase username to enforce case-insensitive uniqueness
CREATE UNIQUE INDEX IF NOT EXISTS profiles_username_unique_idx 
ON profiles (LOWER(username)) 
WHERE username IS NOT NULL;

-- Optional: If you also want a regular unique constraint (case-sensitive), uncomment this:
-- ALTER TABLE profiles ADD CONSTRAINT profiles_username_unique UNIQUE (username);

-- Verify the constraint was added
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename = 'profiles' 
AND indexname LIKE '%username%';
