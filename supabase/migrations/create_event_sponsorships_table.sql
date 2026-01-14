-- Create event_sponsorships table for event-specific sponsorships
-- Allows event creators to add their own sponsorship banners/logos

CREATE TABLE IF NOT EXISTS public.event_sponsorships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  link_url TEXT, -- Optional link for the sponsorship
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_event_sponsorships_event_id ON public.event_sponsorships(event_id);
CREATE INDEX IF NOT EXISTS idx_event_sponsorships_display_order ON public.event_sponsorships(event_id, display_order);

-- Enable RLS
ALTER TABLE public.event_sponsorships ENABLE ROW LEVEL SECURITY;

-- Policy: Everyone can view event sponsorships
DROP POLICY IF EXISTS "Public can view event sponsorships" ON public.event_sponsorships;
CREATE POLICY "Public can view event sponsorships" ON public.event_sponsorships
  FOR SELECT USING (true);

-- Policy: Event organizers can manage sponsorships for their events
DROP POLICY IF EXISTS "Event organizers can manage their event sponsorships" ON public.event_sponsorships;
CREATE POLICY "Event organizers can manage their event sponsorships" ON public.event_sponsorships
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.events
      WHERE events.id = event_sponsorships.event_id
      AND (events.owner_profile_id = auth.uid() OR events.profile_id = auth.uid())
    )
  );

COMMENT ON TABLE public.event_sponsorships IS 'Sponsorship banners/logos added by event creators to their events';
COMMENT ON COLUMN public.event_sponsorships.image_url IS 'URL to the sponsorship image/logo';
COMMENT ON COLUMN public.event_sponsorships.link_url IS 'Optional URL to link when sponsorship is clicked';

