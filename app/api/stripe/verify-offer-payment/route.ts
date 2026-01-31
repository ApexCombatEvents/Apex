import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { stripe } from '@/lib/stripe';
import { createSupabaseServerForRoute } from '@/lib/supabaseServerForRoute';
import { calculatePlatformFee } from '@/lib/platformFees';

// Validate environment variables at module load
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error("Missing required Supabase environment variables: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
}

const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

export async function POST(req: Request) {
  try {
    // Use regular client for auth, admin for database operations
    const supabase = createSupabaseServerForRoute();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    let sessionId: string;
    let boutId: string;
    let fighterId: string;
    let side: string;
    try {
      const json = await req.json();
      sessionId = json.sessionId;
      boutId = json.boutId;
      fighterId = json.fighterId;
      side = json.side;
    } catch (jsonError) {
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 }
      );
    }

    if (!sessionId || !boutId || !fighterId || !side) {
      return NextResponse.json(
        { error: 'Missing required fields' },
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

    // Check if offer already exists (created by webhook)
    const { data: existingOffer } = await supabaseAdmin
      .from('event_bout_offers')
      .select('id')
      .eq('bout_id', boutId)
      .eq('fighter_profile_id', fighterId)
      .eq('from_profile_id', user.id)
      .eq('side', side)
      .maybeSingle();

    if (existingOffer) {
      return NextResponse.json({ 
        success: true, 
        offerId: existingOffer.id,
        created: true 
      });
    }

    // If offer doesn't exist, create it (webhook might not have fired yet)
    const { data: offer, error: offerError } = await supabaseAdmin
      .from('event_bout_offers')
      .insert({
        bout_id: boutId,
        side,
        from_profile_id: user.id,
        fighter_profile_id: fighterId,
        status: 'pending',
      })
      .select('id')
      .single();

    if (offerError || !offer) {
      console.error('Failed to create offer after payment verification:', offerError);
      return NextResponse.json(
        { error: 'Failed to create offer. Please contact support with your payment confirmation.' },
        { status: 500 }
      );
    }

    // Get bout details for payment amount
    const { data: bout, error: boutError } = await supabaseAdmin
      .from('event_bouts')
      .select('offer_fee, event_id')
      .eq('id', boutId)
      .single();

    if (boutError || !bout) {
      console.error('Failed to fetch bout details:', boutError);
      // Still return success since offer was created, but log the error
    }

    const amountPaid = bout?.offer_fee || session.amount_total || 0;
    const eventId = bout?.event_id;
    // Platform fee is 0 initially - will be charged when offer is accepted
    const platformFee = 0;

    // Create payment record (platform fee will be added when offer is accepted)
    if (bout) {
      await supabaseAdmin.from('offer_payments').insert({
        offer_id: offer.id,
        bout_id: boutId,
        payer_profile_id: user.id,
        amount_paid: amountPaid,
        payment_status: 'paid',
        payment_intent_id: session.payment_intent as string,
        platform_fee: platformFee,
      });
    }

    // Get event details for notification
    if (eventId) {
      const { data: event, error: eventError } = await supabaseAdmin
        .from('events')
        .select('id, name, title, owner_profile_id, profile_id')
        .eq('id', eventId)
        .single();

      if (eventError) {
        console.error('Failed to fetch event details:', eventError);
      }

      if (event) {
        const ownerId = event.owner_profile_id || event.profile_id;
        
        // Get sender and fighter names
        const { data: senderProfile } = await supabaseAdmin
          .from('profiles')
          .select('full_name, username')
          .eq('id', user.id)
          .single();

        const { data: fighterProfile } = await supabaseAdmin
          .from('profiles')
          .select('full_name, username')
          .eq('id', fighterId)
          .single();

        const senderName = senderProfile?.full_name || senderProfile?.username || 'A coach/gym';
        const fighterName = fighterProfile?.full_name || fighterProfile?.username || 'A fighter';

        await supabaseAdmin.from('notifications').insert({
          profile_id: ownerId,
          type: 'bout_offer',
          actor_profile_id: user.id,
          data: {
            bout_id: boutId,
            event_id: event?.id || null,
            event_name: event?.title || event?.name || "Event",
            fighter_profile_id: fighterId,
            fighter_name: fighterName,
            from_profile_id: user.id,
            from_name: senderName,
            side,
          },
        });
      }
    }

    return NextResponse.json({ 
      success: true, 
      offerId: offer.id,
      created: true 
    });
  } catch (error: any) {
    console.error('Payment verification error:', error);
    console.error('Error stack:', error.stack);
    return NextResponse.json(
      { 
        error: error.message || 'Failed to verify payment',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}

