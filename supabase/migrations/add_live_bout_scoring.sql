-- Migration: Add live bout scoring system
-- Run this in your Supabase SQL Editor

-- Add scoring fields to event_bouts table
ALTER TABLE public.event_bouts
ADD COLUMN IF NOT EXISTS current_round int,
ADD COLUMN IF NOT EXISTS total_rounds int DEFAULT 3,
ADD COLUMN IF NOT EXISTS round_time_seconds int,
ADD COLUMN IF NOT EXISTS is_live boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS round_started_at timestamptz,
ADD COLUMN IF NOT EXISTS bout_started_at timestamptz,
ADD COLUMN IF NOT EXISTS bout_ended_at timestamptz;

-- Create bout_scores table for round-by-round scoring
CREATE TABLE IF NOT EXISTS public.bout_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bout_id uuid NOT NULL REFERENCES public.event_bouts(id) ON DELETE CASCADE,
  round_number int NOT NULL,
  red_score int DEFAULT 0 CHECK (red_score >= 0 AND red_score <= 10),
  blue_score int DEFAULT 0 CHECK (blue_score >= 0 AND blue_score <= 10),
  scored_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(bout_id, round_number)
);

-- Add result fields if they don't exist (some may already exist)
ALTER TABLE public.event_bouts
ADD COLUMN IF NOT EXISTS result text CHECK (result IN ('red', 'blue', 'draw', 'no_contest', null)),
ADD COLUMN IF NOT EXISTS result_method text,
ADD COLUMN IF NOT EXISTS result_round int,
ADD COLUMN IF NOT EXISTS result_time text;

-- Enable RLS
ALTER TABLE public.bout_scores ENABLE ROW LEVEL SECURITY;

-- RLS Policies for bout_scores
CREATE POLICY "Public can view scores"
  ON public.bout_scores
  FOR SELECT
  USING (true);

CREATE POLICY "Event organizers can score"
  ON public.bout_scores
  FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.event_bouts eb
    JOIN public.events e ON e.id = eb.event_id
    WHERE eb.id = bout_id 
    AND (e.owner_profile_id = auth.uid() OR e.profile_id = auth.uid())
  ));

CREATE POLICY "Event organizers can update scores"
  ON public.bout_scores
  FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.event_bouts eb
    JOIN public.events e ON e.id = eb.event_id
    WHERE eb.id = bout_id 
    AND (e.owner_profile_id = auth.uid() OR e.profile_id = auth.uid())
  ));

CREATE POLICY "Admins can score any bout"
  ON public.bout_scores
  FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
  ));

-- Create indexes
CREATE INDEX IF NOT EXISTS bout_scores_bout_id_idx 
  ON public.bout_scores(bout_id);

CREATE INDEX IF NOT EXISTS bout_scores_bout_round_idx 
  ON public.bout_scores(bout_id, round_number);

CREATE INDEX IF NOT EXISTS event_bouts_is_live_idx 
  ON public.event_bouts(is_live) 
  WHERE is_live = true;

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_bout_scores_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS bout_scores_updated_at_trigger ON public.bout_scores;
CREATE TRIGGER bout_scores_updated_at_trigger
  BEFORE UPDATE ON public.bout_scores
  FOR EACH ROW
  EXECUTE FUNCTION update_bout_scores_updated_at();


