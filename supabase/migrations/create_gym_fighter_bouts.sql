-- Gym-added upcoming fighter bouts (for fights not yet on Apex)
CREATE TABLE IF NOT EXISTS gym_fighter_bouts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  gym_profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  fighter_name TEXT NOT NULL,
  fighter_profile_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  event_name TEXT NOT NULL,
  event_date DATE NOT NULL,
  opponent_name TEXT,
  location TEXT,
  weight_class TEXT,
  discipline TEXT,
  tickets_url TEXT,
  fighter_social TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE gym_fighter_bouts ENABLE ROW LEVEL SECURITY;

-- Gym owner can fully manage their own bouts
CREATE POLICY "Gym owner can manage their bouts"
  ON gym_fighter_bouts FOR ALL
  USING (gym_profile_id = auth.uid())
  WITH CHECK (gym_profile_id = auth.uid());

-- Everyone can read
CREATE POLICY "Anyone can view gym fighter bouts"
  ON gym_fighter_bouts FOR SELECT
  USING (true);
