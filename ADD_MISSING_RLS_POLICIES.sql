-- Add Missing RLS Policies
-- Run this in your Supabase SQL Editor to add policies for tables that have RLS enabled but no policies

-- ============================================
-- 1. gym_membership_requests
-- ============================================

-- Check if table exists and has RLS enabled
DO $$
BEGIN
  -- Check if table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'gym_membership_requests') THEN
    
    -- Enable RLS if not already enabled
    ALTER TABLE gym_membership_requests ENABLE ROW LEVEL SECURITY;

    -- Policy: Users can view their own membership requests
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE schemaname = 'public' 
      AND tablename = 'gym_membership_requests' 
      AND policyname = 'Users can view own membership requests'
    ) THEN
      CREATE POLICY "Users can view own membership requests"
        ON gym_membership_requests
        FOR SELECT
        USING (auth.uid() = fighter_id OR auth.uid() = gym_id);
    END IF;

    -- Policy: Users can create membership requests
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE schemaname = 'public' 
      AND tablename = 'gym_membership_requests' 
      AND policyname = 'Users can create membership requests'
    ) THEN
      CREATE POLICY "Users can create membership requests"
        ON gym_membership_requests
        FOR INSERT
        WITH CHECK (auth.uid() = fighter_id);
    END IF;

    -- Policy: Gym owners can update requests for their gym
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE schemaname = 'public' 
      AND tablename = 'gym_membership_requests' 
      AND policyname = 'Gym owners can update requests'
    ) THEN
      CREATE POLICY "Gym owners can update requests"
        ON gym_membership_requests
        FOR UPDATE
        USING (
          EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.id = gym_membership_requests.gym_id
            AND profiles.role = 'GYM'
          )
        );
    END IF;

    -- Policy: Users can delete their own requests, gym owners can delete requests for their gym
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE schemaname = 'public' 
      AND tablename = 'gym_membership_requests' 
      AND policyname = 'Users and gym owners can delete requests'
    ) THEN
      CREATE POLICY "Users and gym owners can delete requests"
        ON gym_membership_requests
        FOR DELETE
        USING (
          auth.uid() = fighter_id 
          OR EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.id = gym_membership_requests.gym_id
            AND profiles.role = 'GYM'
          )
        );
    END IF;

  END IF;
END $$;

-- ============================================
-- 2. message_thread_participants (or chat_thread_participants)
-- ============================================

-- Check which table name is used
DO $$
BEGIN
  -- Try chat_thread_participants first (more common name)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'chat_thread_participants') THEN
    
    ALTER TABLE chat_thread_participants ENABLE ROW LEVEL SECURITY;

    -- Policy: Users can view participants in threads they're part of
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE schemaname = 'public' 
      AND tablename = 'chat_thread_participants' 
      AND policyname = 'Users can view participants in their threads'
    ) THEN
      CREATE POLICY "Users can view participants in their threads"
        ON chat_thread_participants
        FOR SELECT
        USING (
          EXISTS (
            SELECT 1 FROM chat_thread_participants ctp2
            WHERE ctp2.thread_id = chat_thread_participants.thread_id
            AND ctp2.profile_id = auth.uid()
          )
        );
    END IF;

    -- Policy: Users can be added as participants (insert is usually done by system)
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE schemaname = 'public' 
      AND tablename = 'chat_thread_participants' 
      AND policyname = 'Users can be added as participants'
    ) THEN
      CREATE POLICY "Users can be added as participants"
        ON chat_thread_participants
        FOR INSERT
        WITH CHECK (auth.uid() = profile_id);
    END IF;

    -- Policy: Users can remove themselves from threads
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE schemaname = 'public' 
      AND tablename = 'chat_thread_participants' 
      AND policyname = 'Users can remove themselves'
    ) THEN
      CREATE POLICY "Users can remove themselves"
        ON chat_thread_participants
        FOR DELETE
        USING (auth.uid() = profile_id);
    END IF;

  -- Try message_thread_participants as alternative
  ELSIF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'message_thread_participants') THEN
    
    ALTER TABLE message_thread_participants ENABLE ROW LEVEL SECURITY;

    -- Policy: Users can view participants in threads they're part of
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE schemaname = 'public' 
      AND tablename = 'message_thread_participants' 
      AND policyname = 'Users can view participants in their threads'
    ) THEN
      CREATE POLICY "Users can view participants in their threads"
        ON message_thread_participants
        FOR SELECT
        USING (
          EXISTS (
            SELECT 1 FROM message_thread_participants mtp2
            WHERE mtp2.thread_id = message_thread_participants.thread_id
            AND mtp2.profile_id = auth.uid()
          )
        );
    END IF;

    -- Policy: Users can be added as participants
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE schemaname = 'public' 
      AND tablename = 'message_thread_participants' 
      AND policyname = 'Users can be added as participants'
    ) THEN
      CREATE POLICY "Users can be added as participants"
        ON message_thread_participants
        FOR INSERT
        WITH CHECK (auth.uid() = profile_id);
    END IF;

    -- Policy: Users can remove themselves from threads
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE schemaname = 'public' 
      AND tablename = 'message_thread_participants' 
      AND policyname = 'Users can remove themselves'
    ) THEN
      CREATE POLICY "Users can remove themselves"
        ON message_thread_participants
        FOR DELETE
        USING (auth.uid() = profile_id);
    END IF;

  END IF;
END $$;

-- ============================================
-- Verification
-- ============================================

-- Check policies after creation
SELECT 
  tablename,
  policyname,
  cmd as command
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('gym_membership_requests', 'chat_thread_participants', 'message_thread_participants')
ORDER BY tablename, policyname;
