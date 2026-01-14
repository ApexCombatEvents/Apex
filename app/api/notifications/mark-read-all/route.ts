// app/api/notifications/mark-read-all/route.ts
import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabaseServer";

export async function POST() {
  const supabase = createSupabaseServer();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { error } = await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("profile_id", user.id)
    .eq("is_read", false);

  if (error) {
    console.error("mark notifications read error", error);
    return NextResponse.json(
      { error: "Could not mark as read" },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
