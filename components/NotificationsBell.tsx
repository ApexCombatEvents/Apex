// components/NotificationsBell.tsx
"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";

type NotificationItem = {
  id: string;
  type: string;
  data: any;
  is_read: boolean;
  created_at: string;
  actor_profile_id?: string | null;
};

export default function NotificationsBell() {
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    async function loadUnreadCount() {
      try {
        const res = await fetch("/api/notifications");
        if (!res.ok) return;
        const json = await res.json();
        setUnreadCount(json.unreadCount || 0);
      } catch (err) {
        console.error("notifications load error", err);
      }
    }

    loadUnreadCount();
    // Refresh unread count every 30 seconds
    const interval = setInterval(loadUnreadCount, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <Link
      href="/notifications"
      className="relative flex h-9 w-9 items-center justify-center rounded-full border border-slate-300 bg-white hover:border-purple-500 hover:bg-purple-50 transition-colors"
    >
      <span className="sr-only">Notifications</span>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-5 w-5 text-purple-600"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
        />
      </svg>

      {unreadCount > 0 && (
        <span className="absolute -top-0.5 -right-0.5 inline-flex h-3.5 min-w-[14px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold text-white">
          {unreadCount > 9 ? "9+" : unreadCount}
        </span>
      )}
    </Link>
  );
}

function renderNotificationText(
  n: NotificationItem, 
  href?: string | null,
  actorProfiles?: Record<string, { name: string; handle: string | null }>
): React.ReactNode {
  if (n.type === "message") {
    const sender =
      n.data?.sender_username ||
      n.data?.sender_name ||
      "New message";
    const preview = n.data?.body_preview || n.data?.preview || "";
    return (
      <>
        <span className="font-semibold">{sender}</span>
        {preview && <>: {preview}</>}
      </>
    );
  }

  if (n.type === "follow") {
    // Prioritize actorProfiles if available, otherwise use data field
    let followerName = (n.actor_profile_id && actorProfiles?.[n.actor_profile_id]?.name) ||
                        (n.data?.follower_name && n.data?.follower_name !== "Someone" ? n.data?.follower_name : null);
    
    // Final fallback only if we truly have no data - use handle if available
    if (!followerName) {
      followerName = n.data?.follower_handle ? `@${n.data.follower_handle}` : null;
    }
    
    // If still no name, don't display anything (or show generic message)
    if (!followerName) {
      return <>A user started following you</>;
    }
    
    const followerHandle = (n.actor_profile_id && actorProfiles?.[n.actor_profile_id]?.handle) ||
                          (n.data?.follower_handle) ||
                          null;
    
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
    let liker = (n.actor_profile_id && actorProfiles?.[n.actor_profile_id]?.name) ||
                (n.data?.liker_name && n.data?.liker_name !== "Someone" && n.data?.liker_name ? n.data?.liker_name : null) ||
                (n.data?.actor_name && n.data?.actor_name !== "Someone" ? n.data?.actor_name : null);
    
    // If no name, try handle
    if (!liker) {
      liker = n.data?.liker_handle ? `@${n.data.liker_handle}` : 
              n.data?.actor_handle ? `@${n.data.actor_handle}` : null;
    }
    
    // If still no name, use generic message
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
    // Prioritize actorProfiles if available, otherwise use data field
    let commenter = (n.actor_profile_id && actorProfiles?.[n.actor_profile_id]?.name) ||
                     (n.data?.commenter_name && n.data?.commenter_name !== "Someone" ? n.data?.commenter_name : null);
    
    // Final fallback only if we truly have no data - use handle if available
    if (!commenter) {
      commenter = n.data?.commenter_handle ? `@${n.data.commenter_handle}` : null;
    }
    
    // If still no name, use generic message
    if (!commenter) {
      const preview = n.data?.comment_preview || "";
      return <>A user commented on your post{preview && <>: &quot;{preview}&quot;</>}</>;
    }
    
    const commenterHandle = (n.actor_profile_id && actorProfiles?.[n.actor_profile_id]?.handle) ||
                           (n.data?.commenter_handle) ||
                           null;
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
    // Prioritize actorProfiles if available, otherwise use data field
    let liker = (n.actor_profile_id && actorProfiles?.[n.actor_profile_id]?.name) ||
                  (n.data?.liker_name && n.data?.liker_name !== "Someone" ? n.data?.liker_name : null);
    
    // Final fallback only if we truly have no data - use handle if available
    if (!liker) {
      liker = n.data?.liker_handle ? `@${n.data.liker_handle}` : null;
    }
    
    // If still no name, use generic message
    if (!liker) {
      const eventName = n.data?.event_name || "your event";
      return <>A user liked your event <span className="font-semibold">{eventName}</span></>;
    }
    
    const likerHandle = (n.actor_profile_id && actorProfiles?.[n.actor_profile_id]?.handle) ||
                       (n.data?.liker_handle) ||
                       null;
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
        liked your event{" "}
        <span className="font-semibold">{eventName}</span>
      </>
    );
  }

  if (n.type === "event_comment") {
    // Prioritize actorProfiles if available, otherwise use data field
    let commenter = (n.actor_profile_id && actorProfiles?.[n.actor_profile_id]?.name) ||
                     (n.data?.commenter_name && n.data?.commenter_name !== "Someone" ? n.data?.commenter_name : null);
    
    // Final fallback only if we truly have no data - use handle if available
    if (!commenter) {
      commenter = n.data?.commenter_handle ? `@${n.data.commenter_handle}` : null;
    }
    
    // If still no name, use generic message
    if (!commenter) {
      const eventName = n.data?.event_name || "your event";
      const preview = n.data?.comment_preview || "";
      return <>A user commented on your event <span className="font-semibold">{eventName}</span>{preview && <>: &quot;{preview}&quot;</>}</>;
    }
    
    const commenterHandle = (n.actor_profile_id && actorProfiles?.[n.actor_profile_id]?.handle) ||
                           (n.data?.commenter_handle) ||
                           null;
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
        commented on your event{" "}
        <span className="font-semibold">{eventName}</span>
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
        <span className="font-semibold">
          Bout offer
        </span>{" "}
        for <span className="font-semibold">{fighter}</span>{" "}
        at <span className="font-semibold">{event}</span>
        {from && <> from <span className="font-semibold">{from}</span></>}
      </>
    );
  }

  if (n.type === "bout_assigned") {
    const eventName = n.data?.event_name || "an event";
    const side = n.data?.side === "red" ? "red corner" : "blue corner";
    return (
      <>
        You&apos;ve been assigned to the <span className="font-semibold">{side}</span>{" "}
        at event <span className="font-semibold">{eventName}</span>
      </>
    );
  }

  if (n.type === "event_bout_matched") {
    const eventName = n.data?.event_name || "an event";
    const fighterName = n.data?.fighter_name || "A fighter";
    const side = n.data?.side === "red" ? "red corner" : "blue corner";
    return (
      <>
        A bout has been matched at{" "}
        <span className="font-semibold">{eventName}</span>:{" "}
        <span className="font-semibold">{fighterName}</span> assigned to{" "}
        <span className="font-semibold">{side}</span>
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
    // Prioritize actorProfiles if available, otherwise use data field
    let follower = (n.actor_profile_id && actorProfiles?.[n.actor_profile_id]?.name) ||
                    (n.data?.follower_name && n.data?.follower_name !== "Someone" ? n.data?.follower_name : null);
    
    // Final fallback only if we truly have no data - use handle if available
    if (!follower) {
      follower = n.data?.follower_handle ? `@${n.data.follower_handle}` : null;
    }
    
    // If still no name, use generic message
    if (!follower) {
      const eventName = n.data?.event_name || "your event";
      return <>A user started following <span className="font-semibold">{eventName}</span></>;
    }
    
    const followerHandle = (n.actor_profile_id && actorProfiles?.[n.actor_profile_id]?.handle) ||
                          (n.data?.follower_handle) ||
                          null;
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
        started following{" "}
        <span className="font-semibold">{eventName}</span>
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
        Bout result at <span className="font-semibold">{eventName}</span>:{" "}
        <span className="font-semibold">{resultText}</span>
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

  // Fallback - try to extract any useful information from data
  if (typeof n.data?.message === "string") {
    return <>{n.data.message}</>;
  }

  // If we have actor_profile_id but no specific handler, try to show actor name
  if (n.actor_profile_id && actorProfiles?.[n.actor_profile_id]) {
    const actor = actorProfiles[n.actor_profile_id];
    const actorHandle = actor.handle;
    return (
      <>
        {actorHandle ? (
          <Link href={`/profile/${actorHandle}`} className="font-semibold text-purple-700 hover:underline">
            {actor.name}
          </Link>
        ) : (
          <span className="font-semibold">{actor.name}</span>
        )}{" "}
        interacted with your content
      </>
    );
  }

  // Last resort - show generic message
  return <>You have a new notification.</>;
}

function getNotificationHref(n: NotificationItem): string | null {
  if (n.type === "offer_accepted" || n.type === "offer_declined") {
    const eventId = n.data?.event_id;
    const boutId = n.data?.bout_id;
    if (eventId) {
      return boutId ? `/events/${eventId}#bout-${boutId}` : `/events/${eventId}`;
    }
    return null;
  }

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

  if (n.type === "bout_offer") {
    const eventId = n.data?.event_id;
    if (!eventId) {
      console.warn("⚠️ Bout offer notification missing event_id:", n);
    }
    return eventId ? `/events/${eventId}/offers` : null;
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
