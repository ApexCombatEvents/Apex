import { NextResponse } from 'next/server';
import { createSupabaseServerForRoute } from '@/lib/supabaseServerForRoute';
import { stripe } from '@/lib/stripe';
import { createClient } from '@supabase/supabase-js';

// Validate environment variables at module load
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error("Missing required Supabase environment variables: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
}

const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

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

    let sessionId: string;
    try {
      const json = await req.json();
      sessionId = json.sessionId;
    } catch (jsonError) {
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 }
      );
    }

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Missing session ID' },
        { status: 400 }
      );
    }

    // Verify the checkout session with Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.payment_status !== 'paid') {
      return NextResponse.json(
        { error: 'Payment not completed', paid: false },
        { status: 400 }
      );
    }

    const eventId = session.metadata?.event_id;
    const userId = session.metadata?.user_id;

    if (!eventId || !userId) {
      return NextResponse.json(
        { error: 'Invalid session metadata' },
        { status: 400 }
      );
    }

    // Verify user owns the event
    if (user.id !== userId) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }

    // Check if event is already featured (webhook might have processed it)
    const { data: event } = await supabaseAdmin
      .from('events')
      .select('id, is_featured, featured_until')
      .eq('id', eventId)
      .single();

    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    const now = new Date();
    const featuredUntil = event.featured_until ? new Date(event.featured_until) : null;
    const isFeatured = event.is_featured === true && (!featuredUntil || featuredUntil > now);

    if (isFeatured) {
      // Event is already featured (webhook processed it)
      return NextResponse.json({ 
        success: true, 
        featured: true,
        featuredUntil: event.featured_until
      });
    }

    // If not featured yet, manually trigger the update (webhook might be delayed)
    // This ensures the event is featured immediately after payment
    const durationDays = 30; // Default duration
    const newFeaturedUntil = new Date();
    newFeaturedUntil.setDate(newFeaturedUntil.getDate() + durationDays);

    // Update event to featured status directly
    const { error: updateError, data: updatedEvent } = await supabaseAdmin
      .from('events')
      .update({
        is_featured: true,
        featured_until: newFeaturedUntil.toISOString(),
      })
      .eq('id', eventId)
      .select('is_featured, featured_until')
      .single();

    if (updateError) {
      console.error('Failed to update event featured status in verification:', updateError);
      return NextResponse.json({ 
        success: true, 
        featured: false,
        message: 'Payment verified. Featured status will be updated shortly via webhook.'
      });
    }

    // Return success with featured status
    return NextResponse.json({ 
      success: true, 
      featured: true,
      featuredUntil: updatedEvent?.featured_until || newFeaturedUntil.toISOString()
    });
  } catch (error: any) {
    console.error('Featured event payment verification error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to verify payment' },
      { status: 500 }
    );
  }
}
