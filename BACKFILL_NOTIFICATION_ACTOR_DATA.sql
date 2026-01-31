-- Backfill notification actor profile data
-- This SQL will update existing notifications to include actor profile information
-- Run this in your Supabase SQL Editor
-- Uses only full_name and username columns (handle column may not exist in all databases)

-- Update post_like notifications with actor profile data
-- Uses COALESCE to try full_name, then username
UPDATE notifications n
SET data = jsonb_set(
  COALESCE(n.data, '{}'::jsonb),
  '{liker_name}',
  to_jsonb(COALESCE(
    NULLIF(p.full_name, ''),
    NULLIF(p.username, ''),
    'User'
  ))
)
FROM profiles p
WHERE n.type = 'post_like'
  AND n.actor_profile_id = p.id
  AND (n.data->>'liker_name' IS NULL OR n.data->>'liker_name' = 'Someone' OR n.data->>'liker_name' = '');

-- Update post_like notifications with actor handle (uses username)
UPDATE notifications n
SET data = jsonb_set(
  COALESCE(n.data, '{}'::jsonb),
  '{liker_handle}',
  to_jsonb(p.username)
)
FROM profiles p
WHERE n.type = 'post_like'
  AND n.actor_profile_id = p.id
  AND (n.data->>'liker_handle' IS NULL)
  AND p.username IS NOT NULL;

-- Update event_like notifications with actor profile data
UPDATE notifications n
SET data = jsonb_set(
  COALESCE(n.data, '{}'::jsonb),
  '{liker_name}',
  to_jsonb(COALESCE(
    NULLIF(p.full_name, ''),
    NULLIF(p.username, ''),
    'User'
  ))
)
FROM profiles p
WHERE n.type = 'event_like'
  AND n.actor_profile_id = p.id
  AND (n.data->>'liker_name' IS NULL OR n.data->>'liker_name' = 'Someone' OR n.data->>'liker_name' = '');

-- Update event_like notifications with actor handle (uses username)
UPDATE notifications n
SET data = jsonb_set(
  COALESCE(n.data, '{}'::jsonb),
  '{liker_handle}',
  to_jsonb(p.username)
)
FROM profiles p
WHERE n.type = 'event_like'
  AND n.actor_profile_id = p.id
  AND (n.data->>'liker_handle' IS NULL)
  AND p.username IS NOT NULL;

-- Update post_comment notifications with actor profile data
UPDATE notifications n
SET data = jsonb_set(
  COALESCE(n.data, '{}'::jsonb),
  '{commenter_name}',
  to_jsonb(COALESCE(
    NULLIF(p.full_name, ''),
    NULLIF(p.username, ''),
    'User'
  ))
)
FROM profiles p
WHERE n.type = 'post_comment'
  AND n.actor_profile_id = p.id
  AND (n.data->>'commenter_name' IS NULL OR n.data->>'commenter_name' = 'Someone' OR n.data->>'commenter_name' = '');

-- Update event_comment notifications with actor profile data
UPDATE notifications n
SET data = jsonb_set(
  COALESCE(n.data, '{}'::jsonb),
  '{commenter_name}',
  to_jsonb(COALESCE(
    NULLIF(p.full_name, ''),
    NULLIF(p.username, ''),
    'User'
  ))
)
FROM profiles p
WHERE n.type = 'event_comment'
  AND n.actor_profile_id = p.id
  AND (n.data->>'commenter_name' IS NULL OR n.data->>'commenter_name' = 'Someone' OR n.data->>'commenter_name' = '');

-- Verify the updates
SELECT 
  type,
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE data->>'liker_name' IS NOT NULL AND data->>'liker_name' != 'Someone' AND data->>'liker_name' != '') as with_liker_name,
  COUNT(*) FILTER (WHERE data->>'commenter_name' IS NOT NULL AND data->>'commenter_name' != 'Someone' AND data->>'commenter_name' != '') as with_commenter_name
FROM notifications
WHERE type IN ('post_like', 'event_like', 'post_comment', 'event_comment')
GROUP BY type;
