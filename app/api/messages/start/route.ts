// app/api/messages/start/route.ts
import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabaseServer";

export async function POST(req: Request) {
  const supabase = createSupabaseServer();

  // who am I?
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const otherProfileId = body?.otherProfileId as string | undefined;

  if (!otherProfileId) {
    return NextResponse.json(
      { error: "otherProfileId is required" },
      { status: 400 }
    );
  }

  if (otherProfileId === user.id) {
    return NextResponse.json(
      { error: "You cannot message yourself" },
      { status: 400 }
    );
  }

  // 1) Look for existing thread between these two profiles
  const { data: existing, error: existingError } = await supabase
    .from("message_threads")
    .select("id, profile_a, profile_b")
    .or(
      `and(profile_a.eq.${user.id},profile_b.eq.${otherProfileId}),and(profile_a.eq.${otherProfileId},profile_b.eq.${user.id})`
    )
    .maybeSingle();

  if (existingError) {
    console.error("check existing thread error", existingError);
    return NextResponse.json(
      { error: "Could not check existing thread" },
      { status: 500 }
    );
  }

  if (existing) {
    return NextResponse.json({ threadId: existing.id });
  }

  // 2) Create new thread
  const { data: created, error: insertError } = await supabase
    .from("message_threads")
    .insert({
      profile_a: user.id,
      profile_b: otherProfileId,
    })
    .select("id")
    .single();

  if (insertError) {
    console.error("create thread error", insertError);
    return NextResponse.json(
      { error: "Could not create thread" },
      { status: 500 }
    );
  }

  return NextResponse.json({ threadId: created.id });
}

