-- Migration: add_fight_posters
-- Adds custom promotional poster support to fighter fights.
--   1. `poster_url` column on fighter_fight_history (manual / off-platform fights).
--   2. `fighter_bout_posters` table: per-fighter poster override for Apex platform
--      bouts (event_bouts), so a fighter can swap the auto-used event banner for
--      their own promo image without affecting the event or other fighters.

-- 1) Custom poster for manual fight-history entries
ALTER TABLE public.fighter_fight_history
  ADD COLUMN IF NOT EXISTS poster_url TEXT;

-- 2) Per-fighter poster override for platform bouts
CREATE TABLE IF NOT EXISTS public.fighter_bout_posters (
  id                 UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  fighter_profile_id UUID        REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  bout_id            UUID        REFERENCES public.event_bouts(id) ON DELETE CASCADE NOT NULL,
  poster_url         TEXT        NOT NULL,
  created_at         TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at         TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE (fighter_profile_id, bout_id)
);

ALTER TABLE public.fighter_bout_posters ENABLE ROW LEVEL SECURITY;

-- Anyone can read poster overrides (they are shown on public fighter profiles)
DROP POLICY IF EXISTS "Fight posters are viewable by everyone" ON public.fighter_bout_posters;
CREATE POLICY "Fight posters are viewable by everyone"
  ON public.fighter_bout_posters FOR SELECT
  USING (true);

-- A fighter can create their own override
DROP POLICY IF EXISTS "Fighters can insert own bout posters" ON public.fighter_bout_posters;
CREATE POLICY "Fighters can insert own bout posters"
  ON public.fighter_bout_posters FOR INSERT
  WITH CHECK (auth.uid() = fighter_profile_id);

-- A fighter can update their own override
DROP POLICY IF EXISTS "Fighters can update own bout posters" ON public.fighter_bout_posters;
CREATE POLICY "Fighters can update own bout posters"
  ON public.fighter_bout_posters FOR UPDATE
  USING (auth.uid() = fighter_profile_id)
  WITH CHECK (auth.uid() = fighter_profile_id);

-- A fighter can delete their own override (revert to the event poster)
DROP POLICY IF EXISTS "Fighters can delete own bout posters" ON public.fighter_bout_posters;
CREATE POLICY "Fighters can delete own bout posters"
  ON public.fighter_bout_posters FOR DELETE
  USING (auth.uid() = fighter_profile_id);

CREATE INDEX IF NOT EXISTS idx_fighter_bout_posters_fighter
  ON public.fighter_bout_posters(fighter_profile_id);
CREATE INDEX IF NOT EXISTS idx_fighter_bout_posters_bout
  ON public.fighter_bout_posters(bout_id);
