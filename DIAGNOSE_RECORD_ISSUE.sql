-- DIAGNOSTIC SQL: Run this in your Supabase SQL Editor to diagnose the record update issue
-- Copy and paste ALL of this SQL and run it

-- Step 1: Check if 'record' column exists in profiles table
SELECT 
  column_name, 
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'profiles' 
  AND column_name = 'record';

-- If the above returns no rows, run this to add the column:
-- ALTER TABLE profiles ADD COLUMN IF NOT EXISTS record TEXT;

-- Step 2: Check all profiles that have a record set
SELECT id, username, full_name, record 
FROM profiles 
WHERE record IS NOT NULL 
ORDER BY updated_at DESC
LIMIT 10;

-- Step 3: Check a specific profile (replace 'the_username' with the actual username)
-- SELECT id, username, full_name, record 
-- FROM profiles 
-- WHERE username = 'the_username';

-- Step 4: Check bouts and their fighter IDs
SELECT 
  eb.id as bout_id,
  e.title as event_title,
  eb.red_name,
  eb.blue_name,
  eb.red_fighter_id,
  eb.blue_fighter_id,
  eb.winner_side,
  red_profile.username as red_username,
  red_profile.record as red_record,
  blue_profile.username as blue_username,
  blue_profile.record as blue_record
FROM event_bouts eb
LEFT JOIN events e ON e.id = eb.event_id
LEFT JOIN profiles red_profile ON red_profile.id = eb.red_fighter_id
LEFT JOIN profiles blue_profile ON blue_profile.id = eb.blue_fighter_id
ORDER BY eb.created_at DESC
LIMIT 10;

-- Step 5: If record column doesn't exist, RUN THIS:
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS record TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS rank TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS age INTEGER;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS height_unit TEXT DEFAULT 'cm';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS height_cm NUMERIC;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS height_feet INTEGER;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS height_inches INTEGER;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS weight_unit TEXT DEFAULT 'kg';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS weight NUMERIC;

-- After running Step 5, verify the column exists:
SELECT column_name, data_type
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'profiles' 
  AND column_name IN ('record', 'rank', 'age');
