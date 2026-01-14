// app/api/signup/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { checkRateLimit, getClientIP, RATE_LIMITS } from "@/lib/ratelimit";
import { validateEmail, validatePassword, validateUsername, validateRole, sanitizeEmail, sanitizeUsername, sanitizeString } from "@/lib/input-validation";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

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

    const { email, password, full_name, username, role } = await req.json();

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

    // Validate username if provided
    if (username) {
      const usernameValidation = validateUsername(username);
      if (!usernameValidation.valid) {
        return NextResponse.json(
          { error: usernameValidation.error },
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
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

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

