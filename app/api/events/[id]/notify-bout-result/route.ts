// app/api/events/[id]/notify-bout-result/route.ts
import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabaseServer";

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  const supabase = createSupabaseServer();
  
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const eventId = params.id;
  const body = await req.json();
  const { bout_id, winner_side, winner_name, corner_text, method, round, time } = body;

  // Verify user is the event owner
  const { data: event, error: eventError } = await supabase
    .from("events")
    .select("id, name, title, owner_profile_id")
    .eq("id", eventId)
    .single();

  if (eventError || !event) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  const ownerId = (event as any).owner_profile_id;
  if (ownerId !== user.id) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  // Get all followers of this event
  const { data: followers, error: followersError } = await supabase
    .from("event_follows")
    .select("profile_id")
    .eq("event_id", eventId);

  if (followersError) {
    console.error("Error fetching followers:", followersError);
    return NextResponse.json(
      { error: "Failed to fetch followers" },
      { status: 500 }
    );
  }

  if (!followers || followers.length === 0) {
    return NextResponse.json({ notified: 0, message: "No followers found" });
  }

  const eventName = (event as any).title || (event as any).name || "Event";

  // Create notifications for all followers
  const notifications = followers.map((f) => ({
    profile_id: f.profile_id,
    type: "bout_result",
    actor_profile_id: user.id,
    data: {
      event_id: eventId,
      event_name: eventName,
      bout_id: bout_id,
      winner_side: winner_side,
      winner_name: winner_name,
      corner_text: corner_text,
      method: method,
      round: round,
      time: time,
    },
  }));

  const { error: notifError } = await supabase
    .from("notifications")
    .insert(notifications);

  if (notifError) {
    console.error("Error creating notifications:", notifError);
    return NextResponse.json(
      { error: "Failed to create notifications" },
      { status: 500 }
    );
  }

  return NextResponse.json({
    notified: notifications.length,
    message: `Notified ${notifications.length} followers`,
  });
}


