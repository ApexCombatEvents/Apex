import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';
import { calculatePlatformFee } from '@/lib/platformFees';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  const body = await req.text();
  const signature = req.headers.get('stripe-signature');

  if (!signature) {
    return NextResponse.json(
      { error: 'No signature' },
      { status: 400 }
    );
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
    console.log('✅ Webhook received:', event.type, event.id);
  } catch (err: any) {
    console.error('❌ Webhook signature verification failed:', err.message);
    return NextResponse.json(
      { error: `Webhook Error: ${err.message}` },
      { status: 400 }
    );
  }

  // Handle the event
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    
    // Check if this is an offer fee payment
    if (session.metadata?.type === 'offer_fee') {
      const {
        bout_id,
        event_id,
        fighter_id,
        side,
        payer_profile_id,
      } = session.metadata;

      if (!bout_id || !fighter_id || !side || !payer_profile_id) {
        console.error('Missing metadata in checkout session');
        return NextResponse.json({ received: true });
      }

      // Create the offer
      const { data: offer, error: offerError } = await supabaseAdmin
        .from('event_bout_offers')
        .insert({
          bout_id,
          side,
          from_profile_id: payer_profile_id,
          fighter_profile_id: fighter_id,
          status: 'pending',
        })
        .select('id')
        .single();

      if (offerError || !offer) {
        console.error('Failed to create offer after payment:', offerError);
        return NextResponse.json({ received: true });
      }

      // Get bout details for payment amount
      const { data: bout } = await supabaseAdmin
        .from('event_bouts')
        .select('offer_fee')
        .eq('id', bout_id)
        .single();

      const amountPaid = bout?.offer_fee || session.amount_total || 0;
      // Platform fee is 0 initially - will be charged when offer is accepted
      const platformFee = 0;

      // Create payment record (platform fee will be added when offer is accepted)
      await supabaseAdmin.from('offer_payments').insert({
        offer_id: offer.id,
        bout_id,
        payer_profile_id,
        amount_paid: amountPaid,
        payment_status: 'paid',
        payment_intent_id: session.payment_intent as string,
        platform_fee: platformFee,
      });

      // Create notification for event owner
      try {
        const { data: eventData } = await supabaseAdmin
          .from('events')
          .select('id, name, title, owner_profile_id, profile_id')
          .eq('id', event_id)
          .single();

        if (eventData) {
          const ownerId = eventData.owner_profile_id || eventData.profile_id;
          
          // Get sender and fighter names
          const { data: senderProfile } = await supabaseAdmin
            .from('profiles')
            .select('full_name, username')
            .eq('id', payer_profile_id)
            .single();

          const { data: fighterProfile } = await supabaseAdmin
            .from('profiles')
            .select('full_name, username')
            .eq('id', fighter_id)
            .single();

          const senderName = senderProfile?.full_name || senderProfile?.username || 'A coach/gym';
          const fighterName = fighterProfile?.full_name || fighterProfile?.username || 'A fighter';

          await supabaseAdmin.from('notifications').insert({
            profile_id: ownerId,
            type: 'bout_offer',
            actor_profile_id: payer_profile_id,
            data: {
              bout_id,
              event_id,
              event_name: eventData.title || eventData.name,
              fighter_profile_id: fighter_id,
              fighter_name: fighterName,
              from_profile_id: payer_profile_id,
              from_name: senderName,
              side,
            },
          });
        }
      } catch (notifError) {
        console.error('Failed to create notification:', notifError);
        // Don't fail the webhook - the offer was created successfully
      }
    }
  }

  // Handle stream access payments
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    
    if (session.metadata?.type === 'stream_access') {
      const {
        event_id,
        user_id,
        fighter_allocations,
      } = session.metadata;

      if (!event_id || !user_id) {
        console.error('Missing metadata in stream checkout session');
        return NextResponse.json({ received: true });
      }

      const allocations = fighter_allocations ? JSON.parse(fighter_allocations) : [];
      const amountPaid = session.amount_total || 0;
      const platformFee = calculatePlatformFee(amountPaid);

      // Create payment record with platform fee
      const { data: payment, error: paymentError } = await supabaseAdmin.from('stream_payments').insert({
        event_id,
        user_id,
        amount_paid: amountPaid,
        fighter_allocations: allocations,
        payment_intent_id: session.payment_intent as string,
        platform_fee: platformFee,
      }).select('id').single();

      if (paymentError) {
        console.error('Failed to create stream payment in webhook:', paymentError);
      } else {
        console.log('✅ Webhook: Stream payment created successfully', {
          paymentId: payment.id,
          eventId,
          userId,
          amount: session.amount_total,
        });
      }
    }
  }

  return NextResponse.json({ received: true });
}

