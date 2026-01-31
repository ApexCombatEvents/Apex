// app/messages/page.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createSupabaseBrowser } from "@/lib/supabase-browser";
import SponsorshipBanner from "@/components/sponsors/SponsorshipBanner";
import { getSponsorshipsForPlacement, type Sponsorship } from "@/lib/sponsorships";
import ALogo from "@/components/logos/ALogo";

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
  const [sponsorships, setSponsorships] = useState<Sponsorship[]>([]);
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

  // Load sponsorships for messages page
  useEffect(() => {
    async function loadSponsorships() {
      try {
        const messagesSponsorships = await getSponsorshipsForPlacement("messages_page");
        setSponsorships(messagesSponsorships);
      } catch (error) {
        console.error("Error loading messages page sponsorships:", error);
      }
    }
    loadSponsorships();
  }, []);

  const filteredThreads = threads.filter((t) => {
    if (filter === "fighting") {
      return t.is_fighting_conversation === true;
    }
    return true;
  });

  const isCoachOrGym = userRole === "coach" || userRole === "gym";

  const [showNewConversationModal, setShowNewConversationModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);

  async function searchUsers(query: string) {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setSearching(true);
    try {
      const { data: profiles, error } = await supabase
        .from("profiles")
        .select("id, username, full_name, avatar_url, role")
        .or(`username.ilike.%${query}%,full_name.ilike.%${query}%`)
        .limit(10);

      if (error) {
        console.error("Search error", error);
        setSearchResults([]);
      } else {
        setSearchResults(profiles || []);
      }
    } catch (err) {
      console.error("Search error", err);
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  }

  async function startConversation(profileId: string) {
    try {
      const res = await fetch("/api/messages/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ otherProfileId: profileId }),
      });

      const data = await res.json();

      if (!res.ok) {
        console.error("Failed to start chat", data);
        return;
      }

      if (data.threadId) {
        window.location.href = `/messages/${data.threadId}`;
      }
    } catch (err) {
      console.error("Start conversation error", err);
    }
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6 border-b border-slate-200 pb-4">
        <h1 className="text-xl font-bold text-slate-900">Messages</h1>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowNewConversationModal(true)}
            className="flex items-center justify-center w-10 h-10 rounded-full bg-purple-600 text-white hover:bg-purple-700 transition-colors"
            title="Start new conversation"
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
      </div>

      {/* New Conversation Modal */}
      {showNewConversationModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full max-h-[80vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-slate-900">Start New Conversation</h2>
                <button
                  onClick={() => {
                    setShowNewConversationModal(false);
                    setSearchQuery("");
                    setSearchResults([]);
                  }}
                  className="text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-6 w-6"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>

              <div className="mb-4">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    searchUsers(e.target.value);
                  }}
                  placeholder="Search by username or name..."
                  className="w-full rounded-xl border border-slate-300 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>

              {searching && (
                <div className="text-sm text-slate-600 text-center py-4">Searching...</div>
              )}

              {!searching && searchQuery && searchResults.length === 0 && (
                <div className="text-sm text-slate-600 text-center py-4">No users found</div>
              )}

              {!searching && searchResults.length > 0 && (
                <div className="space-y-2">
                  {searchResults.map((profile) => {
                    const initials = (profile.full_name || profile.username || "?")
                      .split(" ")
                      .map((p: string) => p[0])
                      .join("")
                      .slice(0, 2)
                      .toUpperCase();

                    return (
                      <button
                        key={profile.id}
                        onClick={() => {
                          startConversation(profile.id);
                          setShowNewConversationModal(false);
                        }}
                        className="w-full flex items-center gap-3 p-3 rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors text-left"
                      >
                        <div className="h-10 w-10 rounded-full bg-slate-200 overflow-hidden flex items-center justify-center text-sm font-semibold text-slate-700 flex-shrink-0">
                          {profile.avatar_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={profile.avatar_url}
                              alt={profile.full_name || ""}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            initials
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-slate-900 truncate">
                            {profile.full_name || profile.username || "User"}
                          </div>
                          {profile.username && (
                            <div className="text-sm text-slate-500 truncate">@{profile.username}</div>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

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
                  className="flex items-center justify-between py-4 hover:bg-slate-50 px-4 rounded-lg transition-colors"
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

      {/* Sponsorship Banner at Bottom */}
      <section className="mt-8 w-[95%] mx-auto">
        {sponsorships.length > 0 ? (
          sponsorships.map((sponsorship) => (
            <SponsorshipBanner
              key={sponsorship.id}
              sponsorship={sponsorship}
              variant="vertical"
            />
          ))
        ) : (
          <div className="card border-2 border-dashed border-purple-300 bg-gradient-to-br from-purple-50 to-indigo-50">
            <div className="flex items-center gap-4 py-6 px-4">
              <div className="w-16 h-16 rounded-xl bg-purple-200 flex items-center justify-center flex-shrink-0">
                <ALogo size={40} />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-lg text-slate-900 mb-1">Sponsor Placement Available</h3>
                <p className="text-sm text-slate-600 mb-2">
                  Your sponsor will appear here. High-visibility placement at the bottom of messages.
                </p>
                <a 
                  href="mailto:sponsors@apexcombatevents.com" 
                  className="text-sm text-purple-700 font-medium hover:underline block"
                >
                  Contact: sponsors@apexcombatevents.com
                </a>
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
