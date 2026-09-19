"use client";

import { useState } from "react";

type Props = {
  token: string;
  applicantName: string;
};

export default function GuardianWithdrawActions({ token, applicantName }: Props) {
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  async function withdraw() {
    setError("");
    setSubmitting(true);

    try {
      const res = await fetch("/api/guardian-consent/withdraw", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Something went wrong. Please try again.");
        return;
      }

      setDone(true);
    } catch {
      setError("Could not reach the server. Please check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <div role="status" className="rounded-xl border border-slate-200 bg-slate-50 p-5">
        <p className="text-sm font-semibold text-slate-900">Permission withdrawn</p>
        <p className="text-sm text-slate-700 mt-1 leading-relaxed">
          {applicantName}&apos;s account is restricted again and their profile is hidden
          from other people. They can send you a new request if they still want to use
          the platform.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}

      <button
        type="button"
        onClick={withdraw}
        disabled={submitting}
        className="w-full rounded-lg border border-red-300 bg-red-50 px-4 py-2 text-sm font-medium text-red-800 hover:bg-red-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {submitting ? "Withdrawing…" : `Withdraw permission for ${applicantName}`}
      </button>
    </div>
  );
}
