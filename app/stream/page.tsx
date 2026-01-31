"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { createSupabaseBrowser } from "@/lib/supabase-browser";
import SponsorshipBanner from "@/components/sponsors/SponsorshipBanner";
import { getSponsorshipsForPlacement, type Sponsorship } from "@/lib/sponsorships";
import ALogo from "@/components/logos/ALogo";

type Event = {
  id: string;
  title?: string | null;
  name?: string | null;
  event_date?: string | null;
  location?: string | null;
  location_city?: string | null;
  location_country?: string | null;
  martial_art?: string | null;
  banner_url?: string | null;
  is_live?: boolean | null;
  will_stream?: boolean | null;
  stream_price?: number | null;
  profile_id?: string | null;
  owner_profile_id?: string | null;
  has_live_bout?: boolean; // Custom field to track if any bout is live
};

type ProfileLite = {
  id: string;
  username?: string | null;
  full_name?: string | null;
  avatar_url?: string | null;
};

const ART_FILTERS = [
  { key: "all", label: "All disciplines" },
  { key: "Muay Thai", label: "Muay Thai" },
  { key: "Boxing", label: "Boxing" },
  { key: "MMA", label: "MMA" },
  { key: "BJJ", label: "BJJ" },
  { key: "Kickboxing", label: "Kickboxing" },
  { key: "K1", label: "K1" },
];

export default function StreamPage() {
  const supabase = createSupabaseBrowser();
  const [liveEvents, setLiveEvents] = useState<Event[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [organizers, setOrganizers] = useState<Record<string, ProfileLite>>({});
  const [sponsorships, setSponsorships] = useState<Sponsorship[]>([]);
  const [userPurchasedEvents, setUserPurchasedEvents] = useState<Set<string>>(new Set());
  const [userOwnedEvents, setUserOwnedEvents] = useState<Set<string>>(new Set());
  const [disciplineFilter, setDisciplineFilter] = useState<string>("all");

  // Helper function to insert sponsorships between events (for grid layout)
  const insertSponsorshipsBetweenEvents = (eventList: Event[], sponsorships: Sponsorship[], interval: number = 5) => {
    if (sponsorships.length === 0) return eventList;
    
    const result: (Event | { __isSponsorship: true; sponsorship: Sponsorship })[] = [];
    let sponsorshipIndex = 0;
    
    eventList.forEach((event, index) => {
      result.push(event);
      // Insert sponsorship after every N events (but not after the last one)
      if ((index + 1) % interval === 0 && index < eventList.length - 1) {
        const sponsorship = sponsorships[sponsorshipIndex % sponsorships.length];
        result.push({ __isSponsorship: true, sponsorship });
        sponsorshipIndex++;
      }
    });
    
    return result;
  };

  useEffect(() => {
    (async () => {
      setLoading(true);

      // Check which events the user has already purchased or owns
      const { data: userData } = await supabase.auth.getUser();
      if (userData.user) {
        const { data: payments } = await supabase
          .from("stream_payments")
          .select("event_id")
          .eq("user_id", userData.user.id);
        
        const purchasedEventIds = payments ? payments.map(p => p.event_id) : [];
        
        // Also get events owned by the user (creators get free access)
        const { data: ownedEvents } = await supabase
          .from("events")
          .select("id")
          .or(`owner_profile_id.eq.${userData.user.id},profile_id.eq.${userData.user.id}`);
        
        const ownedEventIds = ownedEvents ? ownedEvents.map(e => e.id) : [];
        
        // Store owned events separately to show "Free" instead of "Purchased"
        setUserOwnedEvents(new Set(ownedEventIds));
        
        // Combine purchased and owned events for access check
        const accessibleEventIds = [...new Set([...purchasedEventIds, ...ownedEventIds])];
        setUserPurchasedEvents(new Set(accessibleEventIds));
      }

      // Load all events that will stream
      const today = new Date().toISOString().split("T")[0];
      const { data: allStreamEvents } = await supabase
        .from("events")
        .select("*")
        .eq("will_stream", true)
        .order("event_date", { ascending: true });

      if (!allStreamEvents || allStreamEvents.length === 0) {
        setLiveEvents([]);
        setUpcomingEvents([]);
        setLoading(false);
        return;
      }

      // Check which events have live bouts
      const eventIds = allStreamEvents.map(e => e.id);
      const { data: liveBoutsData } = await supabase
        .from("event_bouts")
        .select("event_id")
        .in("event_id", eventIds)
        .eq("is_live", true);

      const eventsWithLiveBouts = new Set(
        (liveBoutsData || []).map((b: any) => b.event_id)
      );

      // Add has_live_bout flag to each event
      const eventsWithLiveStatus = allStreamEvents.map(event => ({
        ...event,
        has_live_bout: eventsWithLiveBouts.has(event.id)
      })) as Event[];

      // Separate into live (has live bout, regardless of date) and upcoming (no live bout, date >= today)
      const live = eventsWithLiveStatus.filter(e => e.has_live_bout === true);
      let upcoming = eventsWithLiveStatus.filter(e => 
        e.has_live_bout !== true && 
        (!e.event_date || e.event_date >= today)
      );

      // Sort upcoming events by date (closest first)
      upcoming = upcoming.sort((a, b) => {
        if (!a.event_date && !b.event_date) return 0;
        if (!a.event_date) return 1;
        if (!b.event_date) return -1;
        return new Date(a.event_date).getTime() - new Date(b.event_date).getTime();
      });

      setLiveEvents(live);
      setUpcomingEvents(upcoming);

      // Load organizer profiles
      const organizerIds = Array.from(
        new Set(
          eventsWithLiveStatus
            .map((e) => e.owner_profile_id || e.profile_id)
            .filter((id): id is string => !!id)
        )
      );

      if (organizerIds.length > 0) {
        const { data: profilesData } = await supabase
          .from("profiles")
          .select("id, username, full_name, avatar_url")
          .in("id", organizerIds);

        if (profilesData) {
          const profilesMap: Record<string, ProfileLite> = {};
          (profilesData as ProfileLite[]).forEach((p) => {
            profilesMap[p.id] = p;
          });
          setOrganizers(profilesMap);
        }
      }

      setLoading(false);
    })();

    // Load sponsorships for stream page
    async function loadSponsorships() {
      try {
        const streamSponsorships = await getSponsorshipsForPlacement("stream_page");
        setSponsorships(streamSponsorships);
      } catch (error) {
        console.error("Error loading stream page sponsorships:", error);
      }
    }
    loadSponsorships();
  }, [supabase]);

  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return "Date TBC";
    try {
      return new Date(dateStr).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return "Date TBC";
    }
  };

  const formatLocation = (event: Event) => {
    if (event.location) return event.location;
    if (event.location_city && event.location_country) {
      return `${event.location_city}, ${event.location_country}`;
    }
    if (event.location_city) return event.location_city;
    if (event.location_country) return event.location_country;
    return "Location TBC";
  };

  const getOrganizer = (event: Event) => {
    const orgId = event.owner_profile_id || event.profile_id;
    return orgId ? organizers[orgId] : null;
  };

  // Filter events by discipline
  const filterEventsByDiscipline = (events: Event[]) => {
    if (disciplineFilter === "all") return events;
    
    return events.filter(event => {
      if (!event.martial_art) return false;
      // Check if the discipline filter matches any part of the martial_art field
      // This handles cases like "Muay Thai, Boxing" - will match "Boxing" filter
      const martialArtLower = event.martial_art.toLowerCase();
      const filterLower = disciplineFilter.toLowerCase();
      return martialArtLower.includes(filterLower);
    });
  };

  const filteredLiveEvents = filterEventsByDiscipline(liveEvents);
  const filteredUpcomingEvents = filterEventsByDiscipline(upcomingEvents);

  return (
    <div className="max-w-6xl mx-auto space-y-10">
      <section className="card-elevated">
        <div className="section-header">
          <h1 className="section-title">Watch Live Streams</h1>
          <p className="section-subtitle">
            Browse live and upcoming event streams. Purchase access to watch events live and support fighters.
          </p>
        </div>
      </section>

      {/* Sponsorship Banner */}
      <section>
        {sponsorships.length > 0 ? (
          sponsorships.map((sponsorship) => (
            <SponsorshipBanner
              key={sponsorship.id}
              sponsorship={sponsorship}
              variant={sponsorship.variant as "horizontal" | "vertical" | "compact" || "horizontal"}
            />
          ))
        ) : (
          <div className="card border-2 border-dashed border-purple-300 bg-gradient-to-br from-purple-50 to-indigo-50">
            <div className="flex items-center gap-4 py-6 px-4">
              <div className="w-16 h-16 rounded-xl bg-purple-200 flex items-center justify-center flex-shrink-0">
                <ALogo size={40} />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-lg text-slate-900 mb-1">Sponsor Placement Available</h3>
                <p className="text-sm text-slate-600 mb-2">
                  Your sponsor will appear here. Premium placement above live streams.
                </p>
                <a 
                  href="mailto:sponsors@apexcombatevents.com" 
                  className="text-sm text-purple-700 font-medium hover:underline block"
                >
                  Contact: sponsors@apexcombatevents.com
                </a>
              </div>
            </div>
          </div>
        )}
      </section>

      {loading ? (
        <div className="text-center py-8 text-slate-700">Loading streams...</div>
      ) : (
        <>
          {/* Filter Section */}
          <section className="card">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-sm font-semibold text-slate-900 mb-1">Filter by Discipline</h3>
                <p className="text-xs text-slate-600">Show events by martial art</p>
              </div>
              <select
                value={disciplineFilter}
                onChange={(e) => setDisciplineFilter(e.target.value)}
                className="rounded-xl border-2 border-slate-200 px-4 py-2 text-sm font-medium bg-white hover:border-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all"
              >
                {ART_FILTERS.map((filter) => (
                  <option key={filter.key} value={filter.key}>
                    {filter.label}
                  </option>
                ))}
              </select>
            </div>
          </section>

          {/* LIVE EVENTS */}
          {filteredLiveEvents.length > 0 && (
            <section>
              <div className="mb-8 pb-4 border-b border-slate-200">
                <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
                  <span className="flex h-3 w-3 rounded-full bg-red-500 animate-pulse shadow-[0_0_8px_rgb(239_68_68_/_0.6)]"></span>
                  Live Now
                </h2>
                <p className="text-sm text-slate-600 mt-2">Events currently streaming</p>
              </div>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                {insertSponsorshipsBetweenEvents(filteredLiveEvents, sponsorships, 5).map((item, index) => {
                  // Check if this is a sponsorship
                  if ('__isSponsorship' in item && item.__isSponsorship) {
                    return (
                      <div key={`sponsor-live-${index}`} className="col-span-full my-4">
                        <SponsorshipBanner
                          sponsorship={item.sponsorship}
                          variant={item.sponsorship.variant as "horizontal" | "vertical" | "compact" || "horizontal"}
                        />
                      </div>
                    );
                  }

                  // Regular event
                  const event = item as Event;
                  const organizer = getOrganizer(event);
                  const title = event.title || event.name || "Untitled event";
                  const hasPurchased = userPurchasedEvents.has(event.id);
                  const isOwner = userOwnedEvents.has(event.id);
                  const priceLabel = isOwner
                    ? "Free (Your Event)"
                    : hasPurchased
                    ? "Purchased"
                    : event.stream_price
                    ? `$${(event.stream_price / 100).toFixed(2)}`
                    : "Free";

                  return (
                    <Link
                      key={event.id}
                      href={`/events/${event.id}/stream`}
                      className="card group overflow-hidden hover:shadow-lg hover:-translate-y-1 transition-all duration-200 p-6"
                    >
                      <div className="aspect-video rounded-xl bg-gradient-to-br from-purple-200 via-indigo-200 to-purple-300 mb-5 flex items-center justify-center text-slate-700 text-sm relative overflow-hidden border-2 border-purple-200 group-hover:border-purple-300">
                        {event.banner_url ? (
                          <Image
                            src={event.banner_url}
                            alt={title}
                            fill
                            className="object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        ) : (
                          <span className="text-slate-500">Stream placeholder</span>
                        )}
                        <div className="absolute top-3 left-3 flex items-center gap-2 bg-red-600 text-white px-3 py-1.5 rounded-full text-xs font-bold shadow-lg z-10">
                          <span className="flex h-2 w-2 rounded-full bg-white animate-pulse"></span>
                          LIVE
                        </div>
                      </div>
                      <h3 className="font-bold text-lg mb-3 line-clamp-2 text-slate-900 group-hover:text-purple-700 transition-colors">
                        {title}
                      </h3>
                      <div className="text-sm text-slate-600 space-y-2">
                        {organizer && (
                          <p className="font-medium">
                            {organizer.full_name || organizer.username || "Organizer"}
                          </p>
                        )}
                        <div className="flex items-center gap-2 flex-wrap">
                          <span>{formatDate(event.event_date)}</span>
                          <span>•</span>
                          <span>{formatLocation(event)}</span>
                        </div>
                        {event.martial_art && (
                          <div>
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-100 text-purple-700 border border-purple-200">
                              {event.martial_art}
                            </span>
                          </div>
                        )}
                        <p className={`font-bold text-lg mt-3 ${hasPurchased ? 'text-green-600' : 'text-purple-700'}`}>
                          {priceLabel}
                        </p>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </section>
          )}

          {/* UPCOMING EVENTS */}
          {filteredUpcomingEvents.length > 0 && (
            <section>
              <div className="mb-8 pb-4 border-b border-slate-200">
                <h2 className="text-2xl font-bold text-slate-900">Upcoming Streams</h2>
                <p className="text-sm text-slate-600 mt-2">Scheduled events coming soon (sorted by date)</p>
              </div>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                {insertSponsorshipsBetweenEvents(filteredUpcomingEvents, sponsorships, 5).map((item, index) => {
                  // Check if this is a sponsorship
                  if ('__isSponsorship' in item && item.__isSponsorship) {
                    return (
                      <div key={`sponsor-upcoming-${index}`} className="col-span-full my-4">
                        <SponsorshipBanner
                          sponsorship={item.sponsorship}
                          variant={item.sponsorship.variant as "horizontal" | "vertical" | "compact" || "horizontal"}
                        />
                      </div>
                    );
                  }

                  // Regular event
                  const event = item as Event;
                  const organizer = getOrganizer(event);
                  const title = event.title || event.name || "Untitled event";
                  const hasPurchased = userPurchasedEvents.has(event.id);
                  const isOwner = userOwnedEvents.has(event.id);
                  const priceLabel = isOwner
                    ? "Free (Your Event)"
                    : hasPurchased
                    ? "Purchased"
                    : event.stream_price
                    ? `$${(event.stream_price / 100).toFixed(2)}`
                    : "Free";

                  return (
                    <Link
                      key={event.id}
                      href={`/events/${event.id}/stream`}
                      className="card group overflow-hidden hover:shadow-lg hover:-translate-y-1 transition-all duration-200 p-6"
                    >
                      <div className="aspect-video rounded-xl bg-gradient-to-br from-purple-200 via-indigo-200 to-purple-300 mb-5 flex items-center justify-center text-slate-700 text-sm relative overflow-hidden border-2 border-purple-200 group-hover:border-purple-300">
                        {event.banner_url ? (
                          <Image
                            src={event.banner_url}
                            alt={title}
                            fill
                            className="object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        ) : (
                          <span className="text-slate-500">Stream placeholder</span>
                        )}
                      </div>
                      <h3 className="font-bold text-lg mb-3 line-clamp-2 text-slate-900 group-hover:text-purple-700 transition-colors">
                        {title}
                      </h3>
                      <div className="text-sm text-slate-600 space-y-2">
                        {organizer && (
                          <p className="font-medium">
                            {organizer.full_name || organizer.username || "Organizer"}
                          </p>
                        )}
                        <div className="flex items-center gap-2 flex-wrap">
                          <span>{formatDate(event.event_date)}</span>
                          <span>•</span>
                          <span>{formatLocation(event)}</span>
                        </div>
                        {event.martial_art && (
                          <div>
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-100 text-purple-700 border border-purple-200">
                              {event.martial_art}
                            </span>
                          </div>
                        )}
                        <p className={`font-bold text-lg mt-3 ${hasPurchased ? 'text-green-600' : 'text-purple-700'}`}>
                          {priceLabel}
                        </p>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </section>
          )}

          {filteredLiveEvents.length === 0 && filteredUpcomingEvents.length === 0 && (
            <section className="card">
              <p className="text-slate-700 text-center py-8">
                {liveEvents.length === 0 && upcomingEvents.length === 0
                  ? "No live or upcoming streams at the moment. Check back soon!"
                  : `No ${disciplineFilter !== "all" ? disciplineFilter : ""} streams found. Try a different filter.`}
              </p>
            </section>
          )}
        </>
      )}
    </div>
  );
}
