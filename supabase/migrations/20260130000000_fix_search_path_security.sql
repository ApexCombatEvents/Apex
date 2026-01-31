-- Migration: Fix "role mutable search_path" security issues in database functions
-- This explicitly sets the search_path to 'public' for all custom functions
-- to prevent potential search_path hijacking attacks.

-- 1. update_bout_scores_updated_at
ALTER FUNCTION public.update_bout_scores_updated_at() SET search_path = public;

-- 2. update_fighter_fight_history_updated_at
ALTER FUNCTION public.update_fighter_fight_history_updated_at() SET search_path = public;

-- 3. update_offer_payments_updated_at
ALTER FUNCTION public.update_offer_payments_updated_at() SET search_path = public;

-- 4. calculate_fight_sequence
ALTER FUNCTION public.calculate_fight_sequence(UUID) SET search_path = public;

-- 5. update_fight_sequence
ALTER FUNCTION public.update_fight_sequence() SET search_path = public;

-- 6. recalculate_fight_sequence
ALTER FUNCTION public.recalculate_fight_sequence(UUID) SET search_path = public;

-- 7. normalize_profile_role (if it exists, based on dashboard warnings)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'normalize_profile_role') THEN
        ALTER FUNCTION public.normalize_profile_role() SET search_path = public;
    END IF;
END $$;
