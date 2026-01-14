-- Check Existing RLS Policies for chat_thread_participants
-- This will show you what the existing policies actually do

-- Get detailed policy information
SELECT 
  tablename,
  policyname,
  cmd as command,
  qual as using_expression,
  with_check as with_check_expression
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'chat_thread_participants'
ORDER BY cmd, policyname;

-- Compare what each policy does:
-- 
-- SELECT policies:
-- 1. "Users see their own thread participation" - what does this check?
-- 2. "Users can view participants in their threads" - checks if user is in the thread
--
-- INSERT policies:
-- 1. "Insert own participation" - what does this check?
-- 2. "Users can be added as participants" - checks auth.uid() = profile_id
