-- ============================================
-- Check and Create Storage Buckets
-- Run this in your production Supabase SQL Editor
-- ============================================

-- Step 1: Check existing buckets
SELECT 
  name,
  public,
  created_at,
  CASE 
    WHEN name IN ('avatars', 'banners', 'post-images', 'event-banners') THEN '✅ Required'
    ELSE '❌ Not Required'
  END as status
FROM storage.buckets
WHERE name IN ('avatars', 'banners', 'post-images', 'event-banners')
ORDER BY name;

-- Step 2: Create missing buckets (all at once)
-- This will create buckets that don't exist, and skip ones that do

-- Create avatars bucket (if it doesn't exist)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('avatars', 'avatars', true, 5242880, NULL)
ON CONFLICT (id) DO NOTHING;

-- Create banners bucket (if it doesn't exist)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('banners', 'banners', true, 10485760, NULL)
ON CONFLICT (id) DO NOTHING;

-- Create post-images bucket (if it doesn't exist)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('post-images', 'post-images', true, 10485760, NULL)
ON CONFLICT (id) DO NOTHING;

-- Create event-banners bucket (if it doesn't exist)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('event-banners', 'event-banners', true, 10485760, NULL)
ON CONFLICT (id) DO NOTHING;

-- Step 3: Verify all buckets were created successfully
SELECT 
  name,
  public,
  created_at,
  CASE 
    WHEN public = true THEN '✅ Public'
    ELSE '❌ Not Public'
  END as public_status
FROM storage.buckets
WHERE name IN ('avatars', 'banners', 'post-images', 'event-banners')
ORDER BY name;
