-- Migration: Fix content moderation to use profile_posts instead of posts
-- This adds moderation columns to profile_posts table

-- Add moderation status to profile_posts (the actual table being used)
ALTER TABLE public.profile_posts 
ADD COLUMN IF NOT EXISTS moderation_status text DEFAULT 'approved' CHECK (moderation_status IN ('approved', 'pending', 'hidden', 'deleted')),
ADD COLUMN IF NOT EXISTS moderation_notes text,
ADD COLUMN IF NOT EXISTS moderated_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS moderated_at timestamptz;

-- Add index for moderation status filtering on profile_posts
CREATE INDEX IF NOT EXISTS profile_posts_moderation_status_idx 
  ON public.profile_posts(moderation_status) 
  WHERE moderation_status != 'approved';
