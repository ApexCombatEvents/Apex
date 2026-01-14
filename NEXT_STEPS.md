# Next Steps for Production Launch

## 🎯 Priority 1: Critical for Launch (Do First)

### 1. Run All Database Migrations
**Status:** ⚠️ **CRITICAL** - Must be done before launch

You have **30 migration files** in `supabase/migrations/`. Run them all in your production Supabase database.

**Steps:**
1. Go to your Supabase Dashboard → SQL Editor
2. Run each migration file in order (they're designed to be idempotent with `IF NOT EXISTS`)
3. Verify all tables exist by checking the Table Editor

**Key migrations to verify:**
- ✅ `add_fighter_fight_history.sql` (just created)
- ✅ `add_content_moderation.sql`
- ✅ `add_stream_payment_fields.sql`
- ✅ `add_stream_payments_payment_intent.sql`
- ✅ `create_event_bouts_table.sql`
- ✅ `create_event_sponsorships_table.sql`
- ✅ All others in the migrations folder

**Quick verification query:**
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
    'event_sponsorships'
  );
```

---

### 2. Set Up Stripe Webhook
**Status:** ⚠️ **CRITICAL** - Required for payments to work

**Steps:**
1. Go to [Stripe Dashboard → Webhooks](https://dashboard.stripe.com/webhooks)
2. Click "Add endpoint"
3. Set endpoint URL: `https://yourdomain.com/api/stripe/webhook`
4. Select events to listen for:
   - `checkout.session.completed`
5. Copy the webhook signing secret
6. Add it to your production environment variables as `STRIPE_WEBHOOK_SECRET`

**Test the webhook:**
- Use Stripe CLI: `stripe listen --forward-to localhost:3000/api/stripe/webhook`
- Or use Stripe Dashboard test mode to send test events

---

### 3. Create Legal Pages
**Status:** ⚠️ **REQUIRED** - Legal compliance

Create these pages:
- `/terms` - Terms of Service
- `/privacy` - Privacy Policy

**Quick templates are provided below** - customize with your business details.

---

### 4. Verify Supabase Storage Buckets
**Status:** ⚠️ **CRITICAL** - File uploads won't work without this

**Steps:**
1. Go to Supabase Dashboard → Storage
2. Create these buckets (if they don't exist):
   - `avatars` - Public access
   - `event-banners` - Public access (or `banners` if that's what you're using)
   - `media` - Public access
3. Set up storage policies (RLS) for each bucket

**Storage policies example:**
```sql
-- Allow public read access
CREATE POLICY "Public read access" ON storage.objects
FOR SELECT USING (bucket_id = 'avatars');

-- Allow authenticated users to upload
CREATE POLICY "Authenticated users can upload" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'avatars' AND auth.role() = 'authenticated'
);
```

---

## 🎯 Priority 2: Important (Do Before Public Launch)

### 5. Set Up Error Logging
**Status:** ⚡ **HIGHLY RECOMMENDED**

Choose one:
- **Sentry** (free tier available): https://sentry.io
- **LogRocket** (free trial): https://logrocket.com
- **Vercel Analytics** (if deploying on Vercel)

**Quick Sentry setup:**
```bash
npm install @sentry/nextjs
npx @sentry/wizard@latest -i nextjs
```

---

### 6. Test Critical User Flows
**Status:** ✅ **MUST DO** - Test everything before launch

**Test checklist:**
- [ ] User signup
- [ ] User login (email and username)
- [ ] Profile creation/editing
- [ ] Event creation
- [ ] Bout management
- [ ] Stream payment flow (use Stripe test cards)
- [ ] Offer fee payment flow
- [ ] Content moderation (report, block)
- [ ] Admin dashboard access
- [ ] Fight history addition

**Stripe test cards:**
- Success: `4242 4242 4242 4242`
- Decline: `4000 0000 0000 0002`

---

### 7. Set Production Environment Variables
**Status:** ⚠️ **CRITICAL**

Copy all variables from `.env.example` to your production environment:

**Required variables:**
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (keep secret!)
- `STRIPE_SECRET_KEY` (use live key in production)
- `STRIPE_WEBHOOK_SECRET`

**Where to set:**
- Vercel: Project Settings → Environment Variables
- Other platforms: Check their documentation

---

## 🎯 Priority 3: Nice to Have (Can Add After Launch)

### 8. Add Rate Limiting
**Status:** 🔒 **SECURITY** - Prevents abuse

Consider adding rate limiting to:
- Login endpoint
- Signup endpoint
- Payment endpoints

**Options:**
- Vercel Edge Middleware with Upstash
- Next.js API routes with `@upstash/ratelimit`

---

### 9. Set Up Monitoring
**Status:** 📊 **RECOMMENDED**

- **Uptime monitoring:** UptimeRobot (free) or Pingdom
- **Database monitoring:** Supabase Dashboard
- **Payment monitoring:** Stripe Dashboard

---

### 10. Performance Optimization
**Status:** ⚡ **OPTIMIZATION**

- Review database indexes
- Add pagination to long lists
- Optimize images (already using Next.js Image)
- Consider caching for event listings

---

## 📋 Pre-Launch Checklist

Before going live, verify:

- [ ] All database migrations are run
- [ ] Stripe webhook is configured and tested
- [ ] Legal pages (Terms, Privacy) are live
- [ ] All environment variables are set in production
- [ ] Supabase storage buckets are created
- [ ] Test payment flows work end-to-end
- [ ] Error pages (404, 500) are working
- [ ] Mobile responsiveness is verified
- [ ] Admin functions work correctly
- [ ] Content moderation features work

---

## 🚀 Deployment Steps

1. **Choose hosting platform:**
   - Vercel (recommended for Next.js)
   - AWS
   - Other platforms

2. **Build and deploy:**
   ```bash
   npm run build
   # Deploy to your platform
   ```

3. **Set environment variables** in production

4. **Run database migrations** in production Supabase

5. **Configure Stripe webhook** with production URL

6. **Test everything** in production environment

7. **Go live!** 🎉

---

## 📞 Support Resources

- **Supabase Docs:** https://supabase.com/docs
- **Stripe Docs:** https://stripe.com/docs
- **Next.js Docs:** https://nextjs.org/docs

