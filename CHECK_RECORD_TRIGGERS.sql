-- DIAGNOSTIC SQL: Check for triggers that might be affecting fighter records
-- Run this in your Supabase SQL Editor

-- Step 1: Check for ANY triggers on the profiles table
SELECT 
  tgname AS trigger_name,
  tgtype AS trigger_type,
  pg_get_triggerdef(oid) AS trigger_definition
FROM pg_trigger
WHERE tgrelid = 'public.profiles'::regclass;

-- Step 2: Check for ANY triggers on the event_bouts table
SELECT 
  tgname AS trigger_name,
  tgtype AS trigger_type,
  pg_get_triggerdef(oid) AS trigger_definition
FROM pg_trigger
WHERE tgrelid = 'public.event_bouts'::regclass;

-- Step 3: Check for functions that might update profiles.record
SELECT 
  proname AS function_name,
  prosrc AS function_source
FROM pg_proc
WHERE prosrc ILIKE '%profiles%record%' 
   OR prosrc ILIKE '%update.*profiles%';

-- Step 4: Get the fighter's current record (replace 'FIGHTER_USERNAME' with actual username)
SELECT 
  id,
  username,
  full_name,
  record,
  record_base,
  last_5_form,
  current_win_streak,
  updated_at
FROM profiles
WHERE username = 'FIGHTER_USERNAME';

-- Step 5: Check all bouts this fighter is in (replace 'FIGHTER_ID' with actual UUID)
SELECT 
  eb.id AS bout_id,
  e.title AS event_title,
  eb.red_name,
  eb.blue_name,
  eb.red_fighter_id,
  eb.blue_fighter_id,
  eb.winner_side,
  eb.created_at AS bout_created_at
FROM event_bouts eb
LEFT JOIN events e ON e.id = eb.event_id
WHERE eb.red_fighter_id = 'FIGHTER_ID' OR eb.blue_fighter_id = 'FIGHTER_ID'
ORDER BY eb.created_at DESC;

-- Step 6: Check the profiles audit log (if it exists)
-- This would show when the record was last changed
SELECT 
  id,
  username,
  record,
  record_base,
  updated_at
FROM profiles
WHERE role = 'FIGHTER'
ORDER BY updated_at DESC
LIMIT 20;

-- Step 7: Look for any realtime subscriptions that might be syncing data
SELECT * FROM pg_publication_tables WHERE pubname = 'supabase_realtime';
