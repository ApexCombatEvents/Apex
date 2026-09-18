"use client";

import { useState } from "react";

type Decision = "consent" | "decline";

type Props = {
  token: string;
  applicantName: string;
};

export default function GuardianConsentActions({ token, applicantName }: Props) {
  const [submitting, setSubmitting] = useState<Decision | null>(null);
  const [result, setResult] = useState<{ status: Decision; message: string } | null>(null);
  const [error, setError] = useState("");

  async function respond(action: Decision) {
    setError("");
    setSubmitting(action);

    try {
      const res = await fetch("/api/guardian-consent/respond", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, action }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Something went wrong. Please try again.");
        return;
      }

      setResult({ status: action, message: data.message });
    } catch {
      setError("Could not reach the server. Please check your connection and try again.");
    } finally {
      setSubmitting(null);
    }
  }

  if (result) {
    const approved = result.status === "consent";
    return (
      <div
        role="status"
        className={`rounded-xl border p-5 ${
          approved
            ? "border-green-200 bg-green-50"
            : "border-slate-200 bg-slate-50"
        }`}
      >
        <p className={`text-sm font-semibold ${approved ? "text-green-900" : "text-slate-900"}`}>
          {approved ? "Permission given" : "Permission declined"}
        </p>
        <p className="text-sm text-slate-700 mt-1 leading-relaxed">{result.message}</p>
        {approved && (
          <p className="text-xs text-slate-600 mt-3 leading-relaxed">
            You can withdraw your permission at any time by emailing{" "}
            <a
              href="mailto:support@apexcombatevents.com"
              className="text-purple-600 hover:text-purple-800 underline"
            >
              support@apexcombatevents.com
            </a>
            .
          </p>
        )}
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

      <div className="flex flex-col sm:flex-row gap-3">
        <button
          type="button"
          onClick={() => respond("consent")}
          disabled={submitting !== null}
          className="btn btn-primary flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting === "consent" ? "Confirming..." : `I give permission for ${applicantName}`}
        </button>
        <button
          type="button"
          onClick={() => respond("decline")}
          disabled={submitting !== null}
          className="flex-1 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting === "decline" ? "Saving..." : "No, I do not give permission"}
        </button>
      </div>
    </div>
  );
}
