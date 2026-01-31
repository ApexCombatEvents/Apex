"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { createSupabaseBrowser } from "@/lib/supabase-browser";

export default function AccountSettingsPage() {
  const supabase = useMemo(() => createSupabaseBrowser(), []);

  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data } = await supabase.auth.getUser();
      if (!cancelled) {
        setUser(data.user ?? null);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [supabase]);

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <header className="flex items-start justify-between gap-4">
        <div>
          <div className="text-xs text-slate-500">
            <Link href="/settings" className="hover:underline text-purple-700">
              Settings
            </Link>{" "}
            / Account
          </div>
          <h1 className="text-xl font-semibold mt-1">Account</h1>
          <p className="text-sm text-slate-600 mt-1">
            Manage sign-in details and security for your account.
          </p>
        </div>
        <Link href="/settings" className="btn btn-outline whitespace-nowrap">
          Back to settings →
        </Link>
      </header>

      {loading ? (
        <div className="card">
          <p className="text-sm text-slate-600">Loading account…</p>
        </div>
      ) : !user ? (
        <div className="card">
          <h2 className="text-sm font-semibold">You&apos;re not signed in</h2>
          <p className="text-sm text-slate-600 mt-1">
            Sign in to manage your account settings.
          </p>
          <div className="mt-3">
            <Link href="/login" className="btn btn-primary">
              Sign in
            </Link>
          </div>
        </div>
      ) : (
        <div className="card">
          <p className="text-sm text-slate-600">Account settings coming soon.</p>
        </div>
      )}
    </div>
  );
}
