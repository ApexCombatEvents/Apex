-- ============================================
-- Check and Create Storage Policies (RLS)
-- Run this in your production Supabase SQL Editor
-- ============================================

-- Step 1: Check existing storage policies (optional - skip if you want)
-- Note: We use pg_policies since storage.policies view doesn't exist
SELECT 
  policyname,
  cmd as operation
FROM pg_policies
WHERE schemaname = 'storage' 
  AND tablename = 'objects'
  AND (
    policyname LIKE '%avatars%' 
    OR policyname LIKE '%banners%' 
    OR policyname LIKE '%post-images%' 
    OR policyname LIKE '%event-banners%'
  )
ORDER BY policyname, cmd;

-- Step 2: Drop existing policies if they exist (to recreate them cleanly)
-- Note: This is optional - only run if you want to recreate all policies

-- Step 3: Create storage policies for all buckets
-- These policies allow:
-- - Public read (SELECT) - anyone can view images
-- - Authenticated upload (INSERT) - logged-in users can upload
-- - Own file update (UPDATE) - users can update their own files
-- - Own file delete (DELETE) - users can delete their own files

-- ============================================
-- AVATARS BUCKET POLICIES
-- ============================================

-- Public read access for avatars
DROP POLICY IF EXISTS "Public read access avatars" ON storage.objects;
CREATE POLICY "Public read access avatars" ON storage.objects
FOR SELECT USING (bucket_id = 'avatars');

-- Authenticated users can upload avatars
DROP POLICY IF EXISTS "Authenticated users can upload avatars" ON storage.objects;
CREATE POLICY "Authenticated users can upload avatars" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'avatars' AND auth.role() = 'authenticated'
);

-- Users can update own avatars
DROP POLICY IF EXISTS "Users can update own avatars" ON storage.objects;
CREATE POLICY "Users can update own avatars" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'avatars' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Users can delete own avatars
DROP POLICY IF EXISTS "Users can delete own avatars" ON storage.objects;
CREATE POLICY "Users can delete own avatars" ON storage.objects
FOR DELETE USING (
  bucket_id = 'avatars' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

-- ============================================
-- BANNERS BUCKET POLICIES
-- ============================================

-- Public read access for banners
DROP POLICY IF EXISTS "Public read access banners" ON storage.objects;
CREATE POLICY "Public read access banners" ON storage.objects
FOR SELECT USING (bucket_id = 'banners');

-- Authenticated users can upload banners
DROP POLICY IF EXISTS "Authenticated users can upload banners" ON storage.objects;
CREATE POLICY "Authenticated users can upload banners" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'banners' AND auth.role() = 'authenticated'
);

-- Users can update own banners
DROP POLICY IF EXISTS "Users can update own banners" ON storage.objects;
CREATE POLICY "Users can update own banners" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'banners' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Users can delete own banners
DROP POLICY IF EXISTS "Users can delete own banners" ON storage.objects;
CREATE POLICY "Users can delete own banners" ON storage.objects
FOR DELETE USING (
  bucket_id = 'banners' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

-- ============================================
-- POST-IMAGES BUCKET POLICIES
-- ============================================

-- Public read access for post-images
DROP POLICY IF EXISTS "Public read access post-images" ON storage.objects;
CREATE POLICY "Public read access post-images" ON storage.objects
FOR SELECT USING (bucket_id = 'post-images');

-- Authenticated users can upload post-images
DROP POLICY IF EXISTS "Authenticated users can upload post-images" ON storage.objects;
CREATE POLICY "Authenticated users can upload post-images" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'post-images' AND auth.role() = 'authenticated'
);

-- Users can update own post-images
DROP POLICY IF EXISTS "Users can update own post-images" ON storage.objects;
CREATE POLICY "Users can update own post-images" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'post-images' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Users can delete own post-images
DROP POLICY IF EXISTS "Users can delete own post-images" ON storage.objects;
CREATE POLICY "Users can delete own post-images" ON storage.objects
FOR DELETE USING (
  bucket_id = 'post-images' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

-- ============================================
-- EVENT-BANNERS BUCKET POLICIES
-- ============================================

-- Public read access for event-banners
DROP POLICY IF EXISTS "Public read access event-banners" ON storage.objects;
CREATE POLICY "Public read access event-banners" ON storage.objects
FOR SELECT USING (bucket_id = 'event-banners');

-- Authenticated users can upload event-banners
DROP POLICY IF EXISTS "Authenticated users can upload event-banners" ON storage.objects;
CREATE POLICY "Authenticated users can upload event-banners" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'event-banners' AND auth.role() = 'authenticated'
);

-- Users can update own event-banners
DROP POLICY IF EXISTS "Users can update own event-banners" ON storage.objects;
CREATE POLICY "Users can update own event-banners" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'event-banners' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Users can delete own event-banners
DROP POLICY IF EXISTS "Users can delete own event-banners" ON storage.objects;
CREATE POLICY "Users can delete own event-banners" ON storage.objects
FOR DELETE USING (
  bucket_id = 'event-banners' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Step 4: Verify all policies were created successfully
SELECT 
  policyname,
  cmd as operation,
  CASE 
    WHEN cmd = 'SELECT' THEN '✅ Read'
    WHEN cmd = 'INSERT' THEN '✅ Upload'
    WHEN cmd = 'UPDATE' THEN '✅ Update'
    WHEN cmd = 'DELETE' THEN '✅ Delete'
    ELSE cmd
  END as status
FROM pg_policies
WHERE schemaname = 'storage' 
  AND tablename = 'objects'
  AND (
    policyname LIKE '%avatars%' 
    OR policyname LIKE '%banners%' 
    OR policyname LIKE '%post-images%' 
    OR policyname LIKE '%event-banners%'
  )
ORDER BY policyname, cmd;

-- Expected result: 16 policies total (4 operations × 4 buckets)
-- avatars: SELECT, INSERT, UPDATE, DELETE
-- banners: SELECT, INSERT, UPDATE, DELETE
-- post-images: SELECT, INSERT, UPDATE, DELETE
-- event-banners: SELECT, INSERT, UPDATE, DELETE
