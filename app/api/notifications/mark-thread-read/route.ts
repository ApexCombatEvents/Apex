// app/api/notifications/mark-thread-read/route.ts
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

  const { threadId } = await req.json();

  if (!threadId) {
    return NextResponse.json(
      { error: "threadId is required" },
      { status: 400 }
    );
  }

  const { error } = await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("profile_id", user.id)
    .eq("type", "message")
    .contains("data", { thread_id: threadId });

  if (error) {
    console.error("mark thread notifications read error", error);
    return NextResponse.json(
      { error: "Could not mark thread as read" },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
