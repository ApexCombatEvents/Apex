"use client";

import { useEffect, useState } from "react";

export default function EmbeddedOnboardingPage() {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/stripe/connect/create-account-session", { method: "POST" });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || "Failed to start onboarding");
          setLoading(false);
          return;
        }
        setClientSecret(data.client_secret);
      } catch (e: any) {
        setError(e.message || "Failed to start onboarding");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    // Load Stripe Embedded script
    if (!document.querySelector('script[src="https://js.stripe.com/v3/embedded.js"]')) {
      const s = document.createElement("script");
      s.src = "https://js.stripe.com/v3/embedded.js";
      s.async = true;
      document.body.appendChild(s);
    }
  }, []);

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="card">
          <p className="text-sm text-slate-600">Loading onboarding…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="card">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Payment setup</h1>
        <p className="text-sm text-slate-600 mt-1">
          Complete your payout details to receive transfers for streams and earnings.
        </p>
      </div>

      <div className="card">
        {clientSecret ? (
          // @ts-ignore - web component provided by Stripe Embedded
          <stripe-account-onboarding client-secret={clientSecret}></stripe-account-onboarding>
        ) : (
          <p className="text-sm text-slate-600">Unable to load onboarding.</p>
        )}
      </div>
    </div>
  );
}



