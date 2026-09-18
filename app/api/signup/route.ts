// app/api/signup/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { checkRateLimit, getClientIP, RATE_LIMITS } from "@/lib/ratelimit";
import { validateEmail, validatePassword, validateUsername, validateRole, validateDateOfBirth, validateGuardianDetails, MINOR_AGE_THRESHOLD, sanitizeEmail, sanitizeUsername, sanitizeString } from "@/lib/input-validation";
import { sendWelcomeEmail, sendGuardianConsentEmail } from "@/lib/email";
import { generateConsentToken, hashConsentToken, consentExpiryDate, buildConsentUrl, logConsentUrlInDevelopment, CONSENT_EXPIRY_DAYS } from "@/lib/guardian-consent";

// Validate environment variables at module load
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error("Missing required Supabase environment variables: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
}

const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

export async function POST(req: Request) {
  try {
    // Rate limiting
    const clientIP = getClientIP(req);
    const rateLimitResult = checkRateLimit(
      `signup:${clientIP}`,
      RATE_LIMITS.signup.maxRequests,
      RATE_LIMITS.signup.windowMs
    );

    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { 
          error: "Too many signup attempts. Please try again later.",
          retryAfter: Math.ceil((rateLimitResult.resetAt - Date.now()) / 1000)
        },
        { 
          status: 429,
          headers: {
            "Retry-After": Math.ceil((rateLimitResult.resetAt - Date.now()) / 1000).toString(),
            "X-RateLimit-Limit": RATE_LIMITS.signup.maxRequests.toString(),
            "X-RateLimit-Remaining": rateLimitResult.remaining.toString(),
            "X-RateLimit-Reset": rateLimitResult.resetAt.toString(),
          }
        }
      );
    }

    let email: string;
    let password: string;
    let full_name: string | undefined;
    let username: string | undefined;
    let role: string | undefined;
    let date_of_birth: string | undefined;
    let guardian_name: string | undefined;
    let guardian_email: string | undefined;
    let guardian_relationship: string | undefined;
    let waiver_accepted: boolean | undefined;
    try {
      const json = await req.json();
      email = json.email;
      password = json.password;
      full_name = json.full_name;
      username = json.username;
      role = json.role;
      date_of_birth = json.date_of_birth;
      guardian_name = json.guardian_name;
      guardian_email = json.guardian_email;
      guardian_relationship = json.guardian_relationship;
      waiver_accepted = json.waiver_accepted;
    } catch (jsonError) {
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 }
      );
    }

    // Server-side validation using validation utilities
    const emailValidation = validateEmail(email);
    if (!emailValidation.valid) {
      return NextResponse.json(
        { error: emailValidation.error },
        { status: 400 }
      );
    }

    const passwordValidation = validatePassword(password, 6);
    if (!passwordValidation.valid) {
      return NextResponse.json(
        { error: passwordValidation.error },
        { status: 400 }
      );
    }

    // Checked before the username lookup so an under-age signup is rejected
    // without a database round trip.
    const dobValidation = validateDateOfBirth(date_of_birth);
    if (!dobValidation.valid) {
      return NextResponse.json(
        { error: dobValidation.error },
        { status: 400 }
      );
    }

    // Under-18s need a parent or guardian on record before the account can be
    // activated. Validated up front so an incomplete application never reaches
    // the point of creating a user.
    const isMinor = (dobValidation.age ?? 0) < MINOR_AGE_THRESHOLD;
    const guardianValidation = isMinor
      ? validateGuardianDetails(guardian_name, guardian_email, guardian_relationship, email)
      : null;

    if (guardianValidation && !guardianValidation.valid) {
      return NextResponse.json(
        { error: guardianValidation.error },
        { status: 400 }
      );
    }

    // Validate username if provided
    if (username) {
      const usernameValidation = validateUsername(username);
      if (!usernameValidation.valid) {
        return NextResponse.json(
          { error: usernameValidation.error },
          { status: 400 }
        );
      }

      // Check if username is already taken
      const { data: existingUser, error: checkError } = await supabaseAdmin
        .from("profiles")
        .select("id")
        .eq("username", username.trim().toLowerCase())
        .maybeSingle();

      if (checkError) {
        console.error("Error checking username:", checkError);
        return NextResponse.json(
          { error: "Error checking username availability. Please try again." },
          { status: 500 }
        );
      }

      if (existingUser) {
        return NextResponse.json(
          { error: "This username is already taken. Please choose a different one." },
          { status: 400 }
        );
      }
    }

    // Validate role if provided
    const roleValidation = validateRole(role || "fighter");
    if (!roleValidation.valid) {
      return NextResponse.json(
        { error: roleValidation.error },
        { status: 400 }
      );
    }
    const userRole = roleValidation.value || "fighter";

    // Sanitize inputs
    const sanitizedEmail = sanitizeEmail(email);
    const sanitizedUsername = username ? sanitizeUsername(username) : undefined;
    const sanitizedFullName = sanitizeString(full_name, 100);

    // ⭐ 1: Create AUTH user with metadata
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email: sanitizedEmail,
      password: password.trim(),
      email_confirm: true,
      user_metadata: {
        full_name: sanitizedFullName ?? "",
        username: sanitizedUsername ?? sanitizedEmail.split("@")[0],
        role: userRole,
      },
    });

    if (error) {
      // Check for username unique constraint violation
      if (error.message?.includes('profiles_username_unique_idx') || 
          error.message?.includes('duplicate key') ||
          error.message?.includes('already been registered')) {
        return NextResponse.json(
          { error: "This username or email is already taken. Please choose a different one." },
          { status: 400 }
        );
      }
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // Date of birth is stored in profile_private, never on the public profiles
    // row. An unknown date of birth resolves to "adult" everywhere downstream,
    // so an account must never survive a failed write here — roll it back
    // rather than leave a minor indistinguishable from an adult.
    if (data.user) {
      const { error: dobError } = await supabaseAdmin
        .from("profile_private")
        .upsert(
          { user_id: data.user.id, date_of_birth: dobValidation.value },
          { onConflict: "user_id" }
        );

      if (dobError) {
        console.error("Failed to store date of birth", dobError);
        await supabaseAdmin.auth.admin.deleteUser(data.user.id);
        return NextResponse.json(
          { error: "Could not complete signup. Please try again." },
          { status: 500 }
        );
      }
    }

    // Record waiver acceptance using the admin client (user is not yet authenticated)
    if (waiver_accepted && data.user) {
      const ip = getClientIP(req);
      await supabaseAdmin.from("waiver_acceptances").insert({
        user_id: data.user.id,
        waiver_type: "signup",
        waiver_version: "v1.0",
        ip_address: ip || null,
        metadata: { accepted_during: "signup" },
      });
    }

    // Derive the site URL from the request so emailed links point at the real
    // site rather than a hardcoded fallback.
    const signupOrigin =
      req.headers.get("origin") ||
      (req.headers.get("x-forwarded-host")
        ? `${req.headers.get("x-forwarded-proto") || "https"}://${req.headers.get("x-forwarded-host")}`
        : undefined);

    // An under-18 account is created restricted. It stays that way until the
    // named guardian confirms, so a failure to record the request has to fail
    // the signup rather than quietly leave an unrestricted minor behind.
    if (isMinor && guardianValidation?.value && data.user) {
      const guardian = guardianValidation.value;
      const token = generateConsentToken();

      const { error: consentError } = await supabaseAdmin
        .from("guardian_consent_requests")
        .insert({
          user_id: data.user.id,
          guardian_name: guardian.name,
          guardian_email: guardian.email,
          guardian_relationship: guardian.relationship,
          token_hash: hashConsentToken(token),
          verification_method: "email",
          expires_at: consentExpiryDate().toISOString(),
        });

      if (consentError) {
        console.error("Failed to create guardian consent request", consentError);
        await supabaseAdmin.auth.admin.deleteUser(data.user.id);
        return NextResponse.json(
          { error: "Could not complete signup. Please try again." },
          { status: 500 }
        );
      }

      // A send failure is recoverable — the account is already restricted and
      // the applicant can trigger a resend — so it does not roll the signup back.
      const consentUrl = buildConsentUrl(signupOrigin || "", token);
      const sent = await sendGuardianConsentEmail({
        guardianEmail: guardian.email,
        guardianName: guardian.name,
        applicantName: sanitizedFullName || "A young athlete",
        consentUrl,
        expiryDays: CONSENT_EXPIRY_DAYS,
      });

      logConsentUrlInDevelopment(consentUrl, guardian.email);

      return NextResponse.json(
        {
          message: sent
            ? "Account created. We've emailed your parent or guardian for permission."
            : "Account created, but we couldn't send the permission email. You can resend it after signing in.",
          requiresGuardianConsent: true,
          guardianEmailSent: sent,
        },
        { status: 200 }
      );
    }

    // Send a role-personalised welcome email. This never throws and no-ops when
    // Resend isn't configured, so it can't affect the signup result.
    await sendWelcomeEmail({
      to: sanitizedEmail,
      fullName: sanitizedFullName,
      role: userRole,
      appUrl: signupOrigin,
    });

    return NextResponse.json(
      { message: "Signup successful. You can now sign in." },
      { status: 200 }
    );

  } catch (err) {
    console.error("Signup error", err);
    return NextResponse.json(
      { error: "Unexpected signup error" },
      { status: 500 }
    );
  }
}

