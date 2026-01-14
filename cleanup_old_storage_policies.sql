-- ============================================
-- CLEANUP OLD STORAGE POLICIES (OPTIONAL)
-- This removes old policies with different names
-- Only run this if you want to clean up
-- ============================================

-- Drop old avatar policies
DROP POLICY IF EXISTS "Anyone can view avatars" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated can insert avatars" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated can update avatars" ON storage.objects;
DROP POLICY IF EXISTS "Public read avatars" ON storage.objects;
DROP POLICY IF EXISTS "User delete own avatar folder" ON storage.objects;
DROP POLICY IF EXISTS "User insert own avatar folder" ON storage.objects;
DROP POLICY IF EXISTS "User update own avatar folder" ON storage.objects;

-- Drop old banner policies
DROP POLICY IF EXISTS "Anyone can view banners" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated can insert banners" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated can update banners" ON storage.objects;
DROP POLICY IF EXISTS "Public read banners" ON storage.objects;
DROP POLICY IF EXISTS "User delete own banner folder" ON storage.objects;
DROP POLICY IF EXISTS "User insert own banner folder" ON storage.objects;
DROP POLICY IF EXISTS "User update own banner folder" ON storage.objects;

-- Drop old post-images and event-banners policies
DROP POLICY IF EXISTS "Upload event banners 1faluac_0" ON storage.objects;
DROP POLICY IF EXISTS "Upload post images 1hys5dx_0" ON storage.objects;

-- Drop folder-specific policies (if you want to clean those up too)
-- These are auto-generated, so be careful
-- DROP POLICY IF EXISTS "Give users authenticated access to folder 1oj01fe_0" ON storage.objects;
-- DROP POLICY IF EXISTS "Give users authenticated access to folder 1oj01fe_1" ON storage.objects;
-- DROP POLICY IF EXISTS "Give users authenticated access to folder 1ps738_0" ON storage.objects;
-- DROP POLICY IF EXISTS "Give users authenticated access to folder 1ps738_1" ON storage.objects;
-- DROP POLICY IF EXISTS "Give users authenticated access to folder 1tghu4n_0" ON storage.objects;
-- DROP POLICY IF EXISTS "Give users authenticated access to folder 1tghu4n_1" ON storage.objects;
