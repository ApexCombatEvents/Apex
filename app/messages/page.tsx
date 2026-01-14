// app/messages/page.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createSupabaseBrowser } from "@/lib/supabase-browser";

type ThreadListItem = {
  id: string;
  other_profile_id: string | null;
  other_username: string | null;
  other_full_name: string | null;
  other_avatar_url: string | null;
  last_message_at: string | null;
  last_message_preview?: string | null;
  last_message_sender_id?: string | null;
  has_unread?: boolean;
  is_fighting_conversation?: boolean;
};

type FilterType = "all" | "fighting";

export default function MessagesPage() {
  const [threads, setThreads] = useState<ThreadListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterType>("all");
  const [userRole, setUserRole] = useState<string | null>(null);
  const [myId, setMyId] = useState<string | null>(null);
  const supabase = createSupabaseBrowser();

  useEffect(() => {
    async function loadUserRole() {
      const { data: userData } = await supabase.auth.getUser();
      if (userData.user) {
        setMyId(userData.user.id);
        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", userData.user.id)
          .single();
        setUserRole(profile?.role || null);
      }
    }
    loadUserRole();
  }, [supabase]);

  function formatPreview(body: string) {
    const raw = body || "";
    // Normalize whitespace for list preview
    const normalized = raw.replace(/\s+/g, " ").trim();

    // Special-case bout messages so they read nicely in one line
    if (raw.startsWith("🥊 Bout Request") || raw.startsWith("🥊 Bout Offer")) {
      const lines = raw
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean);
      const title = lines[0] || "🥊 Bout";
      const label = lines[1] || "";

      // If the user typed a message after the bout block, prefer that as the preview.
      const boutIdLineIndex = raw.split("\n").findIndex((l) => l.includes("Bout ID:"));
      if (boutIdLineIndex >= 0) {
        const after = raw
          .split("\n")
          .slice(boutIdLineIndex + 1)
          .join("\n")
          .trim();
        if (after) {
          return after.replace(/\s+/g, " ").trim();
        }
      }

      return [title, label].filter(Boolean).join(" • ").trim() || normalized;
    }

    return normalized;
  }

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/messages/threads");
        if (!res.ok) {
          setError(`Could not load messages (status ${res.status})`);
          setThreads([]);
          return;
        }
        const json = await res.json();
        setThreads(json.threads || []);
      } catch (err) {
        console.error("threads error", err);
        setError("Could not load messages.");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  const filteredThreads = threads.filter((t) => {
    if (filter === "fighting") {
      return t.is_fighting_conversation === true;
    }
    return true;
  });

  const isCoachOrGym = userRole === "coach" || userRole === "gym";

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6 border-b border-slate-200 pb-4">
        <h1 className="text-xl font-bold text-slate-900">Messages</h1>
        {isCoachOrGym && (
          <div className="flex gap-2">
            <button
              onClick={() => setFilter("all")}
              className={`px-3 py-1 text-xs rounded-full border ${
                filter === "all"
                  ? "bg-purple-600 text-white border-purple-600"
                  : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilter("fighting")}
              className={`px-3 py-1 text-xs rounded-full border ${
                filter === "fighting"
                  ? "bg-purple-600 text-white border-purple-600"
                  : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
              }`}
            >
              Fighting
            </button>
          </div>
        )}
      </div>

      {loading ? (
        <p className="text-sm text-slate-600">Loading…</p>
      ) : error ? (
        <p className="text-sm text-red-600">{error}</p>
      ) : filteredThreads.length === 0 ? (
        <p className="text-sm text-slate-600">
          {filter === "fighting"
            ? "No fighting conversations yet. Fighters will send bout requests here."
            : "No conversations yet. Tap &quot;Message&quot; on a profile to start a chat."}
        </p>
      ) : (
        <ul className="divide-y divide-slate-100">
          {filteredThreads.map((t) => {
            const timeLabel = t.last_message_at
              ? new Date(t.last_message_at).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : "";

            const initials =
              (t.other_full_name || t.other_username || "?")
                .split(" ")
                .map((p) => p[0])
                .join("")
                .slice(0, 2)
                .toUpperCase();

            return (
              <li key={t.id}>
                <Link
                  href={`/messages/${t.id}`}
                  className="flex items-center justify-between py-5 hover:bg-slate-50 px-4 rounded-lg transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-full bg-slate-200 overflow-hidden flex items-center justify-center text-sm font-semibold text-slate-700">
                      {t.other_avatar_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={t.other_avatar_url}
                          alt={t.other_full_name || ""}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        initials
                      )}
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-base font-semibold text-slate-900">
                          {t.other_full_name || t.other_username || "Conversation"}
                        </span>
                        {t.is_fighting_conversation && (
                          <span className="text-xs px-2 py-1 rounded bg-purple-100 text-purple-700 font-medium">
                            🥊 Bout
                          </span>
                        )}
                      </div>
                          {t.other_username && (
                            <span className="text-sm text-slate-500">
                              @{t.other_username}
                            </span>
                          )}
                          {t.last_message_preview && (
                            <span className="text-sm text-slate-600 max-w-[240px] sm:max-w-[320px] md:max-w-[420px] truncate">
                              {t.last_message_sender_id && myId && t.last_message_sender_id === myId
                                ? "You: "
                                : ""}
                              {formatPreview(t.last_message_preview)}
                            </span>
                          )}
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-1.5">
                    {timeLabel && (
                      <span className="text-xs text-slate-500">
                        {timeLabel}
                      </span>
                    )}
                    {t.has_unread && (
                      <span className="h-3 w-3 rounded-full bg-purple-500" />
                    )}
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
