"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createSupabaseBrowser } from "@/lib/supabase-browser";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import Skeleton from "@/components/ui/Skeleton";

type PayoutRow = {
  id: string;
  event_id: string;
  fighter_id: string;
  recipient_type: "fighter" | "organizer" | null;
  recipient_profile_id: string | null;
  amount_requested: number;
  status: string;
  stripe_transfer_id: string | null;
  rejection_reason: string | null;
  created_at: string;
  processed_at: string | null;
  events?: {
    id: string;
    title: string | null;
    name: string | null;
  } | null;
  fighters?: {
    id: string;
    full_name: string | null;
    username: string | null;
  } | null;
  recipient?: {
    id: string;
    full_name: string | null;
    username: string | null;
  } | null;
};

const STATUS_OPTIONS = ["all", "pending", "approved", "processed", "rejected", "failed", "cancelled"] as const;
const TYPE_OPTIONS = ["all", "fighter", "organizer"] as const;

export default function AdminPayoutsPage() {
  const router = useRouter();
  const supabase = createSupabaseBrowser();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [rows, setRows] = useState<PayoutRow[]>([]);
  const [statusFilter, setStatusFilter] = useState<(typeof STATUS_OPTIONS)[number]>("pending");
  const [typeFilter, setTypeFilter] = useState<(typeof TYPE_OPTIONS)[number]>("all");
  const [message, setMessage] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<{ open: boolean; id: string | null; action: "approve" | "reject" }>(
    { open: false, id: null, action: "approve" }
  );

  useEffect(() => {
    async function checkAdminAndLoad() {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      if (profile?.role === "ADMIN") {
        setIsAdmin(true);
        await load();
      } else {
        setIsAdmin(false);
        setMessage("Access denied. Admin privileges required.");
        setLoading(false);
      }
    }
    checkAdminAndLoad();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function load() {
    setMessage(null);
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("payout_requests")
        .select(`
          id,
          event_id,
          fighter_id,
          recipient_type,
          recipient_profile_id,
          amount_requested,
          status,
          stripe_transfer_id,
          rejection_reason,
          created_at,
          processed_at,
          events:event_id (id, title, name),
          fighters:fighter_id (id, full_name, username),
          recipient:recipient_profile_id (id, full_name, username)
        `)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Admin payouts load error", error);
        setMessage(error.message || "Failed to load payout requests.");
        setRows([]);
      } else {
        setRows((data as any) || []);
      }
    } catch (e: any) {
      console.error(e);
      setMessage(e.message || "Failed to load payout requests.");
    } finally {
      setLoading(false);
    }
  }

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      const statusOk = statusFilter === "all" ? true : r.status === statusFilter;
      const t = (r.recipient_type || "fighter") as "fighter" | "organizer";
      const typeOk = typeFilter === "all" ? true : t === typeFilter;
      return statusOk && typeOk;
    });
  }, [rows, statusFilter, typeFilter]);

  async function process(id: string, action: "approve" | "reject") {
    setProcessingId(id);
    setMessage(null);
    try {
      const res = await fetch("/api/payouts/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payoutRequestId: id, action }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.error || `Failed to ${action} request`);
        setProcessingId(null);
        return;
      }
      setMessage(action === "approve" ? "Payout processed successfully." : "Payout request rejected.");
      await load();
    } catch (e: any) {
      console.error(e);
      setMessage(e.message || `Failed to ${action} request`);
    } finally {
      setProcessingId(null);
    }
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="card space-y-4">
          <div className="flex items-center justify-between">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-9 w-24" />
          </div>
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="card">
          <p className="text-sm text-red-600">{message || "Access denied."}</p>
          <Link href="/" className="text-purple-700 hover:underline mt-2 inline-block">
            Go to homepage
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Payouts</h1>
          <p className="text-sm text-slate-600 mt-1">
            Review and process payout requests for fighters and organizers.
          </p>
        </div>
        <button
          onClick={load}
          className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Refresh
        </button>
      </div>

      {message && (
        <div
          className={`rounded-xl border px-4 py-3 text-sm ${
            message.includes("successfully") || message.includes("processed") || message.includes("rejected")
              ? "border-green-200 bg-green-50 text-green-700"
              : "border-red-200 bg-red-50 text-red-700"
          }`}
        >
          {message}
        </div>
      )}

      <div className="card flex flex-col md:flex-row md:items-end gap-3">
        <label className="text-xs text-slate-600 space-y-1 block">
          Status
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="w-full md:w-56 rounded-xl border px-3 py-2 text-sm"
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s === "all" ? "All" : s}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs text-slate-600 space-y-1 block">
          Recipient type
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as any)}
            className="w-full md:w-56 rounded-xl border px-3 py-2 text-sm"
          >
            {TYPE_OPTIONS.map((t) => (
              <option key={t} value={t}>
                {t === "all" ? "All" : t}
              </option>
            ))}
          </select>
        </label>
      </div>

      {filtered.length === 0 ? (
        <div className="card">
          <p className="text-sm text-slate-600 text-center py-8">
            No payout requests match your filters.
          </p>
        </div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="min-w-[900px] w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left py-2 px-3 text-xs font-semibold text-slate-600 uppercase">Event</th>
                <th className="text-left py-2 px-3 text-xs font-semibold text-slate-600 uppercase">Recipient</th>
                <th className="text-left py-2 px-3 text-xs font-semibold text-slate-600 uppercase">Type</th>
                <th className="text-right py-2 px-3 text-xs font-semibold text-slate-600 uppercase">Amount</th>
                <th className="text-left py-2 px-3 text-xs font-semibold text-slate-600 uppercase">Status</th>
                <th className="text-left py-2 px-3 text-xs font-semibold text-slate-600 uppercase">Details</th>
                <th className="text-right py-2 px-3 text-xs font-semibold text-slate-600 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => {
                const type = (r.recipient_type || "fighter") as "fighter" | "organizer";
                const eventName = r.events?.title || r.events?.name || "Event";
                const recipientName =
                  type === "organizer"
                    ? r.recipient?.full_name || r.recipient?.username || "Organizer"
                    : r.fighters?.full_name || r.fighters?.username || "Fighter";
                const canAct = r.status === "pending" || r.status === "approved";
                return (
                  <tr key={r.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="py-3 px-3 font-medium text-slate-900">{eventName}</td>
                    <td className="py-3 px-3 text-slate-700">{recipientName}</td>
                    <td className="py-3 px-3 text-slate-600">{type}</td>
                    <td className="py-3 px-3 text-right font-semibold text-slate-900">
                      ${(r.amount_requested / 100).toFixed(2)}
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          r.status === "pending"
                            ? "bg-amber-100 text-amber-800"
                            : r.status === "processed"
                            ? "bg-green-100 text-green-800"
                            : r.status === "failed"
                            ? "bg-red-100 text-red-800"
                            : r.status === "rejected"
                            ? "bg-slate-200 text-slate-700"
                            : "bg-blue-100 text-blue-800"
                        }`}
                      >
                        {r.status}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-slate-600">
                      {r.stripe_transfer_id ? (
                        <div className="text-xs">
                          <div className="font-medium text-slate-700">Transfer:</div>
                          <div className="font-mono">{r.stripe_transfer_id}</div>
                        </div>
                      ) : r.rejection_reason ? (
                        <div className="text-xs">
                          <div className="font-medium text-slate-700">Reason:</div>
                          <div className="line-clamp-2">{r.rejection_reason}</div>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          disabled={!canAct || processingId === r.id}
                          onClick={() => setConfirm({ open: true, id: r.id, action: "reject" })}
                          className="px-3 py-1.5 rounded-lg border border-red-300 bg-red-50 text-red-700 text-xs font-medium hover:bg-red-100 disabled:opacity-50"
                        >
                          Reject
                        </button>
                        <button
                          disabled={!canAct || processingId === r.id}
                          onClick={() => setConfirm({ open: true, id: r.id, action: "approve" })}
                          className="px-3 py-1.5 rounded-lg bg-green-600 text-white text-xs font-medium hover:bg-green-700 disabled:opacity-50"
                        >
                          Approve & Pay
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <ConfirmDialog
        open={confirm.open}
        title={confirm.action === "approve" ? "Approve & pay this request?" : "Reject this request?"}
        description={
          confirm.action === "approve"
            ? "This will create a Stripe transfer immediately."
            : "This will mark the request as rejected and notify the recipient."
        }
        confirmText={confirm.action === "approve" ? "Approve & Pay" : "Reject"}
        danger={confirm.action === "reject"}
        onConfirm={() => {
          if (confirm.id) process(confirm.id, confirm.action);
        }}
        onClose={() => setConfirm((c) => ({ ...c, open: false }))}
      />
    </div>
  );
}



