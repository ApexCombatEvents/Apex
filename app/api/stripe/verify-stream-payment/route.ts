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
    const fighterAllocations = session.metadata?.fighter_allocations 
      ? JSON.parse(session.metadata.fighter_allocations) 
      : [];

    if (!eventId) {
      return NextResponse.json(
        { error: 'Invalid session metadata' },
        { status: 400 }
      );
    }

    // Check if payment already exists (created by webhook)
    const { data: existingPayment } = await supabaseAdmin
      .from('stream_payments')
      .select('id')
      .eq('event_id', eventId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (existingPayment) {
      return NextResponse.json({ 
        success: true, 
        paymentId: existingPayment.id,
        hasAccess: true 
      });
    }

    // If payment doesn't exist, create it (webhook might not have fired yet)
    const { data: payment, error: paymentError } = await supabaseAdmin
      .from('stream_payments')
      .insert({
        event_id: eventId,
        user_id: user.id,
        amount_paid: session.amount_total || 0,
        fighter_allocations: fighterAllocations,
        payment_intent_id: session.payment_intent as string,
        payment_status: 'paid',
      })
      .select('id')
      .single();

    if (paymentError) {
      // Check if error is duplicate key (23505) - means webhook already processed it
      if (paymentError.code === '23505') {
        // Race condition: webhook processed between our check and insert
        // Fetch the payment that was just created by webhook
        const { data: webhookPayment } = await supabaseAdmin
          .from('stream_payments')
          .select('id')
          .eq('event_id', eventId)
          .eq('user_id', user.id)
          .maybeSingle();

        if (webhookPayment) {
          return NextResponse.json({ 
            success: true, 
            paymentId: webhookPayment.id,
            hasAccess: true 
          });
        }
      }

      console.error('Failed to create stream payment after verification:', paymentError);
      return NextResponse.json(
        { error: 'Failed to grant stream access. Please contact support with your payment confirmation.' },
        { status: 500 }
      );
    }

    if (!payment) {
      return NextResponse.json(
        { error: 'Failed to grant stream access. Please contact support with your payment confirmation.' },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      success: true, 
      paymentId: payment.id,
      hasAccess: true 
    });
  } catch (error: any) {
    console.error('Stream payment verification error:', error);
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

