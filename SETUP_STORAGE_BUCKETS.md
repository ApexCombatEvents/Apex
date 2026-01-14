# 🗂️ Setup Production Storage Buckets

**Status:** ⚠️ **CRITICAL** - Must be done before deployment

## 📋 Overview

Your application uses Supabase Storage to store user-uploaded images. You need to create these storage buckets in your **production** Supabase project.

---

## 🎯 Required Storage Buckets

Based on your codebase, you need these buckets:

1. **`avatars`** - User profile pictures (public)
2. **`banners`** - User/event banner images (public)
3. **`post-images`** - Social media post images (public)

---

## 🚀 Step-by-Step Instructions

### Step 1: Access Supabase Storage

1. Go to your [Supabase Dashboard](https://app.supabase.com)
2. Select your **production** project (NOT local/staging)
3. Click on **Storage** in the left sidebar
4. You should see an empty list or existing buckets

### Step 2: Create Each Bucket

For each bucket below, follow these steps:

#### Create `avatars` Bucket

1. Click **"New bucket"** button
2. **Bucket name:** `avatars`
3. **Public bucket:** ✅ **YES** (toggle ON - this makes images publicly accessible)
4. **File size limit:** Leave default or set appropriate limit (e.g., 5MB)
5. **Allowed MIME types:** Leave empty (allows all image types) or restrict to: `image/jpeg,image/png,image/webp,image/gif`
6. Click **"Create bucket"**

#### Create `banners` Bucket

1. Click **"New bucket"** button
2. **Bucket name:** `banners`
3. **Public bucket:** ✅ **YES** (toggle ON)
4. **File size limit:** Leave default or set limit (e.g., 10MB for larger banner images)
5. **Allowed MIME types:** Leave empty or restrict to: `image/jpeg,image/png,image/webp`
6. Click **"Create bucket"**

#### Create `post-images` Bucket

1. Click **"New bucket"** button
2. **Bucket name:** `post-images`
3. **Public bucket:** ✅ **YES** (toggle ON)
4. **File size limit:** Leave default or set limit (e.g., 10MB)
5. **Allowed MIME types:** Leave empty or restrict to: `image/jpeg,image/png,image/webp`
6. Click **"Create bucket"**

---

## 🔒 Step 3: Set Up Storage Policies (RLS)

After creating the buckets, you need to set up storage policies so users can upload and access files. 

### Option A: Using SQL Editor (Recommended)

Go to **SQL Editor** in Supabase Dashboard and run the following:

```sql
-- Storage Policies for avatars bucket
CREATE POLICY "Public read access avatars" ON storage.objects
FOR SELECT USING (bucket_id = 'avatars');

CREATE POLICY "Authenticated users can upload avatars" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'avatars' AND auth.role() = 'authenticated'
);

CREATE POLICY "Users can update own avatars" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'avatars' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete own avatars" ON storage.objects
FOR DELETE USING (
  bucket_id = 'avatars' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Storage Policies for banners bucket
CREATE POLICY "Public read access banners" ON storage.objects
FOR SELECT USING (bucket_id = 'banners');

CREATE POLICY "Authenticated users can upload banners" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'banners' AND auth.role() = 'authenticated'
);

CREATE POLICY "Users can update own banners" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'banners' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete own banners" ON storage.objects
FOR DELETE USING (
  bucket_id = 'banners' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Storage Policies for post-images bucket
CREATE POLICY "Public read access post-images" ON storage.objects
FOR SELECT USING (bucket_id = 'post-images');

CREATE POLICY "Authenticated users can upload post-images" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'post-images' AND auth.role() = 'authenticated'
);

CREATE POLICY "Users can update own post-images" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'post-images' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete own post-images" ON storage.objects
FOR DELETE USING (
  bucket_id = 'post-images' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);
```

**Note:** If you get "policy already exists" errors, that's fine - it means the policies were already created. The policies use `IF NOT EXISTS` logic in some migrations, but you may need to check for existing policies first.

### Option B: Using Storage UI (Alternative)

You can also set policies via the Storage UI:
1. Go to **Storage** → Select a bucket (e.g., `avatars`)
2. Click on **"Policies"** tab
3. Click **"New policy"**
4. Create policies for SELECT, INSERT, UPDATE, DELETE operations
5. Repeat for each bucket

**However, the SQL method above is faster and more reliable.**

---

## ✅ Verification

After creating buckets and policies, verify everything is set up correctly:

### Check Buckets Exist

Run this in SQL Editor:

```sql
SELECT 
  name,
  public,
  created_at
FROM storage.buckets
WHERE name IN ('avatars', 'banners', 'post-images')
ORDER BY name;
```

All three buckets should appear, and `public` should be `true` for all.

### Check Storage Policies

Run this in SQL Editor:

```sql
SELECT 
  bucket_id,
  policyname,
  cmd as operation
FROM storage.policies
WHERE bucket_id IN ('avatars', 'banners', 'post-images')
ORDER BY bucket_id, cmd;
```

You should see policies for SELECT, INSERT, UPDATE, DELETE for each bucket.

---

## 🔍 Common Issues & Solutions

### Issue: "Bucket already exists"
**Solution:** That's fine! The bucket already exists. Just verify it's public and has the correct policies.

### Issue: "Policy already exists"
**Solution:** That's fine! The policy was already created. You can skip that policy or use `CREATE POLICY IF NOT EXISTS` (PostgreSQL 9.5+).

### Issue: "Permission denied"
**Solution:** Make sure you're using the Supabase Dashboard SQL Editor (which has full permissions), not a limited user account.

### Issue: Files aren't publicly accessible
**Solution:** 
1. Verify the bucket is set to "Public" in Storage settings
2. Verify the SELECT policy exists and allows public access
3. Check that the bucket name matches exactly (case-sensitive)

---

## 📝 Checklist

After setup, verify:

- [ ] `avatars` bucket exists and is public
- [ ] `banners` bucket exists and is public
- [ ] `post-images` bucket exists and is public
- [ ] All buckets have SELECT policy (public read)
- [ ] All buckets have INSERT policy (authenticated upload)
- [ ] All buckets have UPDATE policy (users can update own files)
- [ ] All buckets have DELETE policy (users can delete own files)
- [ ] Test upload works (try uploading an avatar)

---

## ⚠️ Important Notes

1. **Public Buckets:** These buckets are public, meaning anyone with the URL can access the images. This is normal for profile pictures, banners, and post images.

2. **File Organization:** Your code stores files using paths like `{userId}/filename`, which allows the policies to verify ownership.

3. **Storage Limits:** Supabase free tier includes 1GB storage. Monitor usage in the Dashboard.

4. **File Size Limits:** Consider setting reasonable file size limits to prevent abuse.

---

## 🚀 Next Steps

After completing storage bucket setup:

1. ✅ Verify all buckets exist and are public
2. ✅ Verify all policies are set up
3. → Move to **Step 3: Set Environment Variables** (next critical step)

---

## 📞 Need Help?

- **Supabase Docs:** [Storage Setup](https://supabase.com/docs/guides/storage)
- **Supabase Support:** Dashboard → Support
- **Storage Policies:** [Storage RLS](https://supabase.com/docs/guides/storage/security/access-control)
