-- Migration: Add record_base to profiles for manual record entries
-- This allows us to keep the manual record separate from Apex bout calculations

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS record_base TEXT DEFAULT '0-0-0';

-- Backfill existing records to record_base if record_base is empty
UPDATE profiles SET record_base = record WHERE record_base IS NULL OR record_base = '0-0-0';
