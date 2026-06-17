// app/api/waivers/accept/route.ts
// Records a waiver acceptance for the currently authenticated user.
import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabaseServer";

const VALID_TYPES = ["signup", "event-creation", "bout-acceptance"] as const;
type WaiverType = (typeof VALID_TYPES)[number];

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { waiver_type, metadata } = body as {
      waiver_type: WaiverType;
      metadata?: Record<string, unknown>;
    };

    if (!waiver_type || !VALID_TYPES.includes(waiver_type)) {
      return NextResponse.json({ error: "Invalid waiver type." }, { status: 400 });
    }

    const supabase = createSupabaseServer();
    const { data: userData, error: authError } = await supabase.auth.getUser();

    if (authError || !userData.user) {
      return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
    }

    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      null;

    const { error: insertError } = await supabase
      .from("waiver_acceptances")
      .insert({
        user_id: userData.user.id,
        waiver_type,
        waiver_version: "v1.0",
        ip_address: ip,
        metadata: metadata ?? null,
      });

    if (insertError) {
      console.error("waiver insert error", insertError);
      return NextResponse.json(
        { error: "Failed to record waiver acceptance." },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("waiver accept route error", err);
    return NextResponse.json({ error: "Unexpected error." }, { status: 500 });
  }
}
