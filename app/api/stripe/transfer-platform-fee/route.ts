import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { createSupabaseServerForRoute } from '@/lib/supabaseServerForRoute';
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

    let paymentId: string;
    let offerId: string;
    try {
      const json = await req.json();
      paymentId = json.paymentId;
      offerId = json.offerId;
    } catch (jsonError) {
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 }
      );
    }

    if (!paymentId) {
      return NextResponse.json(
        { error: 'Missing required field: paymentId' },
        { status: 400 }
      );
    }

    // Get payment record
    const { data: paymentRecord, error: paymentError } = await supabaseAdmin
      .from('offer_payments')
      .select('id, platform_fee, payment_intent_id, amount_paid, transfer_status')
      .eq('id', paymentId)
      .single();

    if (paymentError || !paymentRecord) {
      return NextResponse.json(
        { error: 'Payment record not found' },
        { status: 404 }
      );
    }

    // Check if platform fee has already been transferred
    if (paymentRecord.transfer_status === 'transferred') {
      return NextResponse.json(
        { error: 'Platform fee already transferred' },
        { status: 400 }
      );
    }

    if (!paymentRecord.platform_fee || paymentRecord.platform_fee <= 0) {
      return NextResponse.json(
        { error: 'No platform fee to transfer' },
        { status: 400 }
      );
    }

    if (!paymentRecord.payment_intent_id) {
      return NextResponse.json(
        { error: 'Payment intent ID not found' },
        { status: 400 }
      );
    }

    // Get the payment intent to retrieve the charge
    const paymentIntent = await stripe.paymentIntents.retrieve(
      paymentRecord.payment_intent_id
    );

    if (!paymentIntent.latest_charge || typeof paymentIntent.latest_charge !== 'string') {
      return NextResponse.json(
        { error: 'Charge not found for payment intent' },
        { status: 400 }
      );
    }

    // Get the charge to find the balance transaction
    const charge = await stripe.charges.retrieve(paymentIntent.latest_charge);

    // Platform fee is already in the platform owner's Stripe account
    // When payments are made through Stripe Checkout, they go directly to the platform's account
    // The platform fee (5%) is automatically retained - no transfer needed
    // We just mark it as transferred for tracking purposes
    
    // Update payment record to mark platform fee as transferred
    const { error: updateError } = await supabaseAdmin
      .from('offer_payments')
      .update({
        transfer_status: 'transferred',
        updated_at: new Date().toISOString(),
      })
      .eq('id', paymentId);

    if (updateError) {
      console.error('Failed to update transfer status:', updateError);
      return NextResponse.json(
        { error: 'Failed to update transfer status' },
        { status: 500 }
      );
    }

    // Log the transfer for tracking
    console.log(`✅ Platform fee of $${(paymentRecord.platform_fee / 100).toFixed(2)} retained in platform account for payment ${paymentId}`);

    return NextResponse.json({
      success: true,
      platformFee: paymentRecord.platform_fee,
      message: 'Platform fee retained in platform account',
    });
  } catch (error: any) {
    console.error('Transfer platform fee error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to transfer platform fee' },
      { status: 500 }
    );
  }
}
