-- Migration: Add fighter stats columns and indexes
-- Run this in your Supabase SQL Editor

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS record TEXT DEFAULT '0-0-0';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_5_form TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS current_win_streak INTEGER DEFAULT 0;

-- Optional: Add index for fighter lookup performance
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
