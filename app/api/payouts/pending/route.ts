import { NextResponse } from "next/server";
import { createSupabaseServerForRoute } from "@/lib/supabaseServerForRoute";

// Get pending payout requests for an event organizer
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

    const { searchParams } = new URL(req.url);
    const eventId = searchParams.get("eventId");
    const type = searchParams.get("type"); // 'fighter' (default) or 'organizer'

    // Determine role
    const { data: me } = await supabase
      .from("profiles")
      .select("id, role")
      .eq("id", user.id)
      .single();

    const isAdmin = me?.role === "ADMIN";

    let pendingRequests: any[] | null = null;
    let requestsError: any = null;

    if (type === "organizer" && isAdmin) {
      // Admin view: all organizer pending requests
      const { data, error } = await supabase
        .from("payout_requests")
        .select(`
          *,
          recipient:recipient_profile_id (
            id,
            full_name,
            username,
            stripe_account_id,
            stripe_account_status,
            stripe_onboarding_completed
          ),
          events:event_id (
            id,
            title,
            name,
            event_date
          )
        `)
        .eq("recipient_type", "organizer")
        .in("status", ["pending", "approved"])
        .order("created_at", { ascending: false });

      pendingRequests = data as any[];
      requestsError = error;
    } else {
      // Organizer view: pending fighter requests for their events
      const { data: events, error: eventsError } = await supabase
        .from("events")
        .select("id, title, name")
        .or(`owner_profile_id.eq.${user.id},profile_id.eq.${user.id}`);

      if (eventsError) {
        console.error("Events error", eventsError);
        return NextResponse.json(
          { error: "Failed to load events" },
          { status: 500 }
        );
      }

      const eventIds = (events || []).map((e: any) => e.id);

      if (eventIds.length === 0) {
        return NextResponse.json({ pendingRequests: [] });
      }

      // Build query for fighter requests
      let query = supabase
        .from("payout_requests")
        .select(`
          *,
          fighters:fighter_id (
            id,
            full_name,
            username,
            avatar_url,
            stripe_account_id,
            stripe_account_status,
            stripe_onboarding_completed
          ),
          events:event_id (
            id,
            title,
            name,
            event_date
          )
        `)
        .eq("recipient_type", "fighter")
        .in("event_id", eventIds)
        .in("status", ["pending", "approved"])
        .order("created_at", { ascending: false });

      // Filter by event if provided
      if (eventId && eventIds.includes(eventId)) {
        query = query.eq("event_id", eventId);
      }

      const { data, error } = await query;
      pendingRequests = data as any[];
      requestsError = error;
    }

    if (requestsError) {
      console.error("Pending requests error", requestsError);
      return NextResponse.json(
        { error: "Failed to load pending requests" },
        { status: 500 }
      );
    }

    return NextResponse.json({ pendingRequests: pendingRequests || [] });
  } catch (error: any) {
    console.error("Get pending payouts error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to get pending payouts" },
      { status: 500 }
    );
  }
}

