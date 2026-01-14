// app/api/notifications/route.ts
import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabaseServer";

export async function GET() {
  const supabase = createSupabaseServer();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    // not signed in => nothing to show
    return NextResponse.json(
      { notifications: [], unreadCount: 0 },
      { status: 200 }
    );
  }

  const { data, error } = await supabase
    .from("notifications")
    .select("id, type, data, is_read, created_at, actor_profile_id")
    .eq("profile_id", user.id)
    .order("created_at", { ascending: false })
    .limit(30);

  if (error) {
    console.error("notifications error", error);
    return NextResponse.json(
      { error: "Could not load notifications" },
      { status: 500 }
    );
  }

  const notifications = data ?? [];
  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return NextResponse.json({ notifications, unreadCount });
}

