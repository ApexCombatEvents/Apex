-- Add stream payment fields to events table
-- will_stream: whether the event will be streamed
-- stream_price: price in cents (null = free)
-- fighter_percentage: percentage of price that goes to fighters (0-100, null = 0)

ALTER TABLE public.events
ADD COLUMN IF NOT EXISTS will_stream BOOLEAN DEFAULT false;

ALTER TABLE public.events
ADD COLUMN IF NOT EXISTS stream_price INTEGER DEFAULT NULL;

ALTER TABLE public.events
ADD COLUMN IF NOT EXISTS fighter_percentage INTEGER DEFAULT 0 CHECK (fighter_percentage >= 0 AND fighter_percentage <= 100);

COMMENT ON COLUMN public.events.will_stream IS 'Whether this event will be streamed';
COMMENT ON COLUMN public.events.stream_price IS 'Price to watch stream in cents (null = free stream)';
COMMENT ON COLUMN public.events.fighter_percentage IS 'Percentage of stream price that goes to fighters (0-100, 0 = no fighter revenue sharing)';

-- Create table to track stream payments
CREATE TABLE IF NOT EXISTS public.stream_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount_paid INTEGER NOT NULL, -- in cents
  fighter_allocations jsonb DEFAULT '[]'::jsonb, -- array of {fighter_id: uuid, percentage: number, amount: number}
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  UNIQUE(event_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_stream_payments_event_id ON public.stream_payments(event_id);
CREATE INDEX IF NOT EXISTS idx_stream_payments_user_id ON public.stream_payments(user_id);

-- Enable RLS
ALTER TABLE public.stream_payments ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own stream payments" ON public.stream_payments;
DROP POLICY IF EXISTS "Event organizers can view their event payments" ON public.stream_payments;
DROP POLICY IF EXISTS "Users can insert their own stream payments" ON public.stream_payments;

-- Users can view their own payments
CREATE POLICY "Users can view their own stream payments" ON public.stream_payments
  FOR SELECT USING (auth.uid() = user_id);

-- Event organizers can view payments for their events
CREATE POLICY "Event organizers can view their event payments" ON public.stream_payments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = stream_payments.event_id
      AND (e.owner_profile_id = auth.uid() OR e.profile_id = auth.uid())
    )
  );

-- Users can insert their own payments (via API)
CREATE POLICY "Users can insert their own stream payments" ON public.stream_payments
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create table to track tips to fighters during streams
CREATE TABLE IF NOT EXISTS public.stream_tips (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  fighter_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL, -- in cents
  message text,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_stream_tips_event_id ON public.stream_tips(event_id);
CREATE INDEX IF NOT EXISTS idx_stream_tips_fighter_id ON public.stream_tips(fighter_id);
CREATE INDEX IF NOT EXISTS idx_stream_tips_user_id ON public.stream_tips(user_id);

-- Enable RLS
ALTER TABLE public.stream_tips ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own tips" ON public.stream_tips;
DROP POLICY IF EXISTS "Fighters can view tips they received" ON public.stream_tips;
DROP POLICY IF EXISTS "Event organizers can view tips for their events" ON public.stream_tips;
DROP POLICY IF EXISTS "Users can insert their own tips" ON public.stream_tips;

-- Users can view tips they've sent
CREATE POLICY "Users can view their own tips" ON public.stream_tips
  FOR SELECT USING (auth.uid() = user_id);

-- Fighters can view tips they've received
CREATE POLICY "Fighters can view tips they received" ON public.stream_tips
  FOR SELECT USING (auth.uid() = fighter_id);

-- Event organizers can view all tips for their events
CREATE POLICY "Event organizers can view tips for their events" ON public.stream_tips
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = stream_tips.event_id
      AND (e.owner_profile_id = auth.uid() OR e.profile_id = auth.uid())
    )
  );

-- Users can insert their own tips
CREATE POLICY "Users can insert their own tips" ON public.stream_tips
  FOR INSERT WITH CHECK (auth.uid() = user_id);

