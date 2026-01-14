"use client";

import { useEffect, useRef, useState } from "react";

type Message = {
  id: string;
  sender_profile_id: string;
  body: string;
  created_at: string;
};

export default function ChatThreadClient({
  threadId,
  meId,
  otherProfile,
  initialMessages,
}: {
  threadId: string;
  meId: string;
  otherProfile: {
    id: string;
    full_name?: string | null;
    username?: string | null;
    avatar_url?: string | null;
  } | null;
  initialMessages: Message[];
}) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    const text = body.trim();
    if (!text) return;

    setSending(true);
    try {
      const res = await fetch("/api/messages/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ threadId, body: text }),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.error || "Could not send message");
        return;
      }

      // append new message
      setMessages((prev) => [...prev, data.message]);
      setBody("");
    } catch (err) {
      console.error("send message error", err);
      alert("Something went wrong sending the message.");
    } finally {
      setSending(false);
    }
  }

  const title =
    otherProfile?.full_name ||
    (otherProfile?.username ? `@${otherProfile.username}` : "Chat");

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 flex flex-col h-[calc(100vh-80px)]">
      <header className="pb-3 border-b border-slate-200 mb-3">
        <h1 className="text-base font-semibold text-slate-900">{title}</h1>
        {otherProfile?.username && (
          <p className="text-xs text-slate-500">@{otherProfile.username}</p>
        )}
      </header>

      <div className="flex-1 overflow-y-auto space-y-2 pr-1">
        {messages.map((m) => {
          const mine = m.sender_profile_id === meId;
          return (
            <div
              key={m.id}
              className={`flex ${mine ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[70%] rounded-2xl px-3 py-2 text-sm ${
                  mine
                    ? "bg-purple-600 text-white rounded-br-sm"
                    : "bg-slate-100 text-slate-900 rounded-bl-sm"
                }`}
              >
                <div className="whitespace-pre-wrap">{m.body}</div>
                <div className="mt-1 text-[10px] opacity-70">
                  {new Date(m.created_at).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <form
        onSubmit={sendMessage}
        className="mt-3 flex items-center gap-2 border border-slate-200 rounded-2xl px-3 py-2 bg-white"
      >
        <input
          className="flex-1 text-sm outline-none"
          placeholder="Write a message…"
          value={body}
          onChange={(e) => setBody(e.target.value)}
        />
        <button
          type="submit"
          disabled={sending || !body.trim()}
          className="px-3 py-1.5 rounded-xl bg-purple-600 text-white text-xs font-medium disabled:opacity-50"
        >
          {sending ? "Sending…" : "Send"}
        </button>
      </form>
    </div>
  );
}
