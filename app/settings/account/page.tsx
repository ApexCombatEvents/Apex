"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { createSupabaseBrowser } from "@/lib/supabase-browser";

function formatDate(value?: string | null) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString();
}

export default function AccountSettingsPage() {
  const supabase = useMemo(() => createSupabaseBrowser(), []);

  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [message, setMessage] = useState<string | null>(null);

  const [newEmail, setNewEmail] = useState("");
  const [savingEmail, setSavingEmail] = useState(false);

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data } = await supabase.auth.getUser();
      if (!cancelled) {
        setUser(data.user ?? null);
        setNewEmail(data.user?.email ?? "");
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [supabase]);

  async function handleSaveEmail(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    if (!user) return;
    const email = newEmail.trim();
    if (!email) {
      setMessage("Please enter an email address.");
      return;
    }
    setSavingEmail(true);
    const { error } = await supabase.auth.updateUser({ email });
    if (error) {
      setMessage(error.message);
    } else {
      setMessage(
        "Email update requested. Please check your inbox to confirm the change."
      );
    }
    setSavingEmail(false);
  }

  async function handleSavePassword(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    if (!user) return;

    if (newPassword.length < 8) {
      setMessage("Password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setMessage("Passwords do not match.");
      return;
    }

    setSavingPassword(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      setMessage(error.message);
    } else {
      setMessage("Password updated successfully.");
      setNewPassword("");
      setConfirmPassword("");
    }
    setSavingPassword(false);
  }

  async function handleSignOut(scope: "local" | "global") {
    setMessage(null);
    const { error } = await supabase.auth.signOut(
      scope === "global" ? { scope: "global" } : undefined
    );
    if (error) {
      setMessage(error.message);
      return;
    }
    window.location.href = "/";
  }

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

      {message && (
        <div className="card border-slate-200 bg-white/80">
          <p className="text-sm text-slate-700 whitespace-pre-line">{message}</p>
        </div>
      )}

      {loading ? (
        <div className="card">
          <p className="text-sm text-slate-600">Loading account…</p>
        </div>
      ) : !user ? (
        <div className="card">
          <h2 className="text-sm font-semibold">You’re not signed in</h2>
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
        <>
          <section className="card space-y-3">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-sm font-semibold">Sign-in details</h2>
              <span className="text-[10px] font-semibold rounded-full border border-purple-200 bg-purple-50 px-2 py-0.5 text-purple-800">
                Secure
              </span>
            </div>

            <div className="grid sm:grid-cols-2 gap-3 text-sm">
              <div className="rounded-xl border border-slate-200 bg-white/70 p-3">
                <div className="text-[11px] text-slate-500">Email</div>
                <div className="font-medium text-slate-900 truncate">
                  {user.email ?? "—"}
                </div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white/70 p-3">
                <div className="text-[11px] text-slate-500">Provider</div>
                <div className="font-medium text-slate-900">
                  {user.app_metadata?.provider ?? "email"}
                </div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white/70 p-3">
                <div className="text-[11px] text-slate-500">Created</div>
                <div className="font-medium text-slate-900">
                  {formatDate(user.created_at)}
                </div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white/70 p-3">
                <div className="text-[11px] text-slate-500">Last sign-in</div>
                <div className="font-medium text-slate-900">
                  {formatDate(user.last_sign_in_at)}
                </div>
              </div>
            </div>
          </section>

          <section className="card space-y-3">
            <h2 className="text-sm font-semibold">Email</h2>
            <p className="text-xs text-slate-600">
              Changing your email requires confirmation. We’ll send a link to
              verify the new address.
            </p>
            <form onSubmit={handleSaveEmail} className="flex flex-col gap-2">
              <input
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white/80 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent"
                placeholder="you@example.com"
              />
              <div className="flex items-center gap-2">
                <button
                  type="submit"
                  className="btn btn-primary disabled:opacity-60"
                  disabled={savingEmail || newEmail.trim() === (user.email ?? "")}
                >
                  {savingEmail ? "Saving…" : "Update email"}
                </button>
              </div>
            </form>
          </section>

          <section className="card space-y-3">
            <h2 className="text-sm font-semibold">Password</h2>
            <p className="text-xs text-slate-600">
              Set a new password to keep your account safe.
            </p>
            <form onSubmit={handleSavePassword} className="space-y-2">
              <div className="grid sm:grid-cols-2 gap-2">
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white/80 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent"
                  placeholder="New password"
                />
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white/80 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent"
                  placeholder="Confirm"
                />
              </div>
              <button
                type="submit"
                className="btn btn-primary disabled:opacity-60"
                disabled={savingPassword || !newPassword || !confirmPassword}
              >
                {savingPassword ? "Saving…" : "Update password"}
              </button>
            </form>
          </section>

          <section className="card space-y-3">
            <h2 className="text-sm font-semibold">Session</h2>
            <p className="text-xs text-slate-600">
              Sign out of this device, or sign out everywhere.
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => void handleSignOut("local")}
                className="btn btn-outline"
              >
                Sign out
              </button>
              <button
                type="button"
                onClick={() => void handleSignOut("global")}
                className="btn btn-outline"
              >
                Sign out everywhere
              </button>
            </div>
          </section>

          <section className="card border-red-200 bg-red-50/60 space-y-2">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-sm font-semibold text-red-900">Danger zone</h2>
              <span className="text-[10px] font-semibold rounded-full border border-red-200 bg-white/70 px-2 py-0.5 text-red-800">
                Protected
              </span>
            </div>
            <p className="text-sm text-red-900/80">
              Account deletion requires elevated permissions (server/admin). If
              you need your account removed, we can add a proper flow next.
            </p>
          </section>
        </>
      )}
    </div>
  );
}


