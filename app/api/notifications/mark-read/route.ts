// app/api/notifications/mark-read/route.ts
import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabaseServer";

export async function POST(req: Request) {
  const supabase = createSupabaseServer();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { notificationId } = await req.json();

  if (!notificationId) {
    return NextResponse.json(
      { error: "notificationId is required" },
      { status: 400 }
    );
  }

  const { error } = await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("id", notificationId)
    .eq("profile_id", user.id);

  if (error) {
    console.error("mark notification read error", error);
    return NextResponse.json(
      { error: "Could not mark notification as read" },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
