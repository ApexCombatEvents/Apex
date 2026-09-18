// components/account/RestrictedAccountBanner.tsx
// Shown to a young person whose guardian has not yet given permission.
//
// Purely informational. The actual restrictions are enforced server side, so
// this failing quiet is correct: a broken check should not warn someone whose
// account is fine, and cannot grant access to someone whose account is not.

"use client";

import { useCallback, useEffect, useState } from "react";
import { createSupabaseBrowser } from "@/lib/supabase-browser";

export default function RestrictedAccountBanner() {
  const [restricted, setRestricted] = useState(false);
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createSupabaseBrowser();
    let active = true;

    async function check() {
      // getSession reads the stored session without a network round trip, so
      // signed out visitors cost nothing on a page load.
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.user) {
        if (active) setRestricted(false);
        return;
      }

      const { data, error: rpcError } = await supabase.rpc("account_is_restricted", {
        profile_id: session.user.id,
      });

      if (!active) return;

      if (rpcError) {
        console.error("account_is_restricted check failed", rpcError);
        setRestricted(false);
        return;
      }

      setRestricted(data === true);
    }

    check();

    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      check();
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const resend = useCallback(async () => {
    if (sending) return;

    setSending(true);
    setMessage(null);
    setError(null);

    try {
      const res = await fetch("/api/guardian-consent/resend", { method: "POST" });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(data.error || "Could not send the request. Please try again.");
      } else {
        setMessage(data.message || "Permission request sent.");
      }
    } catch (err) {
      console.error("Consent resend failed", err);
      setError("Could not send the request. Check your connection and try again.");
    } finally {
      setSending(false);
    }
  }, [sending]);

  if (!restricted) return null;

  return (
    <div
      role="status"
      className="border-b border-amber-300 bg-amber-50 px-4 py-3 sm:px-6 lg:px-8"
    >
      <div className="mx-auto flex max-w-5xl flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        {/* Claims only what is actually enforced. The hidden profile depends
            on add_minor_profile_visibility.sql having been applied. */}
        <div className="text-[13px] leading-snug text-amber-900">
          <span className="font-semibold">Waiting for permission.</span>{" "}
          We&apos;ve emailed your parent or guardian. Until they approve, your
          profile stays hidden from other people and messaging is switched off.
        </div>

        <button
          type="button"
          onClick={resend}
          disabled={sending}
          aria-busy={sending}
          className="shrink-0 self-start rounded-full border border-amber-500 px-3 py-1 text-[11px] font-medium text-amber-900 transition-colors hover:bg-amber-100 disabled:opacity-60 sm:self-auto"
        >
          {sending ? "Sending…" : "Send the email again"}
        </button>
      </div>

      {(message || error) && (
        <p
          role={error ? "alert" : undefined}
          className={`mx-auto mt-2 max-w-5xl text-[12px] ${
            error ? "text-red-700" : "text-emerald-800"
          }`}
        >
          {error || message}
        </p>
      )}
    </div>
  );
}
