import { NextResponse } from 'next/server';
import { createSupabaseServerForRoute } from '@/lib/supabaseServerForRoute';
import { stripe } from '@/lib/stripe';

export async function POST(req: Request) {
  try {
    const supabase = createSupabaseServerForRoute();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Get user's profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, stripe_account_id, stripe_account_status, stripe_onboarding_completed')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    let accountId = profile.stripe_account_id;

    // Create Stripe Connect account if it doesn't exist
    if (!accountId) {
      // Get user's country from profile if available
      const { data: userProfile } = await supabase
        .from('profiles')
        .select('location_country')
        .eq('id', user.id)
        .single();

      // Map country name to ISO 3166-1 alpha-2 country code
      // Stripe requires 2-letter country codes (e.g., 'US', 'GB', 'CA', 'AU')
      const countryNameToCode: Record<string, string> = {
        'United States': 'US',
        'United States of America': 'US',
        'US': 'US',
        'USA': 'US',
        'United Kingdom': 'GB',
        'UK': 'GB',
        'Canada': 'CA',
        'Australia': 'AU',
        'New Zealand': 'NZ',
        'Ireland': 'IE',
        'Germany': 'DE',
        'France': 'FR',
        'Spain': 'ES',
        'Italy': 'IT',
        'Netherlands': 'NL',
        'Belgium': 'BE',
        'Sweden': 'SE',
        'Norway': 'NO',
        'Denmark': 'DK',
        'Finland': 'FI',
        'Poland': 'PL',
        'Portugal': 'PT',
        'Greece': 'GR',
        'Austria': 'AT',
        'Switzerland': 'CH',
        'Brazil': 'BR',
        'Mexico': 'MX',
        'Argentina': 'AR',
        'Japan': 'JP',
        'South Korea': 'KR',
        'China': 'CN',
        'India': 'IN',
        'South Africa': 'ZA',
      };

      const countryName = userProfile?.location_country || '';
      // Check if it's already a 2-letter code
      let countryCode = 'US'; // Default fallback
      if (countryName) {
        if (countryName.length === 2 && /^[A-Z]{2}$/i.test(countryName)) {
          countryCode = countryName.toUpperCase();
        } else {
          countryCode = countryNameToCode[countryName] || 'US';
        }
      }

      // IMPORTANT: Once a Stripe Connect account is created, the country cannot be changed.
      // If you need to change the country, you must delete the account in Stripe Dashboard
      // and recreate it with the correct country.
      const account = await stripe.accounts.create({
        type: 'express', // Express accounts are simpler for most use cases
        country: countryCode, // ISO 3166-1 alpha-2 country code
        email: user.email || undefined,
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        metadata: {
          profile_id: user.id,
        },
      });

      accountId = account.id;

      // Save account ID to profile
      await supabase
        .from('profiles')
        .update({
          stripe_account_id: accountId,
          stripe_account_status: account.details_submitted ? 'active' : 'pending',
          stripe_onboarding_completed: account.details_submitted || false,
        })
        .eq('id', user.id);
    }

    // Create account link for onboarding or updating
    const origin = req.headers.get('origin') || 'http://localhost:3000';

    // Determine link type based on account status
    const linkType = profile.stripe_account_status === 'active' && profile.stripe_onboarding_completed
      ? 'account_update' // Update existing account
      : 'account_onboarding'; // First-time onboarding

    // Get user role to determine return URL
    const { data: userProfile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    const roleLower = userProfile?.role?.toLowerCase();
    const returnPath = roleLower === 'fighter' ? '/earnings' : '/settings';
    const refreshPath = roleLower === 'fighter' ? '/earnings?stripe=error' : '/settings?stripe=error';
    const returnUrl = roleLower === 'fighter' ? '/earnings?stripe=success' : '/settings?stripe=success';

    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${origin}${refreshPath}`,
      return_url: `${origin}${returnUrl}`,
      type: linkType,
    });

    return NextResponse.json({ url: accountLink.url });
  } catch (error: any) {
    console.error('Stripe Connect account link creation error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create account link' },
      { status: 500 }
    );
  }
}

