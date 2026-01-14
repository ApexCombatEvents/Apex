-- Add featured/promoted status to events table
-- This allows event organizers to pay to have their events featured at the top

ALTER TABLE public.events
ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT false;

ALTER TABLE public.events
ADD COLUMN IF NOT EXISTS featured_until TIMESTAMPTZ DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_events_is_featured ON public.events(is_featured) WHERE is_featured = true;

COMMENT ON COLUMN public.events.is_featured IS 'Whether this event is currently featured/promoted';
COMMENT ON COLUMN public.events.featured_until IS 'Timestamp when the featured status expires (null = permanent/indefinite)';



