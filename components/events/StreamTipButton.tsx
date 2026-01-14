"use client";

import { useState } from "react";
import { createSupabaseBrowser } from "@/lib/supabase-browser";
import Image from "next/image";

type StreamTipButtonProps = {
  eventId: string;
  fighterId: string;
  fighterName: string;
  fighterAvatar?: string | null;
};

export default function StreamTipButton({
  eventId,
  fighterId,
  fighterName,
  fighterAvatar,
}: StreamTipButtonProps) {
  const supabase = createSupabaseBrowser();
  const [showModal, setShowModal] = useState(false);
  const [amount, setAmount] = useState<string>("");
  const [message, setMessage] = useState<string>("");
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const presetAmounts = [500, 1000, 2500, 5000, 10000]; // in cents: $5, $10, $25, $50, $100

  const handleTip = async () => {
    setProcessing(true);
    setError(null);

    const amountInCents = parseFloat(amount) * 100;
    if (isNaN(amountInCents) || amountInCents < 50) {
      setError("Minimum tip is $0.50");
      setProcessing(false);
      return;
    }

    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        setError("You must be logged in to send tips.");
        setProcessing(false);
        return;
      }

      // In a real implementation, this would integrate with a payment processor
      // For now, we'll simulate the tip

      const { error: tipError } = await supabase.from("stream_tips").insert({
        event_id: eventId,
        fighter_id: fighterId,
        user_id: userData.user.id,
        amount: Math.round(amountInCents),
        message: message.trim() || null,
      });

      if (tipError) {
        console.error("Tip error", tipError);
        setError("Failed to send tip. Please try again.");
        setProcessing(false);
        return;
      }

      setSuccess(true);
      setAmount("");
      setMessage("");
      setTimeout(() => {
        setShowModal(false);
        setSuccess(false);
      }, 2000);
    } catch (err) {
      console.error("Tip processing error", err);
      setError("An error occurred. Please try again.");
      setProcessing(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="flex flex-col items-center gap-2 p-3 bg-white border border-purple-200 hover:border-purple-400 hover:bg-purple-50 rounded-lg transition-colors"
      >
        {fighterAvatar ? (
          <Image
            src={fighterAvatar}
            alt={fighterName}
            width={48}
            height={48}
            className="rounded-full"
          />
        ) : (
          <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center text-purple-700 font-semibold border border-purple-200">
            {fighterName.charAt(0).toUpperCase()}
          </div>
        )}
        <span className="text-xs text-slate-700 text-center font-medium">{fighterName}</span>
      </button>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-md w-full shadow-xl border border-purple-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-slate-900">Tip {fighterName}</h3>
              <button
                onClick={() => {
                  setShowModal(false);
                  setError(null);
                  setSuccess(false);
                }}
                className="text-slate-400 hover:text-slate-600"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            {success ? (
              <div className="text-center py-8">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-500/20 mb-4">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-8 w-8 text-green-500"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </div>
                <p className="text-green-400 font-semibold">Tip sent successfully!</p>
              </div>
            ) : (
              <>
                <div className="mb-4">
                  <label className="block text-sm text-slate-700 mb-2 font-medium">Amount (USD)</label>
                  <div className="grid grid-cols-5 gap-2 mb-2">
                    {presetAmounts.map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setAmount((preset / 100).toFixed(2))}
                        className="px-3 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-sm transition-colors"
                      >
                        ${preset / 100}
                      </button>
                    ))}
                  </div>
                  <input
                    type="number"
                    step="0.01"
                    min="0.50"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 placeholder-slate-400 focus:ring-purple-500 focus:border-purple-500"
                  />
                </div>

                <div className="mb-4">
                  <label className="block text-sm text-slate-700 mb-2 font-medium">
                    Message (optional)
                  </label>
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Add a message..."
                    rows={3}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 placeholder-slate-400 focus:ring-purple-500 focus:border-purple-500"
                  />
                </div>

                {error && <div className="text-red-600 text-sm mb-4">{error}</div>}

                <button
                  onClick={handleTip}
                  disabled={processing || !amount || parseFloat(amount) < 0.5}
                  className="w-full rounded-lg bg-purple-600 px-6 py-3 text-white font-semibold hover:bg-purple-700 disabled:bg-slate-600 disabled:cursor-not-allowed"
                >
                  {processing ? "Processing..." : `Send $${amount || "0.00"} Tip`}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}


