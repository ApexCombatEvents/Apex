-- Migration: Add belt_image_url to promotion_fighters table
-- This allows fighters to display images of their championship belts

ALTER TABLE public.promotion_fighters
ADD COLUMN IF NOT EXISTS belt_image_url TEXT;

COMMENT ON COLUMN public.promotion_fighters.belt_image_url IS 'URL to an image of the championship belt';

-- Note: The existing RLS policies already allow:
-- 1. "Public can view active fighters" - allows anyone to view active fighters with belts
-- 2. "Fighters can view their promotions" - allows fighters to view their own belt records
-- These policies are sufficient for displaying belts on fighter profiles.
