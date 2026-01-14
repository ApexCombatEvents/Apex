-- Make a user an admin
-- Replace 'YOUR_USER_ID_HERE' with the actual user UUID, or use the email/username query below

-- Option 1: Update by user UUID (find UUID from Supabase Auth > Users)
UPDATE profiles
SET role = 'ADMIN'
WHERE id = 'YOUR_USER_ID_HERE';

-- Option 2: Update by email (if you know the user's email)
-- First, you need to find the user ID from auth.users, then update profiles
UPDATE profiles
SET role = 'ADMIN'
WHERE id = (
  SELECT id FROM auth.users 
  WHERE email = 'user@example.com'
);

-- Option 3: Update by username (if you know the username/handle)
UPDATE profiles
SET role = 'ADMIN'
WHERE handle = 'username' OR username = 'username';

-- Verify the update
SELECT id, handle, username, role, full_name, email
FROM profiles
WHERE role = 'ADMIN';

