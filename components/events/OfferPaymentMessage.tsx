"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";

export default function OfferPaymentMessage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [showSuccess, setShowSuccess] = useState(false);
  const [showCancelled, setShowCancelled] = useState(false);
  const [showError, setShowError] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const success = searchParams.get("offer_success");
    const cancelled = searchParams.get("offer_cancelled");
    const sessionId = searchParams.get("session_id");
    const boutId = searchParams.get("bout_id");
    const fighterId = searchParams.get("fighter_id");
    const side = searchParams.get("side");

    if (success === "true") {
      if (!sessionId || !boutId || !fighterId || !side) {
        console.error("Missing payment verification parameters:", { sessionId, boutId, fighterId, side });
        setShowError(true);
        setErrorMessage("Missing payment information. Please contact support if payment was completed.");
        return;
      }

      // Verify payment and create offer if needed
      (async () => {
        try {
          const response = await fetch("/api/stripe/verify-offer-payment", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              sessionId,
              boutId,
              fighterId,
              side,
            }),
          });

          const data = await response.json();

          if (response.ok && data.success) {
            setShowSuccess(true);
            // Remove query params after showing message
            const url = new URL(window.location.href);
            url.searchParams.delete("offer_success");
            url.searchParams.delete("session_id");
            url.searchParams.delete("bout_id");
            url.searchParams.delete("fighter_id");
            url.searchParams.delete("side");
            router.replace(url.pathname + url.search, { scroll: false });
            
            // Hide message after 5 seconds
            setTimeout(() => setShowSuccess(false), 5000);
          } else {
            console.error("Payment verification failed:", data);
            setShowError(true);
            setErrorMessage(data.error || "Failed to verify payment. Please contact support.");
            // Remove query params
            const url = new URL(window.location.href);
            url.searchParams.delete("offer_success");
            url.searchParams.delete("session_id");
            url.searchParams.delete("bout_id");
            url.searchParams.delete("fighter_id");
            url.searchParams.delete("side");
            router.replace(url.pathname + url.search, { scroll: false });
          }
        } catch (err: any) {
          console.error("Payment verification error:", err);
          setShowError(true);
          setErrorMessage(err?.message || "Failed to verify payment. Please contact support if payment was completed.");
        }
      })();
    }

    if (cancelled === "true") {
      setShowCancelled(true);
      // Remove query param after showing message
      const url = new URL(window.location.href);
      url.searchParams.delete("offer_cancelled");
      router.replace(url.pathname + url.search, { scroll: false });
      
      // Hide message after 5 seconds
      setTimeout(() => setShowCancelled(false), 5000);
    }
  }, [searchParams, router]);

  if (showSuccess) {
    return (
      <div className="mb-4 rounded-xl bg-green-50 border border-green-200 p-4">
        <div className="flex items-center gap-2">
          <svg
            className="h-5 w-5 text-green-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <div>
            <p className="text-sm font-medium text-green-800">
              ✓ Payment successful! Your bout offer has been sent.
            </p>
            <p className="text-xs text-green-700 mt-1">
              The event organizer will review your offer. If declined, your payment will be automatically refunded.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (showCancelled) {
    return (
      <div className="mb-4 rounded-xl bg-yellow-50 border border-yellow-200 p-4">
        <div className="flex items-center gap-2">
          <svg
            className="h-5 w-5 text-yellow-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
          <p className="text-sm font-medium text-yellow-800">
            Payment was cancelled. Your offer was not sent.
          </p>
        </div>
      </div>
    );
  }

  if (showError) {
    return (
      <div className="mb-4 rounded-xl bg-red-50 border border-red-200 p-4">
        <div className="flex items-center gap-2">
          <svg
            className="h-5 w-5 text-red-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <p className="text-sm font-medium text-red-800">
            {errorMessage}
          </p>
        </div>
      </div>
    );
  }

  return null;
}

