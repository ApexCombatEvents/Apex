// app/settings/page.tsx
"use client";

import { useEffect, useState } from "react";
import { createSupabaseBrowser } from "@/lib/supabase-browser";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

type Role = "fighter" | "coach" | "gym" | "promotion" | "";

export default function AppSettingsPage() {
  const supabase = createSupabaseBrowser();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [role, setRole] = useState<Role>("");
  const [currentRole, setCurrentRole] = useState<Role>("");

  // Stripe Connect state
  const [stripeAccountStatus, setStripeAccountStatus] = useState<string | null>(null);
  const [stripeOnboardingCompleted, setStripeOnboardingCompleted] = useState(false);
  const [connectingStripe, setConnectingStripe] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user;
      if (!user) {
        setLoading(false);
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("role, stripe_account_status, stripe_onboarding_completed")
        .eq("id", user.id)
        .single();

      if (profile) {
        // Convert role from uppercase (DB) to lowercase (UI expects lowercase)
        const roleFromDb = profile.role?.toLowerCase() || "";
        const profileRole = (roleFromDb === "fighter" || roleFromDb === "coach" || roleFromDb === "gym" || roleFromDb === "promotion") 
          ? roleFromDb as Role 
          : "";
        setRole(profileRole);
        setCurrentRole(profileRole);
        
        // Load Stripe Connect status
        setStripeAccountStatus(profile.stripe_account_status ?? null);
        setStripeOnboardingCompleted(profile.stripe_onboarding_completed ?? false);
      }

      setLoading(false);
    })();
  }, [supabase]);

  // Handle Stripe redirect parameters
  useEffect(() => {
    const stripeParam = searchParams.get('stripe');
    if (stripeParam === 'success') {
      setMessage('Stripe account connected successfully!');
      // Reload profile to get updated Stripe status
      (async () => {
        const { data: userData } = await supabase.auth.getUser();
        const user = userData.user;
        if (user) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("stripe_account_status, stripe_onboarding_completed")
            .eq("id", user.id)
            .single();
          if (profile) {
            setStripeAccountStatus(profile.stripe_account_status ?? null);
            setStripeOnboardingCompleted(profile.stripe_onboarding_completed ?? false);
          }
        }
      })();
    } else if (stripeParam === 'error') {
      setMessage('There was an error connecting your Stripe account. Please try again.');
    }
  }, [searchParams, supabase]);

  async function handleSaveRole() {
    setSaving(true);
    setMessage(null);

    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;
    if (!user) {
      setMessage("You must be signed in.");
      setSaving(false);
      return;
    }

    // Convert role to uppercase for database constraint (database expects: FIGHTER, COACH, GYM, PROMOTION)
    const roleToSave = role ? role.toUpperCase() as "FIGHTER" | "COACH" | "GYM" | "PROMOTION" : null;

    const { error } = await supabase
      .from("profiles")
      .update({
        role: roleToSave,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id);

    if (error) {
      console.error("Error updating role:", error);
      setMessage(error.message || "Failed to update account type. Please try again.");
    } else {
      setMessage("Account type updated successfully.");
      setCurrentRole(role);
      router.refresh();
    }

    setSaving(false);
  }

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto">
        <div className="card">
          <p className="text-sm text-slate-600">Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <header>
        <h1 className="text-xl font-semibold mb-2">Settings</h1>
        <p className="text-sm text-slate-600">
          Manage your account and app preferences here.
        </p>
      </header>

      {/* Account Settings */}
      <section className="card space-y-4">
        <div>
          <h2 className="text-sm font-semibold mb-1">Account Type</h2>
          <p className="text-xs text-slate-500">
            Your account type determines which profile layout and features are available to you.
          </p>
        </div>
        
        <div className="space-y-3">
          <label className="text-xs text-slate-600 space-y-1 block">
            Account type
            <select
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              value={role}
              onChange={(e) => setRole(e.target.value as Role)}
            >
              <option value="">Select...</option>
              <option value="fighter">Fighter</option>
              <option value="coach">Coach</option>
              <option value="gym">Gym</option>
              <option value="promotion">Promotion</option>
            </select>
          </label>

          {role !== currentRole && (
            <div className="flex items-center gap-2">
              <button
                onClick={handleSaveRole}
                disabled={saving}
                className="px-4 py-2 rounded-xl bg-purple-600 text-white text-sm font-medium disabled:opacity-60 hover:bg-purple-700 transition-colors"
              >
                {saving ? "Saving..." : "Save changes"}
              </button>
              <button
                onClick={() => setRole(currentRole)}
                disabled={saving}
                className="px-4 py-2 rounded-xl border border-slate-300 bg-white text-slate-700 text-sm font-medium disabled:opacity-60 hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          )}

          {message && message.includes("Account type") && (
            <div className={`text-sm rounded-xl px-3 py-2 ${
              message.includes("successfully") 
                ? "bg-green-50 text-green-700 border border-green-200" 
                : "bg-red-50 text-red-700 border border-red-200"
            }`}>
              {message}
            </div>
          )}
        </div>
      </section>

      {/* Message display for Stripe and other messages */}
      {message && !message.includes("Account type") && (
        <div className={`text-sm rounded-xl px-3 py-2 ${
          message.includes("successfully") || message.includes("connected")
            ? "bg-green-50 text-green-700 border border-green-200" 
            : message.includes("error") || message.includes("Failed")
            ? "bg-red-50 text-red-700 border border-red-200"
            : "bg-slate-50 text-slate-700 border border-slate-200"
        }`}>
          {message}
        </div>
      )}

      {/* Placeholder sections */}
      <Link href="/settings/account" className="block">
        <section className="card space-y-2 hover:border-purple-200 hover:bg-white transition-colors">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold">Account</h2>
            <span className="text-xs text-purple-700 font-semibold">→</span>
          </div>
          <p className="text-sm text-slate-600">
            Email, password, sessions, and security.
          </p>
        </section>
      </Link>

      <Link href="/settings/notifications" className="block">
        <section className="card space-y-2 hover:border-purple-200 hover:bg-white transition-colors">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold">Notifications</h2>
            <span className="text-xs text-purple-700 font-semibold">→</span>
          </div>
          <p className="text-sm text-slate-600">
            Choose what shows up in your in-app notifications.
          </p>
        </section>
      </Link>

      {/* Earnings - Show for fighters, gyms, and promotions */}
      {(role === "fighter" || role === "gym" || role === "promotion") && (
        <Link href="/earnings" className="block">
          <section className="card space-y-2 hover:border-purple-200 hover:bg-white transition-colors">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-sm font-semibold">Earnings</h2>
              <span className="text-xs text-purple-700 font-semibold">→</span>
            </div>
            <p className="text-sm text-slate-600">
              {role === "fighter" 
                ? "View your earnings and request payouts."
                : "View your event revenue and request payouts."}
            </p>
          </section>
        </Link>
      )}

      {/* Stripe Connect Section */}
      <section className="card space-y-4">
        <div>
          <h2 className="text-sm font-semibold mb-1">Payment Setup</h2>
          <p className="text-xs text-slate-500">
            Connect your Stripe account to receive payments for bout offers and event revenue.
          </p>
        </div>

        {stripeAccountStatus === 'active' && stripeOnboardingCompleted ? (
          <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-xl">
            <div className="flex items-center gap-2">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 text-green-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span className="text-sm font-medium text-green-700">
                Stripe account connected
              </span>
            </div>
            <button
              type="button"
              onClick={async () => {
                setConnectingStripe(true);
                try {
                  // Use embedded onboarding
                  window.location.href = '/onboarding';
                } catch (error) {
                  console.error('Error connecting Stripe:', error);
                  setMessage('Failed to connect Stripe account. Please try again.');
                  setConnectingStripe(false);
                }
              }}
              disabled={connectingStripe}
              className="px-3 py-1.5 text-xs font-medium text-green-700 bg-white border border-green-300 rounded-lg hover:bg-green-50 disabled:opacity-60"
            >
              {connectingStripe ? 'Loading...' : 'Update account'}
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={async () => {
              setConnectingStripe(true);
              try {
                // Use embedded onboarding
                window.location.href = '/onboarding';
              } catch (error) {
                console.error('Error connecting Stripe:', error);
                setMessage('Failed to connect Stripe account. Please try again.');
                setConnectingStripe(false);
              }
            }}
            disabled={connectingStripe}
            className="w-full px-4 py-2.5 rounded-xl bg-purple-600 text-white text-sm font-medium disabled:opacity-60 hover:bg-purple-700 transition-colors flex items-center justify-center gap-2"
          >
            {connectingStripe ? (
              <>
                <svg
                  className="animate-spin h-4 w-4 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                Connecting...
              </>
            ) : (
              <>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                Connect Stripe Account
              </>
            )}
          </button>
        )}
      </section>
    </div>
  );
}
