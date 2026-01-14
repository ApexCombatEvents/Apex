"use client";

import { useEffect, useState, useMemo } from "react";
import { createSupabaseBrowser } from "@/lib/supabase-browser";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import ConfirmDialog from "@/components/ui/ConfirmDialog";

type Event = {
  id: string;
  title: string | null;
  name: string | null;
  event_date: string | null;
  owner: {
    id: string;
    username: string | null;
    full_name: string | null;
  } | null;
};

type Profile = {
  id: string;
  username: string | null;
  full_name: string | null;
  role: string | null;
  avatar_url: string | null;
  created_at: string;
};

export default function AdminDashboard() {
  const supabase = createSupabaseBrowser();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [activeTab, setActiveTab] = useState<"events" | "profiles">("events");
  
  const [events, setEvents] = useState<Event[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  
  const [searchQuery, setSearchQuery] = useState("");
  const [deleting, setDeleting] = useState<string | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({ open: false, title: "", message: "", onConfirm: () => {} });

  useEffect(() => {
    checkAdmin();
  }, []);

  useEffect(() => {
    if (isAdmin) {
      loadAllData();
    }
  }, [isAdmin]);

  async function checkAdmin() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push("/");
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile || (profile.role?.toLowerCase() !== "admin" && profile.role?.toUpperCase() !== "ADMIN")) {
      router.push("/");
      return;
    }

    setIsAdmin(true);
  }

  async function loadAllData() {
    setLoading(true);
    try {
      // Load both events and profiles in parallel for accurate counts
      const [eventsResult, profilesResult] = await Promise.all([
        supabase
          .from("events")
          .select("id, title, name, event_date, owner_profile_id"),
        supabase
          .from("profiles")
          .select("id, username, full_name, role, avatar_url, created_at"),
      ]);

      // Process events
      const { data: eventsData, error: eventsError } = eventsResult;
      if (eventsError) {
        console.error("Error loading events:", eventsError);
        setEvents([]);
      } else if (eventsData && Array.isArray(eventsData)) {
        // Get unique owner IDs
        const ownerIds = Array.from(
          new Set(
            eventsData
              .map((e: any) => e.owner_profile_id)
              .filter((id: string | null) => !!id)
          )
        );

        // Load owner profiles
        let ownersMap: Record<string, any> = {};
        if (ownerIds.length > 0) {
          const { data: ownersData } = await supabase
            .from("profiles")
            .select("id, username, full_name")
            .in("id", ownerIds);

          if (ownersData) {
            ownersMap = ownersData.reduce((acc: any, owner: any) => {
              acc[owner.id] = owner;
              return acc;
            }, {});
          }
        }

        const eventsList = eventsData.map((e: any) => {
          const ownerId = e.owner_profile_id;
          return {
            id: e.id,
            title: e.title,
            name: e.name,
            event_date: e.event_date,
            owner: ownerId ? ownersMap[ownerId] || null : null,
          };
        });

        // Sort alphabetically by title or name
        eventsList.sort((a, b) => {
          const nameA = (a.title || a.name || "").toLowerCase();
          const nameB = (b.title || b.name || "").toLowerCase();
          return nameA.localeCompare(nameB);
        });

        setEvents(eventsList);
      } else {
        setEvents([]);
      }

      // Process profiles
      const { data: profilesData, error: profilesError } = profilesResult;
      if (profilesError) {
        console.error("Error loading profiles:", profilesError);
      }

      if (profilesData) {
        // Sort alphabetically by full_name or username
        const sortedProfiles = [...profilesData].sort((a, b) => {
          const nameA = (a.full_name || a.username || "").toLowerCase();
          const nameB = (b.full_name || b.username || "").toLowerCase();
          return nameA.localeCompare(nameB);
        });
        setProfiles(sortedProfiles);
      } else {
        setProfiles([]);
      }
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  }

  // Filter events and profiles based on search query
  const filteredEvents = useMemo(() => {
    if (!searchQuery.trim()) return events;
    const query = searchQuery.toLowerCase();
    return events.filter((event) => {
      const title = (event.title || event.name || "").toLowerCase();
      return title.includes(query);
    });
  }, [events, searchQuery]);

  const filteredProfiles = useMemo(() => {
    if (!searchQuery.trim()) return profiles;
    const query = searchQuery.toLowerCase();
    return profiles.filter((profile) => {
      const name = (profile.full_name || profile.username || "").toLowerCase();
      return name.includes(query);
    });
  }, [profiles, searchQuery]);

  async function deleteEvent(eventId: string) {
    setDeleting(eventId);
    try {
      const { error } = await supabase
        .from("events")
        .delete()
        .eq("id", eventId);

      if (error) {
        console.error("Error deleting event:", error);
        alert("Failed to delete event");
      } else {
        setEvents(events.filter(e => e.id !== eventId));
      }
    } catch (error) {
      console.error("Error deleting event:", error);
      alert("Failed to delete event");
    } finally {
      setDeleting(null);
    }
  }

  async function deleteProfile(profileId: string) {
    setDeleting(profileId);
    try {
      const { error } = await supabase
        .from("profiles")
        .delete()
        .eq("id", profileId);

      if (error) {
        console.error("Error deleting profile:", error);
        alert("Failed to delete profile");
      } else {
        setProfiles(profiles.filter(p => p.id !== profileId));
      }
    } catch (error) {
      console.error("Error deleting profile:", error);
      alert("Failed to delete profile");
    } finally {
      setDeleting(null);
    }
  }

  function handleDeleteEvent(eventId: string, eventName: string) {
    setConfirmDialog({
      open: true,
      title: "Delete Event",
      message: `Are you sure you want to delete "${eventName}"? This action cannot be undone.`,
      onConfirm: () => {
        deleteEvent(eventId);
        setConfirmDialog({ ...confirmDialog, open: false });
      },
    });
  }

  function handleDeleteProfile(profileId: string, profileName: string) {
    setConfirmDialog({
      open: true,
      title: "Delete Profile",
      message: `Are you sure you want to delete "${profileName}"? This action cannot be undone.`,
      onConfirm: () => {
        deleteProfile(profileId);
        setConfirmDialog({ ...confirmDialog, open: false });
      },
    });
  }

  if (!isAdmin) {
    return <div className="p-8 text-center">Loading...</div>;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Admin Dashboard</h1>
          <p className="text-sm text-slate-600 mt-1">
            Manage all platform content
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/admin/payouts"
            className="text-sm text-purple-700 hover:underline"
          >
            Payouts
          </Link>
          <Link
            href="/admin/moderation"
            className="text-sm text-purple-700 hover:underline"
          >
            Moderation
          </Link>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-200">
        <button
          onClick={() => setActiveTab("events")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "events"
              ? "border-purple-600 text-purple-700"
              : "border-transparent text-slate-600 hover:text-slate-900"
          }`}
        >
          Events ({events.length})
        </button>
        <button
          onClick={() => setActiveTab("profiles")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "profiles"
              ? "border-purple-600 text-purple-700"
              : "border-transparent text-slate-600 hover:text-slate-900"
          }`}
        >
          Profiles ({profiles.length})
        </button>
      </div>

      {/* Search Bar */}
      <div className="flex items-center gap-4">
        <input
          type="text"
          placeholder={`Search ${activeTab === "events" ? "events" : "profiles"} by name...`}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="flex-1 rounded-xl border border-slate-300 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery("")}
            className="text-sm text-slate-600 hover:text-slate-900"
          >
            Clear
          </button>
        )}
      </div>

      {/* Content */}
      {loading ? (
        <div className="text-center py-8 text-slate-600">Loading...</div>
      ) : (
        <>
          {/* Events */}
          {activeTab === "events" && (
            <div className="space-y-3">
              {filteredEvents.length === 0 ? (
                <div className="card text-center py-8 text-slate-600">
                  {searchQuery ? "No events found matching your search." : "No events found."}
                </div>
              ) : (
                filteredEvents.map((event) => (
                  <div key={event.id} className="card flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <h3 className="font-semibold text-slate-900">
                          {event.title || event.name || "Untitled Event"}
                        </h3>
                      </div>
                      <div className="mt-1 flex items-center gap-4 text-xs text-slate-600">
                        {event.event_date && (
                          <span>{new Date(event.event_date).toLocaleDateString()}</span>
                        )}
                        {event.owner && (
                          <span>
                            by {event.owner.full_name || event.owner.username || "Unknown"}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/events/${event.id}`}
                        className="px-3 py-1.5 text-sm text-purple-700 hover:underline"
                      >
                        View →
                      </Link>
                      <button
                        onClick={() => handleDeleteEvent(event.id, event.title || event.name || "Untitled Event")}
                        disabled={deleting === event.id}
                        className="px-3 py-1.5 text-sm font-medium bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 whitespace-nowrap"
                      >
                        {deleting === event.id ? "Deleting..." : "Delete"}
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Profiles */}
          {activeTab === "profiles" && (
            <div className="space-y-3">
              {filteredProfiles.length === 0 ? (
                <div className="card text-center py-8 text-slate-600">
                  {searchQuery ? "No profiles found matching your search." : "No profiles found."}
                </div>
              ) : (
                filteredProfiles.map((profile) => (
                  <div key={profile.id} className="card flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1">
                      {profile.avatar_url && (
                        <Image
                          src={profile.avatar_url}
                          alt=""
                          width={40}
                          height={40}
                          className="rounded-full"
                        />
                      )}
                      <div>
                        <div className="font-medium text-slate-900">
                          {profile.full_name || profile.username || "Unnamed"}
                        </div>
                        <div className="text-xs text-slate-600 flex items-center gap-2">
                          {profile.username && <span>@{profile.username}</span>}
                          {profile.role && (
                            <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                              {profile.role}
                            </span>
                          )}
                          <span>{new Date(profile.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {profile.username && (
                        <Link
                          href={`/profile/${profile.username}`}
                          className="px-3 py-1.5 text-sm text-purple-700 hover:underline"
                        >
                          View →
                        </Link>
                      )}
                      <button
                        onClick={() => handleDeleteProfile(profile.id, profile.full_name || profile.username || "Unnamed")}
                        disabled={deleting === profile.id}
                        className="px-3 py-1.5 text-sm font-medium bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 whitespace-nowrap"
                      >
                        {deleting === profile.id ? "Deleting..." : "Delete"}
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </>
      )}

      <ConfirmDialog
        open={confirmDialog.open}
        title={confirmDialog.title}
        description={confirmDialog.message}
        confirmText="Delete"
        cancelText="Cancel"
        danger={true}
        onConfirm={confirmDialog.onConfirm}
        onClose={() => setConfirmDialog({ ...confirmDialog, open: false })}
      />
    </div>
  );
}
