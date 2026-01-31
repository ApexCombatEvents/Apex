-- Add support for multiple images in posts
-- This migration adds an image_urls JSONB column to store arrays of image URLs

ALTER TABLE public.profile_posts
ADD COLUMN IF NOT EXISTS image_urls JSONB;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_profile_posts_image_urls 
ON public.profile_posts USING GIN (image_urls);

-- Migrate existing single image_url to image_urls array for backward compatibility
UPDATE public.profile_posts
SET image_urls = jsonb_build_array(image_url)
WHERE image_url IS NOT NULL 
  AND (image_urls IS NULL OR image_urls = 'null'::jsonb);
