-- Comprehensive Table Check
-- Run this in your production Supabase SQL Editor to see what tables already exist
-- and what migrations still need to be run

-- Check if critical tables exist
SELECT 
  table_name,
  CASE 
    WHEN table_name IN (
      'stream_payments',
      'offer_payments',
      'event_bouts',
      'event_bout_offers',
      'notifications',
      'payout_requests',
      'content_reports',
      'event_sponsorships',
      'fighter_fight_history',
      'bout_scores',
      'profile_posts',
      'message_threads',
      'chat_messages',
      'chat_thread_participants',
      'event_bout_suggestions'
    ) THEN '✅ Critical'
    ELSE '⚪ Optional'
  END as status
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN (
    -- Core application tables
    'stream_payments',
    'offer_payments',
    'event_bouts',
    'event_bout_offers',
    'event_bout_suggestions',
    'notifications',
    'payout_requests',
    'content_reports',
    'event_sponsorships',
    'fighter_fight_history',
    'bout_scores',
    'profile_posts',
    'profile_post_comments',
    'message_threads',
    'message_thread_participants',
    'chat_threads',
    'chat_messages',
    'chat_thread_participants',
    'notification_preferences',
    'profile_follows',
    'event_follows',
    'sponsorships',
    'fighter_belts'
  )
ORDER BY status DESC, table_name;

-- Summary: Count missing critical tables
SELECT 
  COUNT(*) FILTER (WHERE table_name IN (
    'stream_payments',
    'event_bouts',
    'event_bout_offers',
    'notifications',
    'payout_requests',
    'content_reports',
    'event_sponsorships',
    'fighter_fight_history'
  )) as existing_critical_tables,
  8 - COUNT(*) FILTER (WHERE table_name IN (
    'stream_payments',
    'event_bouts',
    'event_bout_offers',
    'notifications',
    'payout_requests',
    'content_reports',
    'event_sponsorships',
    'fighter_fight_history'
  )) as missing_critical_tables
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN (
    'stream_payments',
    'event_bouts',
    'event_bout_offers',
    'notifications',
    'payout_requests',
    'content_reports',
    'event_sponsorships',
    'fighter_fight_history'
  );
