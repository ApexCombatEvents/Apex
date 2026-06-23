"use client";
import { useState } from "react";
import Link from "next/link";
import { createSupabaseBrowser } from "@/lib/supabase-browser";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "sent" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();

    const trimmed = email.trim();
    if (!trimmed) {
      setStatus("error");
      setErrorMsg("Please enter your email address.");
      return;
    }

    setStatus("loading");
    setErrorMsg("");

    try {
      const supabase = createSupabaseBrowser();
      const { error } = await supabase.auth.resetPasswordForEmail(trimmed, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) {
        console.error("resetPasswordForEmail error:", error.message);

        // Surface rate-limit errors so the user knows to wait. This is safe:
        // it doesn't reveal whether the email belongs to a real account.
        const httpStatus = (error as { status?: number }).status;
        const lower = error.message?.toLowerCase() ?? "";
        const isRateLimited =
          httpStatus === 429 ||
          lower.includes("rate") ||
          lower.includes("seconds") ||
          lower.includes("after");

        if (isRateLimited) {
          setStatus("error");
          setErrorMsg(
            "Too many requests. Please wait about a minute before requesting another reset email."
          );
          return;
        }

        // For any other error (including an unknown email) we intentionally show
        // the same success state, so attackers cannot probe which accounts exist.
      }

      setStatus("sent");
    } catch (err) {
      console.error("Unexpected forgot-password error:", err);
      setStatus("error");
      setErrorMsg("Something went wrong. Please try again in a moment.");
    }
  }

  if (status === "sent") {
    return (
      <div className="max-w-md mx-auto bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <h2 className="text-2xl font-bold text-purple-600 mb-3">Check your email</h2>
        <p className="text-sm text-slate-600 leading-relaxed">
          If an account exists for <span className="font-medium text-slate-800">{email.trim()}</span>,
          we&apos;ve sent a link to reset your password. The link expires after a short while, so
          use it soon.
        </p>
        <p className="text-sm text-slate-500 mt-4">
          Didn&apos;t get it? Check your spam folder, or{" "}
          <button
            type="button"
            onClick={() => setStatus("idle")}
            className="text-purple-600 underline hover:text-purple-700"
          >
            try again
          </button>
          .
        </p>
        <p className="text-sm mt-6">
          <Link href="/login" className="text-purple-600 underline hover:text-purple-700">
            Back to sign in
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto bg-white p-6 rounded-xl shadow-sm border border-slate-200">
      <h2 className="text-2xl font-bold text-purple-600 mb-2">Forgot password</h2>
      <p className="text-sm text-slate-600 mb-4">
        Enter the email linked to your account and we&apos;ll send you a link to reset your password.
      </p>

      <form onSubmit={submit} className="space-y-4">
        <input
          type="email"
          className="w-full p-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          placeholder="Email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
        />
        <button
          type="submit"
          disabled={status === "loading"}
          className="btn btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {status === "loading" ? "Sending..." : "Send reset link"}
        </button>
      </form>

      {status === "error" && errorMsg && (
        <p className="text-sm mt-3 text-red-600">{errorMsg}</p>
      )}

      <p className="text-sm mt-4">
        <Link href="/login" className="text-purple-600 underline hover:text-purple-700">
          Back to sign in
        </Link>
      </p>
    </div>
  );
}
