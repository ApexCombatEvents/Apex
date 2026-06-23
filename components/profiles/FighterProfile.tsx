// components/profiles/FighterProfile.tsx
"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { createSupabaseBrowser } from "@/lib/supabase-browser";
import FollowStats from "@/components/social/FollowStats";
import PostReactions from "@/components/social/PostReactions";
import MessageButton from "@/components/messaging/MessageButton";
import CreatePostModal from "@/components/social/CreatePostModal";
import PostActionsMenu from "@/components/social/PostActionsMenu";
import FighterPromotions from "@/components/promotions/FighterPromotions";
import FighterBelts from "@/components/profiles/FighterBelts";
import PostImages from "@/components/social/PostImages";
import PostContent from "@/components/social/PostContent";
import BoutShareCard, { type BoutShareMetadata } from "@/components/social/BoutShareCard";
import { useRouter } from "next/navigation";
import { useTranslation } from "@/hooks/useTranslation";
import { countryToFlagUrl } from "@/lib/countries";
import FightModal from "@/components/fighters/FightModal";
import FightPosterModal, { type FightPosterTarget } from "@/components/fighters/FightPosterModal";
import FightPosterLightbox from "@/components/fighters/FightPosterLightbox";
import ALogo from "@/components/logos/ALogo";

function isBjjDiscipline(value: string): boolean {
  const normalized = value.toLowerCase().replace(/[^a-z]/g, "");
  return (
    normalized === "bjj" ||
    normalized === "brazilianjiujitsu" ||
    normalized === "brazilianjitsu"
  );
}

type Profile = {
  id: string;
  full_name?: string | null;
  username?: string | null;
  role?: string | null;
  email?: string | null;
  gym_id?: string | null;
  avatar_url?: string | null;
  banner_url?: string | null;
  bio?: string | null;
  country?: string | null;
  martial_arts?: string[] | null;
  rank?: string | null;
  age?: string | null;
  weight?: string | null;
  record?: string | null;

  height_unit?: "cm" | "ft" | null;
  height_cm?: number | null;
  height_feet?: number | null;
  height_inches?: number | null;

  weight_unit?: "kg" | "lb" | null;

  follower_count?: number | null;
  following_count?: number | null;

  record_base?: string | null;
  last_5_form?: string | null;
  current_win_streak?: number | null;

  years_training?: number | null;
  interclub_count?: number | null;

  social_links?: {
    instagram?: string;
    twitter?: string;
    youtube?: string;
    tiktok?: string;
    website?: string;
    gym_username?: string;
    [key: string]: any;
  } | null;
};

type Post = {
  id: string;
  content?: string | null;
  created_at: string;
  image_url?: string | null;
  image_urls?: string[] | null;
  post_metadata?: BoutShareMetadata | null;
};

export default function FighterProfile({
  profile,
  posts = [],
  socialFeedSlot,
  isOwnProfile = false,
  hideStats = false,
  hideFights = false,
  hideBio = false,
  hideUpcomingFights = false,
  hidePastFights = false,
  hidePosts = false,
}: {
  profile: Profile;
  posts?: Post[];
  socialFeedSlot?: React.ReactNode;
  isOwnProfile?: boolean;
  hideStats?: boolean;
  hideFights?: boolean;
  hideBio?: boolean;
  hideUpcomingFights?: boolean;
  hidePastFights?: boolean;
  hidePosts?: boolean;
}) {
  const router = useRouter();
  const { t } = useTranslation();
  const {
    full_name,
    username,
    avatar_url,
    banner_url,
    bio,
    country,
    martial_arts,
    social_links,
    rank,
    age,
    height_unit,
    weight,
    record,
    height_cm,
    height_feet,
    height_inches,
    weight_unit,
    last_5_form,
    current_win_streak,
    years_training,
    interclub_count,
  } = profile;

  const arts = martial_arts && martial_arts.length ? martial_arts : [];
  const gymUsername = social_links?.gym_username || "";
  const hasBjjDiscipline = arts.some((art) => isBjjDiscipline(art));
  const bjjBelt = typeof social_links?.bjj_belt === "string" ? social_links.bjj_belt : "";
  const bjjStripesRaw = social_links?.bjj_stripes;
  const bjjStripes =
    typeof bjjStripesRaw === "number"
      ? bjjStripesRaw
      : typeof bjjStripesRaw === "string"
      ? parseInt(bjjStripesRaw, 10) || 0
      : 0;
  const displayBjjBelt = bjjBelt
    ? `${bjjBelt} belt${bjjStripes > 0 ? ` • ${bjjStripes} stripe${bjjStripes === 1 ? "" : "s"}` : ""}`
    : "–";

  // figure out if this is my own profile (so we can hide Message)
  const [myId, setMyId] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createSupabaseBrowser();
    supabase.auth.getUser().then(({ data }) => {
      setMyId(data.user?.id ?? null);
    });
  }, []);

  const isMe = myId === profile.id;

  // Fight management modal
  const [fightModalOpen, setFightModalOpen] = useState(false);

  // Poster: full-screen viewer (with download) + per-fight editor
  const [lightbox, setLightbox] = useState<{ url: string; title: string } | null>(null);
  const [posterTarget, setPosterTarget] = useState<FightPosterTarget | null>(null);

  // --- Fights pulled from events / bouts ---
  const [upcomingFights, setUpcomingFights] = useState<any[]>([]);
  const [pastFights, setPastFights] = useState<any[]>([]);
  const [manualFights, setManualFights] = useState<any[]>([]); // Manual fight history entries
  const [loadingFights, setLoadingFights] = useState(true);
  const [fightRefreshKey, setFightRefreshKey] = useState(0);
  const [isCreatePostModalOpen, setIsCreatePostModalOpen] = useState(false);
  // Start at page 0 (newest posts)
  const [postPage, setPostPage] = useState(0);

  // Pagination for fights
  const [upcomingDisplayCount, setUpcomingDisplayCount] = useState(6);
  const [pastDisplayCount, setPastDisplayCount] = useState(6);

  // Section visibility (controlled from Edit Profile). The legacy `hideFights`
  // flag hides the whole Fights section; the newer flags allow hiding each tab.
  const showUpcomingFights = !hideFights && !hideUpcomingFights;
  const showPastFights = !hideFights && !hidePastFights;
  const showFightsSection = showUpcomingFights || showPastFights;

  const [activeFightsTab, setActiveFightsTab] = useState<"upcoming" | "past">(
    showUpcomingFights ? "upcoming" : "past"
  );

  // Guard against landing on a hidden tab.
  const effectiveFightsTab: "upcoming" | "past" =
    activeFightsTab === "upcoming" && !showUpcomingFights
      ? "past"
      : activeFightsTab === "past" && !showPastFights
      ? "upcoming"
      : activeFightsTab;

  useEffect(() => {
    const supabase = createSupabaseBrowser();
    let cancelled = false;

    async function loadFights() {
      setLoadingFights(true);

      // Load manual fight history entries first
      let manualEntries: any[] = [];
      try {
        const historyResponse = await fetch(`/api/fighters/fight-history?fighter_id=${profile.id}`);
        if (historyResponse.ok) {
          const historyData = await historyResponse.json();
          manualEntries = (historyData.fights || []).map((f: any) => {
            const fightDate = new Date(f.event_date);
            const now = new Date();
            now.setHours(0, 0, 0, 0);
            const isPast = fightDate < now;
            const resultLabels: Record<string, string> = {
              win: "Win",
              loss: "Loss",
              draw: "Draw",
              no_contest: "No Contest",
            };
            const resultParts: string[] = f.result ? [resultLabels[f.result] || f.result] : [];
            if (f.result_method) resultParts.push(f.result_method);
            if (f.result_round) resultParts.push(`R${f.result_round}`);
            if (f.result_time) resultParts.push(f.result_time);
            return {
              boutId: null,
              manualId: f.id,
              eventId: null,
              eventTitle: f.event_name,
              dateLabel: fightDate.toLocaleDateString(),
              isPast,
              cardType: null,
              weight: f.weight_class || null,
              boutDetails: null,
              opponentName: f.opponent_name,
              locationLabel: f.location || "",
              resultSummary: resultParts.join(" • "),
              outcomeLetter: f.result === "win" ? "W" : f.result === "loss" ? "L" : f.result === "draw" ? "D" : "",
              isManual: true,
              eventBanner: null,
              customPoster: f.poster_url || null,
              posterUrl: f.poster_url || null,
            };
          });
        }
      } catch (err) {
        console.error("Error loading manual fight history:", err);
      }

      const { data: bouts, error } = await supabase
        .from("event_bouts")
        .select(
          "id, event_id, card_type, order_index, red_fighter_id, blue_fighter_id, red_name, blue_name, weight, bout_details, winner_side, result_method, result_round, result_time"
        );

      if (error || !bouts || bouts.length === 0) {
        if (!cancelled) {
          setUpcomingFights([]);
          setPastFights([]);
          setLoadingFights(false);
        }
        return;
      }

      const eventIds = Array.from(
        new Set((bouts as any[]).map((b) => b.event_id).filter(Boolean))
      ) as string[];

      let eventsById: Record<string, any> = {};

      if (eventIds.length > 0) {
        const { data: events, error: eventsError } = await supabase
          .from("events")
          .select(
            "id, title, name, event_date, location, location_city, location_country, martial_art, banner_url"
          )
          .in("id", eventIds);

        if (!eventsError && events) {
          for (const ev of events as any[]) {
            eventsById[ev.id] = ev;
          }
        }
      }

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const rawBouts = (bouts as any[]) || [];

      const fighterBouts = rawBouts.filter(
        (b) =>
          b.red_fighter_id === profile.id ||
          b.blue_fighter_id === profile.id
      );

      // Per-fighter custom poster overrides for these platform bouts
      const boutIds = fighterBouts.map((b) => b.id).filter(Boolean);
      const posterByBoutId: Record<string, string> = {};
      if (boutIds.length > 0) {
        const { data: posterRows } = await supabase
          .from("fighter_bout_posters")
          .select("bout_id, poster_url")
          .eq("fighter_profile_id", profile.id)
          .in("bout_id", boutIds);
        if (posterRows) {
          for (const row of posterRows as any[]) {
            if (row.bout_id && row.poster_url) posterByBoutId[row.bout_id] = row.poster_url;
          }
        }
      }

      const fights = fighterBouts.map((b) => {
        const event = eventsById[b.event_id] || {};
        const eventTitle = event.title || event.name || "Event";
        const eventDate: string | null = event.event_date || null;

        let dateLabel = "Date TBC";
        let isPast = false;

        if (eventDate) {
          const d = new Date(eventDate);
          d.setHours(0, 0, 0, 0);
          dateLabel = d.toLocaleDateString();
          isPast = d < today;
        }

        const locationLabel =
          event.location ||
          [event.location_city, event.location_country]
            .filter(Boolean)
            .join(", ") ||
          "";

        const isRed = b.red_fighter_id === profile.id;
        const opponentName = isRed
          ? b.blue_name || "Opponent TBC"
          : b.red_name || "Opponent TBC";

        const result: string | null = b.winner_side || null;
        const resultMethod: string | null = b.result_method || null;
        const resultRound: number | null = b.result_round ?? null;
        const resultTime: string | null = b.result_time || null;

        let outcome = "";
        let outcomeLetter: "W" | "L" | "D" | "" = "";

        if (result === "draw") {
          outcome = "Draw";
          outcomeLetter = "D";
        } else if (result === "red") {
          if (isRed) {
            outcome = "Win";
            outcomeLetter = "W";
          } else {
            outcome = "Loss";
            outcomeLetter = "L";
          }
        } else if (result === "blue") {
          if (!isRed) {
            outcome = "Win";
            outcomeLetter = "W";
          } else {
            outcome = "Loss";
            outcomeLetter = "L";
          }
        }

        let resultSummary = "";
        if (outcome) {
          const parts: string[] = [];
          if (resultMethod) parts.push(resultMethod);
          if (resultRound) parts.push(`R${resultRound}`);
          if (resultTime) parts.push(resultTime);
          resultSummary = parts.length
            ? `${outcome} • ${parts.join(" ")}`
            : outcome;
        }

        const eventBanner: string | null = event.banner_url || null;
        const customPoster: string | null = posterByBoutId[b.id] || null;

        return {
          boutId: b.id,
          manualId: null,
          eventId: b.event_id,
          eventTitle,
          dateLabel,
          isPast,
          cardType: b.card_type || null,
          weight: b.weight || null,
          boutDetails: b.bout_details || null,
          opponentName,
          locationLabel,
          resultSummary,
          outcomeLetter,
          isManual: false,
          eventBanner,
          customPoster,
          posterUrl: customPoster || eventBanner || null,
        };
      });

      const upcoming = fights
        .filter((f) => !f.isPast)
        .sort((a, b) => a.dateLabel.localeCompare(b.dateLabel));

      const past = fights
        .filter((f) => f.isPast)
        .sort((a, b) => b.dateLabel.localeCompare(a.dateLabel));

      // Merge manual entries into upcoming / past based on their date
      const manualPast = manualEntries.filter((f) => f.isPast);
      const manualUpcoming = manualEntries.filter((f) => !f.isPast);

      const sortByDateDesc = (a: any, b: any) => {
        const dateA = new Date(a.dateLabel).getTime();
        const dateB = new Date(b.dateLabel).getTime();
        if (isNaN(dateA) || isNaN(dateB)) return b.dateLabel.localeCompare(a.dateLabel);
        return dateB - dateA;
      };

      const sortByDateAsc = (a: any, b: any) => {
        const dateA = new Date(a.dateLabel).getTime();
        const dateB = new Date(b.dateLabel).getTime();
        if (isNaN(dateA) || isNaN(dateB)) return a.dateLabel.localeCompare(b.dateLabel);
        return dateA - dateB;
      };

      const allPastFights = [...past, ...manualPast].sort(sortByDateDesc);
      const allUpcomingFights = [...upcoming, ...manualUpcoming].sort(sortByDateAsc);

      if (!cancelled) {
        setUpcomingFights(allUpcomingFights);
        setPastFights(allPastFights);
        setManualFights(manualEntries);
        setLoadingFights(false);
      }
    }

    loadFights();

    return () => {
      cancelled = true;
    };
  }, [profile.id, fightRefreshKey]);

  const displayRank =
    rank && String(rank).trim() !== "" ? rank : "–";

  const displayRecord =
    record && String(record).trim() !== "" ? String(record) : "0-0-0";

  const displayAge =
    age !== null && age !== undefined && String(age).trim() !== ""
      ? String(age)
      : "–";

  const displayHeight = (() => {
    if (height_unit === "cm" && height_cm != null) {
      return `${height_cm} cm`;
    }

    if (height_unit === "ft" && height_feet != null) {
      const feet = height_feet;
      const inches = height_inches ?? 0;
      if (inches) return `${feet}′ ${inches}″`;
      return `${feet}′`;
    }

    return "–";
  })();

  const displayWeight =
    weight !== null && weight !== undefined && String(weight).trim() !== ""
      ? `${weight} ${weight_unit || ""}`.trim()
      : "–";

  const displayLast5Form =
    last_5_form && last_5_form.trim() !== "" 
      ? last_5_form.split('').join('-') 
      : "–";

  const displayWinStreak =
    typeof current_win_streak === "number" && current_win_streak > 0
      ? `${current_win_streak}W`
      : "–";

  // Shared renderer for a single fight card (used by both Upcoming & Past tabs).
  function renderFightCard(fight: any) {
    const posterUrl: string | null = fight.posterUrl || null;
    const cardKey = fight.boutId || fight.manualId || fight.eventTitle;

    const openLightbox = () => {
      if (posterUrl) setLightbox({ url: posterUrl, title: fight.eventTitle });
    };

    const openPosterEditor = () => {
      const refId = fight.isManual ? fight.manualId : fight.boutId;
      if (!refId) return;
      setPosterTarget({
        kind: fight.isManual ? "manual" : "platform",
        refId,
        title: fight.eventTitle,
        eventBanner: fight.eventBanner || null,
        customPoster: fight.customPoster || null,
      });
    };

    return (
      <div
        key={cardKey}
        className={`card-compact flex items-stretch gap-3 ${fight.isPast ? "opacity-90" : ""}`}
      >
        {/* Poster */}
        <button
          type="button"
          onClick={openLightbox}
          disabled={!posterUrl}
          aria-label={posterUrl ? `View ${fight.eventTitle} poster` : "No poster"}
          className="relative h-20 w-20 sm:h-24 sm:w-24 rounded-lg overflow-hidden bg-slate-100 shrink-0 group focus:outline-none focus:ring-2 focus:ring-purple-400"
        >
          {posterUrl ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={posterUrl} alt={fight.eventTitle} className="w-full h-full object-cover" />
              <span className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-5h-4m4 0v4m0-4l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                </svg>
              </span>
            </>
          ) : (
            <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-purple-100 to-slate-100">
              <ALogo size={28} className="opacity-20" />
            </div>
          )}
        </button>

        {/* Details */}
        <div className="flex-1 min-w-0 flex flex-col justify-center">
          <div className="flex items-center gap-2">
            {fight.eventId ? (
              <Link
                href={`/events/${fight.eventId}`}
                className="font-medium text-slate-900 truncate hover:text-purple-700"
              >
                {fight.eventTitle}
              </Link>
            ) : (
              <span className="font-medium text-slate-900 truncate">{fight.eventTitle}</span>
            )}
            <span className="text-[11px] text-slate-500 whitespace-nowrap">{fight.dateLabel}</span>
          </div>

          <div className="mt-0.5 text-[11px] text-slate-600 flex flex-wrap items-center gap-x-2 gap-y-1">
            {fight.resultSummary && (
              <span className="font-semibold text-purple-700">{fight.resultSummary}</span>
            )}
            <span>vs {fight.opponentName}</span>
            {fight.boutDetails && <span>{fight.boutDetails}</span>}
            {fight.weight && (
              <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                {fight.weight}
              </span>
            )}
            {fight.locationLabel && <span>{fight.locationLabel}</span>}
          </div>

          <div className="mt-1 flex items-center gap-3">
            {fight.eventId && (
              <Link
                href={`/events/${fight.eventId}`}
                className="text-[11px] text-purple-700 font-medium hover:underline"
              >
                View event
              </Link>
            )}
            {isMe && (
              <button
                type="button"
                onClick={openPosterEditor}
                className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500 hover:text-purple-700"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                {fight.customPoster ? "Edit poster" : "Add poster"}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  const displayYearsTraining =
    years_training != null && years_training > 0
      ? `${years_training} yrs`
      : "–";

  const displayInterclubs =
    typeof interclub_count === "number" && interclub_count >= 0
      ? String(interclub_count)
      : "–";

  // Discipline records
  const [disciplineRecords, setDisciplineRecords] = useState<Array<{
    id: string; discipline: string; wins: number; losses: number; draws: number;
  }>>([]);

  useEffect(() => {
    async function loadDisciplineRecords() {
      try {
        const res = await fetch(`/api/fighters/discipline-records?fighter_id=${profile.id}`);
        if (res.ok) {
          const data = await res.json();
          setDisciplineRecords(data.records || []);
        }
      } catch (err) {
        console.error("Error loading discipline records:", err);
      }
    }
    loadDisciplineRecords();
  }, [profile.id]);

  const flagUrl = countryToFlagUrl(country);

  return (
    <div className="space-y-6">
      {/* SECTION 1 – Banner / header */}
      <section className="rounded-2xl overflow-hidden border border-slate-200 bg-white shadow-sm">
        <div className="relative h-40 w-full bg-slate-200">
          {banner_url && (
            <Image
              src={banner_url}
              alt="Profile banner"
              fill
              className="object-cover"
              quality={90}
            />
          )}
        </div>

        <div className="px-5 pb-5 relative">
          <div className="flex items-center gap-4">
            <div className="-mt-14 md:-mt-16">
              <div className="h-28 w-28 md:h-32 md:w-32 rounded-full border-4 border-white bg-slate-200 overflow-hidden">
                {avatar_url && (
                  <Image
                    src={avatar_url}
                    alt="Avatar"
                    width={400}
                    height={400}
                    className="h-full w-full object-cover"
                    quality={100}
                    priority
                  />
                )}
              </div>
            </div>

            <div className="flex-1">
              <div className="flex flex-col md:flex-row md:items-center gap-3">
                <div className="flex flex-col">
                  <h1 className="text-lg md:text-xl font-semibold">
                    {full_name || "Fighter name"}
                  </h1>
                  {username && (
                    <Link
                      href={`/profile/${username}`}
                      className="mt-0.5 inline-flex items-center text-xs text-slate-600 hover:text-slate-900 hover:underline underline-offset-4"
                    >
                      @{username}
                    </Link>
                  )}
                </div>

                {/* Right: gym + arts + follow stats + Message */}
                <div className="flex flex-col md:ml-6 gap-2 text-xs text-slate-600">
                  <div className="flex flex-wrap gap-2">
                    {gymUsername && (
                      <Link
                        href={`/profile/${gymUsername}`}
                        className="inline-flex items-center text-slate-600 hover:text-slate-900 hover:underline underline-offset-4 transition-colors"
                      >
                        Gym: @{gymUsername}
                      </Link>
                    )}

                    {arts.length > 0 &&
                      arts.map((art) => (
                        <span
                          key={art}
                          className="px-2 py-1 rounded-full bg-purple-50 text-purple-700"
                        >
                          {art}
                        </span>
                      ))}
                  </div>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-1">
                    <FollowStats profileId={profile.id} username={username} />
                    {/* Only show Message button if not my own profile */}
                    {!isMe && (
                      <MessageButton
                        targetProfileId={profile.id}
                        targetUsername={username}
                      />
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 2 – Bio */}
      {!hideBio && (
      <section className="card">
        <div className="section-header mb-4">
          <h2 className="section-title text-lg">{t('Profile.bio')}</h2>
        </div>
        <p className="text-sm text-slate-700 leading-relaxed min-h-[60px]">
          {bio || (isMe ? "Tell people about your fighting style, experience and goals." : "")}
        </p>
      </section>
      )}

      {/* SECTION 2.5 – Championship Belts */}
      <FighterBelts fighterId={profile.id} />

      {/* SECTION 3 – Stats */}
      {!hideStats && (
      <section className="card">
        <div className="section-header mb-4">
          <h2 className="section-title text-lg">{t('Profile.stats')}</h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
          <StatBox label="Level">{displayRank}</StatBox>
          <StatBox label="Country">
            {country && country.trim() !== "" ? country : "–"}
          </StatBox>
          <StatBox label="Record">{displayRecord}</StatBox>
          <StatBox label="Last 5">{displayLast5Form}</StatBox>
          <StatBox label="Win Streak">{displayWinStreak}</StatBox>
          <StatBox label="Age">{displayAge}</StatBox>
          <StatBox label="Height">{displayHeight}</StatBox>
          <StatBox label="Weight">{displayWeight}</StatBox>
          <StatBox label="Martial arts">
            {martial_arts && martial_arts.length
              ? martial_arts.join(", ")
              : "–"}
          </StatBox>
          {hasBjjDiscipline && (
            <StatBox label="BJJ Belt">{displayBjjBelt}</StatBox>
          )}
          <StatBox label="Yrs Training">{displayYearsTraining}</StatBox>
          <StatBox label="Interclubs">{displayInterclubs}</StatBox>
        </div>

        {/* Discipline Record Breakdown */}
        {disciplineRecords.length > 0 && (
          <div className="mt-4 pt-4 border-t border-slate-100">
            <h3 className="text-xs font-semibold text-slate-700 mb-2">Record by Discipline</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {disciplineRecords.map((rec) => (
                <div
                  key={rec.id}
                  className="rounded-lg bg-slate-50 border border-slate-100 px-3 py-2"
                >
                  <div className="text-xs font-medium text-slate-800">{rec.discipline}</div>
                  <div className="text-sm font-semibold text-slate-900">
                    {rec.wins}-{rec.losses}-{rec.draws}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>
      )}

      {/* SECTION 4 – Promotions */}
      <FighterPromotions fighterId={profile.id} />

      {/* SECTION 5 – Fights */}
      {showFightsSection && (
      <section className="card">
        <div className="flex items-center justify-between mb-4 border-b border-slate-200">
          <div className="flex gap-4">
            {showUpcomingFights && (
              <button
                onClick={() => setActiveFightsTab("upcoming")}
                className={`pb-3 px-1 text-sm font-medium transition-all duration-200 ${
                  effectiveFightsTab === "upcoming"
                    ? "text-purple-700 border-b-2 border-purple-700"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Upcoming Fights
              </button>
            )}
            {showPastFights && (
              <button
                onClick={() => setActiveFightsTab("past")}
                className={`pb-3 px-1 text-sm font-medium transition-all duration-200 ${
                  effectiveFightsTab === "past"
                    ? "text-purple-700 border-b-2 border-purple-700"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Past Fights
              </button>
            )}
          </div>
          {isMe && (
            <button
              type="button"
              onClick={() => setFightModalOpen(true)}
              aria-label="Manage fights"
              className="mb-3 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-600 text-white text-xs font-medium hover:bg-purple-700 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
              </svg>
              Add Fight
            </button>
          )}
        </div>

        {loadingFights ? (
          <p className="text-sm text-slate-600">Loading fights…</p>
        ) : (
          <div className="space-y-4 text-sm">
            {/* Upcoming Fights Tab */}
            {effectiveFightsTab === "upcoming" && showUpcomingFights && (
              <div className="space-y-3">
                {upcomingFights.length === 0 ? (
                  <p className="text-sm text-slate-600 py-4">
                    No upcoming fights linked yet.
                  </p>
                ) : (
                  <>
                    <div className="space-y-3">
                      {upcomingFights
                        .slice(0, upcomingDisplayCount)
                        .map((fight) => renderFightCard(fight))}
                    </div>
                    {upcomingFights.length > upcomingDisplayCount && (
                      <div className="flex justify-center mt-4">
                        <button
                          onClick={() => setUpcomingDisplayCount(prev => prev + 6)}
                          className="px-4 py-2 rounded-lg border border-slate-300 bg-white text-slate-700 text-sm font-medium hover:bg-slate-50 transition-colors"
                        >
                          Load More
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {/* Past Fights Tab */}
            {effectiveFightsTab === "past" && showPastFights && (
              <div className="space-y-3">
                {pastFights.length === 0 ? (
                  <p className="text-sm text-slate-600 py-4">
                    No past fights found.
                  </p>
                ) : (
                  <>
                    <div className="space-y-3">
                      {pastFights
                        .slice(0, pastDisplayCount)
                        .map((fight) => renderFightCard(fight))}
                    </div>
                    {pastFights.length > pastDisplayCount && (
                      <div className="flex justify-center mt-4">
                        <button
                          onClick={() => setPastDisplayCount(prev => prev + 6)}
                          className="px-4 py-2 rounded-lg border border-slate-300 bg-white text-slate-700 text-sm font-medium hover:bg-slate-50 transition-colors"
                        >
                          Load More
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        )}
      </section>
      )}

      {/* SECTION 6 – Social feed */}
      {socialFeedSlot || (hidePosts ? null : (
        <section className="card">
          <div className="section-header mb-4">
            <h2 className="section-title text-lg">Social feed</h2>
          </div>
          <div className="flex items-center justify-between mb-4">
            {isOwnProfile && (
              <button
                onClick={() => setIsCreatePostModalOpen(true)}
                className="flex items-center justify-center w-8 h-8 rounded-full bg-purple-600 text-white hover:bg-purple-700 transition-colors"
                title="Create new post"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4v16m8-8H4"
                  />
                </svg>
              </button>
            )}
          </div>

          {!posts || posts.length === 0 ? (
            <div className="h-24 rounded-xl border border-dashed border-slate-200 flex items-center justify-center text-xs text-slate-400">
              No posts yet.
            </div>
          ) : (
            <div className="mt-3 relative">
              {posts.length >= 6 && (
                <>
                  <button
                    type="button"
                    onClick={() => setPostPage(Math.max(0, postPage - 1))}
                    disabled={postPage === 0}
                    className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 z-10 bg-white rounded-full p-2 shadow-lg border border-slate-200 hover:bg-purple-50 hover:border-purple-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    aria-label="Show newer posts"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5 text-slate-700"
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
                  </button>
                  <button
                    type="button"
                    onClick={() => setPostPage(Math.min(Math.ceil(posts.length / 6) - 1, postPage + 1))}
                    disabled={postPage >= Math.ceil(posts.length / 6) - 1}
                    className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 z-10 bg-white rounded-full p-2 shadow-lg border border-slate-200 hover:bg-purple-50 hover:border-purple-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    aria-label="Show older posts"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5 text-slate-700"
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
                  </button>
                </>
              )}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {(posts.length >= 6
                  ? posts.slice(postPage * 6, postPage * 6 + 6)
                  : posts
                ).map((post) => (
                <article
                  key={post.id}
                  onClick={() => router.push(`/posts/${post.id}`)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      router.push(`/posts/${post.id}`);
                    }
                  }}
                  className="group relative rounded-xl border border-slate-200 bg-white overflow-hidden hover:border-purple-400 hover:shadow-md transition-all cursor-pointer"
                >
                  {isOwnProfile && (
                    <PostActionsMenu
                      postId={post.id}
                      initialContent={post.content || null}
                      initialImageUrl={post.image_url || null}
                      variant={post.image_url ? "dark" : "light"}
                    />
                  )}
                  {(post.image_url || post.image_urls) ? (
                    <div className="relative aspect-square overflow-hidden bg-slate-100">
                      <PostImages imageUrl={post.image_url} imageUrls={post.image_urls} />
                      {/* Overlay with content and date */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        <div className="absolute bottom-0 left-0 right-0 p-3 text-white">
                          {post.content && (
                            <div className="mb-1">
                              <PostContent content={post.content} truncate className="text-white" />
                            </div>
                          )}
                          <div className="flex items-center gap-2 mt-2">
                            <div className="text-[10px] text-white/80">
                              {new Date(post.created_at).toLocaleDateString()}
                            </div>
                            <div className="flex items-center gap-3">
                              <PostReactions
                                postId={post.id}
                                commentHref={`/posts/${post.id}`}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                      {/* Date badge - always visible */}
                      <div className="absolute top-2 left-2 bg-black/50 backdrop-blur-sm rounded-lg px-2 py-1">
                        <span className="text-[10px] text-white font-medium">
                          {new Date(post.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  ) : post.post_metadata?.type === "bout_share" ? (
                    <div className="relative aspect-square overflow-hidden">
                      <BoutShareCard metadata={post.post_metadata as BoutShareMetadata} compact />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
                        <div className="absolute bottom-3 left-3 right-3 pointer-events-auto">
                          <PostReactions postId={post.id} commentHref={`/posts/${post.id}`} />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="relative aspect-square p-4 flex flex-col justify-between bg-gradient-to-br from-purple-50 to-slate-50">
                      <div>
                        {post.content && (
                          <div className="mb-2">
                            <PostContent content={post.content} className="line-clamp-4" />
                          </div>
                        )}
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="text-[10px] text-slate-500">
                          {new Date(post.created_at).toLocaleDateString()}
                        </div>
                      </div>
                      {/* Hover overlay with reactions */}
                      <div className="absolute inset-0 bg-gradient-to-t from-purple-900/70 via-purple-900/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
                        <div className="absolute bottom-3 left-3 right-3 pointer-events-auto">
                          <PostReactions
                            postId={post.id}
                            commentHref={`/posts/${post.id}`}
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </article>
                ))}
              </div>
            </div>
          )}
          {isOwnProfile && (
            <CreatePostModal
              isOpen={isCreatePostModalOpen}
              onClose={() => setIsCreatePostModalOpen(false)}
              profileId={profile.id}
            />
          )}
        </section>
      ))}

      {/* SECTION 6 – Social media links */}
      {((social_links?.instagram || social_links?.facebook || social_links?.twitter || social_links?.tiktok || social_links?.youtube) ||
        (social_links?.websites && Array.isArray(social_links.websites) && social_links.websites.length > 0) ||
        (social_links?.website)) && (
        <section className="card">
          <div className="section-header mb-4">
            <h2 className="section-title text-lg">Social media links</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
            {social_links?.instagram && (
              <SocialRow label="Instagram" value={social_links.instagram} />
            )}
            {social_links?.facebook && (
              <SocialRow label="Facebook" value={social_links.facebook} />
            )}
            {social_links?.twitter && (
              <SocialRow label="Twitter / X" value={social_links.twitter} />
            )}
            {social_links?.tiktok && (
              <SocialRow label="TikTok" value={social_links.tiktok} />
            )}
            {social_links?.youtube && (
              <SocialRow label="YouTube" value={social_links.youtube} />
            )}
            {/* Multiple website links */}
            {social_links?.websites && Array.isArray(social_links.websites) && social_links.websites.length > 0
              ? social_links.websites.map((website: { name: string; url: string }, index: number) => (
                  <SocialRow key={index} label={website.name || "Website"} value={website.url} />
                ))
              : social_links?.website && (
                  <SocialRow label="Website" value={social_links.website} />
                )}
          </div>
        </section>
      )}

      {/* Fight management modal — only mounted for own profile */}
      {isMe && (
        <FightModal
          fighterId={profile.id}
          isOpen={fightModalOpen}
          onClose={() => setFightModalOpen(false)}
          onUpdate={() => setFightRefreshKey((k) => k + 1)}
        />
      )}

      {/* Poster editor — only mounted for own profile */}
      {isMe && (
        <FightPosterModal
          isOpen={posterTarget !== null}
          onClose={() => setPosterTarget(null)}
          fighterId={profile.id}
          target={posterTarget}
          onUpdated={() => setFightRefreshKey((k) => k + 1)}
        />
      )}

      {/* Full-screen poster viewer with download (everyone) */}
      <FightPosterLightbox
        isOpen={lightbox !== null}
        onClose={() => setLightbox(null)}
        posterUrl={lightbox?.url || null}
        title={lightbox?.title || ""}
      />
    </div>
  );
}

function StatBox(props: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-200 p-2 bg-slate-50">
      <div className="text-[10px] uppercase tracking-wide text-slate-500 mb-1">
        {props.label}
      </div>
      <div className="text-xs font-medium text-slate-800">
        {props.children}
      </div>
    </div>
  );
}

function SocialRow({ label, value }: { label: string; value?: string }) {
  if (!value) {
    return null; // Don't render empty links
  }

  // Format URL for display and href
  const formatUrl = (url: string): { display: string; href: string } => {
    const trimmed = url.trim();
    
    // Handle @handles for social media
    if (trimmed.startsWith("@")) {
      const handle = trimmed.substring(1);
      // Determine platform URL based on label
      let baseUrl = "";
      if (label.toLowerCase().includes("instagram")) {
        baseUrl = "https://instagram.com/";
      } else if (label.toLowerCase().includes("twitter") || label.toLowerCase().includes("x")) {
        baseUrl = "https://twitter.com/";
      } else if (label.toLowerCase().includes("tiktok")) {
        baseUrl = "https://tiktok.com/@";
      } else if (label.toLowerCase().includes("youtube")) {
        baseUrl = "https://youtube.com/@";
      } else if (label.toLowerCase().includes("facebook")) {
        baseUrl = "https://facebook.com/";
      }
      return {
        display: trimmed,
        href: baseUrl ? `${baseUrl}${handle}` : trimmed,
      };
    }
    
    // If it already has http:// or https://, use as is
    if (/^https?:\/\//i.test(trimmed)) {
      return {
        display: trimmed.replace(/^https?:\/\//, ""),
        href: trimmed,
      };
    }
    
    // Otherwise, add https://
    return {
      display: trimmed,
      href: `https://${trimmed}`,
    };
  };

  const { display, href } = formatUrl(value);

  return (
    <Link
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2 text-slate-700 text-xs hover:border-purple-400 hover:text-purple-700 transition-colors"
    >
      <span>{label}</span>
      <span className="font-medium truncate max-w-[160px]">{display}</span>
    </Link>
  );
}







