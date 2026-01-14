-- Create promotion_fighters table to link fighters to promotions
-- This allows promotions (like WBC, UFC, etc.) to display their champions and rosters

CREATE TABLE IF NOT EXISTS promotion_fighters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  promotion_profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  fighter_profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'retired', 'suspended')),
  rank text, -- e.g., "Champion", "1", "2", "3", "Interim Champion"
  weight_class text, -- e.g., "Heavyweight", "Lightweight", "70kg"
  belt_title text, -- e.g., "WBC Heavyweight Champion", "Interim Champion"
  joined_at timestamp with time zone DEFAULT now() NOT NULL,
  left_at timestamp with time zone,
  notes text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  UNIQUE(promotion_profile_id, fighter_profile_id)
);

-- Enable RLS
ALTER TABLE promotion_fighters ENABLE ROW LEVEL SECURITY;

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_promotion_fighters_promotion ON promotion_fighters(promotion_profile_id);
CREATE INDEX IF NOT EXISTS idx_promotion_fighters_fighter ON promotion_fighters(fighter_profile_id);
CREATE INDEX IF NOT EXISTS idx_promotion_fighters_status ON promotion_fighters(status);
CREATE INDEX IF NOT EXISTS idx_promotion_fighters_rank ON promotion_fighters(rank) WHERE rank IS NOT NULL;

-- RLS Policies
-- Promotions can view their own fighters
CREATE POLICY "Promotions can view their fighters"
  ON promotion_fighters
  FOR SELECT
  USING (
    promotion_profile_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role = 'ADMIN'
    )
  );

-- Promotions can insert fighters to their roster
CREATE POLICY "Promotions can add fighters"
  ON promotion_fighters
  FOR INSERT
  WITH CHECK (
    promotion_profile_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role = 'PROMOTION'
    )
  );

-- Promotions can update their fighters
CREATE POLICY "Promotions can update their fighters"
  ON promotion_fighters
  FOR UPDATE
  USING (
    promotion_profile_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role = 'ADMIN'
    )
  );

-- Promotions can delete fighters from their roster
CREATE POLICY "Promotions can remove fighters"
  ON promotion_fighters
  FOR DELETE
  USING (
    promotion_profile_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role = 'ADMIN'
    )
  );

-- Fighters can view their own promotion relationships
CREATE POLICY "Fighters can view their promotions"
  ON promotion_fighters
  FOR SELECT
  USING (fighter_profile_id = auth.uid());

-- Public can view active fighters (for display on promotion profiles)
CREATE POLICY "Public can view active fighters"
  ON promotion_fighters
  FOR SELECT
  USING (status = 'active');

COMMENT ON TABLE promotion_fighters IS 'Links fighters to promotions, tracks rank, weight class, and champion status';
COMMENT ON COLUMN promotion_fighters.rank IS 'Fighter rank in the promotion (e.g., "Champion", "1", "2", "Interim Champion")';
COMMENT ON COLUMN promotion_fighters.belt_title IS 'Full belt/champion title (e.g., "WBC Heavyweight Champion")';
COMMENT ON COLUMN promotion_fighters.status IS 'active: currently with promotion, inactive: on leave, retired: no longer competing, suspended: temporarily removed';


