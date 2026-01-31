// app/events/[id]/offers/page.tsx
import Link from "next/link";
import { createSupabaseServer } from "@/lib/supabaseServer";
import OfferActions from "@/components/events/OfferActions";
import OfferMessageButton from "@/components/messaging/OfferMessageButton";

type Event = {
  id: string;
  profile_id: string;
  owner_profile_id?: string | null;
  title?: string | null;
  name?: string | null;
};

type Bout = {
  id: string;
  event_id: string;
  card_type: "main" | "undercard";
  order_index: number;
  red_name?: string | null;
  blue_name?: string | null;
  weight?: string | null;
  bout_details?: string | null;
  red_fighter_id?: string | null;
  blue_fighter_id?: string | null;
};

type Offer = {
  id: string;
  bout_id: string;
  side: "red" | "blue";
  status?: string | null;
  created_at: string;
  from_profile_id: string;
  fighter_profile_id?: string | null;
};

type ProfileLite = {
  id: string;
  full_name?: string | null;
  username?: string | null;
  role?: string | null;
  social_links?: {
    gym_username?: string;
    [key: string]: any;
  } | null;
};

export default async function EventOffersPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createSupabaseServer();

  // 1) Load event
  const { data: event, error: eventError } = await supabase
    .from("events")
    .select("id, profile_id, owner_profile_id, title, name")
    .eq("id", params.id)
    .single<Event>();

  if (eventError || !event) {
    console.error("Event error", eventError);
    return <div className="max-w-4xl mx-auto px-4 py-8">Event not found.</div>;
  }

  // 2) Check organiser
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user ?? null;
  const ownerId = event.owner_profile_id || event.profile_id;

  if (!user || user.id !== ownerId) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8 text-sm text-slate-700">
        You don&apos;t have permission to view offers for this event.
      </div>
    );
  }

  // 3) Load bouts for this event
  const { data: boutsData, error: boutsError } = await supabase
    .from("event_bouts")
    .select(
      "id, event_id, card_type, order_index, red_name, blue_name, weight, bout_details, red_fighter_id, blue_fighter_id"
    )
    .eq("event_id", event.id)
    .order("card_type", { ascending: false })
    .order("order_index", { ascending: true });

  if (boutsError) {
    console.error("Offers page bouts error", boutsError);
    return (
      <div className="max-w-4xl mx-auto px-4 py-8 text-sm text-slate-700">
        Failed to load bouts for this event.
      </div>
    );
  }

  const bouts: Bout[] = (boutsData as Bout[]) || [];
  const boutIds = bouts.map((b) => b.id);
  const boutsById: Record<string, Bout> = {};
  bouts.forEach((b) => {
    boutsById[b.id] = b;
  });

  if (boutIds.length === 0) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold">
            Offers – {event.title || event.name || "Event"}
          </h1>
          <Link
            href={`/events/${event.id}`}
            className="text-xs text-purple-700 hover:underline"
          >
            ← Back to event
          </Link>
        </div>
        <p className="text-sm text-slate-700">
          There are no bouts on this event yet, so there are no offers to
          display.
        </p>
      </div>
    );
  }

  // 4) Load offers for those bouts
  const { data: offersData, error: offersError } = await supabase
    .from("event_bout_offers")
    .select(
      "id, bout_id, side, status, created_at, from_profile_id, fighter_profile_id"
    )
    .in("bout_id", boutIds);

  if (offersError) {
    console.error("Offers page offers error", offersError);
    return (
      <div className="max-w-4xl mx-auto px-4 py-8 text-sm text-slate-700">
        Failed to load offers for this event.
      </div>
    );
  }

  const offers: Offer[] = (offersData as Offer[]) || [];

  if (offers.length === 0) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold">
            Offers – {event.title || event.name || "Event"}
          </h1>
          <Link
            href={`/events/${event.id}`}
            className="text-xs text-purple-700 hover:underline"
          >
            ← Back to event
          </Link>
        </div>
        <p className="text-sm text-slate-700">
          No offers have been sent for this event yet.
        </p>
      </div>
    );
  }

  // 5) Load related profiles (coaches + fighters)
  const fighterIdsFromBouts = Array.from(
    new Set(
      bouts
        .flatMap((b) => [b.red_fighter_id, b.blue_fighter_id])
        .filter((id): id is string => !!id)
    )
  );

  const profileIds = Array.from(
    new Set([
      ...fighterIdsFromBouts,
      ...offers.flatMap((o) => {
        const ids: string[] = [o.from_profile_id];
        if (o.fighter_profile_id) ids.push(o.fighter_profile_id);
        return ids;
      }),
    ])
  );

  let profilesById: Record<string, ProfileLite> = {};
  if (profileIds.length > 0) {
    const { data: profilesData, error: profilesError } = await supabase
      .from("profiles")
      .select("id, full_name, username, role, social_links")
      .in("id", profileIds);

    if (profilesError) {
      console.error("Offers page profiles error", profilesError);
    } else if (profilesData) {
      (profilesData as ProfileLite[]).forEach((p) => {
        profilesById[p.id] = p;
      });
    }
  }

  // 6) Split by status
  const pendingOffers = offers.filter(
    (o) => !o.status || o.status === "pending"
  );
  const acceptedOffers = offers.filter((o) => o.status === "accepted");
  const declinedOffers = offers.filter((o) => o.status === "declined");

  const renderOfferRow = (offer: Offer) => {
    const bout = boutsById[offer.bout_id];
    if (!bout) return null;

    const coach = profilesById[offer.from_profile_id];
    const fighter = offer.fighter_profile_id
      ? profilesById[offer.fighter_profile_id]
      : undefined;

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

    const opponentFighterId =
      offer.side === "red" ? bout.blue_fighter_id : bout.red_fighter_id;
    const opponentProfile = opponentFighterId
      ? profilesById[opponentFighterId]
      : undefined;

    const opponentGymUsername =
      (opponentProfile as any)?.social_links?.gym_username || null;
    const offeredFighterGymUsername =
      (fighter as any)?.social_links?.gym_username || null;

    return (
      <div
        key={offer.id}
        className="py-2 flex items-center justify-between gap-3 border-b last:border-b-0 border-slate-200"
      >
        <div className="flex flex-col gap-0.5">
          <span className="text-xs font-semibold text-slate-900">
            {boutLabel}
          </span>
          <span className="text-xs text-slate-700">
            {bout.red_name || "Red"} vs {bout.blue_name || "Blue"}
            {bout.weight ? ` • ${bout.weight}` : ""}
            {bout.bout_details ? ` • ${bout.bout_details}` : ""}
          </span>
          <span className="text-[11px] text-slate-600">
            Fighter: {offer.fighter_profile_id ? (
              <Link
                href={`/profile/${fighter?.username || offer.fighter_profile_id}`}
                className="hover:text-purple-700 hover:underline"
              >
                {fighterName}
              </Link>
            ) : (
              fighterName
            )} • {sideLabel}
          </span>
          <span className="text-[11px] text-slate-500">
            From {coachName}
            {coach?.role ? ` (${coach.role})` : ""} • {created}
          </span>
        </div>

        <div className="flex flex-col items-end gap-2">
          <span className="text-[11px] uppercase tracking-wide text-slate-500">
            {offer.status || "pending"}
          </span>

          {(!offer.status || offer.status === "pending") && (
            <div className="flex items-center gap-2">
              <OfferMessageButton
                targetProfileId={offer.from_profile_id}
                targetUsername={coach?.username}
                boutId={offer.bout_id}
                eventId={event.id}
                fighterProfileId={offer.fighter_profile_id || null}
                side={offer.side}
              />
              <OfferActions
                offerId={offer.id}
                boutId={offer.bout_id}
                side={offer.side}
                fighterProfileId={offer.fighter_profile_id || null}
                opponentFighterProfileId={opponentFighterId || null}
                opponentGymUsername={opponentGymUsername}
                offeredFighterGymUsername={offeredFighterGymUsername}
              />
            </div>
          )}
        </div>
      </div>
    );
  };


  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">
          Offers – {event.title || event.name || "Event"}
        </h1>
        <div className="flex items-center gap-3">
          <Link
            href={`/events/${event.id}/offers/all`}
            className="text-xs text-purple-700 hover:underline"
          >
            View all offers
          </Link>
          <Link
            href={`/events/${event.id}`}
            className="text-xs text-purple-700 hover:underline"
          >
            ← Back to event
          </Link>
        </div>
      </div>

      <p className="text-xs text-slate-600">
        Review all bout offers for this event. Pending offers can be accepted or
        declined here. Accepted offers will usually lock a fighter into that
        corner.
      </p>

      {/* Pending */}
      <section className="card space-y-2" id="pending">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">Pending offers</h2>
          <span className="text-[11px] text-slate-500">
            {pendingOffers.length} pending
          </span>
        </div>
        {pendingOffers.length === 0 ? (
          <p className="text-sm text-slate-600">
            No pending offers for this event.
          </p>
        ) : (
          <div className="text-xs">{pendingOffers.map(renderOfferRow)}</div>
        )}
      </section>

      {/* Accepted */}
      <section className="card space-y-2" id="accepted">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">Accepted offers</h2>
          <span className="text-[11px] text-slate-500">
            {acceptedOffers.length} accepted
          </span>
        </div>
        {acceptedOffers.length === 0 ? (
          <p className="text-sm text-slate-600">
            No accepted offers yet. Once you accept an offer, it will appear
            here.
          </p>
        ) : (
          <div className="text-xs">{acceptedOffers.map(renderOfferRow)}</div>
        )}
      </section>

      {/* Declined */}
      <section className="card space-y-2" id="declined">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">Declined offers</h2>
          <span className="text-[11px] text-slate-500">
            {declinedOffers.length} declined
          </span>
        </div>
        {declinedOffers.length === 0 ? (
          <p className="text-sm text-slate-600">
            No declined offers for this event.
          </p>
        ) : (
          <div className="text-xs">{declinedOffers.map(renderOfferRow)}</div>
        )}
      </section>
    </div>
  );
}
