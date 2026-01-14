-- Quick RLS Verification Check
-- Run this in your production Supabase SQL Editor to verify RLS is enabled and policies exist

-- 1. Check RLS is enabled on critical tables
SELECT 
  tablename,
  CASE 
    WHEN rowsecurity = true THEN '✅ RLS Enabled'
    ELSE '❌ RLS Disabled'
  END as rls_status
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN (
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
    'chat_threads',
    'chat_messages',
    'chat_thread_participants',
    'profile_follows',
    'event_follows',
    'sponsorships',
    'notification_preferences'
  )
ORDER BY tablename;

-- 2. Count policies per table (should have at least 1 policy each)
SELECT 
  tablename,
  COUNT(*) as policy_count,
  CASE 
    WHEN COUNT(*) > 0 THEN '✅ Has Policies'
    ELSE '⚠️ No Policies'
  END as policy_status
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN (
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
    'chat_threads',
    'chat_messages',
    'chat_thread_participants',
    'profile_follows',
    'event_follows',
    'sponsorships',
    'notification_preferences'
  )
GROUP BY tablename
ORDER BY tablename;

-- 3. Find tables with RLS enabled but no policies (needs attention)
SELECT 
  t.tablename,
  '⚠️ RLS Enabled but NO POLICIES' as status
FROM pg_tables t
LEFT JOIN pg_policies p ON t.tablename = p.tablename AND p.schemaname = 'public'
WHERE t.schemaname = 'public'
  AND t.rowsecurity = true
  AND t.tablename IN (
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
    'chat_threads',
    'chat_messages',
    'chat_thread_participants',
    'profile_follows',
    'event_follows',
    'sponsorships',
    'notification_preferences'
  )
GROUP BY t.tablename
HAVING COUNT(p.policyname) = 0
ORDER BY t.tablename;
