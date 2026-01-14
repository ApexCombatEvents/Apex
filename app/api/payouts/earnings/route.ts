import { NextResponse } from "next/server";
import { createSupabaseServerForRoute } from "@/lib/supabaseServerForRoute";

// Calculate total earnings for a fighter across all events
export async function GET(req: Request) {
  try {
    const supabase = createSupabaseServerForRoute();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Get user's profile and verify they're a fighter
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
        { error: "Only fighters can view earnings" },
        { status: 403 }
      );
    }

    // Calculate earnings from stream_payments (allocations)
    const { data: payments, error: paymentsError } = await supabase
      .from("stream_payments")
      .select("event_id, amount_paid, fighter_allocations, created_at");

    if (paymentsError) {
      console.error("Payments error", paymentsError);
    }

    let allocationEarnings = 0;
    const earningsByEvent: Record<string, { allocationEarnings: number; tipEarnings: number; totalEarnings: number }> = {};

    if (payments) {
      payments.forEach((payment: any) => {
        if (payment.fighter_allocations && Array.isArray(payment.fighter_allocations)) {
          payment.fighter_allocations.forEach((allocation: any) => {
            if (allocation.fighter_id === user.id) {
              allocationEarnings += allocation.amount || 0;
              
              if (!earningsByEvent[payment.event_id]) {
                earningsByEvent[payment.event_id] = { allocationEarnings: 0, tipEarnings: 0, totalEarnings: 0 };
              }
              earningsByEvent[payment.event_id].allocationEarnings += allocation.amount || 0;
            }
          });
        }
      });
    }

    // Calculate earnings from stream_tips
    const { data: tips, error: tipsError } = await supabase
      .from("stream_tips")
      .select("event_id, amount, created_at")
      .eq("fighter_id", user.id);

    if (tipsError) {
      console.error("Tips error", tipsError);
    }

    let tipEarnings = 0;
    if (tips) {
      tips.forEach((tip: any) => {
        tipEarnings += tip.amount || 0;
        
        if (!earningsByEvent[tip.event_id]) {
          earningsByEvent[tip.event_id] = { allocationEarnings: 0, tipEarnings: 0, totalEarnings: 0 };
        }
        earningsByEvent[tip.event_id].tipEarnings += tip.amount || 0;
      });
    }

    // Calculate total earnings per event
    Object.keys(earningsByEvent).forEach((eventId) => {
      const earnings = earningsByEvent[eventId];
      earnings.totalEarnings = earnings.allocationEarnings + earnings.tipEarnings;
    });

    // Get pending and processed payout requests
    const { data: payoutRequests, error: payoutError } = await supabase
      .from("payout_requests")
      .select("id, event_id, amount_requested, status, created_at, processed_at, stripe_transfer_id, rejection_reason")
      .eq("fighter_id", user.id)
      .order("created_at", { ascending: false });

    if (payoutError) {
      console.error("Payout requests error", payoutError);
    }

    // Calculate total paid out
    const totalPaidOut = (payoutRequests || [])
      .filter((pr: any) => pr.status === "processed")
      .reduce((sum: number, pr: any) => sum + (pr.amount_requested || 0), 0);

    // Calculate pending requests
    const pendingRequests = (payoutRequests || [])
      .filter((pr: any) => pr.status === "pending" || pr.status === "approved")
      .reduce((sum: number, pr: any) => sum + (pr.amount_requested || 0), 0);

    const totalEarnings = allocationEarnings + tipEarnings;
    const availableBalance = totalEarnings - totalPaidOut - pendingRequests;

    // Load event details for earnings breakdown
    const eventIds = Object.keys(earningsByEvent);
    let eventsById: Record<string, any> = {};
    
    if (eventIds.length > 0) {
      const { data: events } = await supabase
        .from("events")
        .select("id, title, name, event_date")
        .in("id", eventIds);
      
      if (events) {
        events.forEach((event: any) => {
          eventsById[event.id] = event;
        });
      }
    }

    // Build earnings breakdown with event details
    const earningsBreakdown = Object.entries(earningsByEvent).map(([eventId, earnings]) => ({
      eventId,
      eventName: eventsById[eventId]?.title || eventsById[eventId]?.name || "Unknown Event",
      eventDate: eventsById[eventId]?.event_date,
      ...earnings,
    }));

    return NextResponse.json({
      totalEarnings,
      allocationEarnings,
      tipEarnings,
      totalPaidOut,
      pendingRequests,
      availableBalance,
      earningsBreakdown,
      payoutRequests: payoutRequests || [],
    });
  } catch (error: any) {
    console.error("Earnings calculation error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to calculate earnings" },
      { status: 500 }
    );
  }
}

