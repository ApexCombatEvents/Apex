-- Fix the RLS policy for sponsorships to allow INSERT operations
-- The policy needs WITH CHECK clause for INSERT/UPDATE operations

-- Drop the existing policy
DROP POLICY IF EXISTS "Admins can manage sponsorships" ON public.sponsorships;

-- Recreate with both USING and WITH CHECK clauses
CREATE POLICY "Admins can manage sponsorships" ON public.sponsorships
  FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'ADMIN'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'ADMIN'
    )
  );

