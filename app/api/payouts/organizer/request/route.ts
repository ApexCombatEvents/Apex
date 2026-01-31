import { NextResponse } from "next/server";
import { createSupabaseServerForRoute } from "@/lib/supabaseServerForRoute";
import { calculatePlatformFee } from "@/lib/platformFees";

// Organizer creates payout request for a specific event
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

    // Verify organizer and event ownership
    const { data: event } = await supabase
      .from("events")
      .select("id, owner_profile_id, profile_id")
      .eq("id", eventId)
      .single();

    const ownerId = event?.owner_profile_id || event?.profile_id;
    if (!event || ownerId !== user.id) {
      return NextResponse.json(
        { error: "You are not the organizer of this event" },
        { status: 403 }
      );
    }

    // Calculate organizer share for this event = revenue - fighter share
    const { data: payments } = await supabase
      .from("stream_payments")
      .select("fighter_allocations, amount_paid")
      .eq("event_id", eventId);

    const eventRevenue = (payments || []).reduce((s: number, p: any) => s + (p.amount_paid || 0), 0);
    const platformFee = (payments || []).reduce((s: number, p: any) => s + (p.platform_fee || 0), 0);
    const fighterShare = (payments || []).reduce((s: number, p: any) => {
      const allocs = Array.isArray(p.fighter_allocations) ? p.fighter_allocations : [];
      return s + allocs.reduce((a: number, al: any) => a + (al.amount || 0), 0);
    }, 0);
    const organizerShare = Math.max(0, eventRevenue - platformFee - fighterShare);

    // Existing organizer payout requests
    const { data: payoutRequests } = await supabase
      .from("payout_requests")
      .select("amount_requested, status")
      .eq("recipient_type", "organizer")
      .eq("recipient_profile_id", user.id)
      .eq("event_id", eventId);

    const reserved = (payoutRequests || [])
      .filter((pr: any) => pr.status === "pending" || pr.status === "approved" || pr.status === "processed")
      .reduce((sum: number, pr: any) => sum + (pr.amount_requested || 0), 0);

    const available = organizerShare - reserved;
    if (amount > available) {
      return NextResponse.json(
        { error: `Insufficient balance. Available: $${(available / 100).toFixed(2)}` },
        { status: 400 }
      );
    }

    // Create payout request
    const { data: created, error: insertError } = await supabase
      .from("payout_requests")
      .insert({
        recipient_type: "organizer",
        recipient_profile_id: user.id,
        event_id: eventId,
        amount_requested: amount,
        status: "pending",
      })
      .select()
      .single();

    if (insertError || !created) {
      return NextResponse.json({ error: "Failed to create payout request" }, { status: 500 });
    }

    return NextResponse.json({ payoutRequest: created });
  } catch (error: any) {
    console.error("Organizer payout request error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create organizer payout request" },
      { status: 500 }
    );
  }
}



