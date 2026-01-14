-- Migration: Add admin permissions to delete posts and manage content
-- Run this in your Supabase SQL Editor

-- Allow admins to delete posts
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'posts' 
    AND policyname = 'Admins can delete any post'
  ) THEN
    CREATE POLICY "Admins can delete any post"
      ON public.posts
      FOR DELETE
      USING (
        EXISTS (
          SELECT 1 FROM public.profiles 
          WHERE id = auth.uid() AND role = 'admin'
        )
      );
  END IF;
END $$;

-- Allow admins to delete comments
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'comments') THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE schemaname = 'public' 
      AND tablename = 'comments' 
      AND policyname = 'Admins can delete comments'
    ) THEN
      CREATE POLICY "Admins can delete comments"
        ON public.comments
        FOR DELETE
        USING (
          EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role = 'admin'
          )
        );
    END IF;
  END IF;

  -- Allow admins to delete profile_post_comments (if table exists)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profile_post_comments') THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE schemaname = 'public' 
      AND tablename = 'profile_post_comments' 
      AND policyname = 'Admins can delete profile post comments'
    ) THEN
      CREATE POLICY "Admins can delete profile post comments"
        ON public.profile_post_comments
        FOR DELETE
        USING (
          EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role = 'admin'
          )
        );
    END IF;
  END IF;

  -- Allow admins to delete event_comments (if table exists)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'event_comments') THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE schemaname = 'public' 
      AND tablename = 'event_comments' 
      AND policyname = 'Admins can delete event comments'
    ) THEN
      CREATE POLICY "Admins can delete event comments"
        ON public.event_comments
        FOR DELETE
        USING (
          EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role = 'admin'
          )
        );
    END IF;
  END IF;
END $$;

-- Allow admins to update events
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'events' 
    AND policyname = 'Admins can update any event'
  ) THEN
    CREATE POLICY "Admins can update any event"
      ON public.events
      FOR UPDATE
      USING (
        EXISTS (
          SELECT 1 FROM public.profiles 
          WHERE id = auth.uid() AND role = 'admin'
        )
      );
  END IF;
END $$;

-- Allow admins to delete events
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'events' 
    AND policyname = 'Admins can delete events'
  ) THEN
    CREATE POLICY "Admins can delete events"
      ON public.events
      FOR DELETE
      USING (
        EXISTS (
          SELECT 1 FROM public.profiles 
          WHERE id = auth.uid() AND role = 'admin'
        )
      );
  END IF;
END $$;
