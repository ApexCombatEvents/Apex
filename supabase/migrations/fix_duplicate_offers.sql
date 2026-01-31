-- Migration: Fix duplicate offers and add unique constraint
-- Run this in your Supabase SQL Editor

-- Step 1: Find duplicate offers (same bout, side, fighter)
SELECT bout_id, side, fighter_profile_id, COUNT(*) as count
FROM event_bout_offers
GROUP BY bout_id, side, fighter_profile_id
HAVING COUNT(*) > 1;

-- Step 2: Delete duplicates, keeping only the oldest one
-- This uses a CTE to identify duplicates and delete all but the first
WITH duplicates AS (
  SELECT id,
         ROW_NUMBER() OVER (
           PARTITION BY bout_id, side, fighter_profile_id 
           ORDER BY created_at ASC
         ) as rn
  FROM event_bout_offers
)
DELETE FROM event_bout_offers
WHERE id IN (
  SELECT id FROM duplicates WHERE rn > 1
);

-- Step 3: Add unique constraint to prevent future duplicates
-- This ensures the same fighter can't have multiple offers for the same bout/side
CREATE UNIQUE INDEX IF NOT EXISTS event_bout_offers_unique_idx 
ON event_bout_offers (bout_id, side, fighter_profile_id);

-- Verify the constraint was added
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename = 'event_bout_offers' 
AND indexname LIKE '%unique%';

-- Step 4: Count remaining offers (should have no duplicates now)
SELECT bout_id, side, fighter_profile_id, COUNT(*) as count
FROM event_bout_offers
GROUP BY bout_id, side, fighter_profile_id
HAVING COUNT(*) > 1;
