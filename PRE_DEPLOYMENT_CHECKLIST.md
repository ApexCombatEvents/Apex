# Pre-Deployment Checklist

## ✅ Completed

- [x] Payment verification working
- [x] Webhook configured and tested locally
- [x] Terms of Service page exists
- [x] Privacy Policy page exists

---

## 🎯 Next Steps (Before Deployment)

### 1. Verify Database Migrations ✅ **CRITICAL**

**Check if all migrations are applied:**

Run this in Supabase SQL Editor to verify key tables exist:

```sql
-- Check if key tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN (
    'fighter_fight_history',
    'content_reports',
    'stream_payments',
    'event_bouts',
    'event_sponsorships',
    'notifications',
    'payout_requests',
    'event_bout_offers',
    'offer_payments'
  )
ORDER BY table_name;
```

**If any tables are missing:**
1. Go to Supabase Dashboard → SQL Editor
2. Run the missing migration files from `supabase/migrations/`
3. They're designed to be idempotent (safe to run multiple times)

**Total migrations to verify:** 33 files in `supabase/migrations/`

---

### 2. Verify Supabase Storage Buckets ✅ **CRITICAL**

Your app uses these storage buckets:
- `avatars` - For user profile pictures
- `banners` - For user profile banners  
- `post-images` - For social media post images

**Steps:**
1. Go to Supabase Dashboard → Storage
2. Check if these buckets exist
3. If missing, create them:
   - Click "New bucket"
   - Name: `avatars` → Public bucket
   - Name: `banners` → Public bucket
   - Name: `post-images` → Public bucket

**Set up storage policies:**

Run this in Supabase SQL Editor for each bucket:

```sql
-- For avatars bucket
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

-- For banners bucket
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

-- For post-images bucket
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

---

### 3. Test Critical User Flows ✅ **IMPORTANT**

Test these flows before deploying:

- [ ] **User signup** - Create a new account
- [ ] **User login** - Login with email and username
- [ ] **Profile creation/editing** - Update profile, upload avatar/banner
- [ ] **Event creation** - Create a new event
- [ ] **Bout management** - Add/edit bouts
- [ ] **Stream payment flow** - Purchase stream access (test card: `4242 4242 4242 4242`)
- [ ] **Offer fee payment flow** - Send a bout offer with payment
- [ ] **Content moderation** - Report content, block users
- [ ] **Admin dashboard** - Access admin features (if you have admin role)
- [ ] **Fight history** - Add fight history to fighter profiles
- [ ] **File uploads** - Upload images (avatars, banners, post images)

---

### 4. Create `.env.example` File ✅ **RECOMMENDED**

Create a `.env.example` file documenting all required environment variables:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Optional: For local development
# SUPABASE_URL=your_supabase_url (if using inconsistent variable)
```

**Note:** Don't commit actual secrets! This is just a template.

---

### 5. Review Security Settings ✅ **CRITICAL**

**Check these before launch:**

1. **Middleware security** - Review `middleware.ts`
   - Should use anon key for session refresh, not service role key
   
2. **RLS Policies** - Verify Row Level Security is enabled on all tables:
   ```sql
   -- Check RLS status
   SELECT tablename, rowsecurity 
   FROM pg_tables 
   WHERE schemaname = 'public';
   ```

3. **Admin routes** - Verify admin-only routes are protected

---

## 🚀 Deployment Preparation

### When Ready to Deploy:

1. **Choose hosting platform:**
   - Vercel (recommended for Next.js)
   - Or your preferred platform

2. **Set production environment variables:**
   - All variables from `.env.example`
   - Use **live** Stripe keys (not test keys)
   - Use production Supabase credentials

3. **Configure Stripe webhook for production:**
   - Go to Stripe Dashboard → Webhooks (Live mode)
   - Add endpoint: `https://yourdomain.com/api/stripe/webhook`
   - Select event: `checkout.session.completed`
   - Copy the **live** webhook secret
   - Add to production environment variables

4. **Run all migrations in production Supabase:**
   - Go to production Supabase Dashboard → SQL Editor
   - Run all migration files from `supabase/migrations/`

5. **Create storage buckets in production:**
   - Same buckets as local: `avatars`, `banners`, `post-images`
   - Set up storage policies (same as above)

6. **Test in production:**
   - Make a test payment
   - Verify webhook works
   - Test file uploads
   - Test all critical flows

---

## 📋 Quick Verification Commands

### Check Database Tables:
```sql
SELECT COUNT(*) as migration_count 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_type = 'BASE TABLE';
```

### Check Storage Buckets:
```sql
SELECT name, public 
FROM storage.buckets;
```

### Check RLS Policies:
```sql
SELECT schemaname, tablename, policyname 
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
```

---

## 🎯 Priority Order

1. ✅ Verify database migrations
2. ✅ Verify storage buckets exist
3. ✅ Test critical user flows
4. ✅ Create `.env.example`
5. ✅ Review security settings
6. 🚀 Deploy to production
7. 🚀 Configure production webhook
8. 🚀 Test everything in production

---

## Need Help?

- **Database issues:** Check Supabase Dashboard → SQL Editor
- **Storage issues:** Check Supabase Dashboard → Storage
- **Webhook issues:** Check Stripe Dashboard → Webhooks
- **Payment issues:** Check Stripe Dashboard → Payments
