-- Migration: Add language preference to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS preferred_language TEXT DEFAULT 'en' CHECK (preferred_language IN ('en', 'es'));
