-- ============================================
-- STORAGE BUCKET POLICIES SETUP (FIXED)
-- Run this in Supabase SQL Editor
-- This version drops existing policies first, then creates new ones
-- ============================================

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Public read access avatars" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own avatars" ON storage.objects;

DROP POLICY IF EXISTS "Public read access banners" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload banners" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own banners" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own banners" ON storage.objects;

DROP POLICY IF EXISTS "Public read access post-images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload post-images" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own post-images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own post-images" ON storage.objects;

DROP POLICY IF EXISTS "Public read access event-banners" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload event-banners" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own event-banners" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own event-banners" ON storage.objects;

-- ============================================
-- AVATARS BUCKET POLICIES
-- ============================================

-- Allow anyone to read (view) avatars (public bucket)
CREATE POLICY "Public read access avatars"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

-- Allow authenticated users to upload avatars
CREATE POLICY "Authenticated users can upload avatars"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'avatars' 
  AND auth.role() = 'authenticated'
);

-- Allow users to update their own avatars
CREATE POLICY "Users can update own avatars"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'avatars' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow users to delete their own avatars
CREATE POLICY "Users can delete own avatars"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'avatars' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- ============================================
-- BANNERS BUCKET POLICIES
-- ============================================

-- Allow anyone to read (view) banners (public bucket)
CREATE POLICY "Public read access banners"
ON storage.objects FOR SELECT
USING (bucket_id = 'banners');

-- Allow authenticated users to upload banners
CREATE POLICY "Authenticated users can upload banners"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'banners' 
  AND auth.role() = 'authenticated'
);

-- Allow users to update their own banners
CREATE POLICY "Users can update own banners"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'banners' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow users to delete their own banners
CREATE POLICY "Users can delete own banners"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'banners' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- ============================================
-- POST-IMAGES BUCKET POLICIES
-- ============================================

-- Allow anyone to read (view) post images (public bucket)
CREATE POLICY "Public read access post-images"
ON storage.objects FOR SELECT
USING (bucket_id = 'post-images');

-- Allow authenticated users to upload post images
CREATE POLICY "Authenticated users can upload post-images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'post-images' 
  AND auth.role() = 'authenticated'
);

-- Allow users to update their own post images
CREATE POLICY "Users can update own post-images"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'post-images' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow users to delete their own post images
CREATE POLICY "Users can delete own post-images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'post-images' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- ============================================
-- EVENT-BANNERS BUCKET POLICIES
-- ============================================

-- Allow anyone to read (view) event banners (public bucket)
CREATE POLICY "Public read access event-banners"
ON storage.objects FOR SELECT
USING (bucket_id = 'event-banners');

-- Allow authenticated users to upload event banners
CREATE POLICY "Authenticated users can upload event-banners"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'event-banners' 
  AND auth.role() = 'authenticated'
);

-- Allow users to update their own event banners
CREATE POLICY "Users can update own event-banners"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'event-banners' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow users to delete their own event banners
CREATE POLICY "Users can delete own event-banners"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'event-banners' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);
