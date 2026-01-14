// app/messages/[threadId]/page.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { createSupabaseBrowser } from "@/lib/supabase-browser";
import BoutOfferButton from "@/components/events/BoutOfferButton";

type ChatMessage = {
  id: string;
  body: string;
  created_at: string;
  sender_profile_id: string;
};

type Participant = {
  id: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
  role: string | null;
};

type BoutInfo = {
  bout_id: string;
  side: "red" | "blue";
  event_id?: string;
  event_name?: string;
  discipline?: string;
  weight_class_kg?: number;
  level?: string;
  bout_label?: string;
  is_offer?: boolean; // true if this is a bout offer (from coach/gym), false if request (from fighter)
};

export default function ThreadPage() {
  const { threadId } = useParams<{ threadId: string }>();
  const searchParams = useSearchParams();
  const supabase = createSupabaseBrowser();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [myId, setMyId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [boutInfo, setBoutInfo] = useState<BoutInfo | null>(null);
  const [boutAttachment, setBoutAttachment] = useState<BoutInfo | null>(null);
  const [participant, setParticipant] = useState<Participant | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  function scrollToBottom() {
    setTimeout(() => {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 50);
  }

  async function markThreadAsRead() {
    try {
      await fetch("/api/notifications/mark-thread-read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ threadId }),
      });
    } catch (err) {
      console.error("mark-thread-read error", err);
    }
  }

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      setMyId(data.user?.id ?? null);

      // Get user role
      if (data.user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", data.user.id)
          .single();
        setUserRole(profile?.role || null);
      }

      // Check for bout attachment from query params
      const boutIdParam = searchParams.get("boutId");
      const eventIdParam = searchParams.get("eventId");
      const sideParam = searchParams.get("side") as "red" | "blue" | null;
      const fighterIdParam = searchParams.get("fighterId");

      if (boutIdParam && eventIdParam && sideParam) {
        // Load bout details for attachment
        const { data: bout } = await supabase
          .from("event_bouts")
          .select("id, event_id, card_type, order_index, weight, bout_details")
          .eq("id", boutIdParam)
          .single();

        const { data: event } = await supabase
          .from("events")
          .select("id, name, title")
          .eq("id", eventIdParam)
          .single();

        let fighterName = "";
        if (fighterIdParam) {
          const { data: fighter } = await supabase
            .from("profiles")
            .select("full_name, username")
            .eq("id", fighterIdParam)
            .single();
          fighterName = fighter?.full_name || fighter?.username || "";
        }

        if (bout && event) {
          let boutLabel = "Bout";
          if (bout.card_type === "main") {
            boutLabel = `MAIN CARD • FIGHT ${(bout.order_index || 0) + 1}`;
          } else if (bout.card_type === "undercard") {
            boutLabel = `UNDERCARD • FIGHT ${(bout.order_index || 0) + 1}`;
          }

          setBoutAttachment({
            bout_id: bout.id,
            side: sideParam,
            event_id: event.id,
            event_name: event.title || event.name,
            discipline: bout.bout_details || bout.weight || undefined,
            weight_class_kg: undefined,
            level: undefined,
            bout_label: boutLabel,
          });
        }
      }

      setLoading(true);
      const res = await fetch(`/api/messages/thread/${threadId}`);
      const json = await res.json();
      if (res.ok) {
        const loadedMessages = json.messages || [];
        setMessages(loadedMessages);
        setParticipant(json.participant || null);

        // Check for bout request or offer message
        const boutRequestMsg = loadedMessages.find((m: ChatMessage) =>
          m.body.startsWith("🥊 Bout Request") || m.body.startsWith("🥊 Bout Offer")
        );

        if (boutRequestMsg) {
          // Extract bout info from message body
          // Format for Bout Request: "🥊 Bout Request\n\n{label}\n{corner}\n{details}\n\nEvent: {name}\nEvent ID: {id}\nBout ID: {id}"
          // Format for Bout Offer: "🥊 Bout Offer\n\n{label}\n{corner}\n{details}\n\nEvent: {name}\nEvent ID: {id}\nBout ID: {id}"
          const isOffer = boutRequestMsg.body.startsWith("🥊 Bout Offer");
          const lines = boutRequestMsg.body.split("\n");
          const cornerLine = lines.find((l: string) => l.includes("Corner:"));
          const sideMatch = cornerLine?.match(/(RED|BLUE)/);
          const side = sideMatch
            ? (sideMatch[1].toLowerCase() as "red" | "blue")
            : "red";

          // Extract bout_id and event_id from message
          const boutIdMatch = boutRequestMsg.body.match(/Bout ID: ([^\n]+)/);
          const boutId = boutIdMatch ? boutIdMatch[1].trim() : undefined;

          const eventIdMatch = boutRequestMsg.body.match(/Event ID: ([^\n]+)/);
          const eventId = eventIdMatch ? eventIdMatch[1].trim() : undefined;

          // Get bout details from database
          if (boutId) {
            const { data: bout } = await supabase
              .from("event_bouts")
              .select("id, event_id, weight, bout_details, card_type, order_index")
              .eq("id", boutId)
              .single();

            if (bout) {
              const { data: event } = eventId
                ? await supabase
                    .from("events")
                    .select("id, name, title")
                    .eq("id", eventId)
                    .single()
                : { data: null };

              setBoutInfo({
                bout_id: bout.id,
                side,
                event_id: bout.event_id || eventId || undefined,
                event_name: event?.title || event?.name,
                discipline: bout.bout_details || undefined,
                weight_class_kg: undefined,
                level: undefined,
                is_offer: isOffer,
              });
            }
          }
        }

        await markThreadAsRead(); // 👈 mark notifications for this thread as read
      }
      setLoading(false);
      scrollToBottom();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [threadId]);

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    const body = input.trim();
    if (!body && !boutAttachment) return;

    // Build message body - include bout details if attached
    let messageBody = body;
    if (boutAttachment) {
      // Get bout label from database
      const { data: bout } = await supabase
        .from("event_bouts")
        .select("card_type, order_index, weight, bout_details")
        .eq("id", boutAttachment.bout_id)
        .single();

      let boutLabel = "Bout";
      if (bout) {
        if (bout.card_type === "main") {
          boutLabel = `MAIN CARD • FIGHT ${(bout.order_index || 0) + 1}`;
        } else if (bout.card_type === "undercard") {
          boutLabel = `UNDERCARD • FIGHT ${(bout.order_index || 0) + 1}`;
        }
      }

      const cornerInfo = `${boutAttachment.side.toUpperCase()} Corner`;
      const boutDetails = bout?.bout_details || bout?.weight || "Bout details TBC";
      const eventInfo = boutAttachment.event_name ? `Event: ${boutAttachment.event_name}` : "";
      
      const boutInfoText = `🥊 Bout Offer\n\n${boutLabel}\n${cornerInfo}\n${boutDetails}\n${eventInfo ? `\n${eventInfo}` : ""}\nEvent ID: ${boutAttachment.event_id}\nBout ID: ${boutAttachment.bout_id}`;
      
      messageBody = body 
        ? `${boutInfoText}\n\n${body}`
        : boutInfoText;
    }

    const res = await fetch(`/api/messages/thread/${threadId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: messageBody }),
    });

    if (res.ok) {
      setInput("");
      setBoutAttachment(null); // Clear attachment after sending
      // Clear URL params
      window.history.replaceState({}, "", `/messages/${threadId}`);
      const res2 = await fetch(`/api/messages/thread/${threadId}`);
      const json2 = await res2.json();
      if (res2.ok) {
        setMessages(json2.messages || []);
        setParticipant(json2.participant || null);
        scrollToBottom();
      }
    }
  }

  return (
    <div className="flex flex-col max-w-3xl mx-auto h-[calc(100vh-80px)] px-4 py-4">
      {/* Header with participant info */}
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-200">
        <Link
          href="/messages"
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-700 text-xs font-medium hover:bg-slate-50 transition-colors mr-3"
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
          <span>Back</span>
        </Link>
        
        {participant ? (
          <Link
            href={`/profile/${participant.username || participant.id}`}
            className="flex items-center gap-3 flex-1 hover:opacity-80 transition-opacity"
          >
            {participant.avatar_url ? (
              <Image
                src={participant.avatar_url}
                alt={participant.full_name || participant.username || "Profile"}
                width={40}
                height={40}
                className="rounded-full border-2 border-purple-200"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-400 to-indigo-500 flex items-center justify-center text-white font-semibold text-sm border-2 border-purple-200">
                {(participant.full_name || participant.username || "?")[0].toUpperCase()}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold text-slate-900 truncate">
                  {participant.full_name || participant.username || "Unknown User"}
                </h1>
                {participant.role && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase bg-purple-100 text-purple-700 border border-purple-200">
                    {participant.role}
                  </span>
                )}
              </div>
              {participant.username && (
                <p className="text-xs text-slate-500 truncate">
                  @{participant.username}
                </p>
              )}
            </div>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5 text-slate-400 flex-shrink-0"
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
          </Link>
        ) : (
          <h1 className="text-base font-bold text-slate-900">Messages</h1>
        )}
      </div>

      {/* Bout info card for coaches/gyms (when they receive a bout request from a fighter) */}
      {boutInfo && (userRole === "coach" || userRole === "gym") && !boutInfo.is_offer && (
        <div className="mb-4 p-4 bg-purple-50 border border-purple-200 rounded-lg">
          <div className="flex items-start justify-between mb-3">
            <div>
              <h3 className="text-sm font-semibold text-purple-900 mb-1">
                Bout Request
              </h3>
              {boutInfo.event_name && (
                <p className="text-xs text-purple-700 mb-1">
                  Event: {boutInfo.event_name}
                </p>
              )}
              {boutInfo.discipline && (
                <p className="text-xs text-purple-600">
                  {boutInfo.discipline}
                </p>
              )}
            </div>
            {boutInfo.event_id && (
              <Link
                href={`/events/${boutInfo.event_id}`}
                className="text-xs text-purple-700 hover:underline"
              >
                View Event →
              </Link>
            )}
          </div>
          <div className="flex items-center gap-2">
            <BoutOfferButton
              boutId={boutInfo.bout_id}
              side={boutInfo.side}
            />
          </div>
        </div>
      )}

      {/* Bout info card for fighters (when they receive a bout offer from a coach/gym) */}
      {boutInfo && userRole === "fighter" && boutInfo.is_offer && (
        <div className="mb-4 p-4 bg-purple-50 border border-purple-200 rounded-lg">
          <div className="flex items-start justify-between mb-3">
            <div>
              <h3 className="text-sm font-semibold text-purple-900 mb-1">
                Bout Offer
              </h3>
              {boutInfo.event_name && (
                <p className="text-xs text-purple-700 mb-1">
                  Event: {boutInfo.event_name}
                </p>
              )}
              {boutInfo.discipline && (
                <p className="text-xs text-purple-600">
                  {boutInfo.discipline}
                </p>
              )}
            </div>
            {boutInfo.event_id && (
              <Link
                href={`/events/${boutInfo.event_id}`}
                className="text-xs text-purple-700 hover:underline"
              >
                View Event →
              </Link>
            )}
          </div>
          <p className="text-xs text-purple-700">
            A coach or gym has sent you a bout offer. Review the details and respond in the conversation.
          </p>
        </div>
      )}

      <div className="flex-1 overflow-y-auto space-y-2 pb-2">
        {loading ? (
          <p className="text-sm text-slate-600">Loading…</p>
        ) : messages.length === 0 ? (
          <p className="text-sm text-slate-600">Say hi 👋</p>
        ) : (
          messages.map((m) => {
            const isMine = m.sender_profile_id === myId;
            const time = new Date(m.created_at).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            });

            // Check if this is a bout request or offer message
            const isBoutRequest = m.body.startsWith("🥊 Bout Request") || m.body.startsWith("🥊 Bout Offer");
            let eventId: string | null = null;
            let boutId: string | null = null;
            let boutLabel = "";
            let cornerInfo = "";
            let boutDetails = "";
            let eventName = "";
            let userMessage = "";

            if (isBoutRequest) {
              // Extract event_id and bout_id from message
              const eventIdMatch = m.body.match(/Event ID: ([^\n]+)/);
              eventId = eventIdMatch ? eventIdMatch[1].trim() : null;

              const boutIdMatch = m.body.match(/Bout ID: ([^\n]+)/);
              boutId = boutIdMatch ? boutIdMatch[1].trim() : null;

              // Parse message lines - extract bout info and user message
              const lines = m.body.split("\n");
              
              // Find where the bout info ends (after "Bout ID: ...")
              let boutInfoEndIndex = -1;
              for (let i = 0; i < lines.length; i++) {
                if (lines[i].includes("Bout ID:")) {
                  boutInfoEndIndex = i;
                  break;
                }
              }
              
              // Extract bout details from first part
              const boutInfoLines = lines.slice(0, boutInfoEndIndex + 1).filter((l) => l.trim());
              if (boutInfoLines.length > 1) boutLabel = boutInfoLines[1] || "";
              if (boutInfoLines.length > 2) cornerInfo = boutInfoLines[2] || "";
              if (boutInfoLines.length > 3) boutDetails = boutInfoLines[3] || "";
              const eventMatch = m.body.match(/Event: ([^\n]+)/);
              eventName = eventMatch ? eventMatch[1].trim() : "";
              
              // Extract user message (everything after "Bout ID: ..." and any empty lines)
              if (boutInfoEndIndex >= 0) {
                const messageLines = lines.slice(boutInfoEndIndex + 1);
                // Skip empty lines after bout ID
                let messageStart = 0;
                for (let i = 0; i < messageLines.length; i++) {
                  if (messageLines[i].trim()) {
                    messageStart = i;
                    break;
                  }
                }
                userMessage = messageLines.slice(messageStart).join("\n").trim();
              }
            }

            return (
              <div
                key={m.id}
                className={`flex w-full ${
                  isMine ? "justify-end" : "justify-start"
                }`}
              >
                <div className="max-w-[75%]">
                  {isBoutRequest && eventId ? (
                    <div className="space-y-2">
                      <div
                        onClick={() => {
                          window.location.href = `/events/${eventId}${boutId ? `#bout-${boutId}` : ""}`;
                        }}
                        className={`cursor-pointer rounded-2xl px-4 py-3 text-sm border-2 ${
                          isMine
                            ? "bg-purple-600 text-white border-purple-500 rounded-br-sm hover:bg-purple-700"
                            : "bg-slate-100 text-slate-900 border-purple-300 rounded-bl-sm hover:bg-slate-200"
                        } transition-colors`}
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <span className="font-semibold">
                            {m.body.startsWith("🥊 Bout Request") ? "🥊 Bout Request" : "🥊 Bout Offer"}
                          </span>
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className={`h-4 w-4 ${
                              isMine ? "text-white" : "text-purple-600"
                            }`}
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
                        {boutLabel && (
                          <div className={`text-xs font-semibold mb-1 ${isMine ? "text-purple-100" : "text-purple-700"}`}>
                            {boutLabel}
                          </div>
                        )}
                        {cornerInfo && (
                          <div className={`text-xs mb-1 ${isMine ? "text-purple-100" : "text-slate-700"}`}>
                            {cornerInfo}
                          </div>
                        )}
                        {boutDetails && (
                          <div className={`text-xs mb-2 ${isMine ? "text-purple-100" : "text-slate-600"}`}>
                            {boutDetails}
                          </div>
                        )}
                        {eventName && (
                          <div className={`text-xs ${isMine ? "text-purple-200" : "text-purple-600"} font-medium`}>
                            {eventName}
                          </div>
                        )}
                      </div>
                      {userMessage && (
                        <div
                          className={`rounded-2xl px-3 py-2 text-sm ${
                            isMine
                              ? "bg-purple-600 text-white rounded-br-sm"
                              : "bg-slate-100 text-slate-900 rounded-bl-sm"
                          }`}
                        >
                          {userMessage}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div
                      className={`rounded-2xl px-3 py-2 text-sm ${
                        isMine
                          ? "bg-purple-600 text-white rounded-br-sm"
                          : "bg-slate-100 text-slate-900 rounded-bl-sm"
                      }`}
                    >
                      {m.body}
                    </div>
                  )}
                  <div
                    className={`mt-1 text-[10px] text-slate-500 ${
                      isMine ? "text-right" : "text-left"
                    }`}
                  >
                    {time}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Bout attachment preview */}
      {boutAttachment && (
        <div className="mt-2 mb-2 p-3 bg-purple-50 border border-purple-200 rounded-lg">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm font-semibold text-purple-900">
                  🥊 Bout Offer
                </span>
              </div>
              {boutAttachment.bout_label && (
                <p className="text-xs font-semibold text-purple-800 mb-1">
                  {boutAttachment.bout_label}
                </p>
              )}
              {boutAttachment.event_name && (
                <p className="text-xs text-purple-700 mb-1">
                  Event: {boutAttachment.event_name}
                </p>
              )}
              <p className="text-xs text-purple-600 mb-1">
                {boutAttachment.side.toUpperCase()} Corner
                {boutAttachment.discipline && ` • ${boutAttachment.discipline}`}
              </p>
              {boutAttachment.event_id && (
                <Link
                  href={`/events/${boutAttachment.event_id}`}
                  className="text-xs text-purple-600 hover:text-purple-800 hover:underline"
                >
                  View Event →
                </Link>
              )}
            </div>
            <button
              type="button"
              onClick={() => {
                setBoutAttachment(null);
                window.history.replaceState({}, "", `/messages/${threadId}`);
              }}
              className="text-purple-600 hover:text-purple-800 text-xs font-medium flex-shrink-0"
            >
              Remove
            </button>
          </div>
        </div>
      )}

      {/* Input bar */}
      <form
        onSubmit={sendMessage}
        className="mt-2 flex items-center gap-2 border-t border-slate-200 pt-2"
      >
        <input
          className="flex-1 rounded-full border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-purple-500"
          placeholder="Message…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />
        <button
          type="submit"
          className="px-4 py-2 rounded-full bg-purple-600 text-white text-sm font-medium disabled:opacity-60"
          disabled={!input.trim() && !boutAttachment}
        >
          Send
        </button>
      </form>
    </div>
  );
}

