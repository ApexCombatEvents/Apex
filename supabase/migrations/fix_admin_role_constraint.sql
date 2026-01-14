-- Fix the profiles role constraint to include ADMIN
-- This adds ADMIN to the allowed roles if it's missing

-- Step 1: Check what role values currently exist in the table
SELECT DISTINCT role FROM profiles;

-- Step 2: Fix any invalid role values first (if any exist)
-- Update any lowercase roles to uppercase
UPDATE profiles SET role = UPPER(role) WHERE role IS NOT NULL;

-- Step 3: Drop the old constraint
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;

-- Step 4: Recreate the constraint with ADMIN included
ALTER TABLE profiles 
ADD CONSTRAINT profiles_role_check 
CHECK (role IN ('FIGHTER', 'COACH', 'GYM', 'PROMOTION', 'ADMIN'));

-- Step 5: Now you can update the role to ADMIN
UPDATE profiles
SET role = 'ADMIN'
WHERE id = (
  SELECT id FROM auth.users 
  WHERE email = 'miguel@test.com'
);

-- Step 6: Verify the update worked
SELECT id, handle, username, role, full_name
FROM profiles
WHERE role = 'ADMIN';

