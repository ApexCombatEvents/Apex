-- Migration: Add content moderation and reporting system
-- Run this in your Supabase SQL Editor

-- Add moderation status to posts and comments
ALTER TABLE public.posts 
ADD COLUMN IF NOT EXISTS moderation_status text DEFAULT 'approved' CHECK (moderation_status IN ('approved', 'pending', 'hidden', 'deleted')),
ADD COLUMN IF NOT EXISTS moderation_notes text,
ADD COLUMN IF NOT EXISTS moderated_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS moderated_at timestamptz;

ALTER TABLE public.profile_post_comments
ADD COLUMN IF NOT EXISTS moderation_status text DEFAULT 'approved' CHECK (moderation_status IN ('approved', 'pending', 'hidden', 'deleted')),
ADD COLUMN IF NOT EXISTS moderation_notes text,
ADD COLUMN IF NOT EXISTS moderated_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS moderated_at timestamptz;

ALTER TABLE public.event_comments
ADD COLUMN IF NOT EXISTS moderation_status text DEFAULT 'approved' CHECK (moderation_status IN ('approved', 'pending', 'hidden', 'deleted')),
ADD COLUMN IF NOT EXISTS moderation_notes text,
ADD COLUMN IF NOT EXISTS moderated_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS moderated_at timestamptz;

-- Create content_reports table
CREATE TABLE IF NOT EXISTS public.content_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content_type text NOT NULL CHECK (content_type IN ('post', 'profile_post_comment', 'event_comment')),
  content_id uuid NOT NULL,
  reason text NOT NULL CHECK (reason IN ('spam', 'harassment', 'hate_speech', 'inappropriate', 'false_info', 'other')),
  description text,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'reviewing', 'resolved', 'dismissed')),
  reviewed_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  resolution_notes text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(reporter_id, content_type, content_id) -- Prevent duplicate reports from same user
);

-- Create user_blocks table
CREATE TABLE IF NOT EXISTS public.user_blocks (
  blocker_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  blocked_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (blocker_id, blocked_id),
  CHECK (blocker_id != blocked_id)
);

-- Enable RLS
ALTER TABLE public.content_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_blocks ENABLE ROW LEVEL SECURITY;

-- RLS Policies for content_reports
CREATE POLICY "Users can report content"
  ON public.content_reports
  FOR INSERT
  WITH CHECK (auth.uid() = reporter_id);

CREATE POLICY "Users can view their own reports"
  ON public.content_reports
  FOR SELECT
  USING (auth.uid() = reporter_id OR EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
  ));

CREATE POLICY "Admins can update reports"
  ON public.content_reports
  FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
  ));

-- RLS Policies for user_blocks
CREATE POLICY "Users can block others"
  ON public.user_blocks
  FOR INSERT
  WITH CHECK (auth.uid() = blocker_id);

CREATE POLICY "Users can view their blocks"
  ON public.user_blocks
  FOR SELECT
  USING (auth.uid() = blocker_id OR auth.uid() = blocked_id);

CREATE POLICY "Users can unblock"
  ON public.user_blocks
  FOR DELETE
  USING (auth.uid() = blocker_id);

-- Create indexes
CREATE INDEX IF NOT EXISTS content_reports_content_idx 
  ON public.content_reports(content_type, content_id);

CREATE INDEX IF NOT EXISTS content_reports_status_idx 
  ON public.content_reports(status);

CREATE INDEX IF NOT EXISTS content_reports_reporter_idx 
  ON public.content_reports(reporter_id);

CREATE INDEX IF NOT EXISTS user_blocks_blocker_idx 
  ON public.user_blocks(blocker_id);

CREATE INDEX IF NOT EXISTS user_blocks_blocked_idx 
  ON public.user_blocks(blocked_id);

-- Add index for moderation status filtering
CREATE INDEX IF NOT EXISTS posts_moderation_status_idx 
  ON public.posts(moderation_status) 
  WHERE moderation_status != 'approved';

CREATE INDEX IF NOT EXISTS profile_post_comments_moderation_status_idx 
  ON public.profile_post_comments(moderation_status) 
  WHERE moderation_status != 'approved';

CREATE INDEX IF NOT EXISTS event_comments_moderation_status_idx 
  ON public.event_comments(moderation_status) 
  WHERE moderation_status != 'approved';


