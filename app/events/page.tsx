// app/events/page.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createSupabaseBrowser } from "@/lib/supabase-browser";
import { useRouter } from "next/navigation";

type Event = {
  id: string;
  name: string;
  title?: string | null;
  event_date: string | null;
  date_end: string | null;
  city: string | null;
  country: string | null;
  venue: string | null;
  status: "draft" | "published" | "completed" | "cancelled";
  martial_arts: string[] | null;
  is_live?: boolean | null;
  has_live_bout?: boolean; // Custom field to track if any bout is live
};

export default function EventsPage() {
  const router = useRouter();
  const supabase = createSupabaseBrowser();
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<Event[]>([]);
  const [user, setUser] = useState<any>(null);
  const [role, setRole] = useState<string | null>(null);

  const sortEventsByDateDescNullLast = (rows: any[]) => {
    return [...rows].sort((a, b) => {
      const aDate = a?.event_date ? new Date(a.event_date).getTime() : null;
      const bDate = b?.event_date ? new Date(b.event_date).getTime() : null;

      if (aDate === null && bDate === null) return 0;
      if (aDate === null) return 1;
      if (bDate === null) return -1;
      return bDate - aDate;
    });
  };

  useEffect(() => {
    async function load() {
      const { data: authData } = await supabase.auth.getUser();
      const authUser = authData.user;

      if (!authUser) {
        router.push("/login");
        return;
      }

      setUser(authUser);

      // Get user role
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", authUser.id)
        .single();

      const userRole = profile?.role?.toLowerCase() || null;
      setRole(userRole);

      // Only gym and promotion can access this page
      if (userRole !== "gym" && userRole !== "promotion") {
        router.push("/");
        return;
      }

      // Load events for this user - check both owner_profile_id and profile_id
      // (some older events might use profile_id)
      const { data: eventsData, error } = await supabase
        .from("events")
        .select("*, title")
        .or(`owner_profile_id.eq.${authUser.id},profile_id.eq.${authUser.id}`)
        .order("event_date", { ascending: false });

      let eventsToSet: Event[] = [];

      if (error) {
        console.error("Error loading events:", error);
        // If the OR query fails (maybe profile_id doesn't exist), try just owner_profile_id
        const { data: eventsData2, error: error2 } = await supabase
          .from("events")
          .select("*, title")
          .eq("owner_profile_id", authUser.id)
          .order("event_date", { ascending: false });
        
        if (error2) {
          console.error("Error loading events (fallback):", error2);
        } else {
          console.log("Loaded events (fallback):", eventsData2?.length || 0, "events for user", authUser.id);
          eventsToSet = eventsData2 || [];
        }
      } else {
        console.log("Loaded events:", eventsData?.length || 0, "events for user", authUser.id);
        eventsToSet = eventsData || [];
      }

      // Check for live bouts for each event
      if (eventsToSet.length > 0) {
        const eventIds = eventsToSet.map(e => e.id);
        const { data: liveBoutsData } = await supabase
          .from("event_bouts")
          .select("event_id")
          .in("event_id", eventIds)
          .eq("is_live", true);

        const eventsWithLiveBouts = new Set(
          (liveBoutsData || []).map((b: any) => b.event_id)
        );

        // Add has_live_bout flag to each event
        const eventsWithLiveStatus = eventsToSet.map(event => ({
          ...event,
          has_live_bout: eventsWithLiveBouts.has(event.id)
        }));

        setEvents(sortEventsByDateDescNullLast(eventsWithLiveStatus));
      } else {
        setEvents([]);
      }

      setLoading(false);
    }

    load();
  }, [supabase, router]);

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto">
        <p className="text-sm sm:text-base text-slate-600">Loading events...</p>
      </div>
    );
  }

  // Separate events into current/upcoming and past
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  const currentEvents = events.filter((event) => {
    if (event.status === "completed" || event.status === "cancelled") {
      return false;
    }
    if (!event.event_date) {
      return true; // Include events without dates (drafts)
    }
    const eventDate = new Date(event.event_date);
    eventDate.setHours(0, 0, 0, 0);
    return eventDate >= now;
  });

  const pastEvents = events.filter((event) => {
    if (event.status === "completed" || event.status === "cancelled") {
      return true;
    }
    if (!event.event_date) {
      return false;
    }
    const eventDate = new Date(event.event_date);
    eventDate.setHours(0, 0, 0, 0);
    return eventDate < now;
  });

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Date TBC";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const getStatusBadge = (status: string) => {
    const statusColors: Record<string, string> = {
      draft: "bg-slate-200 text-slate-700",
      published: "bg-blue-100 text-blue-700",
      completed: "bg-green-100 text-green-700",
      cancelled: "bg-red-100 text-red-700",
    };
    const color = statusColors[status] || "bg-slate-200 text-slate-700";
    return (
      <span
        className={`px-2 py-1 rounded-full text-[10px] font-medium uppercase ${color}`}
      >
        {status}
      </span>
    );
  };

  return (
    <div className="max-w-6xl mx-auto space-y-10">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">Events</h1>
          <p className="text-base sm:text-lg text-slate-600 mt-3">
            Manage your events and create new ones
          </p>
        </div>
        <Link
          href="/create-event"
          className="btn btn-primary"
        >
          + Create Event
        </Link>
      </div>

      {/* Current/Upcoming Events */}
      <section className="space-y-6">
        <div className="section-header">
          <h2 className="section-title text-xl sm:text-2xl font-bold">Current & Upcoming Events</h2>
        </div>
        {currentEvents.length === 0 ? (
          <div className="card p-6">
            <p className="text-sm sm:text-base text-slate-600">
              No current or upcoming events. Create your first event to get
              started.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {currentEvents.map((event) => (
              <div
                key={event.id}
                className="card p-6 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200"
              >
                <Link
                  href={`/events/${event.id}`}
                  className="block"
                >
                  <div className="flex items-start justify-between gap-6">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <h3 className="text-lg sm:text-xl font-semibold text-slate-900">
                          {event.title || event.name}
                        </h3>
                        {getStatusBadge(event.status)}
                        {event.has_live_bout === true && (
                          <span className="badge badge-live">
                            <span className="flex h-2 w-2 rounded-full bg-white animate-pulse mr-1.5"></span>
                            Live
                          </span>
                        )}
                      </div>
                    <div className="space-y-2 text-sm sm:text-base text-slate-600">
                      <p>
                        {formatDate(event.event_date)}
                        {event.venue && ` • ${event.venue}`}
                      </p>
                      {event.city && event.country && (
                        <p>
                          {event.city}, {event.country}
                        </p>
                      )}
                      {event.martial_arts && event.martial_arts.length > 0 && (
                        <p className="text-sm text-slate-500">
                          {event.martial_arts.join(", ")}
                        </p>
                      )}
                    </div>
                  </div>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-6 w-6 text-slate-400 flex-shrink-0"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </div>
                </Link>
                {event.has_live_bout === true && (
                  <div className="mt-4 pt-4 border-t border-slate-200">
                    <Link
                      href={`/events/${event.id}/stream`}
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-purple-600 text-white text-sm sm:text-base font-medium hover:bg-purple-700 transition-colors w-full justify-center"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-4 w-4"
                        fill="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path d="M8 5v14l11-7z" />
                      </svg>
                      Watch Stream
                    </Link>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Past Events */}
      {pastEvents.length > 0 && (
        <section className="space-y-6">
          <div className="section-header">
            <h2 className="section-title text-xl sm:text-2xl font-bold">Past Events</h2>
          </div>
          <div className="space-y-4">
            {pastEvents.map((event) => (
              <Link
                key={event.id}
                href={`/events/${event.id}`}
                className="card p-6 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 block opacity-75 hover:opacity-100"
              >
                <div className="flex items-start justify-between gap-6">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <h3 className="text-lg sm:text-xl font-semibold text-slate-900">
                        {event.name}
                      </h3>
                      {getStatusBadge(event.status)}
                    </div>
                    <div className="space-y-2 text-sm sm:text-base text-slate-600">
                      <p>
                        {formatDate(event.event_date)}
                        {event.venue && ` • ${event.venue}`}
                      </p>
                      {event.city && event.country && (
                        <p>
                          {event.city}, {event.country}
                        </p>
                      )}
                      {event.martial_arts && event.martial_arts.length > 0 && (
                        <p className="text-sm text-slate-500">
                          {event.martial_arts.join(", ")}
                        </p>
                      )}
                    </div>
                  </div>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-6 w-6 text-slate-400 flex-shrink-0"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

