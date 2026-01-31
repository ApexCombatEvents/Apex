import { NextResponse } from 'next/server';
import { createSupabaseServerForRoute } from '@/lib/supabaseServerForRoute';
import { stripe } from '@/lib/stripe';
import { checkRateLimit, getClientIP, RATE_LIMITS } from '@/lib/ratelimit';

export async function POST(req: Request) {
  try {
    // Rate limiting
    const clientIP = getClientIP(req);
    const rateLimitResult = checkRateLimit(
      `payment:${clientIP}`,
      RATE_LIMITS.payment.maxRequests,
      RATE_LIMITS.payment.windowMs
    );

    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { 
          error: 'Too many requests. Please try again later.',
          retryAfter: Math.ceil((rateLimitResult.resetAt - Date.now()) / 1000)
        },
        { 
          status: 429,
          headers: {
            'Retry-After': Math.ceil((rateLimitResult.resetAt - Date.now()) / 1000).toString(),
            'X-RateLimit-Limit': RATE_LIMITS.payment.maxRequests.toString(),
            'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
          }
        }
      );
    }

    const supabase = createSupabaseServerForRoute();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    let boutId: string;
    let fighterId: string;
    let side: string;
    try {
      const json = await req.json();
      boutId = json.boutId;
      fighterId = json.fighterId;
      side = json.side;
    } catch (jsonError) {
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 }
      );
    }

    if (!boutId || !fighterId || !side) {
      return NextResponse.json(
        { error: 'Missing required fields: boutId, fighterId, side' },
        { status: 400 }
      );
    }

    // Get bout details to verify offer fee
    const { data: bout, error: boutError } = await supabase
      .from('event_bouts')
      .select('id, offer_fee, event_id')
      .eq('id', boutId)
      .single();

    if (boutError || !bout) {
      return NextResponse.json({ error: 'Bout not found' }, { status: 404 });
    }

    if (!bout.offer_fee || bout.offer_fee <= 0) {
      return NextResponse.json(
        { error: 'This bout does not require an offer fee' },
        { status: 400 }
      );
    }

    // Get event details for metadata
    const { data: event } = await supabase
      .from('events')
      .select('id, name, title')
      .eq('id', bout.event_id)
      .single();

    // Get fighter details for metadata
    const { data: fighter } = await supabase
      .from('profiles')
      .select('id, full_name, username')
      .eq('id', fighterId)
      .single();

    const fighterName = fighter?.full_name || fighter?.username || 'Fighter';
    const eventName = event?.title || event?.name || 'Event';

    // Create Stripe checkout session
    const origin = req.headers.get('origin') || 'http://localhost:3000';
    
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `Bout Offer Fee - ${eventName}`,
              description: `Refundable deposit for bout offer (${side} corner) - ${fighterName}`,
            },
            unit_amount: bout.offer_fee, // Already in cents
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${origin}/events/${bout.event_id}?offer_success=true&session_id={CHECKOUT_SESSION_ID}&bout_id=${boutId}&fighter_id=${fighterId}&side=${side}`,
      cancel_url: `${origin}/events/${bout.event_id}?offer_cancelled=true`,
      metadata: {
        type: 'offer_fee',
        bout_id: boutId,
        event_id: bout.event_id,
        fighter_id: fighterId,
        side: side,
        payer_profile_id: user.id,
      },
      payment_intent_data: {
        metadata: {
          type: 'offer_fee',
          bout_id: boutId,
          event_id: bout.event_id,
          fighter_id: fighterId,
          side: side,
          payer_profile_id: user.id,
        },
      },
    });

    return NextResponse.json({ sessionId: session.id, url: session.url });
  } catch (error: any) {
    console.error('Stripe checkout session creation error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}

