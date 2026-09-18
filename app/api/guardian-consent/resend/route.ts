// app/api/guardian-consent/resend/route.ts
// Reissues a guardian consent request for the signed-in account.
//
// Authenticated as the young person, who may also correct a mistyped guardian
// address. Issuing a new token invalidates the previous one, since only one
// hash is stored per request.

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createSupabaseServerForRoute } from "@/lib/supabaseServerForRoute";
import { checkRateLimit, getClientIP, RATE_LIMITS } from "@/lib/ratelimit";
import { validateGuardianDetails } from "@/lib/input-validation";
import { sendGuardianConsentEmail } from "@/lib/email";
import {
  generateConsentToken,
  hashConsentToken,
  consentExpiryDate,
  buildConsentUrl,
  logConsentUrlInDevelopment,
  CONSENT_EXPIRY_DAYS,
} from "@/lib/guardian-consent";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error("Missing required Supabase environment variables: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
}

const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

export async function POST(req: Request) {
  try {
    const supabase = createSupabaseServerForRoute();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Not signed in" }, { status: 401 });
    }

    const clientIP = getClientIP(req);
    const rateLimitResult = checkRateLimit(
      `guardian-consent-resend:${user.id}`,
      RATE_LIMITS.signup.maxRequests,
      RATE_LIMITS.signup.windowMs
    );

    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: "Too many attempts. Please wait before sending another request." },
        {
          status: 429,
          headers: {
            "Retry-After": Math.ceil((rateLimitResult.resetAt - Date.now()) / 1000).toString(),
          },
        }
      );
    }

    // Optional overrides, for correcting a mistyped address.
    let guardian_name: string | undefined;
    let guardian_email: string | undefined;
    let guardian_relationship: string | undefined;
    try {
      const json = await req.json();
      guardian_name = json.guardian_name;
      guardian_email = json.guardian_email;
      guardian_relationship = json.guardian_relationship;
    } catch {
      // Body is optional — an empty request just resends to the address on file.
    }

    const { data: existing, error: lookupError } = await supabaseAdmin
      .from("guardian_consent_requests")
      .select("id, guardian_name, guardian_email, guardian_relationship, status")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (lookupError) {
      console.error("Consent resend lookup failed", lookupError);
      return NextResponse.json(
        { error: "Could not send the request. Please try again." },
        { status: 500 }
      );
    }

    if (!existing) {
      return NextResponse.json(
        { error: "There's no guardian permission request on this account." },
        { status: 404 }
      );
    }

    if (existing.status === "confirmed") {
      return NextResponse.json(
        { error: "Permission has already been given for this account." },
        { status: 409 }
      );
    }

    // Fall back to the details already on file when no overrides are supplied.
    const guardianValidation = validateGuardianDetails(
      guardian_name ?? existing.guardian_name,
      guardian_email ?? existing.guardian_email,
      guardian_relationship ?? existing.guardian_relationship,
      user.email
    );

    if (!guardianValidation.valid || !guardianValidation.value) {
      return NextResponse.json({ error: guardianValidation.error }, { status: 400 });
    }

    const guardian = guardianValidation.value;
    const token = generateConsentToken();

    const { error: updateError } = await supabaseAdmin
      .from("guardian_consent_requests")
      .update({
        guardian_name: guardian.name,
        guardian_email: guardian.email,
        guardian_relationship: guardian.relationship,
        token_hash: hashConsentToken(token),
        status: "pending",
        expires_at: consentExpiryDate().toISOString(),
        responded_at: null,
        responded_ip: null,
      })
      .eq("id", existing.id);

    if (updateError) {
      console.error("Consent resend update failed", updateError);
      return NextResponse.json(
        { error: "Could not send the request. Please try again." },
        { status: 500 }
      );
    }

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("full_name, username")
      .eq("id", user.id)
      .maybeSingle();

    const origin =
      req.headers.get("origin") ||
      (req.headers.get("x-forwarded-host")
        ? `${req.headers.get("x-forwarded-proto") || "https"}://${req.headers.get("x-forwarded-host")}`
        : "");

    const consentUrl = buildConsentUrl(origin, token);
    const sent = await sendGuardianConsentEmail({
      guardianEmail: guardian.email,
      guardianName: guardian.name,
      applicantName: profile?.full_name || profile?.username || "A young athlete",
      consentUrl,
      expiryDays: CONSENT_EXPIRY_DAYS,
    });

    logConsentUrlInDevelopment(consentUrl, guardian.email);

    if (!sent) {
      return NextResponse.json(
        { error: "We couldn't send the email just now. Please try again shortly." },
        { status: 502 }
      );
    }

    return NextResponse.json(
      { message: `Permission request sent to ${guardian.email}.` },
      { status: 200 }
    );
  } catch (err) {
    console.error("Guardian consent resend error", err);
    return NextResponse.json({ error: "Unexpected error" }, { status: 500 });
  }
}
