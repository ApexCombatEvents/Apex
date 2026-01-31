// components/home/NewsAndUpdates.tsx
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { createSupabaseBrowser } from "@/lib/supabase-browser";
import { useTranslation } from "@/hooks/useTranslation";

type EventUpdate = {
  id: string;
  event_id?: string;
  event_name?: string;
  profile_id?: string;
  profile_name?: string;
  profile_username?: string;
  type: "bout_added" | "bout_matched" | "bout_started" | "event_updated" | "post" | "event_live" | "bout_result";
  message: string;
  created_at: string;
  martial_arts: string[] | null;
  post_content?: string;
  post_image_url?: string | null;
};

type NewsAndUpdatesProps = {
  selectedSports?: string[];
};

// Helper to detect if URL is a video
function isVideoUrl(url: string): boolean {
  const videoExtensions = ['.mp4', '.webm', '.mov', '.avi', '.mkv', '.m4v', '.ogg'];
  const lowerUrl = url.toLowerCase();
  return videoExtensions.some(ext => lowerUrl.includes(ext));
}

export default function NewsAndUpdates({ selectedSports = [] }: NewsAndUpdatesProps) {
  const supabase = createSupabaseBrowser();
  const { t } = useTranslation();
  const [updates, setUpdates] = useState<EventUpdate[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user;
      
      if (!user) {
        setLoading(false);
        return;
      }

      setUserId(user.id);

      // Get profiles the user is following
      const { data: followedProfiles, error: followsError } = await supabase
        .from("profile_follows")
        .select("following_id")
        .eq("follower_id", user.id);

      if (followsError) {
        console.error("Error loading followed profiles:", followsError);
      }

      const followedProfileIds = followedProfiles?.map((f) => f.following_id) || [];

      // Get events the user is following
      const { data: followedEvents, error: eventFollowsError } = await supabase
        .from("event_follows")
        .select("event_id")
        .eq("profile_id", user.id);

      if (eventFollowsError) {
        console.error("Error loading followed events:", eventFollowsError);
      }

      const eventIds = followedEvents?.map((f) => f.event_id) || [];
      console.log("Followed event IDs:", eventIds);
      console.log("Followed profile IDs:", followedProfileIds);

      // Get event details for followed events
      const { data: events, error: eventsError } = eventIds.length > 0 ? await supabase
        .from("events")
        .select("id, name, martial_art")
        .in("id", eventIds) : { data: null, error: null };

      if (eventsError) {
        console.error("Error loading events", eventsError);
      }

      const eventUpdates: EventUpdate[] = [];

      // Get posts from followed profiles (last 30 days, limit 20)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      if (followedProfileIds.length > 0) {

        const { data: posts, error: postsError } = await supabase
          .from("profile_posts")
          .select("id, content, created_at, image_url, profile_id")
          .in("profile_id", followedProfileIds)
          .gte("created_at", thirtyDaysAgo.toISOString())
          .order("created_at", { ascending: false })
          .limit(20);

        if (postsError) {
          console.error("Error loading posts from followed profiles:", postsError);
        } else if (posts) {
          // Get profile details for post authors
          const profileIds = Array.from(new Set(posts.map((p) => p.profile_id)));
          const { data: profiles, error: profilesError } = await supabase
            .from("profiles")
            .select("id, full_name, username, martial_arts")
            .in("id", profileIds);

          if (profilesError) {
            console.error("Error loading post author profiles:", profilesError);
          } else if (profiles) {
            const profilesById: Record<string, any> = {};
            profiles.forEach((p) => {
              profilesById[p.id] = p;
            });

            // Add posts to updates
            for (const post of posts) {
              const author = profilesById[post.profile_id];
              if (!author) continue;

              const authorName = author.full_name || author.username || "Someone";
              const authorUsername = author.username;
              const martialArts = author.martial_arts;

              // Apply sport filter if selected (check author's martial arts)
              if (selectedSports.length > 0 && martialArts) {
                const authorSports = Array.isArray(martialArts) ? martialArts : [martialArts];
                const hasSelectedSport = selectedSports.some((sport) =>
                  authorSports.some((art: string) =>
                    art.toLowerCase().includes(sport.toLowerCase())
                  )
                );
                if (!hasSelectedSport) continue;
              }

              eventUpdates.push({
                id: `post-${post.id}`,
                profile_id: post.profile_id,
                profile_name: authorName,
                profile_username: authorUsername,
                type: "post",
                message: `${authorName} posted`,
                created_at: post.created_at,
                martial_arts: martialArts ? (Array.isArray(martialArts) ? martialArts : [martialArts]) : null,
                post_content: post.content,
                post_image_url: post.image_url,
              });
            }
          }
        }
      }

      if (events && events.length > 0 && eventIds.length > 0) {
        // Get all bouts for these events
        const { data: allBouts, error: allBoutsError } = await supabase
          .from("event_bouts")
          .select("id, event_id, red_fighter_id, blue_fighter_id, created_at")
          .in("event_id", eventIds);

        if (allBoutsError) {
          console.error("Error loading bouts", allBoutsError);
        }

        const boutIds = allBouts?.map((b) => b.id) || [];

        // Get recent bout offers for these events (created in last 30 days)
        const { data: offers, error: offersError } = boutIds.length > 0 ? await supabase
          .from("event_bout_offers")
          .select("id, created_at, fighter_profile_id, bout_id")
          .in("bout_id", boutIds)
          .eq("status", "pending")
          .gte("created_at", thirtyDaysAgo.toISOString())
          .order("created_at", { ascending: false })
          .limit(20) : { data: null, error: null };

        if (offersError) {
          console.error("Error loading offers", offersError);
        }

        // Create a map of bout_id to event_id
        const boutToEventMap: Record<string, string> = {};
        allBouts?.forEach((bout) => {
          boutToEventMap[bout.id] = bout.event_id;
        });

        // Process offers
        if (offers && !offersError) {
          for (const offer of offers) {
            const eventId = boutToEventMap[offer.bout_id];
            if (!eventId) continue;

            const event = events.find((e) => e.id === eventId);
            if (!event) continue;

            const martialArt = event.martial_art;
            
            // Apply sport filter if selected
            if (selectedSports.length > 0 && martialArt) {
              const hasSelectedSport = selectedSports.some((sport) =>
                martialArt.toLowerCase().includes(sport.toLowerCase())
              );
              if (!hasSelectedSport) continue;
            }

            // Get fighter name
            const { data: fighter } = await supabase
              .from("profiles")
              .select("full_name, username")
              .eq("id", offer.fighter_profile_id)
              .single();

            const fighterName = fighter?.full_name || fighter?.username || "A fighter";

            eventUpdates.push({
              id: `offer-${offer.id}`,
              event_id: eventId,
              event_name: event.name || "Event",
              type: "bout_added",
              message: `New bout offer for ${fighterName}`,
              created_at: offer.created_at,
              martial_arts: martialArt ? [martialArt] : null,
            });
          }
        }

        // Get notifications for event updates
        const { data: eventNotifs, error: eventNotifsError } = await supabase
          .from("notifications")
          .select("id, type, data, created_at")
          .eq("profile_id", user.id)
          .in("type", ["event_bout_matched", "event_live", "bout_result", "bout_added", "bout_started"])
          .order("created_at", { ascending: false })
          .limit(50);

        if (!eventNotifsError && eventNotifs) {
          for (const notif of eventNotifs) {
            const eventId = notif.data?.event_id;
            if (!eventId || !eventIds.includes(eventId)) continue;

            const event = events.find((e) => e.id === eventId);
            if (!event) continue;

            const martialArt = event.martial_art || notif.data?.martial_art;
            
            // Apply sport filter if selected
            if (selectedSports.length > 0 && martialArt) {
              const hasSelectedSport = selectedSports.some((sport) =>
                martialArt.toLowerCase().includes(sport.toLowerCase())
              );
              if (!hasSelectedSport) continue;
            }

            if (notif.type === "event_live") {
              eventUpdates.push({
                id: `event-live-${notif.id}`,
                event_id: eventId,
                event_name: event.name || notif.data?.event_name || "Event",
                type: "event_live",
                message: `${event.name || notif.data?.event_name || "Event"} is now live!`,
                created_at: notif.created_at,
                martial_arts: martialArt ? [martialArt] : null,
              });
            } else if (notif.type === "bout_result") {
              const winnerName = notif.data?.winner_name || "Winner";
              const cornerText = notif.data?.corner_text || "";
              const method = notif.data?.method;
              const round = notif.data?.round;
              const time = notif.data?.time;

              let message = cornerText ? `${cornerText} ${winnerName} wins` : `${winnerName} wins`;
              if (method) message += ` ${method}`;
              if (round) message += ` round ${round}`;
              if (time) message += ` @ ${time}`;

              eventUpdates.push({
                id: `bout-result-${notif.id}`,
                event_id: eventId,
                event_name: event.name || notif.data?.event_name || "Event",
                type: "bout_result",
                message: message,
                created_at: notif.created_at,
                martial_arts: martialArt ? [martialArt] : null,
              });
            } else if (notif.type === "event_bout_matched") {
              const fighterName = notif.data?.fighter_name || "A fighter";
              const side = notif.data?.side === "red" ? "red corner" : "blue corner";

              eventUpdates.push({
                id: `bout-matched-${notif.id}`,
                event_id: eventId,
                event_name: event.name || notif.data?.event_name || "Event",
                type: "bout_matched",
                message: `Bout matched: ${fighterName} assigned to ${side}`,
                created_at: notif.created_at,
                martial_arts: martialArt ? [martialArt] : null,
              });
            } else if (notif.type === "bout_added") {
              const redName = notif.data?.red_name || "TBC";
              const blueName = notif.data?.blue_name || "TBC";
              const cardType = notif.data?.card_type === "main" ? "Main card" : "Undercard";
              const boutNumber = notif.data?.bout_number;

              let message = `New bout added: ${redName} vs ${blueName}`;
              if (boutNumber) {
                message = `${cardType} bout ${boutNumber}: ${redName} vs ${blueName}`;
              }

              eventUpdates.push({
                id: `bout-added-${notif.id}`,
                event_id: eventId,
                event_name: event.name || notif.data?.event_name || "Event",
                type: "bout_added",
                message: message,
                created_at: notif.created_at,
                martial_arts: martialArt ? [martialArt] : null,
              });
            } else if (notif.type === "bout_started") {
              const redName = notif.data?.red_name || "TBC";
              const blueName = notif.data?.blue_name || "TBC";
              const boutNumber = notif.data?.bout_number;

              let message = `Fight started: ${redName} vs ${blueName}`;
              if (boutNumber) {
                message = `Bout ${boutNumber} started: ${redName} vs ${blueName}`;
              }

              eventUpdates.push({
                id: `bout-started-${notif.id}`,
                event_id: eventId,
                event_name: event.name || notif.data?.event_name || "Event",
                type: "bout_started",
                message: message,
                created_at: notif.created_at,
                martial_arts: martialArt ? [martialArt] : null,
              });
            }
          }
        }

        // Also process matched bouts directly (bouts with both fighters, created in last 30 days)
        if (allBouts && !allBoutsError) {
          for (const bout of allBouts) {
            // Only include bouts that have both fighters assigned
            if (!bout.red_fighter_id || !bout.blue_fighter_id) continue;
            
            // Only show recent bouts (created in last 30 days)
            const boutDate = new Date(bout.created_at);
            if (boutDate < thirtyDaysAgo) continue;
            
            const event = events.find((e) => e.id === bout.event_id);
            if (!event) continue;

            const martialArt = event.martial_art;
            
            // Apply sport filter if selected
            if (selectedSports.length > 0 && martialArt) {
              const hasSelectedSport = selectedSports.some((sport) =>
                martialArt.toLowerCase().includes(sport.toLowerCase())
              );
              if (!hasSelectedSport) continue;
            }

            // Only add if we don't already have a notification for this bout
            const existingUpdate = eventUpdates.find(
              (u) => u.event_id === bout.event_id && u.type === "bout_matched"
            );
            
            if (!existingUpdate) {
              eventUpdates.push({
                id: `bout-${bout.id}`,
                event_id: bout.event_id,
                event_name: event.name || "Event",
                type: "bout_matched",
                message: `A bout has been matched`,
                created_at: bout.created_at,
                martial_arts: martialArt ? [martialArt] : null,
              });
            }
          }
        }
      }

      // Sort by created_at descending and limit to 10 most recent
      eventUpdates.sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      
      const uniqueUpdates = eventUpdates.slice(0, 10);
      
      console.log("Event updates found:", uniqueUpdates.length, uniqueUpdates);

      setUpdates(uniqueUpdates);
      setLoading(false);
    }

    load();
  }, [supabase, selectedSports]);

  if (loading) {
    return (
      <div className="text-sm text-slate-600">
        {t('Common.loadingUpdates')}
      </div>
    );
  }

  if (!userId) {
    return (
      <div className="text-sm text-slate-600">
        {t('Common.signInUpdates')}
      </div>
    );
  }

  if (updates.length === 0) {
    return (
      <div className="text-sm text-slate-600">
        {t('Common.noUpdates')}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {updates.map((update) => {
        // For user posts, extract the post ID and link to the full post page
        // For event notifications, link to the event page
        let href = "#";
        if (update.type === "post") {
          // Extract post ID from "post-{id}" format
          const postId = update.id.replace("post-", "");
          href = `/posts/${postId}`;
        } else if (update.event_id) {
          href = `/events/${update.event_id}`;
        }

        return (
          <Link
            key={update.id}
            href={href}
            className="block rounded-xl border border-slate-200 p-3 hover:border-purple-300 hover:bg-purple-50/60 transition-colors"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <p className="text-sm text-slate-900 font-medium mb-1">
                  {update.type === "post" ? update.profile_name : update.event_name}
                </p>
                {update.type === "post" && update.post_image_url && (
                  <div className="mb-2 rounded-lg overflow-hidden relative h-48 bg-slate-100">
                    {isVideoUrl(update.post_image_url) ? (
                      <video
                        src={update.post_image_url}
                        className="w-full h-full object-cover"
                        muted
                        playsInline
                        preload="metadata"
                      />
                    ) : (
                      <Image
                        src={update.post_image_url}
                        alt="Post"
                        fill
                        sizes="100vw"
                        className="object-cover"
                      />
                    )}
                  </div>
                )}
                <p className="text-xs text-slate-600 whitespace-pre-wrap break-words">
                  {update.type === "post" && update.post_content
                    ? update.post_content.length > 150
                      ? update.post_content.substring(0, 150) + "..."
                      : update.post_content
                    : update.type === "event_live" || update.type === "bout_result"
                    ? (
                        <span className="inline-flex items-center gap-1.5">
                          {update.type === "event_live" && (
                            <span className="inline-flex h-2 w-2 rounded-full bg-red-600 animate-pulse"></span>
                          )}
                          <span className="font-semibold">{update.message}</span>
                        </span>
                      )
                    : update.message}
                </p>
                {update.martial_arts && update.martial_arts.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {update.martial_arts.map((art, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 text-[10px]"
                      >
                        {art}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <span className="text-[10px] text-slate-400 whitespace-nowrap">
                {new Date(update.created_at).toLocaleDateString()}
              </span>
            </div>
          </Link>
        );
      })}
    </div>
  );
}

