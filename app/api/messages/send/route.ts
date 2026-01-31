import { NextResponse } from "next/server";
import { createSupabaseServerForRoute } from "@/lib/supabaseServerForRoute";
import { createClient } from "@supabase/supabase-js";

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

    let threadId: string;
    let body: string;
    try {
      const json = await req.json();
      threadId = json.threadId;
      body = json.body;
    } catch (jsonError) {
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 }
      );
    }

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

    // Verify user is in the thread before inserting
    const { data: thread, error: threadError } = await supabase
      .from("message_threads")
      .select("profile_a, profile_b")
      .eq("id", threadId)
      .single();

    if (threadError || !thread) {
      return NextResponse.json(
        { error: "Thread not found" },
        { status: 404 }
      );
    }

    if (thread.profile_a !== user.id && thread.profile_b !== user.id) {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 }
      );
    }

    // Use service role client to bypass RLS for chat_messages insert
    // We've already verified authorization above
    // This avoids infinite recursion in RLS policies
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !serviceRoleKey) {
      console.error("Missing Supabase environment variables");
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 }
      );
    }
    
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    // 1️⃣ Insert message using admin client to bypass RLS
    const { data: inserted, error: insertError } = await supabaseAdmin
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
    // Note: message_threads table doesn't have last_message_at or last_message_preview columns
    // These are computed from chat_messages, so we skip this update

    // 3️⃣ Create notifications for the other participant
    // We already have the thread data from the authorization check above
    const recipientIds: string[] = [];
    const otherProfileId = thread.profile_a === user.id ? thread.profile_b : thread.profile_a;
    if (otherProfileId) {
      recipientIds.push(otherProfileId);
    }

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
