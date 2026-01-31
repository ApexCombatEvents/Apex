// app/notifications/page.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createSupabaseBrowser } from "@/lib/supabase-browser";

type Notification = {
  id: string;
  type: string;
  data: any;
  is_read: boolean;
  created_at: string;
  actor_profile_id?: string | null;
};

export default function NotificationsPage() {
  const [items, setItems] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [actorProfiles, setActorProfiles] = useState<Record<string, { name: string; handle: string | null }>>({});
  const supabase = createSupabaseBrowser();

  async function loadNotifications() {
    setLoading(true);
    try {
      const res = await fetch("/api/notifications");
      if (!res.ok) return;
      const json = await res.json();
      const notifications = json.notifications || [];
      setItems(notifications);

      // Fetch actor profiles for ALL notifications that have an actor_profile_id
      // This ensures we have names for likes, comments, follows, etc.
      const notificationsNeedingData = notifications.filter(
        (n: Notification) => n.actor_profile_id && !n.data?.actor_name
      );

      if (notificationsNeedingData.length > 0) {
        const actorIds = Array.from(
          new Set(notificationsNeedingData.map((n: Notification) => n.actor_profile_id).filter(Boolean))
        ) as string[];

        if (actorIds.length > 0) {
          const { data: profiles, error: profilesError } = await supabase
            .from("profiles")
            .select("id, display_name, full_name, username, handle")
            .in("id", actorIds);

          if (profilesError) {
            console.error("Error fetching actor profiles:", profilesError);
          }

          if (profiles && profiles.length > 0) {
            const profilesMap: Record<string, { name: string; handle: string | null }> = {};
            profiles.forEach((p: any) => {
              let name = p.display_name || p.full_name || p.username;
              if (!name && p.handle) {
                name = `@${p.handle}`;
              }
              if (!name) return;
              const handle = p.username || p.handle || null;
              profilesMap[p.id] = { name, handle };
            });
            setActorProfiles(profilesMap);

            setItems((prev) =>
              prev.map((n) => {
                if (n.actor_profile_id && profilesMap[n.actor_profile_id]) {
                  const profile = profilesMap[n.actor_profile_id];
                  const updatedData = { ...n.data };

                  // Update notification data with actor profile info based on type
                  if (n.type === "follow" || n.type === "event_follow") {
                    updatedData.follower_name = profile.name;
                    updatedData.follower_handle = profile.handle;
                  } else if (n.type === "event_like" || n.type === "post_like") {
                    updatedData.liker_name = profile.name;
                    updatedData.liker_handle = profile.handle;
                  } else if (n.type === "event_comment" || n.type === "post_comment") {
                    updatedData.commenter_name = profile.name;
                    updatedData.commenter_handle = profile.handle;
                  } else if (n.type === "offer_accepted" || n.type === "offer_declined") {
                    // Store organizer name for offer notifications
                    updatedData.organizer_name = profile.name;
                    updatedData.organizer_handle = profile.handle;
                  }
                  
                  // Always store generic actor info for fallback
                  updatedData.actor_name = profile.name;
                  updatedData.actor_handle = profile.handle;

                  return {
                    ...n,
                    data: updatedData,
                  };
                }
                return n;
              })
            );
          }
        }
      }
    } catch (err) {
      console.error("notifications load error", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadNotifications();
    // Mark all as read when page loads
    fetch("/api/notifications/mark-read-all", { method: "POST" }).catch((err) =>
      console.error("mark-read-all error", err)
    );
  }, []);

  async function handleNotificationClick(n: Notification) {
    // Mark notification as read
    if (!n.is_read) {
      try {
        await fetch("/api/notifications/mark-read", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ notificationId: n.id }),
        });
        setItems((prev) => prev.map((item) => (item.id === n.id ? { ...item, is_read: true } : item)));
      } catch (err) {
        console.error("mark-read error", err);
      }
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Notifications</h1>
          <p className="text-sm text-slate-600 mt-1">Stay updated with your activity</p>
        </div>
        <Link
          href="/"
          className="px-4 py-2 rounded-xl border border-purple-600 bg-white text-purple-700 text-sm font-medium hover:bg-purple-50 transition-colors"
        >
          Back to home →
        </Link>
      </div>

      <div className="card">
        {loading ? (
          <div className="py-8 text-center text-slate-600">Loading notifications...</div>
        ) : items.length === 0 ? (
          <div className="py-12 text-center">
            <div className="text-4xl mb-4">🔔</div>
            <p className="text-slate-600">No notifications yet.</p>
            <p className="text-sm text-slate-500 mt-2">You&apos;ll see updates here when someone interacts with your content.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {items.map((n) => {
              const href = getNotificationHref(n);
              const notificationContent = renderNotificationText(n, href, actorProfiles);

              const notificationElement = (
                <div
                  className={`px-4 py-4 transition-colors ${
                    n.is_read ? "bg-white hover:bg-slate-50" : "bg-purple-50 hover:bg-purple-100"
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="text-xs text-slate-500 mb-2">
                        {new Date(n.created_at).toLocaleString()}
                      </div>
                      <div className="text-sm text-slate-900">{notificationContent}</div>
                    </div>
                  </div>
                </div>
              );

              if (href) {
                return (
                  <Link
                    key={n.id}
                    href={href}
                    onClick={() => handleNotificationClick(n)}
                    className="block no-underline"
                  >
                    {notificationElement}
                  </Link>
                );
              }

              return <div key={n.id}>{notificationElement}</div>;
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function renderNotificationText(
  n: Notification,
  href?: string | null,
  actorProfiles?: Record<string, { name: string; handle: string | null }>
): React.ReactNode {
  if (n.type === "message") {
    const sender = n.data?.sender_username || n.data?.sender_name || "New message";
    const preview = n.data?.body_preview || n.data?.preview || "";
    return (
      <>
        <span className="font-semibold">{sender}</span>
        {preview && <>: {preview}</>}
      </>
    );
  }

  if (n.type === "follow") {
    let followerName =
      (n.actor_profile_id && actorProfiles?.[n.actor_profile_id]?.name) ||
      (n.data?.follower_name && n.data?.follower_name !== "Someone" ? n.data?.follower_name : null);

    if (!followerName) {
      followerName = n.data?.follower_handle ? `@${n.data.follower_handle}` : null;
    }

    if (!followerName) {
      return <>A user started following you</>;
    }

    const followerHandle =
      (n.actor_profile_id && actorProfiles?.[n.actor_profile_id]?.handle) || n.data?.follower_handle || null;

    return (
      <>
        {followerHandle ? (
          <Link href={`/profile/${followerHandle}`} className="font-semibold text-purple-700 hover:underline">
            {followerName}
          </Link>
        ) : (
          <span className="font-semibold text-purple-700">{followerName}</span>
        )}{" "}
        started following you
      </>
    );
  }

  if (n.type === "post_like") {
    // Try multiple sources for the liker name
    let liker =
      (n.actor_profile_id && actorProfiles?.[n.actor_profile_id]?.name) ||
      (n.data?.liker_name && n.data?.liker_name !== "Someone" && n.data?.liker_name ? n.data?.liker_name : null) ||
      (n.data?.actor_name && n.data?.actor_name !== "Someone" ? n.data?.actor_name : null);

    // If no name, try handle
    if (!liker) {
      liker = n.data?.liker_handle ? `@${n.data.liker_handle}` : 
              n.data?.actor_handle ? `@${n.data.actor_handle}` : null;
    }

    // If still no liker info, show generic message
    if (!liker) {
      return <>A user liked your post</>;
    }

    const likerHandle = (n.actor_profile_id && actorProfiles?.[n.actor_profile_id]?.handle) || 
                       n.data?.liker_handle || 
                       n.data?.actor_handle || 
                       null;
    return (
      <>
        {likerHandle ? (
          <Link href={`/profile/${likerHandle}`} className="font-semibold text-purple-700 hover:underline">
            {liker}
          </Link>
        ) : (
          <span className="font-semibold">{liker}</span>
        )}{" "}
        liked your post
      </>
    );
  }

  if (n.type === "post_comment") {
    let commenter =
      (n.actor_profile_id && actorProfiles?.[n.actor_profile_id]?.name) ||
      (n.data?.commenter_name && n.data?.commenter_name !== "Someone" ? n.data?.commenter_name : null);

    if (!commenter) {
      commenter = n.data?.commenter_handle ? `@${n.data.commenter_handle}` : null;
    }

    if (!commenter) {
      const preview = n.data?.comment_preview || "";
      return <>A user commented on your post{preview && <>: &quot;{preview}&quot;</>}</>;
    }

    const commenterHandle =
      (n.actor_profile_id && actorProfiles?.[n.actor_profile_id]?.handle) || n.data?.commenter_handle || null;
    const preview = n.data?.comment_preview || "";
    return (
      <>
        {commenterHandle ? (
          <Link href={`/profile/${commenterHandle}`} className="font-semibold text-purple-700 hover:underline">
            {commenter}
          </Link>
        ) : (
          <span className="font-semibold">{commenter}</span>
        )}{" "}
        commented on your post
        {preview && <>: &quot;{preview}&quot;</>}
      </>
    );
  }

  if (n.type === "event_like") {
    let liker =
      (n.actor_profile_id && actorProfiles?.[n.actor_profile_id]?.name) ||
      (n.data?.liker_name && n.data?.liker_name !== "Someone" ? n.data?.liker_name : null);

    if (!liker) {
      liker = n.data?.liker_handle ? `@${n.data.liker_handle}` : null;
    }

    if (!liker) {
      const eventName = n.data?.event_name || "your event";
      return (
        <>
          A user liked your event <span className="font-semibold">{eventName}</span>
        </>
      );
    }

    const likerHandle = (n.actor_profile_id && actorProfiles?.[n.actor_profile_id]?.handle) || n.data?.liker_handle || null;
    const eventName = n.data?.event_name || "your event";

    return (
      <>
        {likerHandle ? (
          <Link href={`/profile/${likerHandle}`} className="font-semibold text-purple-700 hover:underline">
            {liker}
          </Link>
        ) : (
          <span className="font-semibold">{liker}</span>
        )}{" "}
        liked your event <span className="font-semibold">{eventName}</span>
      </>
    );
  }

  if (n.type === "event_comment") {
    let commenter =
      (n.actor_profile_id && actorProfiles?.[n.actor_profile_id]?.name) ||
      (n.data?.commenter_name && n.data?.commenter_name !== "Someone" ? n.data?.commenter_name : null);

    if (!commenter) {
      commenter = n.data?.commenter_handle ? `@${n.data.commenter_handle}` : null;
    }

    if (!commenter) {
      const eventName = n.data?.event_name || "your event";
      const preview = n.data?.comment_preview || "";
      return (
        <>
          A user commented on your event <span className="font-semibold">{eventName}</span>
          {preview && <>: &quot;{preview}&quot;</>}
        </>
      );
    }

    const commenterHandle =
      (n.actor_profile_id && actorProfiles?.[n.actor_profile_id]?.handle) || n.data?.commenter_handle || null;
    const eventName = n.data?.event_name || "your event";
    const preview = n.data?.comment_preview || "";
    return (
      <>
        {commenterHandle ? (
          <Link href={`/profile/${commenterHandle}`} className="font-semibold text-purple-700 hover:underline">
            {commenter}
          </Link>
        ) : (
          <span className="font-semibold">{commenter}</span>
        )}{" "}
        commented on your event <span className="font-semibold">{eventName}</span>
        {preview && <>: &quot;{preview}&quot;</>}
      </>
    );
  }

  if (n.type === "bout_offer") {
    const fighter = n.data?.fighter_name || "a fighter";
    const event = n.data?.event_name || "an event";
    const from = n.data?.from_name || n.data?.from_username || null;

    return (
      <>
        <span className="font-semibold">Bout offer</span> for <span className="font-semibold">{fighter}</span> at{" "}
        <span className="font-semibold">{event}</span>
        {from && (
          <>
            {" "}
            from <span className="font-semibold">{from}</span>
          </>
        )}
      </>
    );
  }

  if (n.type === "bout_assigned") {
    const eventName = n.data?.event_name || "an event";
    const side = n.data?.side === "red" ? "red corner" : "blue corner";
    return (
      <>
        You&apos;ve been assigned to the <span className="font-semibold">{side}</span> at event{" "}
        <span className="font-semibold">{eventName}</span>
      </>
    );
  }

  if (n.type === "event_bout_matched") {
    const eventName = n.data?.event_name || "an event";
    const fighterName = n.data?.fighter_name || "A fighter";
    const side = n.data?.side === "red" ? "red corner" : "blue corner";
    return (
      <>
        A bout has been matched at <span className="font-semibold">{eventName}</span>:{" "}
        <span className="font-semibold">{fighterName}</span> assigned to <span className="font-semibold">{side}</span>
      </>
    );
  }

  if (n.type === "bout_added") {
    const eventName = n.data?.event_name || "an event";
    const redName = n.data?.red_name || "TBC";
    const blueName = n.data?.blue_name || "TBC";
    const cardType = n.data?.card_type === "main" ? "Main card" : "Undercard";
    const boutNumber = n.data?.bout_number;
    
    if (boutNumber) {
      return (
        <>
          {cardType} bout {boutNumber} added to <span className="font-semibold">{eventName}</span>: {redName} vs {blueName}
        </>
      );
    }
    
    return (
      <>
        New bout added to <span className="font-semibold">{eventName}</span>: {redName} vs {blueName}
      </>
    );
  }

  if (n.type === "bout_started") {
    const eventName = n.data?.event_name || "an event";
    const redName = n.data?.red_name || "TBC";
    const blueName = n.data?.blue_name || "TBC";
    const boutNumber = n.data?.bout_number;
    
    if (boutNumber) {
      return (
        <>
          Bout {boutNumber} started at <span className="font-semibold">{eventName}</span>: {redName} vs {blueName}
        </>
      );
    }
    
    return (
      <>
        Fight started at <span className="font-semibold">{eventName}</span>: {redName} vs {blueName}
      </>
    );
  }

  if (n.type === "gym_added") {
    const gymName = n.data?.gym_name || "a gym";
    return (
      <>
        You&apos;ve been added to <span className="font-semibold">{gymName}</span>
      </>
    );
  }

  if (n.type === "event_follow") {
    let follower =
      (n.actor_profile_id && actorProfiles?.[n.actor_profile_id]?.name) ||
      (n.data?.follower_name && n.data?.follower_name !== "Someone" ? n.data?.follower_name : null);

    if (!follower) {
      follower = n.data?.follower_handle ? `@${n.data.follower_handle}` : null;
    }

    if (!follower) {
      const eventName = n.data?.event_name || "your event";
      return (
        <>
          A user started following <span className="font-semibold">{eventName}</span>
        </>
      );
    }

    const followerHandle =
      (n.actor_profile_id && actorProfiles?.[n.actor_profile_id]?.handle) || n.data?.follower_handle || null;
    const eventName = n.data?.event_name || "your event";
    return (
      <>
        {followerHandle ? (
          <Link href={`/profile/${followerHandle}`} className="font-semibold text-purple-700 hover:underline">
            {follower}
          </Link>
        ) : (
          <span className="font-semibold">{follower}</span>
        )}{" "}
        started following <span className="font-semibold">{eventName}</span>
      </>
    );
  }

  if (n.type === "event_live") {
    const eventName = n.data?.event_name || "an event";
    return (
      <>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-flex h-2 w-2 rounded-full bg-red-600 animate-pulse"></span>
          <span className="font-semibold">{eventName}</span> is now live!
        </span>
      </>
    );
  }

  if (n.type === "bout_result") {
    const eventName = n.data?.event_name || "an event";
    const winnerName = n.data?.winner_name || "Winner";
    const cornerText = n.data?.corner_text || "";
    const method = n.data?.method;
    const round = n.data?.round;
    const time = n.data?.time;

    let resultText = cornerText ? `${cornerText} ${winnerName} wins` : `${winnerName} wins`;
    if (method) resultText += ` ${method}`;
    if (round) resultText += ` round ${round}`;
    if (time) resultText += ` @ ${time}`;

    return (
      <>
        Bout result at <span className="font-semibold">{eventName}</span>: <span className="font-semibold">{resultText}</span>
      </>
    );
  }

  if (n.type === "bout_request") {
    const fighterName = n.data?.fighter_name || "A fighter";
    return (
      <>
        <span className="font-semibold">{fighterName}</span> requested a bout
      </>
    );
  }

  if (n.type === "offer_accepted") {
    const eventName = n.data?.event_name || "an event";
    const fighterName = n.data?.fighter_name || "A fighter";
    const side = n.data?.side === "red" ? "red corner" : "blue corner";
    return (
      <>
        Your offer for <span className="font-semibold">{fighterName}</span>{" "}
        has been accepted for the <span className="font-semibold">{side}</span>{" "}
        at <span className="font-semibold">{eventName}</span>
      </>
    );
  }

  if (n.type === "offer_declined") {
    const eventName = n.data?.event_name || "an event";
    const fighterName = n.data?.fighter_name || "A fighter";
    const refundAmount = n.data?.refund_amount;
    const refunded = n.data?.refunded === true;
    const refundText = refunded && refundAmount 
      ? ` Your payment of $${(refundAmount / 100).toFixed(2)} has been refunded.`
      : "";
    return (
      <>
        Your offer for <span className="font-semibold">{fighterName}</span>{" "}
        at <span className="font-semibold">{eventName}</span> was declined.{refundText}
      </>
    );
  }

  // Fallback
  if (typeof n.data?.message === "string") {
    return <>{n.data.message}</>;
  }

  return <>You have a new notification.</>;
}

function getNotificationHref(n: Notification): string | null {
  if (n.type === "message") {
    // Check both threadId and thread_id (different sources might use different field names)
    const threadId = n.data?.threadId || n.data?.thread_id;
    if (!threadId) {
      console.warn("⚠️ Message notification missing threadId/thread_id:", n);
    }
    return threadId ? `/messages/${threadId}` : null;
  }

  if (n.type === "follow") {
    const followerHandle = n.data?.follower_handle;
    if (!followerHandle) {
      console.warn("⚠️ Follow notification missing follower_handle:", n);
    }
    return followerHandle ? `/profile/${followerHandle}` : null;
  }

  if (n.type === "post_like" || n.type === "post_comment") {
    // Posts don't have individual pages, so we could navigate to the profile
    // For now, return null - you might want to add post detail pages later
    return null;
  }

  if (n.type === "event_like" || n.type === "event_comment") {
    const eventId = n.data?.event_id;
    if (!eventId) {
      console.warn("⚠️ Event notification missing event_id:", n);
    }
    return eventId ? `/events/${eventId}` : null;
  }

  if (n.type === "bout_offer" || n.type === "bout_request") {
    const eventId = n.data?.event_id;
    if (!eventId) {
      console.warn("⚠️ Bout notification missing event_id:", n);
    }
    return eventId ? `/events/${eventId}/offers` : null;
  }

  if (n.type === "offer_accepted" || n.type === "offer_declined") {
    const eventId = n.data?.event_id;
    const boutId = n.data?.bout_id;
    if (eventId) {
      return boutId ? `/events/${eventId}#bout-${boutId}` : `/events/${eventId}`;
    }
    return null;
  }

  if (n.type === "event_follow") {
    const eventId = n.data?.event_id;
    if (!eventId) {
      console.warn("⚠️ Event follow notification missing event_id:", n);
    }
    return eventId ? `/events/${eventId}` : null;
  }

  if (n.type === "event_bout_matched" || n.type === "bout_added" || n.type === "bout_started") {
    const eventId = n.data?.event_id;
    const boutId = n.data?.bout_id;
    if (eventId) {
      return boutId ? `/events/${eventId}#bout-${boutId}` : `/events/${eventId}`;
    }
    return null;
  }

  if (n.type === "bout_assigned") {
    const eventId = n.data?.event_id;
    return eventId ? `/events/${eventId}` : null;
  }

  if (n.type === "event_live" || n.type === "bout_result") {
    const eventId = n.data?.event_id;
    if (!eventId) {
      console.warn(`⚠️ ${n.type} notification missing event_id:`, n);
    }
    return eventId ? `/events/${eventId}` : null;
  }

  if (n.type === "gym_added") {
    // Could navigate to gym profile if we have gym_id
    return null;
  }

  return null;
}
