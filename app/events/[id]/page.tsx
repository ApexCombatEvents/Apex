// app/events/[id]/page.tsx
import Image from "next/image";
import Link from "next/link";
import { createSupabaseServer } from "@/lib/supabaseServer";
import { countryToFlagUrl } from "@/lib/countries";
import { getGoogleMapsUrl } from "@/lib/location";
import BoutOfferButton from "@/components/events/BoutOfferButton";
import OfferActions from "@/components/events/OfferActions";
import EventDiscussion from "@/components/events/EventDiscussion";
import EventReactions from "@/components/events/EventReactions";
import FighterSuggestBoutButton from "@/components/events/FighterSuggestBoutButton";
import CoachGymBoutOfferButton from "@/components/events/CoachGymBoutOfferButton";
import OfferMessageButton from "@/components/messaging/OfferMessageButton";
import EventFollowButton from "@/components/events/EventFollowButton";
import LiveEventControls from "@/components/events/LiveEventControls";
import EventSponsorshipSlideshow from "@/components/events/EventSponsorshipSlideshow";
import StartEventButton from "@/components/events/StartEventButton";
import OfferPaymentMessage from "@/components/events/OfferPaymentMessage";
import ShareEventButton from "@/components/events/ShareEventButton";


type Event = {
  id: string;
  profile_id: string;
  owner_profile_id?: string | null;
  name?: string | null;
  title?: string | null;
  description?: string | null;
  event_date?: string | null;
  event_time?: string | null;
  location?: string | null;
  location_city?: string | null;
  location_country?: string | null;
  martial_art?: string | null;
  banner_url?: string | null;
  is_live?: boolean | null;
  is_started?: boolean | null;
  will_stream?: boolean | null;
};

type GymProfileLite = {
  id: string;
  username?: string | null;
  full_name?: string | null;
  avatar_url?: string | null;
  country?: string | null;
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
  notes?: string | null;
  red_looking_for_opponent?: boolean | null;
  blue_looking_for_opponent?: boolean | null;
  red_fighter_id?: string | null;
  blue_fighter_id?: string | null;
  winner_side?: "red" | "blue" | "draw" | null;
  result_method?: string | null;
  result_round?: string | null;
  result_time?: string | null;
  is_live?: boolean | null;
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
  avatar_url?: string | null;
  country?: string | null;
  social_links?: {
    gym_username?: string;
    [key: string]: any;
  } | null;
};

export default async function EventPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams?: { from?: string; offer_success?: string; offer_cancelled?: string };
}) {
  const supabase = createSupabaseServer();
  const fromStream = searchParams?.from === 'stream';
  const offerSuccess = searchParams?.offer_success === 'true';
  const offerCancelled = searchParams?.offer_cancelled === 'true';

  // 1) Load event
  const { data: event, error: eventError } = await supabase
    .from("events")
    .select("*")
    .eq("id", params.id)
    .single<Event>();

  if (eventError || !event) {
    console.error("Event error", eventError);
    return <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-10">Event not found.</div>;
  }

  // 2) Load organiser profile
  const ownerId = event.owner_profile_id || event.profile_id;
  const { data: organiser } = await supabase
    .from("profiles")
    .select("id, username, full_name, avatar_url, country")
    .eq("id", ownerId)
    .single<GymProfileLite>();

  // 3) Load bouts
  const { data: boutsData, error: boutsError } = await supabase
    .from("event_bouts")
    .select("*")
    .eq("event_id", event.id)
    .order("card_type", { ascending: false })
    .order("order_index", { ascending: true });

  if (boutsError) {
    console.error("Bouts error", boutsError);
  }

  const bouts: Bout[] = (boutsData as Bout[]) || [];

  // Load event sponsorships
  const { data: sponsorshipsData } = await supabase
    .from("event_sponsorships")
    .select("*")
    .eq("event_id", event.id)
    .order("display_order", { ascending: true });
  
  const sponsorships = (sponsorshipsData || []) as Array<{
    id: string;
    image_url: string;
    link_url?: string | null;
    display_order?: number | null;
  }>;
  
  // Sort bouts by order_index only (keep live bouts in their original position)
  const sortBouts = (boutList: Bout[]) => {
    return [...boutList].sort((a, b) => {
      // Sort by order_index only - live bouts stay in their original position
      return a.order_index - b.order_index;
    });
  };
  
  // Sort bouts: main card first (displayed first, but fought last), undercard last (displayed last, but fought first)
  const mainCard = sortBouts(bouts.filter((b) => b.card_type === "main"));
  const undercard = sortBouts(bouts.filter((b) => b.card_type === "undercard"));

  const title = event.title || event.name || "Untitled event";
  const dateLabel = event.event_date
    ? new Date(event.event_date).toLocaleDateString()
    : "Date TBC";

  const locationLabel =
    event.location ||
    [event.location_city, event.location_country].filter(Boolean).join(", ") ||
    "Location TBC";

  // Bout label map (for offers section)
  // Numbering reversed: bottom fight = 1, top fight = highest number
  const boutLabelMap: Record<string, string> = {};
  mainCard.forEach((bout, index) => {
    const fightNumber = mainCard.length - index;
    boutLabelMap[bout.id] = `Main card • Fight ${fightNumber}`;
  });
  undercard.forEach((bout, index) => {
    const fightNumber = undercard.length - index;
    boutLabelMap[bout.id] = `Undercard • Fight ${fightNumber}`;
  });

  // 4) Get current user
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user ?? null;
  const canEdit = !!user && user.id === ownerId;

  // 5) Load fighter profiles for bouts
  let fightersById: Record<string, ProfileLite> = {};
  if (bouts.length > 0) {
    const fighterIds = Array.from(
      new Set(
        bouts
          .flatMap((b) => [b.red_fighter_id, b.blue_fighter_id])
          .filter((id): id is string => !!id)
      )
    );

    if (fighterIds.length > 0) {
      const { data: fightersData, error: fightersError } = await supabase
        .from("profiles")
        .select(
          "id, full_name, username, role, avatar_url, country, social_links"
        )
        .in("id", fighterIds);

      if (fightersError) {
        console.error("fighters for bouts error", fightersError);
      } else if (fightersData) {
        (fightersData as ProfileLite[]).forEach((f) => {
          fightersById[f.id] = f;
        });
      }
    }
  }

  // 6) If organiser, load offers + related profiles
  let offers: Offer[] = [];
  let pendingOffers: Offer[] = [];
  let offersByBout: Record<string, Offer[]> = {};
  let profilesById: Record<string, ProfileLite> = { ...fightersById };

  if (canEdit && bouts.length > 0) {
    const boutIds = bouts.map((b) => b.id);

    const { data: offersData, error: offersError } = await supabase
      .from("event_bout_offers")
      .select(
        "id, bout_id, side, status, created_at, from_profile_id, fighter_profile_id"
      )
      .in("bout_id", boutIds);

    if (offersError) {
      console.error("Offers error", offersError);
    } else if (offersData) {
      offers = offersData as Offer[];

      // ✅ only keep pending offers for this page
      pendingOffers = offers.filter(
        (o) => !o.status || o.status === "pending"
      );

      pendingOffers.forEach((offer) => {
        if (!offersByBout[offer.bout_id]) {
          offersByBout[offer.bout_id] = [];
        }
        offersByBout[offer.bout_id].push(offer);
      });

      const profileIds = Array.from(
        new Set(
          offers.flatMap((o) => {
            const ids: string[] = [o.from_profile_id];
            if (o.fighter_profile_id) ids.push(o.fighter_profile_id);
            return ids;
          })
        )
      );

      const missingProfileIds = profileIds.filter((id) => !profilesById[id]);

      if (missingProfileIds.length > 0) {
        const { data: profilesData, error: profilesError } = await supabase
          .from("profiles")
          .select(
            "id, full_name, username, role, avatar_url, country, social_links"
          )
          .in("id", missingProfileIds);

        if (profilesError) {
          console.error("Offer profiles error", profilesError);
        } else if (profilesData) {
          (profilesData as ProfileLite[]).forEach((p) => {
            profilesById[p.id] = p;
          });
        }
      }
    }
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Back to Stream Link - Hidden for initial rollout */}
      {false && fromStream && (
        <div className="mb-4">
          <Link
            href={`/events/${event?.id}/stream`}
            className="inline-flex items-center gap-2 text-sm text-purple-700 hover:text-purple-800 hover:underline"
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
            Back to Stream
          </Link>
        </div>
      )}
      
      {/* Payment success/error messages */}
      <OfferPaymentMessage />
      
      {/* HEADER */}
      <section className="grid md:grid-cols-[2fr,1.5fr] gap-6 sm:gap-8 items-stretch">
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div className="flex-1">
              <div className="mb-3">
                <Link
                  href="/events"
                  className="inline-flex items-center gap-2 text-sm text-purple-700 hover:text-purple-800 hover:underline"
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
                  <span>Back to events</span>
                </Link>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold">{title}</h1>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              {!canEdit && (
                <>
                  <EventFollowButton eventId={event.id} eventName={title} />
                  <ShareEventButton 
                    eventId={event.id} 
                    eventTitle={title}
                    eventBannerUrl={event.banner_url || null}
                  />
                </>
              )}
              {canEdit && (
                <>
                  <Link
                    href={`/events/${event.id}/edit`}
                    className="inline-flex items-center rounded-full border border-purple-200 bg-purple-50 px-4 py-2 text-sm font-medium text-purple-700 hover:bg-purple-100"
                  >
                    Edit event
                  </Link>
                  {event.will_stream && (
                    <Link
                      href={`/events/${event.id}/revenue`}
                      className="inline-flex items-center rounded-full border border-green-200 bg-green-50 px-4 py-2 text-sm font-medium text-green-700 hover:bg-green-100"
                    >
                      Revenue & Analytics
                    </Link>
                  )}
                  <ShareEventButton 
                    eventId={event.id} 
                    eventTitle={title}
                    eventBannerUrl={event.banner_url || null}
                  />
                </>
              )}
            </div>
          </div>
          {canEdit && (
            <div className="mt-5">
              {event.is_live ? (
                <LiveEventControls eventId={event.id} />
              ) : (
                <StartEventButton eventId={event.id} boutCount={bouts.length} />
              )}
            </div>
          )}

          <div className="text-base text-slate-700 space-y-2">
            <div>
              <span className="font-medium">Date:</span>{" "}
              <span>{dateLabel}</span>
            </div>
            <div>
              <span className="font-medium">Time:</span>{" "}
              <span>{event.event_time || "TBC"}</span>
            </div>
            <div>
              <span className="font-medium">Location:</span>{" "}
              {(() => {
                const mapsUrl = getGoogleMapsUrl(locationLabel !== "Location TBC" ? locationLabel : null);
                return mapsUrl ? (
                  <Link
                    href={mapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline hover:text-purple-600 transition-colors inline-flex items-center gap-1"
                  >
                    {locationLabel}
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-3 w-3"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                      />
                    </svg>
                  </Link>
                ) : (
                  <span>{locationLabel}</span>
                );
              })()}
            </div>
            {event.martial_art && (
              <div>
                <span className="font-medium">Discipline:</span>{" "}
                <span>{event.martial_art}</span>
              </div>
            )}
          </div>

          {event.description && (
            <p className="text-sm text-slate-700 whitespace-pre-wrap">
              {event.description}
            </p>
          )}

          {/* Organiser card */}
          {organiser && (
            <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 px-5 py-4 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-full bg-slate-200 overflow-hidden">
                  {organiser.avatar_url && (
                    <Image
                      src={organiser.avatar_url}
                      alt={organiser.full_name || "Organiser"}
                      width={40}
                      height={40}
                      className="h-full w-full object-cover"
                    />
                  )}
                </div>
                <div className="flex flex-col">
                  <span className="text-base font-medium text-slate-900">
                    Hosted by{" "}
                    <Link
                      href={`/profile/${organiser.username}`}
                      className="text-purple-700 hover:underline"
                    >
                      {organiser.full_name || organiser.username || "Profile"}
                    </Link>
                  </span>
                  {organiser.country && (
                    <span className="text-sm text-slate-500">
                      {organiser.country}
                    </span>
                  )}
                </div>
              </div>
              {organiser.username && (
                <Link
                  href={`/profile/${organiser.username}`}
                  className="text-sm text-purple-700 hover:underline"
                >
                  View profile
                </Link>
              )}
            </div>
          )}
        </div>

        {/* Right column: Banner and Sponsorships */}
        <div className="flex flex-col gap-6 h-full">
          {/* Banner Image */}
          <div className="rounded-2xl border border-slate-200 bg-slate-100 overflow-hidden h-56 flex-shrink-0">
            {event.banner_url ? (
              <div className="relative w-full h-full">
                <Image
                  src={event.banner_url}
                  alt={title}
                  fill
                  sizes="(max-width: 768px) 100vw, 400px"
                  className="object-cover"
                />
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-500 px-4">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-8 w-8 mb-2 opacity-50"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
                <div className="text-sm font-medium mb-1">No banner image</div>
                <div className="text-xs opacity-75 text-center max-w-xs">
                  Recommended: 1600×560px (16:9 ratio)
                </div>
              </div>
            )}
          </div>

          {/* Event Sponsorships Slideshow */}
          <div className="flex-1 min-h-[300px] md:min-h-0">
            {sponsorships.length > 0 ? (
              <div className="h-full min-h-[300px] md:min-h-0">
                <EventSponsorshipSlideshow sponsorships={sponsorships} autoRotateInterval={5000} />
              </div>
            ) : (
              <div className="h-full min-h-[300px] md:min-h-0 rounded-xl border-2 border-dashed border-purple-300 bg-purple-50 flex flex-col items-center justify-center text-center p-4 text-purple-700">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 mb-2 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V3m0 9v3m0 3.01V21M21 12h-3.01M3 12H6m15.364-6.364l-2.122-2.122M5.636 18.364l-2.122 2.122M18.364 18.364l-2.122 2.122M5.636 5.636l-2.122-2.122" />
                </svg>
                <p className="font-semibold text-sm">Add sponsorships here</p>
                <p className="text-xs mt-1">These will appear in a rotating display.</p>
                <p className="text-[10px] mt-2 text-purple-600">Recommended: 600×400px (3:2 ratio)</p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* BOUTS */}
      <section className="card p-3 sm:p-6 overflow-hidden">
        <div className="flex items-center justify-between text-xs sm:text-sm text-slate-600 mb-3 sm:mb-4">
          <div className="font-semibold">Red corner</div>
          <div className="text-[10px] sm:text-[11px] uppercase tracking-wide text-slate-400">
            VS
          </div>
          <div className="font-semibold text-right">Blue corner</div>
        </div>

        {mainCard.length > 0 && (
          <div className="mt-2 sm:mt-4">
            <h2 className="text-sm sm:text-base lg:text-lg font-bold mb-3 sm:mb-4">Main card</h2>
            <div className="space-y-3 sm:space-y-4">
              {mainCard.map((bout, index) => {
                const fightNumber = mainCard.length - index;
                return (
                  <BoutRow
                    key={bout.id}
                    bout={bout}
                    label={`MAIN CARD • FIGHT ${fightNumber}`}
                    fightersById={fightersById}
                  />
                );
              })}
            </div>
          </div>
        )}

        {undercard.length > 0 && (
          <div className="mt-6 sm:mt-8">
            <h2 className="text-sm sm:text-base lg:text-lg font-bold mb-3 sm:mb-4">Undercard</h2>
            <div className="space-y-3 sm:space-y-4">
              {undercard.map((bout, index) => {
                const fightNumber = undercard.length - index;
                return (
                  <BoutRow
                    key={bout.id}
                    bout={bout}
                    label={`UNDERCARD • FIGHT ${fightNumber}`}
                    fightersById={fightersById}
                  />
                );
              })}
            </div>
          </div>
        )}

        {bouts.length === 0 && (
          <p className="text-base text-slate-600 mt-4">
            No bouts added yet. Edit this event to add the first fight.
          </p>
        )}
      </section>

      {/* EVENT DISCUSSION */}
      <section className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base sm:text-lg font-bold">Event discussion</h2>

          {/* Like + comment counts */}
          <EventReactions eventId={event.id} />
        </div>

        {/* Comment thread */}
        <EventDiscussion eventId={event.id} />
      </section>



      {/* OFFERS – organiser only (pending only) */}
      {canEdit && (
        <section className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex flex-col gap-2">
              <h2 className="text-base sm:text-lg font-bold">Offers (pending)</h2>
              <span className="text-sm text-slate-500">
                Visible only to the event organiser
              </span>
            </div>

            <Link
              href={`/events/${event.id}/offers`}
              className="text-sm text-purple-700 hover:underline"
            >
              View all offers for this event
            </Link>
          </div>

          {pendingOffers.length === 0 ? (
            <p className="text-base text-slate-600">
              No pending offers. When coaches and gyms send offers for bouts,
              they&apos;ll appear here. You can also review accepted and
              declined offers on the offers page.
            </p>
          ) : (
            <div className="space-y-5 text-sm">
              {bouts.map((bout) => {
                const boutOffers = offersByBout[bout.id] || [];
                if (boutOffers.length === 0) return null;

                const label = boutLabelMap[bout.id] ?? "Fight";

                return (
                  <div
                    key={bout.id}
                    className="rounded-xl border border-slate-200 bg-slate-50 px-5 py-4"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span className="font-semibold text-base text-slate-900">
                        {label}
                      </span>
                      {bout.weight && (
                        <span className="text-sm text-slate-500">
                          {bout.weight}
                        </span>
                      )}
                    </div>

                    <div className="divide-y divide-slate-200">
                      {boutOffers.map((offer) => {
                        const coach = profilesById[offer.from_profile_id];
                        const fighter = offer.fighter_profile_id
                          ? profilesById[offer.fighter_profile_id]
                          : null;
                        const opponentFighterId =
                          offer.side === "red"
                            ? bout.blue_fighter_id
                            : bout.red_fighter_id;

                        const opponentProfile = opponentFighterId
                          ? profilesById[opponentFighterId]
                          : null;

                        const opponentGymUsername =
                          (opponentProfile as any)?.social_links?.gym_username ||
                          null;

                        const offeredFighterGymUsername =
                          (fighter as any)?.social_links?.gym_username || null;

                        const coachName =
                          coach?.full_name || coach?.username || "Profile";
                        const fighterName =
                          fighter?.full_name ||
                          fighter?.username ||
                          "Fighter";

                        const sideLabel =
                          offer.side === "red" ? "Red corner" : "Blue corner";

                        const created = offer.created_at
                          ? new Date(offer.created_at).toLocaleString()
                          : "";

                        return (
                          <div
                            key={offer.id}
                            className="py-1.5 flex items-center justify-between gap-3"
                          >
                            <div className="flex flex-col">
                              <span className="font-medium text-slate-900">
                                {offer.fighter_profile_id ? (
                                  <Link
                                    href={`/profile/${fighter?.username || offer.fighter_profile_id}`}
                                    className="hover:text-purple-700 hover:underline"
                                  >
                                    {fighterName}
                                  </Link>
                                ) : (
                                  fighterName
                                )}
                                <span className="text-slate-500 font-normal">
                                  {" "}
                                  • {sideLabel}
                                </span>
                              </span>
                              <span className="text-[11px] text-slate-500">
                                From {coachName}
                                {coach?.role ? ` (${coach.role})` : ""} •{" "}
                                {created}
                              </span>
                            </div>

                            <div className="flex items-center gap-3">
                              <span className="text-[11px] uppercase tracking-wide text-slate-500">
                                {offer.status || "pending"}
                              </span>

                              {(!offer.status ||
                                offer.status === "pending") && (
                                <>
                                  <OfferMessageButton
                                    targetProfileId={offer.from_profile_id}
                                    targetUsername={coach?.username}
                                    boutId={offer.bout_id}
                                    eventId={event.id}
                                    fighterProfileId={
                                      offer.fighter_profile_id || null
                                    }
                                    side={offer.side}
                                  />
                                  <OfferActions
                                    offerId={offer.id}
                                    boutId={offer.bout_id}
                                    side={offer.side}
                                    fighterProfileId={
                                      offer.fighter_profile_id || null
                                    }
                                    opponentFighterProfileId={
                                      opponentFighterId || null
                                    }
                                    opponentGymUsername={opponentGymUsername}
                                    offeredFighterGymUsername={
                                      offeredFighterGymUsername
                                    }
                                  />
                                </>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}
    </div>
  );
}

function BoutRow({
  bout,
  label,
  fightersById,
}: {
  bout: Bout;
  label: string;
  fightersById: Record<string, ProfileLite>;
}) {
  const redFighter = bout.red_fighter_id
    ? fightersById[bout.red_fighter_id]
    : undefined;
  const blueFighter = bout.blue_fighter_id
    ? fightersById[bout.blue_fighter_id]
    : undefined;

  const redNameBase = redFighter
    ? redFighter.full_name || redFighter.username || "Fighter"
    : bout.red_name || "TBC";

  const blueNameBase = blueFighter
    ? blueFighter.full_name || blueFighter.username || "Fighter"
    : bout.blue_name || "TBC";

  const redGymHandle = redFighter?.social_links?.gym_username || "";
  const blueGymHandle = blueFighter?.social_links?.gym_username || "";

  const redFlagUrl = countryToFlagUrl(redFighter?.country);
  const blueFlagUrl = countryToFlagUrl(blueFighter?.country);

  const redCountry = redFighter?.country || "";
  const blueCountry = blueFighter?.country || "";

  // winner/result label
  let resultText: string | null = null;
  if (
    bout.winner_side ||
    bout.result_method ||
    bout.result_round ||
    bout.result_time
  ) {
    const winnerText =
      bout.winner_side === "red"
        ? `${redNameBase} won`
        : bout.winner_side === "blue"
        ? `${blueNameBase} won`
        : bout.winner_side === "draw"
        ? "Draw / No contest"
        : "";

    const parts: string[] = [];
    if (winnerText) parts.push(winnerText);
    if (bout.result_method) parts.push(`by ${bout.result_method}`);
    const roundBits: string[] = [];
    if (bout.result_round) roundBits.push(`R${bout.result_round}`);
    if (bout.result_time) roundBits.push(bout.result_time);
    if (roundBits.length) parts.push(roundBits.join(" @ "));
    resultText = parts.join(" • ") || null;
  }

  const redNameNode = redFighter?.username ? (
    <Link href={`/profile/${redFighter.username}`} className="hover:underline">
      {redNameBase}
    </Link>
  ) : (
    <span>{redNameBase}</span>
  );

  const blueNameNode = blueFighter?.username ? (
    <Link
      href={`/profile/${blueFighter.username}`}
      className="hover:underline"
    >
      {blueNameBase}
    </Link>
  ) : (
    <span>{blueNameBase}</span>
  );

  const renderRedSide = () => {
    if (!redFighter && bout.red_looking_for_opponent) {
      return (
        <div className="flex flex-col items-center gap-0.5">
          {/* For coaches / gyms to send an offer directly */}
          <BoutOfferButton boutId={bout.id} side="red" />
          
          {/* For coaches / gyms to send an offer via message */}
          <div className="-mt-1">
            <CoachGymBoutOfferButton boutId={bout.id} side="red" />
          </div>

          {/* For fighters to send this bout to their own coach/gym */}
          <div className="mt-0.5">
            <FighterSuggestBoutButton boutId={bout.id} side="red" />
          </div>
        </div>
      );
    }

    if (redFighter || bout.red_name) {
      return (
        <div className="flex items-center gap-2 sm:gap-3 max-w-full overflow-hidden">
          <div className="flex flex-col items-end min-w-0 flex-shrink">
            <span className="font-semibold text-xs sm:text-[13px] leading-tight truncate max-w-[80px] sm:max-w-[120px] lg:max-w-none">
              {redNameNode}
            </span>
            {redGymHandle && (
              <Link
                href={`/profile/${redGymHandle}`}
                className="text-[10px] sm:text-[11px] text-purple-700 hover:underline truncate max-w-[80px] sm:max-w-[100px] lg:max-w-none"
              >
                Gym: @{redGymHandle}
              </Link>
            )}
          </div>

          <div className="flex flex-col items-center gap-0.5 flex-shrink-0">
            <div className="flex items-center gap-1.5">
              <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-xl bg-slate-200 overflow-hidden flex-shrink-0">
                {redFighter?.avatar_url && (
                  <Image
                    src={redFighter.avatar_url}
                    alt={redNameBase}
                    width={160}
                    height={160}
                    className="h-full w-full object-cover"
                    quality={100}
                    priority
                  />
                )}
              </div>
              {redFlagUrl && (
                <Image
                  src={redFlagUrl.replace("/w20/", "/w40/")}
                  alt={redCountry || "Country flag"}
                  width={32}
                  height={24}
                  className="w-5 h-4 sm:w-6 sm:h-5 object-cover rounded shadow-sm flex-shrink-0"
                  style={{ imageRendering: "crisp-edges" }}
                />
              )}
            </div>
            {redCountry && (
              <span className="text-[9px] sm:text-[10px] text-slate-500 truncate max-w-[60px]">{redCountry}</span>
            )}
          </div>
        </div>
      );
    }

    return (
      <div className="flex justify-center">
        <span className="text-xs text-slate-500">TBC</span>
      </div>
    );
  };

  const renderBlueSide = () => {
    if (!blueFighter && bout.blue_looking_for_opponent) {
      return (
        <div className="flex flex-col items-center gap-0.5">
          <BoutOfferButton boutId={bout.id} side="blue" />
          
          {/* For coaches / gyms to send an offer via message */}
          <div className="-mt-1">
            <CoachGymBoutOfferButton boutId={bout.id} side="blue" />
          </div>
          
          <div className="mt-0.5">
            <FighterSuggestBoutButton boutId={bout.id} side="blue" />
          </div>
        </div>
      );
    }

    if (blueFighter || bout.blue_name) {
      return (
        <div className="flex items-center gap-2 sm:gap-3 max-w-full overflow-hidden">
          <div className="flex flex-col items-center gap-0.5 flex-shrink-0">
            <div className="flex items-center gap-1.5">
              {blueFlagUrl && (
                <Image
                  src={blueFlagUrl.replace("/w20/", "/w40/")}
                  alt={blueCountry || "Country flag"}
                  width={32}
                  height={24}
                  className="w-5 h-4 sm:w-6 sm:h-5 object-cover rounded shadow-sm flex-shrink-0"
                  style={{ imageRendering: "crisp-edges" }}
                />
              )}
              <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-xl bg-slate-200 overflow-hidden flex-shrink-0">
                {blueFighter?.avatar_url && (
                  <Image
                    src={blueFighter.avatar_url}
                    alt={blueNameBase}
                    width={160}
                    height={160}
                    className="h-full w-full object-cover"
                    quality={100}
                    priority
                  />
                )}
              </div>
            </div>
            {blueCountry && (
              <span className="text-[9px] sm:text-[10px] text-slate-500 truncate max-w-[60px]">{blueCountry}</span>
            )}
          </div>

          <div className="flex flex-col items-start min-w-0 flex-shrink">
            <span className="font-semibold text-xs sm:text-[13px] leading-tight truncate max-w-[80px] sm:max-w-[120px] lg:max-w-none">
              {blueNameNode}
            </span>
            {blueGymHandle && (
              <Link
                href={`/profile/${blueGymHandle}`}
                className="text-[10px] sm:text-[11px] text-purple-700 hover:underline truncate max-w-[80px] sm:max-w-[100px] lg:max-w-none"
              >
                Gym: @{blueGymHandle}
              </Link>
            )}
          </div>
        </div>
      );
    }

    return (
      <div className="flex justify-center">
        <span className="text-xs text-slate-500">TBC</span>
      </div>
    );
  };

  return (
    <div
      className={`rounded-xl border px-2 sm:px-3 py-2 min-h-[90px] sm:min-h-[120px] flex flex-col relative overflow-hidden ${
        bout.is_live
          ? "border-red-500 bg-red-50/30 shadow-lg"
          : "border-slate-200 bg-slate-50"
      }`}
    >
      {bout.is_live && (
        <div className="absolute top-2 right-2 z-10">
          <div className="bg-red-600 text-white px-2 sm:px-3 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-bold flex items-center gap-1 sm:gap-1.5 shadow-lg animate-pulse">
            <span className="relative flex h-1.5 w-1.5 sm:h-2 sm:w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 sm:h-2 sm:w-2 bg-white"></span>
            </span>
            LIVE
          </div>
        </div>
      )}
      <div className="flex items-center justify-between text-[10px] sm:text-[11px] text-slate-500 mb-1">
        <span>{label}</span>
      </div>

      <div className="grid grid-cols-[minmax(0,1fr),auto,minmax(0,1fr)] gap-2 sm:gap-4 items-center flex-1 overflow-hidden">
        <div className="flex justify-center overflow-hidden">{renderRedSide()}</div>

        <div className="flex flex-col items-center justify-center text-[10px] sm:text-xs text-slate-600 px-1 sm:px-2 min-w-[60px] sm:min-w-[80px] max-w-[100px] sm:max-w-[140px]">
          {bout.weight && (
            <span className="font-medium text-center">{bout.weight}</span>
          )}
          <span className="mt-0.5 text-center line-clamp-2">
            {bout.bout_details || "Bout details TBC"}
          </span>
          {bout.notes && (
            <span className="mt-1 text-[10px] sm:text-[11px] text-slate-500 text-center line-clamp-2">
              {bout.notes}
            </span>
          )}
          {resultText && (
            <span className="mt-1 text-[10px] sm:text-[11px] text-purple-700 text-center line-clamp-2">
              {resultText}
            </span>
          )}
        </div>

        <div className="flex justify-center overflow-hidden">{renderBlueSide()}</div>
      </div>
    </div>
  );
}

