-- Simple Migration Table Check
-- This will show you which migration tables exist and which are missing

WITH expected_tables AS (
  SELECT unnest(ARRAY[
    'fighter_fight_history',
    'content_reports',
    'stream_payments',
    'event_bouts',
    'event_sponsorships',
    'event_bout_offers',
    'event_bout_suggestions',
    'bout_scores',
    'offer_payments',
    'sponsorships',
    'notification_preferences',
    'payout_requests',
    'profile_follows',
    'chat_threads',
    'chat_messages',
    'chat_thread_participants',
    'event_follows'
  ]) AS table_name
),
existing_tables AS (
  SELECT table_name
  FROM information_schema.tables
  WHERE table_schema = 'public'
    AND table_type = 'BASE TABLE'
)
SELECT 
  et.table_name,
  CASE 
    WHEN ext.table_name IS NOT NULL THEN '✅ EXISTS'
    ELSE '❌ MISSING'
  END AS status
FROM expected_tables et
LEFT JOIN existing_tables ext ON et.table_name = ext.table_name
ORDER BY status, et.table_name;

-- Also check for important columns that indicate migrations were applied
SELECT 
  'event_bouts.sequence_number' AS check_item,
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'event_bouts' 
      AND column_name = 'sequence_number'
  ) THEN '✅ EXISTS' ELSE '❌ MISSING' END AS status
UNION ALL
SELECT 
  'events.will_stream',
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'events' 
      AND column_name = 'will_stream'
  ) THEN '✅ EXISTS' ELSE '❌ MISSING' END
UNION ALL
SELECT 
  'profiles.username',
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'profiles' 
      AND column_name = 'username'
  ) THEN '✅ EXISTS' ELSE '❌ MISSING' END;

