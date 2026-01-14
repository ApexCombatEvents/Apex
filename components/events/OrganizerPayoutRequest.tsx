"use client";

import { useEffect, useState } from "react";

type OrganizerPayoutRequestProps = {
  eventId: string;
  organizerShare: number; // in cents
};

export default function OrganizerPayoutRequest({
  eventId,
  organizerShare,
}: OrganizerPayoutRequestProps) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [amount, setAmount] = useState<string>("");

  const availableDollars = (organizerShare / 100).toFixed(2);

  async function handleRequest(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    const cents = Math.round(parseFloat(amount) * 100);
    if (!cents || cents <= 0) {
      setMessage("Enter a valid amount");
      setLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/payouts/organizer/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId, amount: cents }),
      });

      const data = await response.json();
      if (!response.ok) {
        setMessage(data.error || "Failed to create payout request");
        setLoading(false);
        return;
      }

      setMessage("Payout request submitted.");
      setAmount("");
    } catch (err) {
      console.error("Organizer payout request error", err);
      setMessage("Failed to create payout request");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card">
      <h2 className="text-lg font-semibold text-slate-900 mb-4">Organizer Payout</h2>
      <p className="text-sm text-slate-600 mb-3">
        Available organizer share: <span className="font-semibold">${availableDollars}</span>
      </p>
      <p className="text-xs text-slate-500 mb-4">
        Requesting a payout creates a pending request. A platform admin will review and pay it via Stripe.
      </p>

      <form onSubmit={handleRequest} className="flex items-end gap-3">
        <label className="text-xs text-slate-600 space-y-1 block">
          Amount (USD)
          <input
            type="number"
            step="0.01"
            min="0.01"
            className="w-40 rounded-xl border px-3 py-2 text-sm"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            required
            disabled={loading || organizerShare <= 0}
          />
        </label>

        <button
          type="submit"
          disabled={loading || organizerShare <= 0}
          className="px-4 py-2 rounded-xl bg-purple-600 text-white text-sm font-medium disabled:opacity-60"
        >
          {loading ? "Submitting..." : "Request Payout"}
        </button>
      </form>

      {message && (
        <p className={`mt-2 text-sm ${message.includes("submitted") ? "text-green-700" : "text-red-700"}`}>
          {message}
        </p>
      )}

      {organizerShare <= 0 && (
        <p className="mt-3 text-sm text-slate-600">
          No organizer balance yet. This will update after stream sales come in.
        </p>
      )}
    </div>
  );
}


