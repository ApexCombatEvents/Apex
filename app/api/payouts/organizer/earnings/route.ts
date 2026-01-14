import { NextResponse } from "next/server";
import { createSupabaseServerForRoute } from "@/lib/supabaseServerForRoute";
import { calculatePlatformFee } from "@/lib/platformFees";

// Calculate organizer earnings (revenue minus fighter allocations) per event
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

    // Verify organizer role
    const { data: profile } = await supabase
      .from("profiles")
      .select("id, role")
      .eq("id", user.id)
      .single();

    const roleLower = profile?.role?.toLowerCase();
    if (roleLower !== "promotion" && roleLower !== "gym") {
      return NextResponse.json(
        { error: "Only organizers can view organizer earnings" },
        { status: 403 }
      );
    }

    // Load events owned by this organizer
    const { data: events } = await supabase
      .from("events")
      .select("id, title, name, event_date, owner_profile_id, profile_id, fighter_percentage, will_stream")
      .or(`owner_profile_id.eq.${user.id},profile_id.eq.${user.id}`);

    const eventIds = (events || []).map((e: any) => e.id);
    if (eventIds.length === 0) {
      return NextResponse.json({
        totalRevenue: 0,
        totalFighterShare: 0,
        organizerShare: 0,
        totalPaidOut: 0,
        pendingRequests: 0,
        availableBalance: 0,
        earningsBreakdown: [],
        payoutRequests: [],
      });
    }

    // Payments for these events
    const { data: payments } = await supabase
      .from("stream_payments")
      .select("event_id, amount_paid, fighter_allocations, platform_fee, created_at")
      .in("event_id", eventIds);

    const totalRevenue = (payments || []).reduce((sum: number, p: any) => sum + (p.amount_paid || 0), 0);
    const totalPlatformFees = (payments || []).reduce((sum: number, p: any) => sum + (p.platform_fee || 0), 0);

    // Sum fighter allocations by event
    const fighterByEvent: Record<string, number> = {};
    (payments || []).forEach((p: any) => {
      const allocations = Array.isArray(p.fighter_allocations) ? p.fighter_allocations : [];
      const allocationSum = allocations.reduce((s: number, a: any) => s + (a.amount || 0), 0);
      fighterByEvent[p.event_id] = (fighterByEvent[p.event_id] || 0) + allocationSum;
    });

    const totalFighterShare = Object.values(fighterByEvent).reduce((s, v) => s + v, 0);

    // Calculate platform fees by event
    const platformFeeByEvent: Record<string, number> = {};
    (payments || []).forEach((p: any) => {
      platformFeeByEvent[p.event_id] = (platformFeeByEvent[p.event_id] || 0) + (p.platform_fee || 0);
    });

    // Organizer share per event = revenue - platform fees - fighter allocations
    const organizerByEvent: Record<string, number> = {};
    eventIds.forEach((id) => {
      const eventRevenue = (payments || []).filter((p: any) => p.event_id === id).reduce((s: number, p: any) => s + (p.amount_paid || 0), 0);
      const fighterShare = fighterByEvent[id] || 0;
      const platformFee = platformFeeByEvent[id] || 0;
      organizerByEvent[id] = Math.max(0, eventRevenue - platformFee - fighterShare);
    });

    // Existing organizer payout requests
    const { data: payoutRequests } = await supabase
      .from("payout_requests")
      .select("id, event_id, amount_requested, status, created_at, processed_at, recipient_type, recipient_profile_id")
      .eq("recipient_type", "organizer")
      .eq("recipient_profile_id", user.id)
      .in("event_id", eventIds)
      .order("created_at", { ascending: false });

    const totalPaidOut = (payoutRequests || [])
      .filter((pr: any) => pr.status === "processed")
      .reduce((sum: number, pr: any) => sum + (pr.amount_requested || 0), 0);

    const pendingRequests = (payoutRequests || [])
      .filter((pr: any) => pr.status === "pending" || pr.status === "approved")
      .reduce((sum: number, pr: any) => sum + (pr.amount_requested || 0), 0);

    const organizerShare = Object.values(organizerByEvent).reduce((s, v) => s + v, 0);
    const availableBalance = organizerShare - totalPaidOut - pendingRequests;

    // Build breakdown
    const eventsById: Record<string, any> = {};
    (events || []).forEach((e: any) => (eventsById[e.id] = e));
    const earningsBreakdown = eventIds.map((id) => ({
      eventId: id,
      eventName: eventsById[id]?.title || eventsById[id]?.name || "Event",
      eventDate: eventsById[id]?.event_date,
      totalRevenue: (payments || []).filter((p: any) => p.event_id === id).reduce((s: number, p: any) => s + (p.amount_paid || 0), 0),
      platformFee: platformFeeByEvent[id] || 0,
      fighterShare: fighterByEvent[id] || 0,
      organizerShare: organizerByEvent[id] || 0,
    }));

    return NextResponse.json({
      totalRevenue,
      totalPlatformFees,
      totalFighterShare,
      organizerShare,
      totalPaidOut,
      pendingRequests,
      availableBalance,
      earningsBreakdown,
      payoutRequests: payoutRequests || [],
    });
  } catch (error: any) {
    console.error("Organizer earnings error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to calculate organizer earnings" },
      { status: 500 }
    );
  }
}



