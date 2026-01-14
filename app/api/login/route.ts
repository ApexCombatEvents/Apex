// app/api/login/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { checkRateLimit, getClientIP, RATE_LIMITS } from "@/lib/ratelimit";
import { validatePassword } from "@/lib/input-validation";

export async function POST(req: Request) {
  try {
    // Rate limiting
    const clientIP = getClientIP(req);
    const rateLimitResult = checkRateLimit(
      `login:${clientIP}`,
      RATE_LIMITS.login.maxRequests,
      RATE_LIMITS.login.windowMs
    );

    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { 
          error: "Too many login attempts. Please try again later.",
          retryAfter: Math.ceil((rateLimitResult.resetAt - Date.now()) / 1000)
        },
        { 
          status: 429,
          headers: {
            "Retry-After": Math.ceil((rateLimitResult.resetAt - Date.now()) / 1000).toString(),
            "X-RateLimit-Limit": RATE_LIMITS.login.maxRequests.toString(),
            "X-RateLimit-Remaining": rateLimitResult.remaining.toString(),
            "X-RateLimit-Reset": rateLimitResult.resetAt.toString(),
          }
        }
      );
    }

    const { identifier, password } = await req.json();

    // Server-side validation
    if (!identifier || typeof identifier !== 'string' || identifier.trim().length === 0) {
      return NextResponse.json(
        { error: "Email/username is required" },
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

    // Sanitize inputs
    const sanitizedIdentifier = identifier.trim();
    const sanitizedPassword = password.trim();

    const cookieStore = cookies();

    // Create Supabase server client for route handler
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          },
        },
      }
    );

    // Determine if identifier is email or username
    let email = sanitizedIdentifier;
    const isEmail = email.includes("@");

    // If it's not an email, look up the username in profiles to get the email
    if (!isEmail) {
      // Use admin client to query profiles
      const supabaseAdmin = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );

      const { data: profile, error: profileError } = await supabaseAdmin
        .from("profiles")
        .select("id")
        .eq("username", sanitizedIdentifier)
        .single();

      if (profileError || !profile) {
        return NextResponse.json(
          { error: "Invalid login credentials" },
          { status: 400 }
        );
      }

      // Get the user's email from auth.users using the profile id
      const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.getUserById(
        profile.id
      );

      if (authError || !authUser?.user?.email) {
        return NextResponse.json(
          { error: "Invalid login credentials" },
          { status: 400 }
        );
      }

      email = authUser.user.email;
    }

    // Attempt login with the email
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password: sanitizedPassword,
    });

    if (error) {
      console.error("Login error:", error.message);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // Success
    return NextResponse.json({ message: "Login successful", user: data.user });

  } catch (err) {
    console.error("Unexpected login error:", err);
    return NextResponse.json({ error: "Unexpected error" }, { status: 500 });
  }
}

