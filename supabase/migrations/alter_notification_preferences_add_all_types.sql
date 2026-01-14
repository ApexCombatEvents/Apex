-- Add all notification type preferences to notification_preferences table
-- Run this in your Supabase SQL Editor
-- IMPORTANT: Make sure you've run add_notification_preferences.sql first!

-- First, ensure the table exists with all base columns
CREATE TABLE IF NOT EXISTS notification_preferences (
  profile_id uuid PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  notify_event_follow boolean NOT NULL DEFAULT true,
  notify_event_bout_matched boolean NOT NULL DEFAULT true,
  notify_post_comment boolean NOT NULL DEFAULT true,
  notify_new_message boolean NOT NULL DEFAULT true,
  notify_product_updates boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS if not already enabled
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

-- Create policies if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'notification_preferences' 
    AND policyname = 'Own notification preferences read'
  ) THEN
    CREATE POLICY "Own notification preferences read"
      ON notification_preferences
      FOR SELECT
      USING (profile_id = auth.uid());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'notification_preferences' 
    AND policyname = 'Own notification preferences insert'
  ) THEN
    CREATE POLICY "Own notification preferences insert"
      ON notification_preferences
      FOR INSERT
      WITH CHECK (profile_id = auth.uid());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'notification_preferences' 
    AND policyname = 'Own notification preferences update'
  ) THEN
    CREATE POLICY "Own notification preferences update"
      ON notification_preferences
      FOR UPDATE
      USING (profile_id = auth.uid());
  END IF;
END $$;

-- Add new columns (one at a time with IF NOT EXISTS)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notification_preferences' AND column_name = 'notify_follow') THEN
    ALTER TABLE notification_preferences ADD COLUMN notify_follow boolean NOT NULL DEFAULT true;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notification_preferences' AND column_name = 'notify_post_like') THEN
    ALTER TABLE notification_preferences ADD COLUMN notify_post_like boolean NOT NULL DEFAULT true;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notification_preferences' AND column_name = 'notify_event_like') THEN
    ALTER TABLE notification_preferences ADD COLUMN notify_event_like boolean NOT NULL DEFAULT true;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notification_preferences' AND column_name = 'notify_event_comment') THEN
    ALTER TABLE notification_preferences ADD COLUMN notify_event_comment boolean NOT NULL DEFAULT true;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notification_preferences' AND column_name = 'notify_event_live') THEN
    ALTER TABLE notification_preferences ADD COLUMN notify_event_live boolean NOT NULL DEFAULT true;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notification_preferences' AND column_name = 'notify_bout_offer') THEN
    ALTER TABLE notification_preferences ADD COLUMN notify_bout_offer boolean NOT NULL DEFAULT true;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notification_preferences' AND column_name = 'notify_bout_assigned') THEN
    ALTER TABLE notification_preferences ADD COLUMN notify_bout_assigned boolean NOT NULL DEFAULT true;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notification_preferences' AND column_name = 'notify_bout_result') THEN
    ALTER TABLE notification_preferences ADD COLUMN notify_bout_result boolean NOT NULL DEFAULT true;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notification_preferences' AND column_name = 'notify_payout_processed') THEN
    ALTER TABLE notification_preferences ADD COLUMN notify_payout_processed boolean NOT NULL DEFAULT true;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notification_preferences' AND column_name = 'notify_payout_rejected') THEN
    ALTER TABLE notification_preferences ADD COLUMN notify_payout_rejected boolean NOT NULL DEFAULT true;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notification_preferences' AND column_name = 'notify_payout_failed') THEN
    ALTER TABLE notification_preferences ADD COLUMN notify_payout_failed boolean NOT NULL DEFAULT true;
  END IF;
END $$;

