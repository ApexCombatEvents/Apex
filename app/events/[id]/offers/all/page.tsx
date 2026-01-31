// app/events/[id]/offers/all/page.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { createSupabaseBrowser } from "@/lib/supabase-browser";

type Offer = {
  id: string;
  bout_id: string;
  side: "red" | "blue";
  status: string | null;
  created_at: string;
  from_profile_id: string;
  fighter_profile_id: string | null;
};

type Bout = {
  id: string;
  event_id: string;
  card_type: "main" | "undercard";
  order_index: number;
  red_name: string | null;
  blue_name: string | null;
  weight: string | null;
  bout_details: string | null;
  red_fighter_id: string | null;
  blue_fighter_id: string | null;
};

type ProfileLite = {
  id: string;
  full_name: string | null;
  username: string | null;
  role: string | null;
};

type Event = {
  id: string;
  title: string | null;
  name: string | null;
};

export default function AllOffersPage() {
  const params = useParams();
  const eventId = params.id as string;
  const supabase = createSupabaseBrowser();
  
  const [event, setEvent] = useState<Event | null>(null);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [bouts, setBouts] = useState<Record<string, Bout>>({});
  const [profiles, setProfiles] = useState<Record<string, ProfileLite>>({});
  const [loading, setLoading] = useState(true);
  const [timeFilter, setTimeFilter] = useState<"recent" | "past">("recent");
  const [statusFilter, setStatusFilter] = useState<"all" | "accepted" | "rejected">("all");

  useEffect(() => {
    loadData();
  }, [eventId]);

  async function loadData() {
    setLoading(true);
    try {
      // Load event
      const { data: eventData } = await supabase
        .from("events")
        .select("id, title, name")
        .eq("id", eventId)
        .single();

      if (eventData) {
        setEvent(eventData);
      }

      // Load bouts
      const { data: boutsData } = await supabase
        .from("event_bouts")
        .select("id, event_id, card_type, order_index, red_name, blue_name, weight, bout_details, red_fighter_id, blue_fighter_id")
        .eq("event_id", eventId);

      if (boutsData) {
        const boutsMap: Record<string, Bout> = {};
        boutsData.forEach((b) => {
          boutsMap[b.id] = b as Bout;
        });
        setBouts(boutsMap);
      }

      // Load all offers
      const boutIds = boutsData?.map((b) => b.id) || [];
      if (boutIds.length > 0) {
        const { data: offersData } = await supabase
          .from("event_bout_offers")
          .select("id, bout_id, side, status, created_at, from_profile_id, fighter_profile_id")
          .in("bout_id", boutIds);

        if (offersData) {
          setOffers(offersData as Offer[]);
        }

        // Load profiles
        const profileIds = new Set<string>();
        offersData?.forEach((o: any) => {
          profileIds.add(o.from_profile_id);
          if (o.fighter_profile_id) profileIds.add(o.fighter_profile_id);
        });
        boutsData?.forEach((b: any) => {
          if (b.red_fighter_id) profileIds.add(b.red_fighter_id);
          if (b.blue_fighter_id) profileIds.add(b.blue_fighter_id);
        });

        if (profileIds.size > 0) {
          const { data: profilesData } = await supabase
            .from("profiles")
            .select("id, full_name, username, role")
            .in("id", Array.from(profileIds));

          if (profilesData) {
            const profilesMap: Record<string, ProfileLite> = {};
            profilesData.forEach((p) => {
              profilesMap[p.id] = p as ProfileLite;
            });
            setProfiles(profilesMap);
          }
        }
      }
    } catch (err) {
      console.error("Error loading offers:", err);
    } finally {
      setLoading(false);
    }
  }

  const filteredOffers = offers.filter((offer) => {
    // Time filter
    const offerDate = new Date(offer.created_at);
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    if (timeFilter === "recent" && offerDate < thirtyDaysAgo) {
      return false;
    }
    if (timeFilter === "past" && offerDate >= thirtyDaysAgo) {
      return false;
    }

    // Status filter
    if (statusFilter === "accepted" && offer.status !== "accepted") {
      return false;
    }
    if (statusFilter === "rejected" && offer.status !== "declined") {
      return false;
    }

    return true;
  });

  const renderOfferRow = (offer: Offer) => {
    const bout = bouts[offer.bout_id];
    if (!bout) return null;

    const coach = profiles[offer.from_profile_id];
    const fighter = offer.fighter_profile_id ? profiles[offer.fighter_profile_id] : undefined;

    const boutLabel =
      bout.card_type === "main"
        ? `Main card • Fight ${bout.order_index + 1}`
        : `Undercard • Fight ${bout.order_index + 1}`;

    const coachName = coach?.full_name || coach?.username || "Profile";
    const fighterName = fighter?.full_name || fighter?.username || "Fighter";
    const sideLabel = offer.side === "red" ? "Red corner" : "Blue corner";
    const created = offer.created_at
      ? new Date(offer.created_at).toLocaleString()
      : "";

    return (
      <div
        key={offer.id}
        className="py-3 flex items-center justify-between gap-3 border-b last:border-b-0 border-slate-200"
      >
        <div className="flex flex-col gap-1">
          <span className="text-xs font-semibold text-slate-900">{boutLabel}</span>
          <span className="text-xs text-slate-700">
            {bout.red_name || "Red"} vs {bout.blue_name || "Blue"}
            {bout.weight ? ` • ${bout.weight}` : ""}
          </span>
          <span className="text-[11px] text-slate-600">
            Fighter: {fighterName} • {sideLabel}
          </span>
          <span className="text-[11px] text-slate-500">
            From {coachName} • {created}
          </span>
        </div>

        <div className="flex flex-col items-end gap-1">
          <span
            className={`text-[11px] uppercase tracking-wide px-2 py-1 rounded ${
              offer.status === "accepted"
                ? "bg-green-100 text-green-700"
                : offer.status === "declined"
                ? "bg-red-100 text-red-700"
                : "bg-yellow-100 text-yellow-700"
            }`}
          >
            {offer.status || "pending"}
          </span>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <p className="text-sm text-slate-600">Loading offers...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">
          All Offers – {event?.title || event?.name || "Event"}
        </h1>
        <Link
          href={`/events/${eventId}/offers`}
          className="text-xs text-purple-700 hover:underline"
        >
          ← Back to pending offers
        </Link>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="flex gap-2">
          <button
            onClick={() => setTimeFilter("recent")}
            className={`px-3 py-1 text-xs rounded-full border ${
              timeFilter === "recent"
                ? "bg-purple-600 text-white border-purple-600"
                : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
            }`}
          >
            Recent (30 days)
          </button>
          <button
            onClick={() => setTimeFilter("past")}
            className={`px-3 py-1 text-xs rounded-full border ${
              timeFilter === "past"
                ? "bg-purple-600 text-white border-purple-600"
                : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
            }`}
          >
            Past
          </button>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setStatusFilter("all")}
            className={`px-3 py-1 text-xs rounded-full border ${
              statusFilter === "all"
                ? "bg-purple-600 text-white border-purple-600"
                : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
            }`}
          >
            All
          </button>
          <button
            onClick={() => setStatusFilter("accepted")}
            className={`px-3 py-1 text-xs rounded-full border ${
              statusFilter === "accepted"
                ? "bg-purple-600 text-white border-purple-600"
                : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
            }`}
          >
            Accepted
          </button>
          <button
            onClick={() => setStatusFilter("rejected")}
            className={`px-3 py-1 text-xs rounded-full border ${
              statusFilter === "rejected"
                ? "bg-purple-600 text-white border-purple-600"
                : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
            }`}
          >
            Rejected
          </button>
        </div>
      </div>

      {/* Results */}
      <div className="card space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">Filtered Offers</h2>
          <span className="text-[11px] text-slate-500">
            {filteredOffers.length} {timeFilter === "recent" ? "recent" : "past"} offers
          </span>
        </div>
        {filteredOffers.length === 0 ? (
          <p className="text-sm text-slate-600">
            No offers match the selected filters.
          </p>
        ) : (
          <div className="text-xs">{filteredOffers.map(renderOfferRow)}</div>
        )}
      </div>
    </div>
  );
}
