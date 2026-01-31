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

    let offerId: string;
    try {
      const json = await req.json();
      offerId = json.offerId;
    } catch (jsonError) {
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 }
      );
    }

    if (!offerId) {
      return NextResponse.json(
        { error: 'Missing required field: offerId' },
        { status: 400 }
      );
    }

    // Get the payment record
    const { data: paymentRecord, error: paymentError } = await supabaseAdmin
      .from('offer_payments')
      .select('id, payment_intent_id, amount_paid, refund_status, payer_profile_id')
      .eq('offer_id', offerId)
      .eq('payment_status', 'paid')
      .maybeSingle();

    if (paymentError || !paymentRecord) {
      return NextResponse.json(
        { error: 'Payment record not found or already refunded' },
        { status: 404 }
      );
    }

    // Verify user is the event organizer (only organizers can decline offers and trigger refunds)
    // Get the offer to find the event
    const { data: offer } = await supabaseAdmin
      .from('event_bout_offers')
      .select('bout_id, status')
      .eq('id', offerId)
      .single();

    if (!offer) {
      return NextResponse.json({ error: 'Offer not found' }, { status: 404 });
    }

    // Verify offer is declined (refunds only happen when offer is declined)
    if (offer.status !== 'declined') {
      return NextResponse.json(
        { error: 'Offer must be declined before refund can be processed' },
        { status: 400 }
      );
    }

    const { data: bout } = await supabaseAdmin
      .from('event_bouts')
      .select('event_id')
      .eq('id', offer.bout_id)
      .single();

    if (!bout) {
      return NextResponse.json({ error: 'Bout not found' }, { status: 404 });
    }

    const { data: event } = await supabaseAdmin
      .from('events')
      .select('owner_profile_id, profile_id')
      .eq('id', bout.event_id)
      .single();

    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    const ownerId = event.owner_profile_id || event.profile_id;
    if (user.id !== ownerId) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }

    // Check if already refunded
    if (paymentRecord.refund_status === 'refunded') {
      return NextResponse.json(
        { error: 'Payment already refunded' },
        { status: 400 }
      );
    }

    // Process Stripe refund
    if (!paymentRecord.payment_intent_id) {
      return NextResponse.json(
        { error: 'Payment intent ID not found' },
        { status: 400 }
      );
    }

    try {
      // Create refund via Stripe
      const refund = await stripe.refunds.create({
        payment_intent: paymentRecord.payment_intent_id,
        amount: paymentRecord.amount_paid, // Full refund
        metadata: {
          offer_id: offerId,
          bout_id: offer.bout_id,
          reason: 'offer_declined',
        },
      });

      // Update payment record
      await supabaseAdmin
        .from('offer_payments')
        .update({
          refund_status: 'refunded',
          refund_id: refund.id,
          updated_at: new Date().toISOString(),
        })
        .eq('id', paymentRecord.id);

      return NextResponse.json({
        success: true,
        refundId: refund.id,
        amount: paymentRecord.amount_paid,
      });
    } catch (stripeError: any) {
      console.error('Stripe refund error:', stripeError);
      return NextResponse.json(
        { error: stripeError.message || 'Failed to process refund' },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('Refund offer payment error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to process refund' },
      { status: 500 }
    );
  }
}
