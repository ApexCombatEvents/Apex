-- Migration Verification Script
-- Run this in your Supabase SQL Editor to check which tables exist
-- This helps verify that all migrations have been applied

-- Check for key tables from migrations
SELECT 
  table_name,
  CASE 
    WHEN table_name IN (
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
      'event_sponsorships',
      'notification_preferences',
      'payout_requests',
      'profile_follows',
      'chat_threads',
      'chat_messages',
      'chat_thread_participants'
    ) THEN '✅ EXISTS'
    ELSE '⚠️ MISSING'
  END as status
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN (
    -- Core tables (should exist from schema.sql)
    'profiles',
    'events',
    'posts',
    'notifications',
    
    -- Migration tables to verify
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
    'chat_thread_participants'
  )
ORDER BY table_name;

-- Check for specific columns that indicate migrations were run
SELECT 
  'Column checks' as check_type,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'event_bouts' 
      AND column_name = 'sequence_number'
    ) THEN '✅ sequence_number exists in event_bouts'
    ELSE '⚠️ sequence_number missing in event_bouts'
  END as sequence_number_check,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'events' 
      AND column_name = 'will_stream'
    ) THEN '✅ will_stream exists in events'
    ELSE '⚠️ will_stream missing in events'
  END as stream_fields_check,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'profiles' 
      AND column_name = 'username'
    ) THEN '✅ username exists in profiles'
    ELSE '⚠️ username missing in profiles'
  END as profile_fields_check;

-- List all tables in public schema (for reference)
SELECT 
  'All tables in public schema:' as info,
  string_agg(table_name, ', ' ORDER BY table_name) as tables
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_type = 'BASE TABLE';

