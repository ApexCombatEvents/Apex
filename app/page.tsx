"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createSupabaseBrowser } from "@/lib/supabase-browser";
import NewsAndUpdates from "@/components/home/NewsAndUpdates";
import SponsorshipSlideshow from "@/components/sponsors/SponsorshipSlideshow";
import SponsorshipBanner from "@/components/sponsors/SponsorshipBanner";
import { getSponsorshipsForPlacement, type Sponsorship } from "@/lib/sponsorships";
import ALogo from "@/components/logos/ALogo";
import { useTranslation } from "@/hooks/useTranslation";

type Profile = {
  id: string;
  full_name: string | null;
  username: string | null;
  role: string | null;
};

type Event = {
  id: string;
  name?: string | null;
  title?: string | null;
  event_date: string | null;
  location?: string | null;
  location_city?: string | null;
  location_country?: string | null;
  martial_art?: string | null;
  martial_arts?: string[] | null;
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
        const { data, error } = await supabase
          .from("events")
          .select(
            "id, title, name, event_date, location, location_city, location_country, martial_art, is_featured, featured_until"
          )
          .limit(50);

        if (error) {
          console.error("Error loading events:", error);
          setLoading(false);
          return;
        }

        if (data) {
          const now = new Date();
          const today = now.toISOString().slice(0, 10);
          const eventsWithFeatured = (data as Event[]).map((event) => ({
            ...event,
            is_featured:
              !!event.is_featured &&
              (!event.featured_until || new Date(event.featured_until) > now),
          }));

          const upcoming = eventsWithFeatured.filter(
            (event) => !event.event_date || event.event_date >= today
          );

          const sorted = upcoming.sort((a, b) => {
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
          View all events →
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
          const locationLabel =
            event.location ||
            [event.location_city, event.location_country].filter(Boolean).join(", ") ||
            "Location TBC";
          const eventTitle = event.title || event.name || "Untitled event";
          const disciplineLabel =
            event.martial_art ||
            (event.martial_arts && event.martial_arts.length > 0
              ? event.martial_arts.join(", ")
              : null);

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
                      {eventTitle}
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
                    {disciplineLabel && (
                      <>
                        <span>•</span>
                        <span className="font-medium text-purple-700">
                          {disciplineLabel}
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
  const { t } = useTranslation();
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-slate-900">{t('Common.newsTitle')}</h3>
      </div>

      <p className="text-sm text-slate-600 mb-4">
        {t('Common.newsSubtitle')}
      </p>

      <NewsAndUpdates selectedSports={[]} />
    </div>
  );
}

export default function HomePage() {
  const supabase = createSupabaseBrowser();
  const { t } = useTranslation();
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

  const isGuest = !loading && !userEmail;

  const [heroSponsorships, setHeroSponsorships] = useState<Sponsorship[]>([]);
  const [sidebarSponsorships, setSidebarSponsorships] = useState<Sponsorship[]>([]);

  useEffect(() => {
      async function loadSponsorships() {
      try {
        // Load hero slideshow sponsorships - only include slideshow variants
        const allHero = await getSponsorshipsForPlacement("homepage_hero");
        const hero = allHero.filter(s => s.variant === "slideshow");

        // Always include the welcome slide as the first slide
        const welcomeSlide = {
          id: "welcome-slide",
          title: "Apex Combat Events",
          description:
            "Connect fighters, coaches, gyms, and promotions. Find fights, manage events, and build your legacy in combat sports.",
          placement: "homepage_hero",
          variant: "slideshow",
          is_brand_slide: true,
        };

        // Add placeholder sponsorship slide if no sponsorships exist
        const placeholderSlide = {
          id: "sponsor-placeholder",
          title: "Your Sponsor Will Appear Here",
          description: "This premium placement is available for sponsorship. Contact us at sponsors@apexcombatevents.com to feature your brand in this prominent location.",
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
          title: "Apex Combat Events",
          description:
            "Connect fighters, coaches, gyms, and promotions. Find fights, manage events, and build your legacy in combat sports.",
          placement: "homepage_hero",
          variant: "slideshow",
          is_brand_slide: true,
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

      {/* Explore Apex — quick paths for new visitors */}
      <section className="space-y-4">
        <div className="section-header">
          <h2 className="section-title">Explore Apex</h2>
          <p className="section-subtitle">
            {isGuest
              ? "Browse events, discover fighters, or create your profile to get started."
              : "Browse events and discover fighters on the platform."}
          </p>
        </div>
        <div
          className={`grid grid-cols-1 gap-4 ${
            isGuest ? "sm:grid-cols-3" : "sm:grid-cols-2"
          }`}
        >
          <HomeExploreCard
            title="Browse events"
            description="See upcoming shows, fight cards, and opportunities to compete."
            buttonLabel="View events"
            href="/search"
            icon="events"
          />
          <HomeExploreCard
            title="Discover fighters"
            description="Explore fighter profiles already on the platform."
            buttonLabel="Find fighters"
            href="/search?role=fighter"
            icon="fighters"
          />
          {isGuest && (
            <HomeExploreCard
              title="Join the community"
              description="Sign up as a fighter, coach, gym, or promotion and build your legacy."
              buttonLabel="Sign up free"
              href="/signup"
              icon="signup"
            />
          )}
        </div>
      </section>

      {/* Sign up invitation — guests only */}
      {isGuest && (
        <section
          className="rounded-2xl border border-purple-200 bg-gradient-to-br from-purple-600 via-purple-700 to-indigo-800 px-6 py-10 sm:px-10 sm:py-12 text-center text-white shadow-lg"
          aria-labelledby="home-signup-heading"
        >
          <h2 id="home-signup-heading" className="text-2xl sm:text-3xl font-bold mb-3">
            Ready to find your next fight?
          </h2>
          <p className="text-sm sm:text-base text-purple-100 max-w-xl mx-auto mb-6">
            Join fighters, coaches, gyms, and promotions on Apex Combat Events. Create
            your profile, follow events, and connect with the combat sports community.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/signup"
              className="inline-flex items-center justify-center min-w-[200px] px-5 py-2.5 rounded-xl text-sm font-semibold bg-white text-purple-700 hover:bg-purple-50 shadow-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-purple-700"
            >
              Create free account
            </Link>
            <Link
              href="/login"
              className="btn min-w-[200px] border-2 border-white/80 text-white bg-transparent hover:bg-white/10"
            >
              Sign in
            </Link>
          </div>
        </section>
      )}

      {/* Upcoming events preview */}
      <section className="card">
        <div className="section-header mb-4">
          <h2 className="section-title">Upcoming events</h2>
          <p className="section-subtitle">
            See what&apos;s on the calendar and find your next opportunity.
          </p>
        </div>
        <FightsNearYou />
      </section>

      {/* Sponsored + news */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card md:col-span-2 order-2 md:order-1">
          <NewsAndUpdatesSection />
        </div>

        <div className="card order-1 md:order-2 md:sticky md:top-4 md:self-start">
          <div className="space-y-3">
            {sidebarSponsorships.length > 0 ? (
              sidebarSponsorships.map((sponsorship) => (
                <SponsorshipBanner
                  key={sponsorship.id}
                  sponsorship={sponsorship}
                  variant="vertical"
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
                    Premium sticky sidebar placement
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

interface HomeExploreCardProps {
  title: string;
  description: string;
  buttonLabel: string;
  href: string;
  icon: "events" | "fighters" | "signup";
}

function HomeExploreCard({
  title,
  description,
  buttonLabel,
  href,
  icon,
}: HomeExploreCardProps) {
  return (
    <div className="card flex flex-col h-full hover:border-purple-300">
      <div className="flex items-center gap-3 mb-3">
        <div
          className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-purple-100 text-purple-700"
          aria-hidden
        >
          {icon === "events" && (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          )}
          {icon === "fighters" && (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          )}
          {icon === "signup" && (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          )}
        </div>
        <h3 className="text-base font-bold text-slate-900">{title}</h3>
      </div>
      <p className="text-sm text-slate-600 mb-4 flex-1">{description}</p>
      <Link href={href} className="btn btn-primary w-full text-center justify-center">
        {buttonLabel}
      </Link>
    </div>
  );
}

