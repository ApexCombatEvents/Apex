// app/api/events/[id]/notify-bout-started/route.ts
import { NextResponse } from "next/server";
import { createClient } from '@supabase/supabase-js';

// Validate environment variables at module load
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error("Missing required Supabase environment variables: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
}

const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const eventId = params.id;
    let boutId: string;
    
    try {
      const body = await req.json();
      boutId = body.boutId;
    } catch (jsonError) {
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 }
      );
    }

    if (!boutId) {
      return NextResponse.json(
        { error: "Missing boutId" },
        { status: 400 }
      );
    }

    // Get event details
    const { data: event, error: eventError } = await supabaseAdmin
      .from("events")
      .select("id, name, title, owner_profile_id, profile_id")
      .eq("id", eventId)
      .single();

    if (eventError || !event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    // Get all followers of this event
    const { data: followers, error: followersError } = await supabaseAdmin
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

    const eventName = event.title || event.name || "Event";
    const ownerId = event.owner_profile_id || event.profile_id;

    // Get bout details
    const { data: bout } = await supabaseAdmin
      .from("event_bouts")
      .select("id, red_name, blue_name, sequence_number, card_type")
      .eq("id", boutId)
      .single();

    const redName = bout?.red_name || "TBC";
    const blueName = bout?.blue_name || "TBC";
    const boutNumber = bout?.sequence_number || null;

    // Create notifications for all followers
    const notifications = followers.map((f) => ({
      profile_id: f.profile_id,
      type: "bout_started",
      actor_profile_id: ownerId,
      data: {
        event_id: eventId,
        event_name: eventName,
        bout_id: boutId,
        red_name: redName,
        blue_name: blueName,
        bout_number: boutNumber,
      },
    }));

    const { error: notifError } = await supabaseAdmin
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
      notified: followers.length,
      message: `Notified ${followers.length} followers` 
    });
  } catch (error: any) {
    console.error("Notify bout started error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
