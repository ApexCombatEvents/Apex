-- Migration: Add fighter experience fields for fairer matchmaking
-- Adds years_training and interclub_count to profiles,
-- and a new fighter_discipline_records table for per-discipline record breakdowns.

-- 1. New columns on profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS years_training NUMERIC;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS interclub_count INTEGER;

-- 2. Cross-discipline record breakdown table
CREATE TABLE IF NOT EXISTS public.fighter_discipline_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fighter_profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,

  discipline TEXT NOT NULL,
  wins INTEGER NOT NULL DEFAULT 0,
  losses INTEGER NOT NULL DEFAULT 0,
  draws INTEGER NOT NULL DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT fighter_discipline_unique UNIQUE (fighter_profile_id, discipline),
  CONSTRAINT wins_non_negative CHECK (wins >= 0),
  CONSTRAINT losses_non_negative CHECK (losses >= 0),
  CONSTRAINT draws_non_negative CHECK (draws >= 0)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_fighter_discipline_records_fighter_id
  ON public.fighter_discipline_records(fighter_profile_id);

-- Enable RLS
ALTER TABLE public.fighter_discipline_records ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Anyone can view discipline records (public profiles)
CREATE POLICY "Public can view discipline records"
  ON public.fighter_discipline_records
  FOR SELECT
  USING (true);

-- Fighters can only insert their own discipline records
CREATE POLICY "Fighters can add their own discipline records"
  ON public.fighter_discipline_records
  FOR INSERT
  WITH CHECK (
    fighter_profile_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'FIGHTER'
    )
  );

-- Fighters can only update their own discipline records
CREATE POLICY "Fighters can update their own discipline records"
  ON public.fighter_discipline_records
  FOR UPDATE
  USING (fighter_profile_id = auth.uid())
  WITH CHECK (fighter_profile_id = auth.uid());

-- Fighters can only delete their own discipline records
CREATE POLICY "Fighters can delete their own discipline records"
  ON public.fighter_discipline_records
  FOR DELETE
  USING (fighter_profile_id = auth.uid());

-- Admins can manage any discipline records
CREATE POLICY "Admins can manage any discipline records"
  ON public.fighter_discipline_records
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'ADMIN'
    )
  );

-- updated_at trigger
CREATE OR REPLACE FUNCTION update_fighter_discipline_records_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS fighter_discipline_records_updated_at_trigger
  ON public.fighter_discipline_records;
CREATE TRIGGER fighter_discipline_records_updated_at_trigger
  BEFORE UPDATE ON public.fighter_discipline_records
  FOR EACH ROW
  EXECUTE FUNCTION update_fighter_discipline_records_updated_at();

COMMENT ON TABLE public.fighter_discipline_records IS 'Per-discipline win/loss/draw breakdown for fighter profiles';
COMMENT ON COLUMN public.fighter_discipline_records.discipline IS 'Combat discipline name, e.g. Boxing, Muay Thai, MMA';
