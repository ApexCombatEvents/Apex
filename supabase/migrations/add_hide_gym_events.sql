-- Allow gym profiles to hide their own created events and only show Fighter Events
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS hide_gym_events BOOLEAN NOT NULL DEFAULT false;
