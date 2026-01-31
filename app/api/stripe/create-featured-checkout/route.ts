import { NextResponse } from 'next/server';
import { createSupabaseServerForRoute } from '@/lib/supabaseServerForRoute';
import { stripe } from '@/lib/stripe';

// Featured event pricing - adjust as needed
// Price is higher because featured events are shown worldwide, not just per country
const FEATURED_EVENT_PRICE_CENTS = 15000; // $150.00
const FEATURED_DURATION_DAYS = 30; // 30 days

export async function POST(req: Request) {
  try {
    const supabase = createSupabaseServerForRoute();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    let eventId: string;
    try {
      const json = await req.json();
      eventId = json.eventId;
    } catch (jsonError) {
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 }
      );
    }

    if (!eventId) {
      return NextResponse.json(
        { error: 'Missing required field: eventId' },
        { status: 400 }
      );
    }

    // Verify user owns the event
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('id, name, title, owner_profile_id, profile_id')
      .eq('id', eventId)
      .single();

    if (eventError || !event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    const ownerId = event.owner_profile_id || event.profile_id;
    if (user.id !== ownerId) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
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
              name: `Feature Event - ${eventName}`,
              description: `Feature your event for ${FEATURED_DURATION_DAYS} days`,
            },
            unit_amount: FEATURED_EVENT_PRICE_CENTS,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${origin}/events/${eventId}/edit?featured_success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/events/${eventId}/edit?featured_cancelled=true`,
      metadata: {
        type: 'feature_event',
        event_id: eventId,
        user_id: user.id,
        duration_days: FEATURED_DURATION_DAYS.toString(),
      },
    });

    return NextResponse.json({ sessionId: session.id, url: session.url });
  } catch (error: any) {
    console.error('Stripe featured event checkout creation error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}
