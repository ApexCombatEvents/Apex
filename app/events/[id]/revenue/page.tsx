import { createSupabaseServer } from "@/lib/supabaseServer";
import Link from "next/link";
import Image from "next/image";
import PayoutManagement from "@/components/events/PayoutManagement";
import OrganizerPayoutRequest from "@/components/events/OrganizerPayoutRequest";

type Event = {
  id: string;
  title?: string | null;
  name?: string | null;
  owner_profile_id?: string | null;
  profile_id?: string | null;
  stream_price?: number | null;
  fighter_percentage?: number | null;
  will_stream?: boolean | null;
};

type StreamPayment = {
  id: string;
  event_id: string;
  user_id: string;
  amount_paid: number;
  fighter_allocations: Array<{
    fighter_id: string;
    percentage: number;
    amount: number;
  }> | null;
  created_at: string;
};

type StreamTip = {
  id: string;
  event_id: string;
  fighter_id: string;
  user_id: string;
  amount: number;
  message?: string | null;
  created_at: string;
};

type FighterProfile = {
  id: string;
  username?: string | null;
  full_name?: string | null;
  avatar_url?: string | null;
  country?: string | null;
};

type FighterEarnings = {
  fighter_id: string;
  fighter: FighterProfile;
  allocationEarnings: number; // from fighter_allocations
  tipEarnings: number; // from stream_tips
  totalEarnings: number;
  allocationCount: number; // how many times they were chosen
};

export default async function EventRevenuePage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createSupabaseServer();

  // 1) Load event
  const { data: event, error: eventError } = await supabase
    .from("events")
    .select("id, title, name, owner_profile_id, profile_id, stream_price, fighter_percentage, will_stream")
    .eq("id", params.id)
    .single<Event>();

  if (eventError || !event) {
    console.error("Event error", eventError);
    return (
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="card">
          <p className="text-sm text-slate-600">Event not found.</p>
        </div>
      </div>
    );
  }

  // 2) Check authorization (only event owner can view)
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user ?? null;
  const ownerId = event.owner_profile_id || event.profile_id;

  if (!user || user.id !== ownerId) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="card">
          <p className="text-sm text-slate-600">
            You don&apos;t have permission to view revenue for this event.
          </p>
        </div>
      </div>
    );
  }

  // 3) Load stream payments
  const { data: paymentsData, error: paymentsError } = await supabase
    .from("stream_payments")
    .select("*")
    .eq("event_id", event.id)
    .order("created_at", { ascending: false });

  if (paymentsError) {
    console.error("Payments error", paymentsError);
  }

  const payments: StreamPayment[] = (paymentsData as StreamPayment[]) || [];

  // 4) Load stream tips
  const { data: tipsData, error: tipsError } = await supabase
    .from("stream_tips")
    .select("*")
    .eq("event_id", event.id)
    .order("created_at", { ascending: false });

  if (tipsError) {
    console.error("Tips error", tipsError);
  }

  const tips: StreamTip[] = (tipsData as StreamTip[]) || [];

  // 5) Calculate revenue statistics
  const totalRevenue = (payments || []).reduce((sum, p) => sum + (p.amount_paid || 0), 0);
  const totalTips = (tips || []).reduce((sum, t) => sum + (t.amount || 0), 0);
  const viewerCount = payments?.length || 0;
  const uniqueTippers = new Set((tips || []).map((t) => t.user_id).filter(Boolean)).size;

  // 6) Calculate fighter earnings
  const fighterEarningsMap: Record<string, FighterEarnings> = {};

  // Process allocations from payments
  (payments || []).forEach((payment) => {
    if (payment.fighter_allocations && Array.isArray(payment.fighter_allocations)) {
      payment.fighter_allocations.forEach((allocation: any) => {
        if (!fighterEarningsMap[allocation.fighter_id]) {
          fighterEarningsMap[allocation.fighter_id] = {
            fighter_id: allocation.fighter_id,
            fighter: {} as FighterProfile,
            allocationEarnings: 0,
            tipEarnings: 0,
            totalEarnings: 0,
            allocationCount: 0,
          };
        }
        fighterEarningsMap[allocation.fighter_id].allocationEarnings += allocation.amount;
        fighterEarningsMap[allocation.fighter_id].allocationCount += 1;
      });
    }
  });

  // Process tips
  (tips || []).forEach((tip) => {
    if (!fighterEarningsMap[tip.fighter_id]) {
      fighterEarningsMap[tip.fighter_id] = {
        fighter_id: tip.fighter_id,
        fighter: {} as FighterProfile,
        allocationEarnings: 0,
        tipEarnings: 0,
        totalEarnings: 0,
        allocationCount: 0,
      };
    }
    fighterEarningsMap[tip.fighter_id].tipEarnings += tip.amount;
  });

  // Calculate total earnings for each fighter
  Object.values(fighterEarningsMap).forEach((earning) => {
    earning.totalEarnings = earning.allocationEarnings + earning.tipEarnings;
  });

  // 7) Load fighter profiles
  const fighterIds = Object.keys(fighterEarningsMap);
  if (fighterIds.length > 0) {
    const { data: fightersData } = await supabase
      .from("profiles")
      .select("id, username, full_name, avatar_url, country")
      .in("id", fighterIds);

    if (fightersData) {
      fightersData.forEach((fighter) => {
        if (fighterEarningsMap[fighter.id]) {
          fighterEarningsMap[fighter.id].fighter = fighter as FighterProfile;
        }
      });
    }
  }

  // 8) Sort fighters by total earnings (highest first)
  const fighterEarnings = Object.values(fighterEarningsMap).sort(
    (a, b) => b.totalEarnings - a.totalEarnings
  );

  // 9) Find most chosen fighter (by allocation count)
  const mostChosenFighter = fighterEarnings.length > 0
    ? [...fighterEarnings].sort((a, b) => b.allocationCount - a.allocationCount)[0]
    : null;

  const eventTitle = event.title || event.name || "Untitled event";
  const organizerCut = totalRevenue - fighterEarnings.reduce((sum, f) => sum + f.allocationEarnings, 0);
  const fighterPercentage = event.fighter_percentage || 0;

  // Organizer payout history for this event
  const { data: organizerPayoutRequests } = await supabase
    .from("payout_requests")
    .select("id, amount_requested, status, created_at, processed_at, stripe_transfer_id, rejection_reason")
    .eq("event_id", event.id)
    .eq("recipient_type", "organizer")
    .eq("recipient_profile_id", ownerId)
    .order("created_at", { ascending: false });

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Event Revenue & Analytics</h1>
          <p className="text-sm text-slate-600 mt-1">{eventTitle}</p>
        </div>
        <Link
          href={`/events/${event.id}`}
          className="px-4 py-2 rounded-lg border border-slate-300 bg-white text-slate-700 text-sm font-medium hover:bg-slate-50"
        >
          ← Back to Event
        </Link>
      </div>

      {/* Revenue Overview Cards */}
      <div className="grid md:grid-cols-4 gap-4">
        <div className="card">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
            Total Revenue
          </div>
          <div className="text-2xl font-bold text-slate-900">
            ${(totalRevenue / 100).toFixed(2)}
          </div>
          <div className="text-xs text-slate-600 mt-1">
            From {viewerCount} viewer{viewerCount !== 1 ? "s" : ""}
          </div>
        </div>

        <div className="card">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
            Total Tips
          </div>
          <div className="text-2xl font-bold text-purple-700">
            ${(totalTips / 100).toFixed(2)}
          </div>
          <div className="text-xs text-slate-600 mt-1">
            From {uniqueTippers} tipper{uniqueTippers !== 1 ? "s" : ""}
          </div>
        </div>

        <div className="card">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
            Your Cut
          </div>
          <div className="text-2xl font-bold text-green-700">
            ${(organizerCut / 100).toFixed(2)}
          </div>
          <div className="text-xs text-slate-600 mt-1">
            {fighterPercentage > 0 
              ? `After ${fighterPercentage}% fighter share`
              : "100% of revenue"}
          </div>
        </div>

        <div className="card">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
            Fighter Share
          </div>
          <div className="text-2xl font-bold text-blue-700">
            ${(fighterEarnings.reduce((sum, f) => sum + f.allocationEarnings, 0) / 100).toFixed(2)}
          </div>
          <div className="text-xs text-slate-600 mt-1">
            {fighterPercentage > 0 ? `${fighterPercentage}% allocated` : "No fighter share"}
          </div>
        </div>
      </div>

      {/* Most Chosen Fighter */}
      {mostChosenFighter && mostChosenFighter.allocationCount > 0 && (
        <div className="card bg-purple-50 border-purple-200">
          <div className="flex items-center gap-3">
            {mostChosenFighter.fighter.avatar_url ? (
              <Image
                src={mostChosenFighter.fighter.avatar_url}
                alt={mostChosenFighter.fighter.full_name || mostChosenFighter.fighter.username || "Fighter"}
                width={48}
                height={48}
                className="rounded-full"
              />
            ) : (
              <div className="w-12 h-12 rounded-full bg-purple-200 flex items-center justify-center">
                <span className="text-purple-600 font-semibold text-lg">
                  {(mostChosenFighter.fighter.full_name || mostChosenFighter.fighter.username || "F")[0].toUpperCase()}
                </span>
              </div>
            )}
            <div className="flex-1">
              <div className="text-sm font-semibold text-purple-900">
                Most Chosen Fighter
              </div>
              <div className="text-lg font-bold text-purple-800">
                {mostChosenFighter.fighter.full_name || mostChosenFighter.fighter.username || "Unknown Fighter"}
              </div>
              <div className="text-xs text-purple-700 mt-0.5">
                Chosen {mostChosenFighter.allocationCount} time{mostChosenFighter.allocationCount !== 1 ? "s" : ""} for percentage share
              </div>
            </div>
            <div className="text-right">
              <div className="text-lg font-bold text-purple-700">
                ${(mostChosenFighter.allocationEarnings / 100).toFixed(2)}
              </div>
              <div className="text-xs text-purple-600">From allocations</div>
            </div>
          </div>
        </div>
      )}

      {/* Fighter Earnings Table */}
      {fighterEarnings.length > 0 ? (
        <div className="card">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Fighter Payouts</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left py-2 px-3 text-xs font-semibold text-slate-600 uppercase">Fighter</th>
                  <th className="text-right py-2 px-3 text-xs font-semibold text-slate-600 uppercase">Allocation Share</th>
                  <th className="text-right py-2 px-3 text-xs font-semibold text-slate-600 uppercase">Tips Received</th>
                  <th className="text-right py-2 px-3 text-xs font-semibold text-slate-600 uppercase">Total Earnings</th>
                  <th className="text-right py-2 px-3 text-xs font-semibold text-slate-600 uppercase">Chosen Count</th>
                </tr>
              </thead>
              <tbody>
                {fighterEarnings.map((earning) => {
                  const fighterName = earning.fighter.full_name || earning.fighter.username || "Unknown Fighter";
                  return (
                    <tr key={earning.fighter_id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2">
                          {earning.fighter.avatar_url ? (
                            <Image
                              src={earning.fighter.avatar_url}
                              alt={fighterName}
                              width={32}
                              height={32}
                              className="rounded-full"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center">
                              <span className="text-slate-600 font-medium text-xs">
                                {fighterName[0].toUpperCase()}
                              </span>
                            </div>
                          )}
                          <div>
                            <div className="font-medium text-slate-900">{fighterName}</div>
                            {earning.fighter.username && (
                              <div className="text-xs text-slate-500">@{earning.fighter.username}</div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-right font-medium text-slate-900">
                        ${(earning.allocationEarnings / 100).toFixed(2)}
                      </td>
                      <td className="py-3 px-3 text-right font-medium text-purple-700">
                        ${(earning.tipEarnings / 100).toFixed(2)}
                      </td>
                      <td className="py-3 px-3 text-right font-bold text-slate-900">
                        ${(earning.totalEarnings / 100).toFixed(2)}
                      </td>
                      <td className="py-3 px-3 text-right text-slate-600">
                        {earning.allocationCount}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="bg-slate-50">
                  <td className="py-3 px-3 font-semibold text-slate-900">Total</td>
                  <td className="py-3 px-3 text-right font-semibold text-slate-900">
                    ${(fighterEarnings.reduce((sum, f) => sum + f.allocationEarnings, 0) / 100).toFixed(2)}
                  </td>
                  <td className="py-3 px-3 text-right font-semibold text-purple-700">
                    ${(fighterEarnings.reduce((sum, f) => sum + f.tipEarnings, 0) / 100).toFixed(2)}
                  </td>
                  <td className="py-3 px-3 text-right font-bold text-slate-900">
                    ${(fighterEarnings.reduce((sum, f) => sum + f.totalEarnings, 0) / 100).toFixed(2)}
                  </td>
                  <td className="py-3 px-3 text-right font-semibold text-slate-600">
                    {fighterEarnings.reduce((sum, f) => sum + f.allocationCount, 0)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      ) : (
        <div className="card">
          <p className="text-sm text-slate-600 text-center py-8">
            No fighter payouts yet. Revenue will appear here once viewers purchase stream access and allocate fighter percentages.
          </p>
        </div>
      )}

      {/* Recent Payments */}
      {payments.length > 0 && (
        <div className="card">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Recent Payments</h2>
          <div className="space-y-2">
            {payments.slice(0, 10).map((payment) => (
              <div
                key={payment.id}
                className="flex items-center justify-between py-2 px-3 rounded-lg bg-slate-50 hover:bg-slate-100"
              >
                <div>
                  <div className="text-sm font-medium text-slate-900">
                    ${(payment.amount_paid / 100).toFixed(2)} payment
                  </div>
                  <div className="text-xs text-slate-600">
                    {new Date(payment.created_at).toLocaleString()}
                  </div>
                </div>
                {payment.fighter_allocations && payment.fighter_allocations.length > 0 && (
                  <div className="text-xs text-slate-600">
                    {payment.fighter_allocations.length} fighter{payment.fighter_allocations.length !== 1 ? "s" : ""} allocated
                  </div>
                )}
              </div>
            ))}
            {payments.length > 10 && (
              <p className="text-xs text-slate-500 text-center pt-2">
                Showing 10 of {payments.length} payments
              </p>
            )}
          </div>
        </div>
      )}

      {/* Payout Requests Management */}
      {fighterPercentage > 0 && (
        <PayoutManagement eventId={event.id} />
      )}

      {/* Organizer Payout (request by organizer) */}
      <OrganizerPayoutRequest eventId={event.id} organizerShare={organizerCut} />

      {/* Organizer Payout History */}
      <div className="card">
        <h2 className="text-lg font-semibold text-slate-900 mb-2">Organizer Payout History</h2>
        <p className="text-xs text-slate-500 mb-4">
          These are your payout requests for this event. Processed requests will include a Stripe transfer ID.
        </p>

        {(organizerPayoutRequests || []).length === 0 ? (
          <p className="text-sm text-slate-600">No organizer payout requests yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[760px]">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left py-2 px-3 text-xs font-semibold text-slate-600 uppercase">Amount</th>
                  <th className="text-left py-2 px-3 text-xs font-semibold text-slate-600 uppercase">Status</th>
                  <th className="text-left py-2 px-3 text-xs font-semibold text-slate-600 uppercase">Requested</th>
                  <th className="text-left py-2 px-3 text-xs font-semibold text-slate-600 uppercase">Processed</th>
                  <th className="text-left py-2 px-3 text-xs font-semibold text-slate-600 uppercase">Details</th>
                </tr>
              </thead>
              <tbody>
                {(organizerPayoutRequests || []).map((r: any) => (
                  <tr key={r.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="py-3 px-3 font-semibold text-slate-900">
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
                      {new Date(r.created_at).toLocaleString()}
                    </td>
                    <td className="py-3 px-3 text-slate-600">
                      {r.processed_at ? new Date(r.processed_at).toLocaleString() : "—"}
                    </td>
                    <td className="py-3 px-3 text-slate-600">
                      {r.stripe_transfer_id ? (
                        <span className="font-mono text-xs">{r.stripe_transfer_id}</span>
                      ) : r.rejection_reason ? (
                        <span className="text-xs">{r.rejection_reason}</span>
                      ) : (
                        "—"
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Stream Settings Info */}
      {!event.will_stream && (
        <div className="card bg-amber-50 border-amber-200">
          <p className="text-sm text-amber-800">
            <strong>Note:</strong> Streaming is not enabled for this event. Enable streaming in event settings to start collecting revenue.
          </p>
        </div>
      )}
    </div>
  );
}

