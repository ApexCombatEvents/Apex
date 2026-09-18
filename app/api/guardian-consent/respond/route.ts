// app/api/guardian-consent/respond/route.ts
// Records a guardian's decision on an under-18 account.
//
// Deliberately unauthenticated: the guardian is not a platform user. The
// token is the credential, so it is rate limited, checked against a stored
// hash, single use, and time limited.

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

const PARENTAL_CONSENT_VERSION = "v1.0";

export async function POST(req: Request) {
  try {
    const clientIP = getClientIP(req);

    // Guards against someone walking the token space.
    const rateLimitResult = checkRateLimit(
      `guardian-consent:${clientIP}`,
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
    let action: string;
    try {
      const json = await req.json();
      token = json.token;
      action = json.action;
    } catch {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    if (!token || typeof token !== "string") {
      return NextResponse.json({ error: "Missing consent token" }, { status: 400 });
    }

    if (action !== "consent" && action !== "decline") {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    const { data: request, error: lookupError } = await supabaseAdmin
      .from("guardian_consent_requests")
      .select("id, user_id, guardian_name, guardian_email, guardian_relationship, status, expires_at, verification_method")
      .eq("token_hash", hashConsentToken(token))
      .maybeSingle();

    if (lookupError) {
      console.error("Consent lookup failed", lookupError);
      return NextResponse.json(
        { error: "Could not process this request. Please try again." },
        { status: 500 }
      );
    }

    // Same response for an unknown token and a used one, so this cannot be
    // used to probe which tokens exist.
    if (!request || request.status !== "pending") {
      return NextResponse.json(
        { error: "This link is no longer valid. It may have already been used." },
        { status: 410 }
      );
    }

    if (new Date(request.expires_at) < new Date()) {
      await supabaseAdmin
        .from("guardian_consent_requests")
        .update({ status: "expired" })
        .eq("id", request.id);

      return NextResponse.json(
        { error: "This link has expired. Ask them to send a new one." },
        { status: 410 }
      );
    }

    const respondedAt = new Date().toISOString();

    const { error: updateError } = await supabaseAdmin
      .from("guardian_consent_requests")
      .update({
        status: action === "consent" ? "confirmed" : "declined",
        responded_at: respondedAt,
        responded_ip: clientIP || null,
      })
      .eq("id", request.id)
      .eq("status", "pending");

    if (updateError) {
      console.error("Consent update failed", updateError);
      return NextResponse.json(
        { error: "Could not record your decision. Please try again." },
        { status: 500 }
      );
    }

    // The permanent legal record lives alongside every other waiver, with the
    // guardian's details captured for audit.
    if (action === "consent") {
      const { error: waiverError } = await supabaseAdmin
        .from("waiver_acceptances")
        .insert({
          user_id: request.user_id,
          waiver_type: "parental-consent",
          waiver_version: PARENTAL_CONSENT_VERSION,
          ip_address: clientIP || null,
          metadata: {
            guardian_name: request.guardian_name,
            guardian_email: request.guardian_email,
            guardian_relationship: request.guardian_relationship,
            verification_method: request.verification_method,
            consent_request_id: request.id,
          },
        });

      if (waiverError) {
        // Roll the status back rather than activate an account with no record
        // of who approved it.
        console.error("Failed to record parental consent waiver", waiverError);
        await supabaseAdmin
          .from("guardian_consent_requests")
          .update({ status: "pending", responded_at: null, responded_ip: null })
          .eq("id", request.id);

        return NextResponse.json(
          { error: "Could not record your decision. Please try again." },
          { status: 500 }
        );
      }
    }

    return NextResponse.json(
      {
        message:
          action === "consent"
            ? "Thank you. The account is now active."
            : "Thank you. The account will stay restricted.",
        status: action === "consent" ? "confirmed" : "declined",
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("Guardian consent error", err);
    return NextResponse.json({ error: "Unexpected error" }, { status: 500 });
  }
}
