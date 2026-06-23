"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createSupabaseBrowser } from "@/lib/supabase-browser";

type Phase = "verifying" | "ready" | "invalid" | "saving" | "done";

// While a password recovery is in progress we set this flag cookie. The
// middleware uses it to confine the user to the reset page so they cannot browse
// the app with the recovery session before actually setting a new password.
const RECOVERY_COOKIE = "apex-recovery";

function setRecoveryFlag() {
  if (typeof document !== "undefined") {
    document.cookie = `${RECOVERY_COOKIE}=1; path=/; SameSite=Lax`;
  }
}

function clearRecoveryFlag() {
  if (typeof document !== "undefined") {
    document.cookie = `${RECOVERY_COOKIE}=; path=/; Max-Age=0; SameSite=Lax`;
  }
}

export default function ResetPasswordPage() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("verifying");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  // When the email link uses the scanner-safe token_hash flow, we hold the token
  // here and only verify it when the user submits — so email security scanners
  // that pre-load the link can't consume the single-use token first.
  const tokenHashRef = useRef<string | null>(null);

  useEffect(() => {
    const supabase = createSupabaseBrowser();
    let active = true;
    let settled = false;

    const markReady = (opts?: { lock?: boolean }) => {
      if (active && !settled) {
        settled = true;
        // Lock an active recovery session to this page until the password is set.
        if (opts?.lock) setRecoveryFlag();
        setPhase("ready");
      }
    };
    const markInvalid = (msg: string) => {
      if (active && !settled) {
        settled = true;
        setErrorMsg(msg);
        setPhase("invalid");
      }
    };

    // Fires if/when the client establishes a session from the URL (code flow).
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (!active) return;
      if (
        session &&
        (event === "PASSWORD_RECOVERY" ||
          event === "SIGNED_IN" ||
          event === "INITIAL_SESSION" ||
          event === "TOKEN_REFRESHED")
      ) {
        markReady({ lock: true });
      }
    });

    async function init() {
      try {
        const url = new URL(window.location.href);
        const hashParams = new URLSearchParams(url.hash.replace(/^#/, ""));

        // Supabase may redirect back with an explicit error (e.g. expired link).
        const errorDescription =
          url.searchParams.get("error_description") || hashParams.get("error_description");
        if (errorDescription) {
          markInvalid(decodeURIComponent(errorDescription.replace(/\+/g, " ")));
          return;
        }

        // Preferred scanner-safe flow: a token_hash in the URL. We do NOT verify
        // it on load — only on submit — so link scanners can't consume the
        // single-use token before the user acts. Show the form immediately.
        const tokenHash = url.searchParams.get("token_hash");
        const type = url.searchParams.get("type");
        if (tokenHash && (type === "recovery" || type === null)) {
          tokenHashRef.current = tokenHash;
          markReady(); // no session yet; verified on submit
          return;
        }

        // Fallback (legacy code/implicit flow): the client auto-exchanges the
        // code in the URL into a session. getSession() awaits that step.
        const { data } = await supabase.auth.getSession();
        if (data.session) {
          markReady({ lock: true });
          return;
        }

        // Give the auth listener a brief window in case the exchange is still in
        // flight, then treat the link as invalid/expired.
        setTimeout(async () => {
          if (!active || settled) return;
          const { data: retry } = await supabase.auth.getSession();
          if (retry.session) markReady({ lock: true });
          else markInvalid("This password reset link is invalid or has expired.");
        }, 3000);
      } catch (err) {
        console.error("Reset-password init error:", err);
        markInvalid("Something went wrong loading this page. Please request a new link.");
      }
    }

    init();

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg("");

    if (password.length < 6) {
      setErrorMsg("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setErrorMsg("Passwords do not match.");
      return;
    }

    setPhase("saving");

    try {
      const supabase = createSupabaseBrowser();

      // Scanner-safe flow: consume the recovery token now (on user action).
      if (tokenHashRef.current) {
        const { error: verifyError } = await supabase.auth.verifyOtp({
          type: "recovery",
          token_hash: tokenHashRef.current,
        });
        if (verifyError) {
          console.error("verifyOtp error:", verifyError.message);
          setErrorMsg("This reset link is invalid or has expired. Please request a new one.");
          setPhase("invalid");
          return;
        }
        tokenHashRef.current = null; // single-use
        setRecoveryFlag();
      }

      const { error } = await supabase.auth.updateUser({ password });

      if (error) {
        console.error("updateUser error:", error.message);
        setErrorMsg(error.message);
        setPhase("ready");
        return;
      }

      // Password changed: release the recovery lock and sign out so the user
      // must log in fresh with their new password (no lingering session).
      clearRecoveryFlag();
      await supabase.auth.signOut();

      setPhase("done");
      setTimeout(() => router.push("/login"), 2500);
    } catch (err) {
      console.error("Unexpected reset-password error:", err);
      setErrorMsg("Something went wrong. Please try again.");
      setPhase("ready");
    }
  }

  async function cancel() {
    // Abandon the recovery: clear the lock and sign out the recovery session.
    clearRecoveryFlag();
    try {
      const supabase = createSupabaseBrowser();
      await supabase.auth.signOut();
    } catch {
      /* ignore */
    }
    router.push("/login");
  }

  if (phase === "verifying") {
    return (
      <div className="max-w-md mx-auto bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <h2 className="text-2xl font-bold text-purple-600 mb-2">Reset password</h2>
        <p className="text-sm text-slate-600">Verifying your reset link...</p>
      </div>
    );
  }

  if (phase === "invalid") {
    return (
      <div className="max-w-md mx-auto bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <h2 className="text-2xl font-bold text-purple-600 mb-2">Link expired</h2>
        <p className="text-sm text-slate-600 leading-relaxed">
          {errorMsg || "This password reset link is invalid or has expired."}
        </p>
        <p className="text-sm mt-4">
          <Link href="/forgot-password" className="text-purple-600 underline hover:text-purple-700">
            Request a new reset link
          </Link>
        </p>
      </div>
    );
  }

  if (phase === "done") {
    return (
      <div className="max-w-md mx-auto bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <h2 className="text-2xl font-bold text-purple-600 mb-2">Password updated</h2>
        <p className="text-sm text-slate-600">
          Your password has been changed. Redirecting you to sign in...
        </p>
        <p className="text-sm mt-4">
          <Link href="/login" className="text-purple-600 underline hover:text-purple-700">
            Go to sign in now
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto bg-white p-6 rounded-xl shadow-sm border border-slate-200">
      <h2 className="text-2xl font-bold text-purple-600 mb-2">Set a new password</h2>
      <p className="text-sm text-slate-600 mb-4">Choose a new password for your account.</p>

      <form onSubmit={submit} className="space-y-4">
        <input
          type="password"
          className="w-full p-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          placeholder="New password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          required
        />
        <input
          type="password"
          className="w-full p-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          placeholder="Confirm new password"
          value={confirmPassword}
          onChange={e => setConfirmPassword(e.target.value)}
          required
        />
        <button
          type="submit"
          disabled={phase === "saving"}
          className="btn btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {phase === "saving" ? "Updating..." : "Update password"}
        </button>
      </form>

      {errorMsg && <p className="text-sm mt-3 text-red-600">{errorMsg}</p>}

      <button
        type="button"
        onClick={cancel}
        disabled={phase === "saving"}
        className="text-sm text-slate-500 hover:text-slate-700 mt-4 disabled:opacity-50"
      >
        Cancel
      </button>
    </div>
  );
}
