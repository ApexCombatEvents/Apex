# How to Make a Profile an Admin

Since there's no UI for setting admin roles (for security), you need to update it directly in the database. Here are the methods:

## Method 1: Using Supabase Dashboard (Easiest)

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Run one of these queries:

### By User UUID:
```sql
UPDATE profiles
SET role = 'ADMIN'
WHERE id = 'YOUR_USER_ID_HERE';
```

### By Email:
```sql
UPDATE profiles
SET role = 'ADMIN'
WHERE id = (
  SELECT id FROM auth.users 
  WHERE email = 'user@example.com'
);
```

### By Username/Handle:
```sql
UPDATE profiles
SET role = 'ADMIN'
WHERE handle = 'username' OR username = 'username';
```

4. Click **Run** to execute the query

## Method 2: Find User ID First

If you don't know the user's UUID, you can find it first:

```sql
-- Find user by email
SELECT id, email, created_at 
FROM auth.users 
WHERE email = 'user@example.com';

-- Then use that ID in the UPDATE query above
```

## Verify Admin Status

After updating, verify it worked:

```sql
SELECT id, handle, username, role, full_name
FROM profiles
WHERE role = 'ADMIN';
```

## Important Notes:

- The role value must be exactly `'ADMIN'` (uppercase)
- Make sure the user profile exists in the `profiles` table
- The user will need to refresh/login again for the role change to take effect in the app
- Once a user is an admin, they can access `/admin/sponsorships` and manage sponsorships

