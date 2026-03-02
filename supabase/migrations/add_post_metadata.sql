-- Adds a flexible JSONB metadata column to profile_posts.
-- Used to store structured data for special post types (e.g. bout shares).
-- Existing posts are unaffected (column is nullable).

ALTER TABLE profile_posts
  ADD COLUMN IF NOT EXISTS post_metadata JSONB;
