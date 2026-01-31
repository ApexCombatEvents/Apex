// app/api/messages/threads/route.ts
import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabaseServer";
import { createClient } from "@supabase/supabase-js";

type RawThread = {
  id: string;
  profile_a: string;
  profile_b: string;
  created_at: string | null;
};

export async function GET() {
  const supabase = createSupabaseServer();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json(
      { error: authError?.message || "Not authenticated" },
      { status: 401 }
    );
  }

  try {
    // 1) Get all threads where I'm profile_a or profile_b (no limit - load all)
    const { data, error } = await supabase
      .from("message_threads")
      .select("id, profile_a, profile_b, created_at")
      .or(`profile_a.eq.${user.id},profile_b.eq.${user.id}`);

    if (error) {
      console.error("threads error", error);
      return NextResponse.json(
        { error: error.message || "Could not load threads" },
        { status: 500 }
      );
    }

    const threads = (data ?? []) as RawThread[];

    // 2) Collect "other" profile IDs and thread IDs
    const otherIds = new Set<string>();
    const threadIds = threads.map((t) => t.id);
    for (const t of threads) {
      const otherId = t.profile_a === user.id ? t.profile_b : t.profile_a;
      otherIds.add(otherId);
    }

    // 3.5) Load a "last message" preview per thread (best-effort)
    // We do this here so the messages list can show a preview before entering the thread.
    // Get the most recent message for each thread
    const lastMessageByThreadId: Record<
      string,
      { body: string; created_at: string; sender_profile_id: string }
    > = {};

    if (threadIds.length > 0) {
      // Use service role client to bypass RLS for chat_messages query
      // This avoids infinite recursion in RLS policies
      // Authorization is already verified - user can only see their own threads
      const supabaseAdmin = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );

      // Get the most recent message for each thread
      // We'll do this by getting all messages and then finding the latest per thread
      const { data: recentMessages, error: recentMessagesError } = await supabaseAdmin
        .from("chat_messages")
        .select("thread_id, body, created_at, sender_profile_id")
        .in("thread_id", threadIds)
        .order("created_at", { ascending: false });

      if (recentMessagesError) {
        console.error("recent messages error", recentMessagesError);
      } else if (recentMessages) {
        // Since messages are ordered by created_at descending, first occurrence per thread_id is the latest
        for (const m of recentMessages as any[]) {
          if (!lastMessageByThreadId[m.thread_id]) {
            lastMessageByThreadId[m.thread_id] = {
              body: m.body,
              created_at: m.created_at,
              sender_profile_id: m.sender_profile_id,
            };
          }
        }
      }
    }

    // 3) Load those profiles
    const profilesById: Record<string, any> = {};
    if (otherIds.size > 0) {
      const { data: profiles, error: profError } = await supabase
        .from("profiles")
        .select("id, username, full_name, avatar_url")
        .in("id", Array.from(otherIds));

      if (profError) {
        console.error("thread profiles error", profError);
      } else if (profiles) {
        for (const p of profiles as any[]) {
          profilesById[p.id] = p;
        }
      }
    }

    // 4) Check which threads are fighting conversations (have bout request or offer messages)
    const fightingThreadIds = new Set<string>();
    if (threadIds.length > 0) {
      // Use service role client to bypass RLS (same as above)
      const supabaseUrl2 = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const serviceRoleKey2 = process.env.SUPABASE_SERVICE_ROLE_KEY;
      
      if (!supabaseUrl2 || !serviceRoleKey2) {
        console.error("Missing Supabase environment variables");
        return NextResponse.json(
          { error: "Server configuration error" },
          { status: 500 }
        );
      }
      
      const supabaseAdmin = createClient(supabaseUrl2, serviceRoleKey2);

      const { data: boutMessages } = await supabaseAdmin
        .from("chat_messages")
        .select("thread_id, body")
        .in("thread_id", threadIds)
        .or("body.ilike.%🥊 Bout Request%,body.ilike.%🥊 Bout Offer%");

      if (boutMessages) {
        for (const msg of boutMessages) {
          fightingThreadIds.add(msg.thread_id);
        }
      }
    }

    // 5) Shape response for the UI
    // Order by last message time (fallback to thread created_at)
    // Most recent conversations first
    const sortedThreads = [...threads].sort((a, b) => {
      const aLastMessage = lastMessageByThreadId[a.id];
      const bLastMessage = lastMessageByThreadId[b.id];
      
      // If both have messages, sort by message time
      if (aLastMessage && bLastMessage) {
        return aLastMessage.created_at > bLastMessage.created_at ? -1 : 1;
      }
      // If only one has messages, prioritize it
      if (aLastMessage && !bLastMessage) return -1;
      if (!aLastMessage && bLastMessage) return 1;
      // If neither has messages, sort by thread creation date (newest first)
      const aCreated = a.created_at || "";
      const bCreated = b.created_at || "";
      return aCreated > bCreated ? -1 : aCreated < bCreated ? 1 : 0;
    });

    const mapped = sortedThreads.map((t) => {
      const otherId = t.profile_a === user.id ? t.profile_b : t.profile_a;
      const other = profilesById[otherId] || null;
      const last = lastMessageByThreadId[t.id] || null;

      return {
        id: t.id,
        other_profile_id: otherId,
        other_username: other?.username ?? null,
        other_full_name: other?.full_name ?? null,
        other_avatar_url: other?.avatar_url ?? null,
        // keep the field name the UI already expects
        last_message_at: last?.created_at ?? t.created_at,
        last_message_preview: last?.body ?? null,
        last_message_sender_id: last?.sender_profile_id ?? null,
        is_fighting_conversation: fightingThreadIds.has(t.id),
      };
    });

    return NextResponse.json({ threads: mapped });
  } catch (e: any) {
    console.error("threads fatal error", e);
    return NextResponse.json(
      { error: e?.message || "Unexpected error" },
      { status: 500 }
    );
  }
}
