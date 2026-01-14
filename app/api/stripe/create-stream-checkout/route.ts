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

    const { eventId, streamPrice, fighterAllocations } = await req.json();

    if (!eventId || !streamPrice) {
      return NextResponse.json(
        { error: 'Missing required fields: eventId, streamPrice' },
        { status: 400 }
      );
    }

    // Get event details
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('id, name, title')
      .eq('id', eventId)
      .single();

    if (eventError || !event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    const eventName = event.title || event.name || 'Event';
    const origin = req.headers.get('origin') || 'http://localhost:3000';
    
    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `Stream Access - ${eventName}`,
              description: 'Live event stream access',
            },
            unit_amount: streamPrice, // Already in cents
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${origin}/events/${eventId}/stream?payment_success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/events/${eventId}/stream?payment_cancelled=true`,
      metadata: {
        type: 'stream_access',
        event_id: eventId,
        user_id: user.id,
        fighter_allocations: JSON.stringify(fighterAllocations || []),
      },
      payment_intent_data: {
        metadata: {
          type: 'stream_access',
          event_id: eventId,
          user_id: user.id,
        },
      },
    });

    return NextResponse.json({ sessionId: session.id, url: session.url });
  } catch (error: any) {
    console.error('Stripe stream checkout creation error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}



