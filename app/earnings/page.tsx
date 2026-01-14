"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { createSupabaseBrowser } from "@/lib/supabase-browser";
import { useRouter, useSearchParams } from "next/navigation";
import Skeleton from "@/components/ui/Skeleton";

type FighterEarningsData = {
  totalEarnings: number;
  allocationEarnings: number;
  tipEarnings: number;
  totalPaidOut: number;
  pendingRequests: number;
  availableBalance: number;
  earningsBreakdown: Array<{
    eventId: string;
    eventName: string;
    eventDate: string | null;
    allocationEarnings: number;
    tipEarnings: number;
    totalEarnings: number;
  }>;
  payoutRequests: Array<{
    id: string;
    event_id: string;
    amount_requested: number;
    status: string;
    stripe_transfer_id?: string | null;
    rejection_reason?: string | null;
    created_at: string;
    processed_at: string | null;
  }>;
};

type OrganizerEarningsData = {
  totalRevenue: number;
  totalPlatformFees: number;
  totalFighterShare: number;
  organizerShare: number;
  totalPaidOut: number;
  pendingRequests: number;
  availableBalance: number;
  earningsBreakdown: Array<{
    eventId: string;
    eventName: string;
    eventDate: string | null;
    totalRevenue: number;
    platformFee: number;
    fighterShare: number;
    organizerShare: number;
  }>;
  payoutRequests: Array<{
    id: string;
    event_id: string;
    amount_requested: number;
    status: string;
    stripe_transfer_id?: string | null;
    rejection_reason?: string | null;
    created_at: string;
    processed_at: string | null;
  }>;
};

type EarningsData = FighterEarningsData | OrganizerEarningsData;

export default function EarningsPage() {
  const supabase = createSupabaseBrowser();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [earnings, setEarnings] = useState<EarningsData | null>(null);
  const [userRole, setUserRole] = useState<"fighter" | "gym" | "promotion" | null>(null);
  const [requestingPayout, setRequestingPayout] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState<string>("");
  const [requestAmount, setRequestAmount] = useState<string>("");
  const [message, setMessage] = useState<string | null>(null);
  const [stripeConnecting, setStripeConnecting] = useState(false);

  useEffect(() => {
    loadEarnings();
  }, []);

  // Handle Stripe redirect parameters
  useEffect(() => {
    const stripeParam = searchParams.get('stripe');
    if (stripeParam === 'success') {
      setMessage('Stripe account connected successfully!');
      // Reload to check Stripe status
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } else if (stripeParam === 'error') {
      setMessage('There was an error connecting your Stripe account. Please try again.');
    }
  }, [searchParams]);

  async function loadEarnings() {
    setLoading(true);
    try {
      // First, get user's role
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        router.push("/");
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", userData.user.id)
        .single();

      const roleLower = profile?.role?.toLowerCase();
      if (roleLower !== "fighter" && roleLower !== "gym" && roleLower !== "promotion") {
        router.push("/");
        return;
      }

      setUserRole(roleLower as "fighter" | "gym" | "promotion");

      // Use appropriate API endpoint based on role
      const apiEndpoint = roleLower === "fighter" 
        ? "/api/payouts/earnings" 
        : "/api/payouts/organizer/earnings";

      const response = await fetch(apiEndpoint);
      if (!response.ok) {
        const error = await response.json();
        if (response.status === 403) {
          router.push("/");
          return;
        }
        setMessage(error.error || "Failed to load earnings");
        setLoading(false);
        return;
      }

      const data = await response.json();
      setEarnings(data);
    } catch (error: any) {
      console.error("Load earnings error", error);
      setMessage("Failed to load earnings");
    } finally {
      setLoading(false);
    }
  }

  async function handleConnectStripe() {
    setStripeConnecting(true);
    try {
      // Use embedded onboarding
      window.location.href = "/onboarding";
    } catch (error: any) {
      console.error("Connect Stripe error", error);
      setMessage("Failed to connect Stripe account");
      setStripeConnecting(false);
    }
  }

  async function handleRequestPayout(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedEventId || !requestAmount) {
      setMessage("Please select an event and enter an amount");
      return;
    }

    const amountCents = Math.round(parseFloat(requestAmount) * 100);
    if (isNaN(amountCents) || amountCents <= 0) {
      setMessage("Please enter a valid amount");
      return;
    }

    setRequestingPayout(true);
    setMessage(null);

    try {
      // Use appropriate API endpoint based on role
      const apiEndpoint = userRole === "fighter"
        ? "/api/payouts/request"
        : "/api/payouts/organizer/request";

      const response = await fetch(apiEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventId: selectedEventId,
          amount: amountCents,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.error || "Failed to create payout request");
        setRequestingPayout(false);
        return;
      }

      setMessage("Payout request created successfully!");
      setRequestAmount("");
      setSelectedEventId("");
      await loadEarnings();
    } catch (error: any) {
      console.error("Request payout error", error);
      setMessage("Failed to create payout request");
    } finally {
      setRequestingPayout(false);
    }
  }

  // Check if user has Stripe connected
  const [stripeConnected, setStripeConnected] = useState(false);
  const [stripeStatus, setStripeStatus] = useState<string | null>(null);

  useEffect(() => {
    async function checkStripeStatus() {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("stripe_account_id, stripe_account_status, stripe_onboarding_completed")
        .eq("id", userData.user.id)
        .single();

      if (profile) {
        setStripeConnected(!!profile.stripe_account_id);
        setStripeStatus(profile.stripe_account_status);
      }
    }
    checkStripeStatus();
  }, [supabase]);

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto">
        <div className="card space-y-4">
          <Skeleton className="h-6 w-44" />
          <div className="grid md:grid-cols-4 gap-4">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
          <Skeleton className="h-40 w-full" />
        </div>
      </div>
    );
  }

  if (!earnings) {
    return (
      <div className="max-w-6xl mx-auto">
        <div className="card">
          <p className="text-sm text-slate-600">{message || "Failed to load earnings"}</p>
        </div>
      </div>
    );
  }

  // Type guard to check if it's fighter earnings
  const isFighterEarnings = (data: EarningsData): data is FighterEarningsData => {
    return "totalEarnings" in data && "allocationEarnings" in data;
  };

  const isFighter = isFighterEarnings(earnings);
  
  // Get events with earnings based on role
  const eventsWithEarnings = isFighter
    ? earnings.earningsBreakdown.filter((e) => e.totalEarnings > 0)
    : earnings.earningsBreakdown.filter((e) => (e as OrganizerEarningsData["earningsBreakdown"][0]).organizerShare > 0);

  // Calculate totals based on role
  const totalEarnings = isFighter ? earnings.totalEarnings : earnings.organizerShare;
  const totalPaidOut = earnings.totalPaidOut;
  const pendingRequests = earnings.pendingRequests;
  const availableBalance = earnings.availableBalance;
  
  // For organizers, update organizer share calculation to account for platform fees
  if (!isFighter) {
    const organizerData = earnings as OrganizerEarningsData;
    // Organizer share already accounts for platform fees in the API
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            {isFighter ? "My Earnings" : "Event Revenue"}
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            {isFighter 
              ? "View your earnings and request payouts"
              : "View your event revenue and request payouts"}
          </p>
        </div>
        <Link
          href="/settings"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-300 bg-white text-slate-700 text-sm font-medium hover:bg-slate-50 transition-colors whitespace-nowrap"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
          <span>Back to settings</span>
        </Link>
      </div>

      {/* Stripe Connect Notice */}
      {!stripeConnected && (
        <div className="card bg-amber-50 border-amber-200">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h3 className="font-semibold text-amber-900 mb-1">Connect Stripe Account</h3>
              <p className="text-sm text-amber-800 mb-3">
                You need to connect your Stripe account to receive payouts. This is a one-time setup that takes just a few minutes.
              </p>
              <button
                onClick={handleConnectStripe}
                disabled={stripeConnecting}
                className="px-4 py-2 rounded-lg bg-amber-600 text-white text-sm font-medium hover:bg-amber-700 disabled:opacity-60"
              >
                {stripeConnecting ? "Opening..." : "Set up payouts"}
              </button>
            </div>
          </div>
        </div>
      )}

      {stripeConnected && stripeStatus !== "active" && (
        <div className="card bg-blue-50 border-blue-200">
          <p className="text-sm text-blue-800">
            Your Stripe account is being set up. Please complete the onboarding process to receive payouts.
          </p>
        </div>
      )}

      {/* Stripe Fee Disclosure */}
      <div className="card bg-slate-50 border-slate-200">
        <div className="flex items-start gap-3">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5 text-slate-600 mt-0.5 flex-shrink-0"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-slate-900 mb-1">Payment Processing Fees</h3>
            <p className="text-xs text-slate-700 mb-2">
              {isFighter 
                ? "Stripe charges processing fees (approximately 2.9% + $0.30 per transaction) which are automatically deducted from payments. These fees are deducted before your earnings are calculated."
                : "Apex charges a 5% platform fee on stream revenue. Stripe processing fees (approximately 2.9% + $0.30 per transaction) are also deducted automatically. Your organizer share = Total Revenue - Platform Fee (5%) - Fighter Allocations."}
            </p>
            <p className="text-xs text-slate-600">
              <strong>Example:</strong> For a $10.00 payment: Platform fee = $0.50 (5%), Stripe fees ≈ $0.59, leaving ~$8.91 in net revenue.
            </p>
          </div>
        </div>
      </div>

      {/* Earnings Summary */}
      <div className={`grid gap-4 ${isFighter ? "md:grid-cols-4" : "md:grid-cols-3 lg:grid-cols-6"}`}>
        {!isFighter && (
          <div className="card">
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
              Total Revenue
            </div>
            <div className="text-2xl font-bold text-blue-700">
              ${(((earnings as OrganizerEarningsData).totalRevenue || 0) / 100).toFixed(2)}
            </div>
            <div className="text-xs text-slate-600 mt-1">
              All stream payments
            </div>
          </div>
        )}

        {!isFighter && (
          <div className="card">
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
              Platform Fees
            </div>
            <div className="text-2xl font-bold text-slate-600">
              ${(((earnings as OrganizerEarningsData).totalPlatformFees || 0) / 100).toFixed(2)}
            </div>
            <div className="text-xs text-slate-600 mt-1">
              5% of revenue
            </div>
          </div>
        )}

        <div className="card">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
            {isFighter ? "Total Earnings" : "Organizer Share"}
          </div>
          <div className="text-2xl font-bold text-slate-900">
            ${(totalEarnings / 100).toFixed(2)}
          </div>
          <div className="text-xs text-slate-600 mt-1">
            {isFighter ? "All time" : "After fees & allocations"}
          </div>
        </div>

        <div className="card">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
            Available Balance
          </div>
          <div className="text-2xl font-bold text-green-700">
            ${(availableBalance / 100).toFixed(2)}
          </div>
          <div className="text-xs text-slate-600 mt-1">
            Ready to withdraw
          </div>
        </div>

        <div className="card">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
            Pending Requests
          </div>
          <div className="text-2xl font-bold text-amber-700">
            ${(pendingRequests / 100).toFixed(2)}
          </div>
          <div className="text-xs text-slate-600 mt-1">
            Awaiting approval
          </div>
        </div>

        <div className="card">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
            Total Paid Out
          </div>
          <div className="text-2xl font-bold text-purple-700">
            ${(totalPaidOut / 100).toFixed(2)}
          </div>
          <div className="text-xs text-slate-600 mt-1">
            Received
          </div>
        </div>
      </div>

      {/* Request Payout */}
      {stripeConnected && stripeStatus === "active" && eventsWithEarnings.length > 0 && (
        <div className="card">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Request Payout</h2>
          <form onSubmit={handleRequestPayout} className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <label className="text-xs text-slate-600 space-y-1 block">
                Select Event
                <select
                  className="w-full rounded-xl border px-3 py-2 text-sm"
                  value={selectedEventId}
                  onChange={(e) => setSelectedEventId(e.target.value)}
                  required
                >
                  <option value="">Choose an event...</option>
                  {eventsWithEarnings.map((event) => {
                    const available = earnings.earningsBreakdown.find((e) => e.eventId === event.eventId);
                    const availableAmount = isFighter 
                      ? (available as FighterEarningsData["earningsBreakdown"][0])?.totalEarnings || 0
                      : (available as OrganizerEarningsData["earningsBreakdown"][0])?.organizerShare || 0;
                    const requested = earnings.payoutRequests
                      .filter((pr) => pr.event_id === event.eventId && (pr.status === "pending" || pr.status === "approved" || pr.status === "processed"))
                      .reduce((sum, pr) => sum + pr.amount_requested, 0);
                    const availableBalance = availableAmount - requested;
                    
                    return (
                      <option key={event.eventId} value={event.eventId}>
                        {event.eventName} - Available: ${(availableBalance / 100).toFixed(2)}
                      </option>
                    );
                  })}
                </select>
              </label>

              <label className="text-xs text-slate-600 space-y-1 block">
                Amount (USD)
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  className="w-full rounded-xl border px-3 py-2 text-sm"
                  value={requestAmount}
                  onChange={(e) => setRequestAmount(e.target.value)}
                  placeholder="0.00"
                  required
                />
                {selectedEventId && (() => {
                  const available = earnings.earningsBreakdown.find((e) => e.eventId === selectedEventId);
                  const availableAmount = isFighter
                    ? (available as FighterEarningsData["earningsBreakdown"][0])?.totalEarnings || 0
                    : (available as OrganizerEarningsData["earningsBreakdown"][0])?.organizerShare || 0;
                  const requested = earnings.payoutRequests
                    .filter((pr) => pr.event_id === selectedEventId && (pr.status === "pending" || pr.status === "approved" || pr.status === "processed"))
                    .reduce((sum, pr) => sum + pr.amount_requested, 0);
                  const availableBalance = availableAmount - requested;
                  
                  return (
                    <span className="text-[11px] text-slate-500">
                      Available: ${(availableBalance / 100).toFixed(2)}
                    </span>
                  );
                })()}
              </label>
            </div>

            {message && (
              <div className={`text-sm ${message.includes("success") ? "text-green-700" : "text-red-700"}`}>
                {message}
              </div>
            )}

            <button
              type="submit"
              disabled={requestingPayout}
              className="px-4 py-2 rounded-xl bg-purple-600 text-white text-sm font-medium disabled:opacity-60"
            >
              {requestingPayout ? "Submitting..." : "Request Payout"}
            </button>
          </form>
        </div>
      )}

      {/* Earnings Breakdown */}
      {earnings.earningsBreakdown.length > 0 && (
        <div className="card">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Earnings by Event</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left py-2 px-3 text-xs font-semibold text-slate-600 uppercase">Event</th>
                  {isFighter ? (
                    <>
                      <th className="text-right py-2 px-3 text-xs font-semibold text-slate-600 uppercase">Allocations</th>
                      <th className="text-right py-2 px-3 text-xs font-semibold text-slate-600 uppercase">Tips</th>
                      <th className="text-right py-2 px-3 text-xs font-semibold text-slate-600 uppercase">Total</th>
                    </>
                  ) : (
                    <>
                      <th className="text-right py-2 px-3 text-xs font-semibold text-slate-600 uppercase">Revenue</th>
                      <th className="text-right py-2 px-3 text-xs font-semibold text-slate-600 uppercase">Platform Fee</th>
                      <th className="text-right py-2 px-3 text-xs font-semibold text-slate-600 uppercase">Fighter Share</th>
                      <th className="text-right py-2 px-3 text-xs font-semibold text-slate-600 uppercase">Your Share</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody>
                {earnings.earningsBreakdown.map((event) => {
                  const requested = earnings.payoutRequests
                    .filter((pr) => pr.event_id === event.eventId && (pr.status === "pending" || pr.status === "approved" || pr.status === "processed"))
                    .reduce((sum, pr) => sum + pr.amount_requested, 0);
                  
                  if (isFighter) {
                    const fighterEvent = event as FighterEarningsData["earningsBreakdown"][0];
                    const available = fighterEvent.totalEarnings - requested;
                    
                    return (
                      <tr key={event.eventId} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="py-3 px-3">
                          <div>
                            <div className="font-medium text-slate-900">{event.eventName}</div>
                            {event.eventDate && (
                              <div className="text-xs text-slate-500">
                                {new Date(event.eventDate).toLocaleDateString()}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-3 text-right font-medium text-slate-900">
                          ${(fighterEvent.allocationEarnings / 100).toFixed(2)}
                        </td>
                        <td className="py-3 px-3 text-right font-medium text-purple-700">
                          ${(fighterEvent.tipEarnings / 100).toFixed(2)}
                        </td>
                        <td className="py-3 px-3 text-right font-bold text-slate-900">
                          ${(fighterEvent.totalEarnings / 100).toFixed(2)}
                        </td>
                      </tr>
                    );
                    } else {
                      const organizerEvent = event as OrganizerEarningsData["earningsBreakdown"][0];
                      const available = organizerEvent.organizerShare - requested;
                      
                      return (
                        <tr key={event.eventId} className="border-b border-slate-100 hover:bg-slate-50">
                          <td className="py-3 px-3">
                            <div>
                              <div className="font-medium text-slate-900">{event.eventName}</div>
                              {event.eventDate && (
                                <div className="text-xs text-slate-500">
                                  {new Date(event.eventDate).toLocaleDateString()}
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-3 text-right font-medium text-slate-900">
                            ${(organizerEvent.totalRevenue / 100).toFixed(2)}
                          </td>
                          <td className="py-3 px-3 text-right font-medium text-slate-500">
                            ${((organizerEvent.platformFee || 0) / 100).toFixed(2)}
                          </td>
                          <td className="py-3 px-3 text-right font-medium text-slate-600">
                            ${(organizerEvent.fighterShare / 100).toFixed(2)}
                          </td>
                          <td className="py-3 px-3 text-right font-bold text-green-700">
                            ${(organizerEvent.organizerShare / 100).toFixed(2)}
                          </td>
                        </tr>
                      );
                    }
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Payout History */}
      {earnings.payoutRequests.length > 0 && (
        <div className="card">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Payout History</h2>
          <div className="text-xs text-slate-500 mb-3">
            Tip: “Processed” means a Stripe transfer was created. If a request “Failed”, you can submit a new request after Stripe is ready.
          </div>
          <div className="space-y-2">
            {earnings.payoutRequests.map((request) => {
              const statusColors: Record<string, string> = {
                pending: "bg-amber-100 text-amber-800",
                approved: "bg-blue-100 text-blue-800",
                processed: "bg-green-100 text-green-800",
                rejected: "bg-red-100 text-red-800",
                failed: "bg-red-100 text-red-800",
                cancelled: "bg-slate-100 text-slate-800",
              };
              const eventName =
                earnings.earningsBreakdown.find((e) => e.eventId === request.event_id)?.eventName ||
                "Event";

              return (
                <div
                  key={request.id}
                  className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 py-3 px-3 rounded-lg bg-slate-50 hover:bg-slate-100"
                >
                  <div>
                    <div className="text-sm font-medium text-slate-900">
                      ${(request.amount_requested / 100).toFixed(2)}
                    </div>
                    <div className="text-xs text-slate-600">{eventName}</div>
                    <div className="text-xs text-slate-600">
                      {new Date(request.created_at).toLocaleString()}
                    </div>
                    {request.processed_at && (
                      <div className="text-[11px] text-slate-500">
                        Processed: {new Date(request.processed_at).toLocaleString()}
                      </div>
                    )}
                    {request.stripe_transfer_id && (
                      <div className="text-[11px] text-slate-500">
                        Transfer: <span className="font-mono">{request.stripe_transfer_id}</span>
                      </div>
                    )}
                    {request.rejection_reason && (
                      <div className="text-[11px] text-slate-500">
                        Note: {request.rejection_reason}
                      </div>
                    )}
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[request.status] || statusColors.pending}`}>
                    {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {totalEarnings === 0 && (
        <div className="card">
          <p className="text-sm text-slate-600 text-center py-8">
            {isFighter 
              ? "No earnings yet. Earnings will appear here once viewers purchase stream access and allocate percentages to you, or send you tips."
              : "No earnings yet. Earnings will appear here once viewers purchase stream access for your events. Your share is calculated as total revenue minus fighter allocations."}
          </p>
        </div>
      )}
    </div>
  );
}

