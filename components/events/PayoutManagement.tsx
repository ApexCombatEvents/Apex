"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { createSupabaseBrowser } from "@/lib/supabase-browser";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import Skeleton from "@/components/ui/Skeleton";

type PendingRequest = {
  id: string;
  fighter_id: string;
  event_id: string;
  amount_requested: number;
  status: string;
  created_at: string;
  fighters: {
    id: string;
    full_name: string | null;
    username: string | null;
    avatar_url: string | null;
    stripe_account_id: string | null;
    stripe_account_status: string | null;
    stripe_onboarding_completed: boolean | null;
  };
  events: {
    id: string;
    title: string | null;
    name: string | null;
    event_date: string | null;
  };
};

type PayoutManagementProps = {
  eventId: string;
};

export default function PayoutManagement({ eventId }: PayoutManagementProps) {
  const supabase = createSupabaseBrowser();
  const [pendingRequests, setPendingRequests] = useState<PendingRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<{
    open: boolean;
    requestId: string | null;
    action: "approve" | "reject";
  }>({ open: false, requestId: null, action: "approve" });

  useEffect(() => {
    loadPendingRequests();
  }, [eventId]);

  async function loadPendingRequests() {
    setLoading(true);
    try {
      const response = await fetch(`/api/payouts/pending?eventId=${eventId}`);
      if (!response.ok) {
        const error = await response.json();
        setMessage(error.error || "Failed to load pending requests");
        setLoading(false);
        return;
      }

      const data = await response.json();
      setPendingRequests(data.pendingRequests || []);
    } catch (error: any) {
      console.error("Load pending requests error", error);
      setMessage("Failed to load pending requests");
    } finally {
      setLoading(false);
    }
  }

  async function handleProcessPayout(requestId: string, action: "approve" | "reject") {
    setProcessing(requestId);
    setMessage(null);

    try {
      const response = await fetch("/api/payouts/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          payoutRequestId: requestId,
          action,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.error || `Failed to ${action} payout request`);
        setProcessing(null);
        return;
      }

      setMessage(
        action === "approve"
          ? "Payout processed successfully! Funds have been transferred to the fighter's Stripe account."
          : "Payout request rejected."
      );

      // Reload requests
      await loadPendingRequests();
    } catch (error: any) {
      console.error("Process payout error", error);
      setMessage(`Failed to ${action} payout request`);
    } finally {
      setProcessing(null);
    }
  }

  if (loading) {
    return (
      <div className="card">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-4 w-16" />
          </div>
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      </div>
    );
  }

  if (pendingRequests.length === 0) {
    return (
      <div className="card">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Payout Requests</h2>
        <p className="text-sm text-slate-600 text-center py-6">
          No pending requests yet.
        </p>
        <div className="text-xs text-slate-500 text-center">
          Fighters submit requests from <span className="font-medium">Earnings</span> after connecting Stripe.
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Payout Requests</h2>
          <p className="text-xs text-slate-500 mt-1">
            Approving will immediately create a Stripe transfer to the fighter’s connected account.
          </p>
        </div>
        <button
          onClick={loadPendingRequests}
          className="text-sm text-purple-600 hover:text-purple-700"
        >
          Refresh
        </button>
      </div>

      {message && (
        <div
          className={`mb-4 p-3 rounded-lg text-sm ${
            message.includes("success") || message.includes("rejected")
              ? "bg-green-50 text-green-800 border border-green-200"
              : "bg-red-50 text-red-800 border border-red-200"
          }`}
        >
          {message}
        </div>
      )}

      <div className="space-y-3">
        {pendingRequests.map((request) => {
          const fighter = request.fighters;
          const event = request.events;
          const fighterName = fighter.full_name || fighter.username || "Unknown Fighter";
          const hasStripe = !!fighter.stripe_account_id;
          const stripeReady =
            fighter.stripe_account_status === "active" &&
            fighter.stripe_onboarding_completed;

          return (
            <div
              key={request.id}
              className="border border-slate-200 rounded-lg p-4 bg-slate-50"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 flex-1">
                  {fighter.avatar_url ? (
                    <Image
                      src={fighter.avatar_url}
                      alt={fighterName}
                      width={48}
                      height={48}
                      className="rounded-full"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-slate-200 flex items-center justify-center">
                      <span className="text-slate-600 font-semibold">
                        {fighterName[0].toUpperCase()}
                      </span>
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-slate-900">{fighterName}</div>
                    {fighter.username && (
                      <div className="text-xs text-slate-500">@{fighter.username}</div>
                    )}
                    <div className="text-sm text-slate-600 mt-1">
                      <div>
                        Event: {event.title || event.name || "Unknown Event"}
                      </div>
                      <div className="font-bold text-lg text-purple-700 mt-1">
                        ${(request.amount_requested / 100).toFixed(2)}
                      </div>
                      <div className="text-xs text-slate-500 mt-1">
                        Requested: {new Date(request.created_at).toLocaleString()}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-2 items-end">
                  {!hasStripe && (
                    <div className="text-xs text-amber-700 bg-amber-50 px-2 py-1 rounded">
                      Stripe not connected
                    </div>
                  )}
                  {hasStripe && !stripeReady && (
                    <div className="text-xs text-blue-700 bg-blue-50 px-2 py-1 rounded">
                      Stripe setup incomplete
                    </div>
                  )}
                  {stripeReady && (
                    <div className="text-xs text-green-700 bg-green-50 px-2 py-1 rounded">
                      Ready to pay
                    </div>
                  )}

                  <div className="flex gap-2">
                    <button
                      onClick={() =>
                        setConfirm({ open: true, requestId: request.id, action: "reject" })
                      }
                      disabled={processing === request.id}
                      className="px-3 py-1.5 rounded-lg border border-red-300 bg-red-50 text-red-700 text-sm font-medium hover:bg-red-100 disabled:opacity-60"
                    >
                      {processing === request.id ? "Processing..." : "Reject"}
                    </button>
                    <button
                      onClick={() =>
                        setConfirm({ open: true, requestId: request.id, action: "approve" })
                      }
                      disabled={processing === request.id || !stripeReady}
                      className="px-3 py-1.5 rounded-lg bg-green-600 text-white text-sm font-medium hover:bg-green-700 disabled:opacity-60"
                    >
                      {processing === request.id ? "Processing..." : "Approve & Pay"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <ConfirmDialog
        open={confirm.open}
        title={confirm.action === "approve" ? "Approve & pay this request?" : "Reject this request?"}
        description={
          confirm.action === "approve"
            ? "This will create a Stripe transfer immediately. Make sure the fighter’s Stripe status is Ready to pay."
            : "The fighter will be notified that the request was rejected."
        }
        confirmText={confirm.action === "approve" ? "Approve & Pay" : "Reject"}
        danger={confirm.action === "reject"}
        onConfirm={() => {
          if (confirm.requestId) handleProcessPayout(confirm.requestId, confirm.action);
        }}
        onClose={() => setConfirm((c) => ({ ...c, open: false }))}
      />
    </div>
  );
}

