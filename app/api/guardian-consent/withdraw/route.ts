// app/api/guardian-consent/withdraw/route.ts
// A guardian revokes permission using the standing link from their
// confirmation email. Unauthenticated: the token is the credential.

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { checkRateLimit, getClientIP, RATE_LIMITS } from "@/lib/ratelimit";
import { hashConsentToken } from "@/lib/guardian-consent";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error("Missing required Supabase environment variables: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
}

const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

export async function POST(req: Request) {
  try {
    const clientIP = getClientIP(req);

    const rateLimitResult = checkRateLimit(
      `guardian-withdraw:${clientIP}`,
      RATE_LIMITS.login.maxRequests,
      RATE_LIMITS.login.windowMs
    );

    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: "Too many attempts. Please try again later." },
        {
          status: 429,
          headers: {
            "Retry-After": Math.ceil((rateLimitResult.resetAt - Date.now()) / 1000).toString(),
          },
        }
      );
    }

    let token: string;
    try {
      const json = await req.json();
      token = json.token;
    } catch {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    if (!token || typeof token !== "string") {
      return NextResponse.json({ error: "Missing withdrawal token" }, { status: 400 });
    }

    const { data: request, error: lookupError } = await supabaseAdmin
      .from("guardian_consent_requests")
      .select("id, status")
      .eq("withdrawal_token_hash", hashConsentToken(token))
      .maybeSingle();

    if (lookupError) {
      console.error("Withdrawal lookup failed", lookupError);
      return NextResponse.json(
        { error: "Could not process this request. Please try again." },
        { status: 500 }
      );
    }

    if (!request) {
      return NextResponse.json(
        { error: "This link is no longer valid." },
        { status: 410 }
      );
    }

    if (request.status === "withdrawn") {
      return NextResponse.json(
        { message: "Permission has already been withdrawn.", status: "withdrawn" },
        { status: 200 }
      );
    }

    if (request.status !== "confirmed") {
      return NextResponse.json(
        { error: "This link is no longer valid." },
        { status: 410 }
      );
    }

    const { error: updateError } = await supabaseAdmin
      .from("guardian_consent_requests")
      .update({
        status: "withdrawn",
        withdrawn_at: new Date().toISOString(),
        responded_ip: clientIP || null,
      })
      .eq("id", request.id)
      .eq("status", "confirmed");

    if (updateError) {
      console.error("Withdrawal update failed", updateError);
      return NextResponse.json(
        { error: "Could not withdraw permission. Please try again." },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        message:
          "Permission withdrawn. The account is restricted again and the profile is hidden.",
        status: "withdrawn",
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("Guardian withdrawal error", err);
    return NextResponse.json({ error: "Unexpected error" }, { status: 500 });
  }
}
