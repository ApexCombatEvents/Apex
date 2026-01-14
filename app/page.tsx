"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createSupabaseBrowser } from "@/lib/supabase-browser";
import NewsAndUpdates from "@/components/home/NewsAndUpdates";
import SponsorshipSlideshow from "@/components/sponsors/SponsorshipSlideshow";
import SponsorshipBanner from "@/components/sponsors/SponsorshipBanner";
import { getSponsorshipsForPlacement, type Sponsorship } from "@/lib/sponsorships";
import ALogo from "@/components/logos/ALogo";

type Profile = {
  id: string;
  full_name: string | null;
  username: string | null;
  role: string | null;
};

type Event = {
  id: string;
  name: string;
  event_date: string | null;
  city: string | null;
  country: string | null;
  martial_arts: string[] | null;
  is_featured?: boolean | null;
  featured_until?: string | null;
};

function FightsNearYou() {
  const supabase = createSupabaseBrowser();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadEvents() {
      try {
        // Try event_date first (newer column name), fallback to date_start if needed
        const { data, error } = await supabase
          .from("events")
          .select("id, name, event_date, date_start, city, country, martial_arts, is_featured, featured_until")
          .eq("status", "published");

        if (error) {
          console.error("Error loading events:", error);
          setLoading(false);
          return;
        }

        if (data) {
          const now = new Date();
          // Filter out expired featured events and check active featured status
          // Use event_date if available, otherwise fallback to date_start
          const eventsWithFeatured = (data as any[]).map(event => ({
            ...event,
            event_date: event.event_date || event.date_start || null,
            is_featured: event.is_featured && (!event.featured_until || new Date(event.featured_until) > now)
          }));

          const sorted = eventsWithFeatured.sort((a, b) => {
            // Featured events come first
            const aFeatured = a.is_featured === true;
            const bFeatured = b.is_featured === true;
            if (aFeatured && !bFeatured) return -1;
            if (!aFeatured && bFeatured) return 1;

            // Then sort by date (earliest first)
            const aDate = a.event_date ? new Date(a.event_date).getTime() : null;
            const bDate = b.event_date ? new Date(b.event_date).getTime() : null;
            if (aDate === null && bDate === null) return 0;
            if (aDate === null) return 1;
            if (bDate === null) return -1;
            return aDate - bDate; // ascending
          });

          setEvents(sorted.slice(0, 5)); // Limit to 5 after sorting
        }
      } catch (err) {
        console.error("Error in loadEvents:", err);
      } finally {
        setLoading(false);
      }
    }
    loadEvents();
  }, [supabase]);

  if (loading) {
    return (
      <div className="text-sm text-slate-600">
        Loading events...
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="space-y-2">
        <p className="text-sm text-slate-600">No upcoming events found.</p>
        <Link href="/search" className="text-sm font-semibold text-purple-600">
          Browse all events →
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="space-y-2">
        {events.map((event) => {
          const dateLabel = event.event_date
            ? new Date(event.event_date).toLocaleDateString()
            : "Date TBC";
          const locationLabel = [event.city, event.country]
            .filter(Boolean)
            .join(", ") || "Location TBC";

          return (
            <Link
              key={event.id}
              href={`/events/${event.id}`}
              className={`block rounded-xl border-2 px-4 py-3 transition-all duration-200 ${
                event.is_featured
                  ? "border-purple-300 bg-gradient-to-br from-purple-50 to-indigo-50/50 hover:border-purple-400 hover:shadow-md hover:-translate-y-0.5"
                  : "border-slate-200 bg-white hover:border-purple-300 hover:shadow-md hover:-translate-y-0.5"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-2">
                    <h3 className="text-sm font-bold text-slate-900 truncate">
                      {event.name}
                    </h3>
                    {event.is_featured && (
                      <span className="badge badge-featured">
                        Featured
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2 text-xs text-slate-600">
                    <span className="font-medium">{dateLabel}</span>
                    {locationLabel !== "Location TBC" && (
                      <>
                        <span>•</span>
                        <span>{locationLabel}</span>
                      </>
                    )}
                    {event.martial_arts && event.martial_arts.length > 0 && (
                      <>
                        <span>•</span>
                        <span className="font-medium text-purple-700">
                          {event.martial_arts.join(", ")}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
      <Link href="/search" className="text-sm font-semibold text-purple-600">
        View all events →
      </Link>
    </div>
  );
}

function NewsAndUpdatesSection() {
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-slate-900">News & updates</h3>
      </div>

      <p className="text-sm text-slate-600 mb-4">
        Latest posts and activity from profiles and events you follow. See bout updates, event changes, and posts from your network.
      </p>

      <NewsAndUpdates selectedSports={[]} />
    </div>
  );
}

export default function HomePage() {
  const supabase = createSupabaseBrowser();
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user;
      if (user) {
        setUserEmail(user.email ?? null);
        const { data, error } = await supabase
          .from("profiles")
          .select("id, full_name, username, role")
          .eq("id", user.id)
          .single();

        if (!error && data) {
          setProfile(data as Profile);
        }
      } else {
        setUserEmail(null);
      }
      setLoading(false);
    };
    load();
  }, [supabase]);

  const displayName =
    profile?.full_name || profile?.username || userEmail || "Apex fighter";

  const [heroSponsorships, setHeroSponsorships] = useState<Sponsorship[]>([]);
  const [sidebarSponsorships, setSidebarSponsorships] = useState<Sponsorship[]>([]);

  useEffect(() => {
    async function loadSponsorships() {
      try {
        // Load hero slideshow sponsorships
        const hero = await getSponsorshipsForPlacement("homepage_hero");

        // Always include the welcome slide as the first slide
        const welcomeSlide = {
          id: "welcome-slide",
          title: "Welcome to Apex",
          description: "Connect fighters, coaches, gyms, and promotions. Find fights, manage events, and build your legacy in combat sports.",
          button_text: "Get Started",
          link_url: "/search",
          placement: "homepage_hero",
          variant: "slideshow",
        };

        // Add placeholder sponsorship slide if no sponsorships exist
        const placeholderSlide = {
          id: "sponsor-placeholder",
          title: "Your Sponsor Will Appear Here",
          description: "This premium placement is available for sponsorship. Contact us at sponsors@apexcombatevents.com to feature your brand in this prominent location.",
          button_text: "Learn More",
          link_url: "/search",
          placement: "homepage_hero",
          variant: "slideshow",
          background_color: "from-purple-500 via-purple-600 to-indigo-700",
        };

        // Combine: welcome slide first, then sponsorships, then placeholder if needed
        const allSlides = [welcomeSlide, ...hero];
        if (hero.length === 0) {
          allSlides.push(placeholderSlide);
        }

        setHeroSponsorships(allSlides);

        // Load sidebar sponsorships
        const sidebar = await getSponsorshipsForPlacement("homepage_sidebar");
        setSidebarSponsorships(sidebar);
      } catch (error) {
        console.error("Error loading sponsorships:", error);
        // Use fallback
        setHeroSponsorships([{
          id: "fallback",
          title: "Welcome to Apex",
          description: "Connect fighters, coaches, gyms, and promotions. Find fights, manage events, and build your legacy in combat sports.",
          button_text: "Get Started",
          link_url: "/search",
          placement: "homepage_hero",
          variant: "slideshow",
        }]);
      }
    }
    loadSponsorships();
  }, []);

  return (
    <div className="max-w-6xl mx-auto space-y-10 sm:space-y-12">
      {/* Sponsorship Slideshow Hero - Full Width */}
      <section className="card-elevated overflow-hidden relative">
        <SponsorshipSlideshow sponsorships={heroSponsorships} autoRotateInterval={6000} />
      </section>


      {/* Sponsored + news */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card md:col-span-2 order-2 md:order-1">
          <NewsAndUpdatesSection />
        </div>

        <div className="card order-1 md:order-2">
          <div className="section-header mb-4">
            <h3 className="section-title text-base sm:text-lg">Sponsored</h3>
          </div>
          <div className="space-y-3">
            {sidebarSponsorships.length > 0 ? (
              sidebarSponsorships.map((sponsorship) => (
                <SponsorshipBanner
                  key={sponsorship.id}
                  sponsorship={sponsorship}
                  variant={sponsorship.variant as "horizontal" | "vertical" | "compact" || "vertical"}
                />
              ))
            ) : (
              <div className="card border-2 border-dashed border-purple-300 bg-gradient-to-br from-purple-50 to-indigo-50">
                <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
                  <div className="w-12 h-12 rounded-full bg-purple-200 flex items-center justify-center mb-3">
                    <ALogo size={32} />
                  </div>
                  <h3 className="font-bold text-slate-900 mb-1">Sponsor Placement Available</h3>
                  <p className="text-sm text-slate-600 mb-2">
                    Your sponsor will appear here
                  </p>
                  <p className="text-xs text-slate-500 mb-2">
                    Premium sidebar placement
                  </p>
                  <a 
                    href="mailto:sponsors@apexcombatevents.com" 
                    className="text-xs text-purple-700 font-medium hover:underline"
                  >
                    Contact: sponsors@apexcombatevents.com
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

