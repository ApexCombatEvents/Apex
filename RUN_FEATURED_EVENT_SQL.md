# Featured Event SQL Migration

**IMPORTANT:** Run this SQL in your Supabase SQL Editor to ensure the featured event columns exist.

## Steps:

1. Open your **Supabase Dashboard**
2. Go to **SQL Editor** (in the left sidebar)
3. Click **New Query**
4. Copy and paste the SQL code below
5. Click **Run** (or press Ctrl+Enter / Cmd+Enter)

## SQL Code:

```sql
-- Add featured/promoted status to events table
-- This allows event organizers to pay to have their events featured at the top

ALTER TABLE public.events
ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT false;

ALTER TABLE public.events
ADD COLUMN IF NOT EXISTS featured_until TIMESTAMPTZ DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_events_is_featured ON public.events(is_featured) WHERE is_featured = true;

COMMENT ON COLUMN public.events.is_featured IS 'Whether this event is currently featured/promoted';
COMMENT ON COLUMN public.events.featured_until IS 'Timestamp when the featured status expires (null = permanent/indefinite)';
```

## Verify the Migration:

After running, verify the columns exist:

```sql
-- Check if columns exist
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'events'
  AND column_name IN ('is_featured', 'featured_until');
```

You should see:
- `is_featured` (boolean, not null, default false)
- `featured_until` (timestamp with time zone, nullable)

After running this, refresh your browser and the featured event payment should work properly!
