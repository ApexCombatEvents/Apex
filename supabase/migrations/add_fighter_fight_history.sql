-- Migration: Add fighter_fight_history table for manual fight entries
-- This allows fighters to add fights they participated in that weren't on Apex

CREATE TABLE IF NOT EXISTS public.fighter_fight_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fighter_profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  
  -- Fight details
  event_name TEXT NOT NULL,
  event_date DATE NOT NULL,
  opponent_name TEXT NOT NULL,
  location TEXT, -- e.g., "London, UK" or "Las Vegas, NV"
  
  -- Result
  result TEXT NOT NULL CHECK (result IN ('win', 'loss', 'draw', 'no_contest')),
  result_method TEXT, -- e.g., "KO", "TKO", "Decision", "Submission", "DQ"
  result_round INTEGER, -- Round number if applicable
  result_time TEXT, -- e.g., "2:34" for time in round
  
  -- Additional details
  weight_class TEXT, -- e.g., "70kg", "Welterweight"
  martial_art TEXT, -- e.g., "Muay Thai", "MMA", "Boxing"
  notes TEXT, -- Additional notes about the fight
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_fighter_fight_history_fighter_id 
  ON public.fighter_fight_history(fighter_profile_id);

CREATE INDEX IF NOT EXISTS idx_fighter_fight_history_event_date 
  ON public.fighter_fight_history(fighter_profile_id, event_date DESC);

-- Enable Row Level Security
ALTER TABLE public.fighter_fight_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Anyone can view fight history (public profiles)
CREATE POLICY "Public can view fight history"
  ON public.fighter_fight_history
  FOR SELECT
  USING (true);

-- Fighters can only insert their own fight history
CREATE POLICY "Fighters can add their own fight history"
  ON public.fighter_fight_history
  FOR INSERT
  WITH CHECK (
    fighter_profile_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'FIGHTER'
    )
  );

-- Fighters can only update their own fight history
CREATE POLICY "Fighters can update their own fight history"
  ON public.fighter_fight_history
  FOR UPDATE
  USING (fighter_profile_id = auth.uid())
  WITH CHECK (fighter_profile_id = auth.uid());

-- Fighters can only delete their own fight history
CREATE POLICY "Fighters can delete their own fight history"
  ON public.fighter_fight_history
  FOR DELETE
  USING (fighter_profile_id = auth.uid());

-- Admins can manage any fight history
CREATE POLICY "Admins can manage any fight history"
  ON public.fighter_fight_history
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'ADMIN'
    )
  );

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_fighter_fight_history_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS fighter_fight_history_updated_at_trigger 
  ON public.fighter_fight_history;
CREATE TRIGGER fighter_fight_history_updated_at_trigger
  BEFORE UPDATE ON public.fighter_fight_history
  FOR EACH ROW
  EXECUTE FUNCTION update_fighter_fight_history_updated_at();

-- Add comments for documentation
COMMENT ON TABLE public.fighter_fight_history IS 'Manual fight history entries added by fighters for fights not tracked on Apex';
COMMENT ON COLUMN public.fighter_fight_history.result IS 'Fight result: win, loss, draw, or no_contest';
COMMENT ON COLUMN public.fighter_fight_history.result_method IS 'How the fight ended: KO, TKO, Decision, Submission, DQ, etc.';

