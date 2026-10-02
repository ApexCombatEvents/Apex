-- Migration: add_fight_card_icon
--
-- Fighters and coaches can now upload a second photo, their "fight picture",
-- used wherever they appear on a fight card. Profile pictures are often action
-- shots, which crop badly and read poorly at small sizes; a fight picture is
-- the face-to-camera promo shot a promoter would ask for before a real bout.
--
-- The column is nullable with no backfill and no default. Every render site
-- falls back to avatar_url when it is empty, so nothing changes for anyone who
-- never sets one. That is what makes this safe to apply ahead of the UI.
--
-- No RLS changes. The column lives on public.profiles and inherits the
-- existing policies, including the under-18 visibility restriction.
--
-- Images reuse the existing 'avatars' storage bucket. Paths are already
-- namespaced per user and timestamped, so no new bucket or policy is needed.
--
-- Safe to run more than once. Run this in the Supabase SQL Editor.

-- ---------------------------------------------------------------------------
-- 1. Column
-- ---------------------------------------------------------------------------

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS fight_card_icon_url TEXT;

COMMENT ON COLUMN public.profiles.fight_card_icon_url IS
  'Optional fight picture shown on fight cards. Falls back to avatar_url when null.';

-- ---------------------------------------------------------------------------
-- 2. Verification
-- ---------------------------------------------------------------------------

SELECT
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'profiles'
  AND column_name = 'fight_card_icon_url';

-- ---------------------------------------------------------------------------
-- Rollback
-- ---------------------------------------------------------------------------
--
-- ALTER TABLE public.profiles DROP COLUMN IF EXISTS fight_card_icon_url;
