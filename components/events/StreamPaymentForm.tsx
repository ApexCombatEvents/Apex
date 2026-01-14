"use client";

import { useState, useEffect } from "react";
import { createSupabaseBrowser } from "@/lib/supabase-browser";
import Image from "next/image";

type Fighter = {
  id: string;
  full_name?: string | null;
  username?: string | null;
  avatar_url?: string | null;
};

type StreamPaymentFormProps = {
  eventId: string;
  streamPrice: number; // in cents
  fighterPercentage: number; // 0-100
  fighters: Fighter[];
  onPaymentComplete: () => void;
};

type FighterAllocation = {
  fighterId: string;
  percentage: number;
};

export default function StreamPaymentForm({
  eventId,
  streamPrice,
  fighterPercentage,
  fighters,
  onPaymentComplete,
}: StreamPaymentFormProps) {
  const supabase = createSupabaseBrowser();
  const [allocations, setAllocations] = useState<FighterAllocation[]>([]);
  const [availablePercentage, setAvailablePercentage] = useState(fighterPercentage);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const totalAllocated = allocations.reduce((sum, a) => sum + a.percentage, 0);
  const remainingPercentage = availablePercentage - totalAllocated;

  const addFighter = (fighterId: string) => {
    if (allocations.find((a) => a.fighterId === fighterId)) return; // Already added
    setAllocations([...allocations, { fighterId, percentage: 0 }]);
  };

  const removeFighter = (fighterId: string) => {
    setAllocations(allocations.filter((a) => a.fighterId !== fighterId));
  };

  const updatePercentage = (fighterId: string, percentage: number) => {
    const newAllocations = allocations.map((a) =>
      a.fighterId === fighterId ? { ...a, percentage } : a
    );
    setAllocations(newAllocations);
  };

  const distributeEvenly = () => {
    if (allocations.length === 0) return;
    const perFighter = Math.floor(availablePercentage / allocations.length);
    const remainder = availablePercentage % allocations.length;
    setAllocations(
      allocations.map((a, i) => ({
        ...a,
        percentage: perFighter + (i < remainder ? 1 : 0),
      }))
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setProcessing(true);
    setError(null);

    if (fighterPercentage > 0 && totalAllocated !== availablePercentage) {
      setError(`Please allocate exactly ${availablePercentage}% to fighters.`);
      setProcessing(false);
      return;
    }

    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        setError("You must be logged in to purchase stream access.");
        setProcessing(false);
        return;
      }

      const fighterAllocationsJson = allocations.map((a) => ({
        fighter_id: a.fighterId,
        percentage: a.percentage,
        amount: Math.round((streamPrice * a.percentage) / 100),
      }));

      // Create Stripe checkout session
      const response = await fetch("/api/stripe/create-stream-checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          eventId,
          streamPrice,
          fighterAllocations: fighterAllocationsJson,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Failed to create checkout session.");
        setProcessing(false);
        return;
      }

      // Redirect to Stripe checkout
      if (data.url) {
        window.location.href = data.url;
      } else {
        setError("Failed to get checkout URL.");
        setProcessing(false);
      }
    } catch (err) {
      console.error("Payment processing error", err);
      setError("An error occurred. Please try again.");
      setProcessing(false);
    }
  };

  const priceInDollars = (streamPrice / 100).toFixed(2);
  const fighterAmountTotal = (streamPrice * fighterPercentage) / 100;
  const fighterAmountInDollars = (fighterAmountTotal / 100).toFixed(2);

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-xl shadow-lg">
      <h2 className="text-2xl font-bold mb-4">Purchase Stream Access</h2>
      <p className="text-slate-600 mb-6">
        Stream price: <span className="font-semibold text-lg">${priceInDollars}</span>
      </p>

      {fighterPercentage > 0 && (
        <div className="mb-6 p-4 bg-purple-50 border border-purple-200 rounded-lg">
          <p className="text-sm text-purple-900 mb-2">
            <strong>Fighter Support:</strong> {fighterPercentage}% of your payment (${fighterAmountInDollars}) will go to the fighters you choose below.
          </p>
          <p className="text-xs text-purple-700">
            You can split this percentage among multiple fighters (e.g., 2% to 5 fighters = 10% total).
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {fighterPercentage > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-sm font-semibold">Select Fighters to Support</label>
              <button
                type="button"
                onClick={distributeEvenly}
                className="text-xs text-purple-600 hover:underline"
                disabled={allocations.length === 0}
              >
                Distribute evenly
              </button>
            </div>

            {/* Fighter selection dropdown */}
            <div>
              <select
                className="w-full rounded-lg border px-3 py-2 text-sm"
                onChange={(e) => {
                  if (e.target.value) {
                    addFighter(e.target.value);
                    e.target.value = "";
                  }
                }}
              >
                <option value="">Add a fighter...</option>
                {fighters
                  .filter((f) => !allocations.find((a) => a.fighterId === f.id))
                  .map((fighter) => (
                    <option key={fighter.id} value={fighter.id}>
                      {fighter.full_name || fighter.username || "Unknown Fighter"}
                    </option>
                  ))}
              </select>
            </div>

            {/* Allocated fighters */}
            {allocations.length > 0 && (
              <div className="space-y-3">
                {allocations.map((allocation) => {
                  const fighter = fighters.find((f) => f.id === allocation.fighterId);
                  if (!fighter) return null;

                  return (
                    <div
                      key={allocation.fighterId}
                      className="flex items-center gap-4 p-3 border rounded-lg"
                    >
                      <div className="flex items-center gap-3 flex-1">
                        {fighter.avatar_url && (
                          <Image
                            src={fighter.avatar_url}
                            alt={fighter.full_name || fighter.username || "Fighter"}
                            width={40}
                            height={40}
                            className="rounded-full"
                          />
                        )}
                        <div className="flex-1">
                          <p className="text-sm font-medium">
                            {fighter.full_name || fighter.username || "Unknown Fighter"}
                          </p>
                          <p className="text-xs text-slate-500">
                            ${((streamPrice * allocation.percentage) / 10000).toFixed(2)} will go to this fighter
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min="0"
                          max={remainingPercentage + allocation.percentage}
                          value={allocation.percentage}
                          onChange={(e) =>
                            updatePercentage(allocation.fighterId, parseInt(e.target.value) || 0)
                          }
                          className="w-20 rounded border px-2 py-1 text-sm text-center"
                        />
                        <span className="text-sm text-slate-600">%</span>
                        <button
                          type="button"
                          onClick={() => removeFighter(allocation.fighterId)}
                          className="text-red-600 hover:text-red-800 text-sm"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  );
                })}

                <div className="text-sm text-slate-600 flex justify-between items-center pt-2 border-t">
                  <span>Total allocated:</span>
                  <span
                    className={
                      totalAllocated === availablePercentage
                        ? "text-green-600 font-semibold"
                        : totalAllocated > availablePercentage
                        ? "text-red-600 font-semibold"
                        : "text-slate-600"
                    }
                  >
                    {totalAllocated}% / {availablePercentage}%
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        {error && <div className="text-red-600 text-sm">{error}</div>}

        <button
          type="submit"
          disabled={processing || (fighterPercentage > 0 && totalAllocated !== availablePercentage)}
          className="w-full rounded-lg bg-purple-600 px-6 py-3 text-white font-semibold hover:bg-purple-700 disabled:bg-slate-400 disabled:cursor-not-allowed"
        >
          {processing ? "Processing..." : `Pay $${priceInDollars}`}
        </button>
      </form>
    </div>
  );
}





