-- Verify Row Level Security (RLS) Policies
-- Run this in your Supabase SQL Editor to check RLS status

-- 1. Check which tables have RLS enabled
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- 2. Check RLS policies on all tables
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd as command,
  qual as using_expression,
  with_check as with_check_expression
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- 3. Find tables that should have RLS but don't
-- (This will show tables that might need RLS enabled)
SELECT 
  tablename,
  'RLS NOT ENABLED' as status
FROM pg_tables
WHERE schemaname = 'public'
  AND rowsecurity = false
  AND tablename NOT IN (
    -- Add any system tables or tables that intentionally don't need RLS
    'schema_migrations'
  )
ORDER BY tablename;

-- 4. Count policies per table
SELECT 
  tablename,
  COUNT(*) as policy_count
FROM pg_policies
WHERE schemaname = 'public'
GROUP BY tablename
ORDER BY tablename;

-- 5. Check for tables with no policies (might need policies added)
SELECT 
  t.tablename,
  COUNT(p.policyname) as policy_count
FROM pg_tables t
LEFT JOIN pg_policies p ON t.tablename = p.tablename AND p.schemaname = 'public'
WHERE t.schemaname = 'public'
  AND t.rowsecurity = true
GROUP BY t.tablename
HAVING COUNT(p.policyname) = 0
ORDER BY t.tablename;

-- Expected Tables (examples - adjust based on your schema):
-- profiles, events, event_bouts, posts, payout_requests, notifications, etc.
-- All should have RLS enabled and appropriate policies

-- If you find tables without RLS enabled, enable it with:
-- ALTER TABLE table_name ENABLE ROW LEVEL SECURITY;

-- If you find tables without policies, you may need to add policies.
-- Refer to your migration files in supabase/migrations/ for policy examples.
