// app/api/messages/thread/[threadId]/route.ts
import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabaseServer";
import { createClient } from "@supabase/supabase-js";

// Small helper so we don't repeat the same checks twice
async function ensureUserInThread(
  supabase: ReturnType<typeof createSupabaseServer>,
  threadId: string
): Promise<
  | { errorResponse: NextResponse }
  | { user: { id: string }; thread: { id: string; profile_a: string; profile_b: string } }
> {
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
  { params }: { params: Promise<{ threadId: string }> | { threadId: string } }
) {
  const supabase = createSupabaseServer();
  
  // Handle both sync and async params (Next.js 13 vs 15)
  const resolvedParams = await Promise.resolve(params);
  const threadId = resolvedParams.threadId;

  const check = await ensureUserInThread(supabase, threadId);
  if ("errorResponse" in check) return check.errorResponse;

  // Use service role client to bypass RLS for chat_messages query
  // We've already verified authorization in ensureUserInThread
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

  const { data: messages, error } = await supabaseAdmin
    .from("chat_messages")
    .select("id, body, created_at, sender_profile_id")
    .eq("thread_id", threadId)
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

  const { data: otherProfile, error: profileError } = await supabase
    .from("profiles")
    .select("id, username, full_name, avatar_url, role")
    .eq("id", otherProfileId)
    .maybeSingle();

  if (profileError) {
    console.error("profile error", profileError);
    // Don't fail the whole request if profile lookup fails
  }

  return NextResponse.json({ 
    messages: messages || [],
    participant: otherProfile || null
  });
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ threadId: string }> | { threadId: string } }
) {
  const supabase = createSupabaseServer();
  
  // Handle both sync and async params (Next.js 13 vs 15)
  const resolvedParams = await Promise.resolve(params);
  const threadId = resolvedParams.threadId;

  const check = await ensureUserInThread(supabase, threadId);
  if ("errorResponse" in check) return check.errorResponse;

  const { user } = check;
  let body: string;
  try {
    const json = await req.json();
    body = json.body;
  } catch (jsonError) {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 }
    );
  }

  if (!body || typeof body !== "string" || !body.trim()) {
    return NextResponse.json(
      { error: "Message body is required" },
      { status: 400 }
    );
  }

  // Use service role client to bypass RLS for chat_messages insert
  // We've already verified authorization in ensureUserInThread
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

  const { data, error } = await supabaseAdmin
    .from("chat_messages")
    .insert({
      thread_id: threadId,
      sender_profile_id: user.id,
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


