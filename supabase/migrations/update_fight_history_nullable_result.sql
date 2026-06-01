-- Allow result to be NULL for upcoming fights (no result yet)
ALTER TABLE fighter_fight_history ALTER COLUMN result DROP NOT NULL;
