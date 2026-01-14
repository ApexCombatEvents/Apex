// app/api/messages/thread/[threadId]/route.ts
import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabaseServer";

// Small helper so we don't repeat the same checks twice
async function ensureUserInThread(
  supabase: ReturnType<typeof createSupabaseServer>,
  threadId: string
) {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { errorResponse: NextResponse.json({ error: "Not authenticated" }, { status: 401 }) };
  }

  const { data: thread, error: threadError } = await supabase
    .from("message_threads")
    .select("id, profile_a, profile_b")
    .eq("id", threadId)
    .maybeSingle();

  if (threadError) {
    console.error("thread error", threadError);
    return {
      errorResponse: NextResponse.json(
        { error: "Could not load thread" },
        { status: 500 }
      ),
    };
  }

  if (!thread) {
    return {
      errorResponse: NextResponse.json(
        { error: "Thread not found" },
        { status: 404 }
      ),
    };
  }

  if (thread.profile_a !== user.id && thread.profile_b !== user.id) {
    return {
      errorResponse: NextResponse.json(
        { error: "Forbidden" },
        { status: 403 }
      ),
    };
  }

  return { user, thread };
}

export async function GET(
  _req: Request,
  { params }: { params: { threadId: string } }
) {
  const supabase = createSupabaseServer();

  const check = await ensureUserInThread(supabase, params.threadId);
  if ("errorResponse" in check) return check.errorResponse;

  const { data: messages, error } = await supabase
    .from("chat_messages")
    .select("id, body, created_at, sender_profile_id")
    .eq("thread_id", params.threadId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("messages error", error);
    return NextResponse.json(
      { error: "Could not load messages" },
      { status: 500 }
    );
  }

  // Get the other participant's profile information
  const otherProfileId = check.thread.profile_a === check.user.id 
    ? check.thread.profile_b 
    : check.thread.profile_a;

  const { data: otherProfile } = await supabase
    .from("profiles")
    .select("id, username, full_name, avatar_url, role")
    .eq("id", otherProfileId)
    .single();

  return NextResponse.json({ 
    messages,
    participant: otherProfile || null
  });
}

export async function POST(
  req: Request,
  { params }: { params: { threadId: string } }
) {
  const supabase = createSupabaseServer();

  const check = await ensureUserInThread(supabase, params.threadId);
  if ("errorResponse" in check) return check.errorResponse;

  const { user } = check;
  const { body } = await req.json();

  if (!body || typeof body !== "string" || !body.trim()) {
    return NextResponse.json(
      { error: "Message body is required" },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("chat_messages")
    .insert({
      thread_id: params.threadId,
      sender_profile_id: user!.id,
      body: body.trim(),
    })
    .select("id")
    .single();

  if (error) {
    console.error("insert message error", error);
    return NextResponse.json(
      { error: "Could not send message" },
      { status: 500 }
    );
  }

  return NextResponse.json({ id: data.id });
}


