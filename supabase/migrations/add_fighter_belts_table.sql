-- Migration: Add fighter_belts table for fighters to manage their own belts
-- This allows fighters to add belts from promotions that aren't on Apex yet

CREATE TABLE IF NOT EXISTS public.fighter_belts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fighter_profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  
  -- Belt information
  belt_title TEXT NOT NULL,
  weight_class TEXT,
  promotion_name TEXT, -- Name of the promotion (e.g., "WBC", "UFC", "ISKA")
  belt_image_url TEXT, -- Optional image URL for the belt
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Enable RLS
ALTER TABLE public.fighter_belts ENABLE ROW LEVEL SECURITY;

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_fighter_belts_fighter_id 
  ON public.fighter_belts(fighter_profile_id);

-- RLS Policies

-- Public can view all belts (for display on profiles)
CREATE POLICY "Public can view fighter belts"
  ON public.fighter_belts
  FOR SELECT
  USING (true);

-- Fighters can insert their own belts
CREATE POLICY "Fighters can add their own belts"
  ON public.fighter_belts
  FOR INSERT
  WITH CHECK (
    fighter_profile_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND (p.role = 'FIGHTER' OR p.role = 'ADMIN')
    )
  );

-- Fighters can update their own belts
CREATE POLICY "Fighters can update their own belts"
  ON public.fighter_belts
  FOR UPDATE
  USING (
    fighter_profile_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role = 'ADMIN'
    )
  );

-- Fighters can delete their own belts
CREATE POLICY "Fighters can delete their own belts"
  ON public.fighter_belts
  FOR DELETE
  USING (
    fighter_profile_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role = 'ADMIN'
    )
  );

COMMENT ON TABLE public.fighter_belts IS 'Belts that fighters manage themselves, for promotions not on Apex';
COMMENT ON COLUMN public.fighter_belts.belt_title IS 'Full belt/champion title (e.g., "WBC Heavyweight Champion")';
COMMENT ON COLUMN public.fighter_belts.promotion_name IS 'Name of the promotion that awarded the belt';
