import { NextResponse } from "next/server";
import { createSupabaseServerForRoute } from "@/lib/supabaseServerForRoute";

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

    const { threadId, body } = await req.json();

    if (!threadId || !body || typeof body !== "string") {
      return NextResponse.json(
        { error: "threadId and body are required" },
        { status: 400 }
      );
    }

    const text = body.trim();
    if (!text) {
      return NextResponse.json(
        { error: "Message body cannot be empty." },
        { status: 400 }
      );
    }

    // 1️⃣ Insert message (RLS "Insert messages as self" will check sender_profile_id)
    const { data: inserted, error: insertError } = await supabase
      .from("chat_messages")
      .insert({
        thread_id: threadId,
        sender_profile_id: user.id,
        body: text,
      })
      .select("id, sender_profile_id, body, created_at")
      .single();

    if (insertError || !inserted) {
      console.error("send message insert error", insertError);
      return NextResponse.json(
        { error: "Failed to send message." },
        { status: 500 }
      );
    }

    // 2️⃣ Update thread summary (optional, ignore errors)
    await supabase
      .from("chat_threads")
      .update({
        last_message_at: new Date().toISOString(),
        last_message_preview: text.slice(0, 140),
      })
      .eq("id", threadId);

    // 3️⃣ Create notifications for the other participants
    const { data: participants } = await supabase
      .from("chat_thread_participants")
      .select("profile_id")
      .eq("thread_id", threadId);

    const recipientIds = (participants || [])
      .map((p) => p.profile_id)
      .filter((pid) => pid !== user.id);

    if (recipientIds.length > 0) {
      const rows = recipientIds.map((pid) => ({
        profile_id: pid,
        type: "message",
        actor_profile_id: user.id,
        data: {
          threadId,
          preview: text.slice(0, 80),
        },
      }));

      // RLS on notifications allows insert with check(true)
      await supabase.from("notifications").insert(rows);
    }

    return NextResponse.json({ message: inserted });
  } catch (err) {
    console.error("messages/send error", err);
    return NextResponse.json(
      { error: "Unexpected error sending message." },
      { status: 500 }
    );
  }
}
