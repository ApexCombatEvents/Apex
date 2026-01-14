# 🗄️ Run Production Database Migrations

**Status:** ⚠️ **CRITICAL** - Must be done before deployment

## 📋 Overview

You need to run all migration files from `supabase/migrations/` in your **production** Supabase database.

---

## 🎯 Step-by-Step Instructions

### Step 1: Access Production Supabase

1. Go to your [Supabase Dashboard](https://app.supabase.com)
2. Select your **production** project (NOT the local/staging one)
3. Click on **SQL Editor** in the left sidebar

### Step 2: List All Migrations to Run

The migration files are located in `supabase/migrations/` directory. Here's the recommended order:

**Important:** Most migrations use `IF NOT EXISTS` so they're safe to run multiple times, but it's best to run them in order.

### Step 3: Run Each Migration File

For each migration file:

1. Open the migration file from `supabase/migrations/`
2. Copy the entire SQL content
3. Paste it into the Supabase SQL Editor
4. Click **Run** (or press `Ctrl+Enter` / `Cmd+Enter`)
5. Verify there are no errors
6. Move to the next migration

**Tip:** Run them one at a time so you can catch any errors early.

---

## ✅ Verification Queries

After running all migrations, verify that the key tables exist:

### Check All Critical Tables

```sql
-- Check if critical tables exist
SELECT 
  table_name,
  CASE 
    WHEN table_name IN (
      'stream_payments',
      'offer_payments',
      'event_bouts',
      'event_bout_offers',
      'notifications',
      'payout_requests',
      'content_reports',
      'event_sponsorships',
      'fighter_fight_history',
      'profile_posts',
      'profile_post_comments',
      'message_threads',
      'chat_messages',
      'bout_scores',
      'stream_access'
    ) THEN '✅ Critical'
    ELSE '⚪ Optional'
  END as status
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN (
    'stream_payments',
    'offer_payments',
    'event_bouts',
    'event_bout_offers',
    'notifications',
    'payout_requests',
    'content_reports',
    'event_sponsorships',
    'fighter_fight_history',
    'profile_posts',
    'profile_post_comments',
    'message_threads',
    'chat_messages',
    'bout_scores',
    'stream_access'
  )
ORDER BY status DESC, table_name;
```

### Check RLS Status

```sql
-- Verify RLS is enabled on critical tables
SELECT 
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN (
    'stream_payments',
    'offer_payments',
    'event_bouts',
    'event_bout_offers',
    'notifications',
    'payout_requests',
    'content_reports',
    'event_sponsorships',
    'fighter_fight_history'
  )
ORDER BY tablename;
```

All tables should show `rls_enabled = true`.

### Count Policies Per Table

```sql
-- Check that tables have RLS policies
SELECT 
  tablename,
  COUNT(*) as policy_count
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN (
    'stream_payments',
    'offer_payments',
    'event_bouts',
    'event_bout_offers',
    'notifications',
    'payout_requests',
    'content_reports',
    'event_sponsorships',
    'fighter_fight_history'
  )
GROUP BY tablename
ORDER BY tablename;
```

---

## 🔍 Common Issues & Solutions

### Issue: "relation already exists"
**Solution:** This is normal if the table already exists. The migrations use `IF NOT EXISTS` so they're safe to run multiple times.

### Issue: "permission denied"
**Solution:** Make sure you're running these in the SQL Editor with proper permissions. Use the Supabase Dashboard SQL Editor (not a limited user account).

### Issue: "column already exists"
**Solution:** Some migrations add columns. If you see this, the column already exists from a previous migration. You can safely ignore it or comment out that line.

### Issue: Migration fails partway through
**Solution:** 
1. Check the error message
2. Most migrations are idempotent (safe to run multiple times)
3. You can re-run the migration after fixing any issues
4. If needed, manually fix the database state, then continue

---

## 📝 Migration Checklist

After running migrations, verify these exist:

- [ ] `stream_payments` table
- [ ] `offer_payments` table
- [ ] `event_bouts` table
- [ ] `event_bout_offers` table
- [ ] `notifications` table
- [ ] `payout_requests` table
- [ ] `content_reports` table
- [ ] `event_sponsorships` table
- [ ] `fighter_fight_history` table
- [ ] `profile_posts` table (if applicable)
- [ ] `message_threads` table (if applicable)
- [ ] `chat_messages` table (if applicable)
- [ ] All tables have RLS enabled
- [ ] All tables have appropriate RLS policies

---

## ⚠️ Important Notes

1. **Run in Production Only:** Make sure you're running these in your **production** Supabase project, not local or staging.

2. **Backup First:** If possible, create a database backup before running migrations (Supabase does this automatically, but good to verify).

3. **Test First (Recommended):** If you have a staging environment, test the migrations there first.

4. **One at a Time:** Run migrations one at a time to catch errors early.

5. **Check for Errors:** After each migration, check for any error messages in the SQL Editor output.

6. **Verify Results:** Use the verification queries above to ensure everything was created correctly.

---

## 🚀 Next Steps

After completing the migrations:

1. ✅ Verify all tables exist (use queries above)
2. ✅ Verify RLS is enabled on all tables
3. ✅ Verify RLS policies exist (use `VERIFY_RLS_POLICIES.sql`)
4. → Move to **Step 2: Create Storage Buckets** (next critical step)

---

## 📞 Need Help?

- **Supabase Docs:** [Running Migrations](https://supabase.com/docs/guides/database/migrations)
- **Supabase Support:** Dashboard → Support
- **Check Existing Docs:** See `PRE_DEPLOYMENT_CHECKLIST.md` for more details
