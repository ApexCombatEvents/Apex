import { NextResponse } from "next/server";
import { createSupabaseServerForRoute } from "@/lib/supabaseServerForRoute";

// Create a payout request
export async function POST(req: Request) {
  try {
    const supabase = createSupabaseServerForRoute();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    let eventId: string;
    let amount: number;
    try {
      const json = await req.json();
      eventId = json.eventId;
      amount = json.amount;
    } catch (jsonError) {
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 }
      );
    }

    if (!eventId || !amount || typeof amount !== "number" || amount <= 0) {
      return NextResponse.json(
        { error: "eventId and amount (in cents) are required" },
        { status: 400 }
      );
    }

    // Verify user is a fighter
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id, role")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    const roleLower = profile.role?.toLowerCase();
    if (roleLower !== "fighter") {
      return NextResponse.json(
        { error: "Only fighters can request payouts" },
        { status: 403 }
      );
    }

    // Verify event exists
    const { data: event, error: eventError } = await supabase
      .from("events")
      .select("id, title, name")
      .eq("id", eventId)
      .single();

    if (eventError || !event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    // Calculate available earnings for this event
    // Get allocations for this fighter from this event
    const { data: payments, error: paymentsError } = await supabase
      .from("stream_payments")
      .select("fighter_allocations")
      .eq("event_id", eventId);

    let allocationEarnings = 0;
    if (payments && Array.isArray(payments)) {
      payments.forEach((payment: any) => {
        if (payment && payment.fighter_allocations && Array.isArray(payment.fighter_allocations)) {
          payment.fighter_allocations.forEach((allocation: any) => {
            if (allocation && allocation.fighter_id === user.id) {
              allocationEarnings += allocation.amount || 0;
            }
          });
        }
      });
    }

    // Get tips for this fighter from this event
    const { data: tips, error: tipsError } = await supabase
      .from("stream_tips")
      .select("amount")
      .eq("event_id", eventId)
      .eq("fighter_id", user.id);

    let tipEarnings = 0;
    if (tips && Array.isArray(tips)) {
      tips.forEach((tip: any) => {
        if (tip && tip.amount) {
          tipEarnings += tip.amount;
        }
      });
    }

    const totalEarnings = allocationEarnings + tipEarnings;

    // Get existing payout requests for this event
    const { data: existingRequests, error: existingError } = await supabase
      .from("payout_requests")
      .select("amount_requested, status")
      .eq("fighter_id", user.id)
      .eq("event_id", eventId);

    if (existingError) {
      console.error("Existing requests error", existingError);
    }

    const totalRequested = (existingRequests || [])
      .filter((pr: any) => pr.status === "pending" || pr.status === "approved" || pr.status === "processed")
      .reduce((sum: number, pr: any) => sum + (pr.amount_requested || 0), 0);

    const availableBalance = totalEarnings - totalRequested;

    if (amount > availableBalance) {
      return NextResponse.json(
        { 
          error: `Insufficient balance. Available: $${(availableBalance / 100).toFixed(2)}, Requested: $${(amount / 100).toFixed(2)}` 
        },
        { status: 400 }
      );
    }

    // Create payout request
    const { data: payoutRequest, error: insertError } = await supabase
      .from("payout_requests")
      .insert({
        fighter_id: user.id,
        event_id: eventId,
        amount_requested: amount,
        status: "pending",
      })
      .select()
      .single();

    if (insertError || !payoutRequest) {
      console.error("Payout request insert error", insertError);
      return NextResponse.json(
        { error: "Failed to create payout request" },
        { status: 500 }
      );
    }

    return NextResponse.json({ payoutRequest });
  } catch (error: any) {
    console.error("Payout request error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create payout request" },
      { status: 500 }
    );
  }
}


