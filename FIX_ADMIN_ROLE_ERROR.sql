-- Fix the admin role constraint error
-- Run this in Supabase SQL Editor

-- Step 1: First, check what role values currently exist
SELECT DISTINCT role FROM profiles;

-- Step 2: If you see any lowercase values or invalid values, fix them first
-- (This updates any lowercase roles to uppercase)
UPDATE profiles 
SET role = UPPER(role) 
WHERE role IS NOT NULL 
AND role NOT IN ('FIGHTER', 'COACH', 'GYM', 'PROMOTION', 'ADMIN');

-- Step 3: Check the current constraint definition
SELECT conname, pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conrelid = 'profiles'::regclass 
AND conname LIKE '%role%';

-- Step 4: Drop the existing constraint
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;

-- Step 5: Recreate the constraint with ADMIN included
ALTER TABLE profiles 
ADD CONSTRAINT profiles_role_check 
CHECK (role IN ('FIGHTER', 'COACH', 'GYM', 'PROMOTION', 'ADMIN'));

-- Step 6: Now update the user to ADMIN
UPDATE profiles
SET role = 'ADMIN'
WHERE id = (
  SELECT id FROM auth.users 
  WHERE email = 'miguel@test.com'
);

-- Step 7: Verify it worked
SELECT id, handle, username, role, full_name
FROM profiles
WHERE role = 'ADMIN';

