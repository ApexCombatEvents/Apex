-- Add 'messages_page' to the sponsorships placement check constraint
-- This allows sponsorships to be placed on the messages page

ALTER TABLE public.sponsorships
DROP CONSTRAINT IF EXISTS sponsorships_placement_check;

ALTER TABLE public.sponsorships
ADD CONSTRAINT sponsorships_placement_check 
CHECK (placement IN (
  'homepage_hero', 
  'homepage_sidebar', 
  'stream_page', 
  'search_page', 
  'event_page', 
  'profile_page', 
  'rankings_page',
  'messages_page'
));
