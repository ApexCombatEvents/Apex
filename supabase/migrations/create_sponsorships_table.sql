-- Create sponsorships table for managing promotional content
-- This allows admins to manage sponsorship banners, slideshows, and promotional content

CREATE TABLE IF NOT EXISTS public.sponsorships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  link_url TEXT,
  button_text TEXT,
  background_color TEXT, -- Tailwind gradient classes like "from-purple-600 via-indigo-600 to-purple-800"
  text_color TEXT, -- Tailwind text color classes like "text-white"
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  placement TEXT NOT NULL CHECK (placement IN ('homepage_hero', 'homepage_sidebar', 'stream_page', 'search_page', 'event_page', 'profile_page', 'rankings_page')),
  variant TEXT DEFAULT 'horizontal' CHECK (variant IN ('horizontal', 'vertical', 'compact', 'slideshow')),
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  click_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sponsorships_placement ON public.sponsorships(placement);
CREATE INDEX IF NOT EXISTS idx_sponsorships_active ON public.sponsorships(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_sponsorships_display_order ON public.sponsorships(display_order);
CREATE INDEX IF NOT EXISTS idx_sponsorships_dates ON public.sponsorships(start_date, end_date);

-- Enable RLS
ALTER TABLE public.sponsorships ENABLE ROW LEVEL SECURITY;

-- Policy: Everyone can view active sponsorships
DROP POLICY IF EXISTS "Public can view active sponsorships" ON public.sponsorships;
CREATE POLICY "Public can view active sponsorships" ON public.sponsorships
  FOR SELECT USING (
    is_active = true
    AND (start_date IS NULL OR start_date <= now())
    AND (end_date IS NULL OR end_date >= now())
  );

-- Policy: Only admins can manage sponsorships
DROP POLICY IF EXISTS "Admins can manage sponsorships" ON public.sponsorships;
CREATE POLICY "Admins can manage sponsorships" ON public.sponsorships
  FOR ALL USING (
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

COMMENT ON TABLE public.sponsorships IS 'Manages sponsorship banners and promotional content across the platform';
COMMENT ON COLUMN public.sponsorships.placement IS 'Where the sponsorship should be displayed';
COMMENT ON COLUMN public.sponsorships.variant IS 'Display style: horizontal, vertical, compact, or slideshow';
COMMENT ON COLUMN public.sponsorships.background_color IS 'Tailwind gradient classes for background (e.g., "from-purple-600 via-indigo-600 to-purple-800")';
COMMENT ON COLUMN public.sponsorships.text_color IS 'Tailwind text color classes (e.g., "text-white")';

