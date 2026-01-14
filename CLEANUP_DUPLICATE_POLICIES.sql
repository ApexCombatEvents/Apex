-- Cleanup Duplicate RLS Policies for chat_thread_participants
-- This removes redundant policies, keeping the better ones

-- ============================================
-- Cleanup chat_thread_participants policies
-- ============================================

-- Remove duplicate INSERT policy
-- "Users can be added as participants" is redundant with "Insert own participation"
DROP POLICY IF EXISTS "Users can be added as participants" ON chat_thread_participants;

-- Remove redundant SELECT policy
-- "Users see their own thread participation" only shows own row
-- "Users can view participants in their threads" is better (shows all participants in threads user is part of)
DROP POLICY IF EXISTS "Users see their own thread participation" ON chat_thread_participants;

-- ============================================
-- Verification
-- ============================================

-- Check remaining policies
SELECT 
  tablename,
  policyname,
  cmd as command
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'chat_thread_participants'
ORDER BY cmd, policyname;

-- Expected result:
-- - "Insert own participation" (INSERT)
-- - "Users can view participants in their threads" (SELECT)
-- - "Users can remove themselves" (DELETE)
