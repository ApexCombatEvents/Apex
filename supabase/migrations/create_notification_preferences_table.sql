-- Create notification_preferences table with all columns
-- Run this in your Supabase SQL Editor

CREATE TABLE IF NOT EXISTS notification_preferences (
  profile_id uuid PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Social notifications
  notify_follow boolean NOT NULL DEFAULT true,
  notify_post_like boolean NOT NULL DEFAULT true,
  notify_post_comment boolean NOT NULL DEFAULT true,
  
  -- Event notifications
  notify_event_like boolean NOT NULL DEFAULT true,
  notify_event_comment boolean NOT NULL DEFAULT true,
  notify_event_follow boolean NOT NULL DEFAULT true,
  notify_event_bout_matched boolean NOT NULL DEFAULT true,
  notify_event_live boolean NOT NULL DEFAULT true,
  
  -- Bout notifications
  notify_bout_offer boolean NOT NULL DEFAULT true,
  notify_bout_assigned boolean NOT NULL DEFAULT true,
  notify_bout_result boolean NOT NULL DEFAULT true,
  
  -- Message notifications
  notify_new_message boolean NOT NULL DEFAULT true,
  
  -- Payout notifications
  notify_payout_processed boolean NOT NULL DEFAULT true,
  notify_payout_rejected boolean NOT NULL DEFAULT true,
  notify_payout_failed boolean NOT NULL DEFAULT true,
  
  -- Product/marketing
  notify_product_updates boolean NOT NULL DEFAULT false,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Own notification preferences read"
  ON notification_preferences
  FOR SELECT
  USING (profile_id = auth.uid());

CREATE POLICY "Own notification preferences insert"
  ON notification_preferences
  FOR INSERT
  WITH CHECK (profile_id = auth.uid());

CREATE POLICY "Own notification preferences update"
  ON notification_preferences
  FOR UPDATE
  USING (profile_id = auth.uid());

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS notification_preferences_profile_id_idx
  ON notification_preferences(profile_id);


