import { NextResponse } from "next/server";
import { createSupabaseServerForRoute } from "@/lib/supabaseServerForRoute";
import { stripe } from "@/lib/stripe";

export async function POST(req: Request) {
  try {
    const supabase = createSupabaseServerForRoute();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Fetch profile
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id, email, stripe_account_id, stripe_account_status, stripe_onboarding_completed, location_country, role")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    // Create Connect account if needed
    let accountId = (profile as any).stripe_account_id as string | null;
    if (!accountId) {
      // Map country name to ISO 2 code (fallback US)
      const map: Record<string, string> = {
        "United States": "US",
        "United States of America": "US",
        US: "US",
        USA: "US",
        "United Kingdom": "GB",
        UK: "GB",
        Canada: "CA",
        Australia: "AU",
        "New Zealand": "NZ",
        Ireland: "IE",
        Germany: "DE",
        France: "FR",
        Spain: "ES",
        Italy: "IT",
        Netherlands: "NL",
        Belgium: "BE",
        Sweden: "SE",
        Norway: "NO",
        Denmark: "DK",
        Finland: "FI",
        Poland: "PL",
        Portugal: "PT",
        Greece: "GR",
        Austria: "AT",
        Switzerland: "CH",
        Brazil: "BR",
        Mexico: "MX",
        Argentina: "AR",
        Japan: "JP",
        "South Korea": "KR",
        China: "CN",
        India: "IN",
        "South Africa": "ZA",
      };
      const countryName = (profile as any).location_country || "";
      const country =
        (countryName && countryName.length === 2
          ? countryName.toUpperCase()
          : map[countryName]) || "US";

      const account = await stripe.accounts.create({
        type: "express",
        country,
        email: (user as any).email || undefined,
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        metadata: { profile_id: user.id },
      });
      accountId = account.id;

      await supabase
        .from("profiles")
        .update({
          stripe_account_id: accountId,
          stripe_account_status: (account as any).details_submitted ? "active" : "pending",
          stripe_onboarding_completed: (account as any).details_submitted || false,
        })
        .eq("id", user.id);
    }

    // Create an Account Session for Embedded Onboarding
    const accountSession = await stripe.accountSessions.create({
      account: accountId!,
      components: {
        account_onboarding: {
          enabled: true,
          features: {
            external_account_collection: "always",
          },
        },
      },
    });

    return NextResponse.json({
      account: accountId,
      client_secret: accountSession.client_secret,
    });
  } catch (error: any) {
    console.error("Create account session error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create account session" },
      { status: 500 }
    );
  }
}



