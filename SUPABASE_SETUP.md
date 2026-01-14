# Supabase SQL Setup Instructions

## Notifications Table Setup

You need to run SQL in your Supabase database to create the notifications table and set up the necessary policies.

### Option 1: Run the Migration File

1. Open your Supabase Dashboard
2. Go to **SQL Editor**
3. Copy and paste the contents of `supabase/migrations/add_notifications.sql`
4. Click **Run**

### Option 2: Run Individual SQL Commands

If you prefer to run commands individually, here's what you need:

```sql
-- 1. Create the notifications table
create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id) on delete cascade,
  type text not null,
  actor_profile_id uuid references profiles(id) on delete set null,
  data jsonb,
  is_read boolean default false,
  created_at timestamptz default now()
);

-- 2. Enable Row Level Security
alter table notifications enable row level security;

-- 3. Create RLS Policies
create policy "Own notifications read" on notifications for select using (profile_id = auth.uid());
create policy "Insert notifications" on notifications for insert with check (true);
create policy "Update own notifications" on notifications for update using (profile_id = auth.uid());

-- 4. Create indexes for better performance
create index if not exists notifications_profile_id_idx on notifications(profile_id);
create index if not exists notifications_profile_id_created_at_idx on notifications(profile_id, created_at desc);
create index if not exists notifications_profile_id_is_read_idx on notifications(profile_id, is_read) where is_read = false;
```

### Verify the Setup

After running the SQL, you can verify it worked by running:

```sql
-- Check if table exists
select * from notifications limit 1;

-- Check policies
select * from pg_policies where tablename = 'notifications';
```

### Important Notes

- The `if not exists` clauses ensure the migration is safe to run multiple times
- The indexes will help with query performance when loading notifications
- The RLS policies ensure users can only see and update their own notifications
- Anyone can insert notifications (needed for the notification creation logic)

### Troubleshooting

If you get an error about the table already existing:
- The table might have been created manually before
- You can drop it first: `drop table if exists notifications cascade;` (be careful - this deletes all notifications!)

If you get permission errors:
- Make sure you're running as a database admin or have the necessary permissions
- Check that your Supabase project has the correct roles set up

