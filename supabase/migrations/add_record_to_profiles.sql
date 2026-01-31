-- Migration: Add record column to profiles table for fighter stats
-- Run this in your Supabase SQL Editor

-- Add record column to profiles (format: Wins-Losses-Draws, e.g., "10-2-1")
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS record TEXT;

-- Add rank column if not exists (for fighter ranking)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS rank TEXT;

-- Add age column if not exists
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS age INTEGER;

-- Add height columns if not exists
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS height_unit TEXT DEFAULT 'cm';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS height_cm NUMERIC;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS height_feet INTEGER;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS height_inches INTEGER;

-- Add weight columns if not exists
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS weight_unit TEXT DEFAULT 'kg';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS weight NUMERIC;

-- Grant update access to authenticated users for the record column
-- This allows the API route with service role to update records

-- Verify columns exist
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'profiles' 
AND column_name IN ('record', 'rank', 'age', 'height_cm', 'weight');

-- Test query to verify you can read records
SELECT id, username, full_name, record 
FROM profiles 
WHERE record IS NOT NULL 
LIMIT 5;
