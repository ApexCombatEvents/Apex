// components/profiles/PromotionProfile.tsx
"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowser } from "@/lib/supabase-browser";
import CreatePostModal from "@/components/social/CreatePostModal";
import PostReactions from "@/components/social/PostReactions";
import PostActionsMenu from "@/components/social/PostActionsMenu";
import PostImages from "@/components/social/PostImages";
import PostContent from "@/components/social/PostContent";
import BoutShareCard, { type BoutShareMetadata } from "@/components/social/BoutShareCard";
import PromotionFighters from "@/components/promotions/PromotionFighters";
import SocialPills from "@/components/profiles/SocialPills";

type Profile = {
  id: string;
  full_name?: string | null;
  username?: string | null;
  avatar_url?: string | null;
  banner_url?: string | null;
  bio?: string | null;
  martial_arts?: string[] | null;
  social_links?: {
    instagram?: string;
    twitter?: string;
    tiktok?: string;
    website?: string;
    [key: string]: any;
  } | null;
};

type Post = {
  id: string;
  content: string | null;
  created_at: string;
  image_url?: string | null;
  image_urls?: string[] | null;
  post_metadata?: BoutShareMetadata | null;
};

export default function PromotionProfile({ 
  profile, 
  posts = [],
  isOwnProfile = false,
  initialEvents = []
}: { 
  profile: Profile;
  posts?: Post[];
  isOwnProfile?: boolean;
  initialEvents?: any[];
}) {
  const router = useRouter();
  const {
    id,
    full_name,
    username,
    banner_url,
    bio,
    martial_arts,
    social_links,
  } = profile;

  const arts = martial_arts && martial_arts.length ? martial_arts : [];

  // figure out if this is my own profile
  const [myId, setMyId] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createSupabaseBrowser();
    supabase.auth.getUser().then(({ data }) => {
      setMyId(data.user?.id ?? null);
    });
  }, []);

  const isMe = myId === id;
  const [isCreatePostModalOpen, setIsCreatePostModalOpen] = useState(false);
  // Start at page 0 (newest posts)
  const [postPage, setPostPage] = useState(0);

  const [events, setEvents] = useState<any[]>(initialEvents);
  const [eventsLoading, setEventsLoading] = useState(initialEvents.length === 0);
  const [eventsFilter, setEventsFilter] = useState<"upcoming" | "past">("upcoming");
  const [eventsDisplayCount, setEventsDisplayCount] = useState(5);


  // Load events for this promotion if not provided
  useEffect(() => {
    if (!id || initialEvents.length > 0) return;
    const supabase = createSupabaseBrowser();

    (async () => {
      setEventsLoading(true);
      
      const { data: eventsData, error: eventsError } = await supabase
        .from("events")
        .select("id, owner_profile_id, title, name, event_date, location, banner_url")
        .eq("owner_profile_id", id)
        .order("event_date", { ascending: true });

      if (eventsError) {
        console.error("Error loading events:", eventsError);
        setEvents([]);
      } else {
        setEvents(eventsData || []);
      }
      setEventsLoading(false);
    })();
  }, [id, initialEvents]);

  // Helper function to check if event is upcoming
  const isEventUpcoming = (eventDate: string | null) => {
    if (!eventDate) return true; // Events without dates treated as upcoming (drafts)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const date = new Date(eventDate);
    date.setHours(0, 0, 0, 0);
    return date >= today;
  };

  // Filter and paginate events
  const getFilteredEvents = () => {
    const filtered = events.filter((ev) => {
      const upcoming = isEventUpcoming(ev.event_date || null);
      return eventsFilter === "upcoming" ? upcoming : !upcoming;
    });
    // Sort: upcoming shows earliest first, past shows most recent first
    const sorted = [...filtered].sort((a, b) => {
      const dateA = a.event_date ? new Date(a.event_date).getTime() : Infinity;
      const dateB = b.event_date ? new Date(b.event_date).getTime() : Infinity;
      return eventsFilter === "upcoming" ? dateA - dateB : dateB - dateA;
    });
    return sorted.slice(0, eventsDisplayCount);
  };

  return (
    <div className="space-y-6">
      {/* SECTION 1 – Header: banner, identity, bio and links */}
      <section className="rounded-2xl overflow-hidden border border-slate-200 bg-white shadow-sm">
        {/* Banner. Promotions have no profile picture, so this is the main
            image and is given the height to carry the header on its own. */}
        <div className="relative h-44 sm:h-56 lg:h-64 w-full bg-slate-200">
          {banner_url ? (
            <Image
              src={banner_url}
              alt={full_name ? `${full_name} banner` : "Promotion banner"}
              fill
              sizes="(max-width: 1024px) 100vw, 1024px"
              className="object-cover"
              priority
            />
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-500 px-4">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6 mb-1.5 opacity-50"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
              <div className="text-xs font-medium mb-0.5">No banner</div>
              <div className="text-[10px] opacity-75 text-center">
                1920×640px (3:1)
              </div>
            </div>
          )}
        </div>

        <div className="p-5 sm:p-6 space-y-4">
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
              {full_name || "Promotion name"}
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

          {arts.length > 0 && (
            <div className="flex flex-wrap gap-2 text-xs">
              {arts.map((art) => (
                <span
                  key={art}
                  className="px-2 py-1 rounded-full bg-purple-50 text-purple-700"
                >
                  {art}
                </span>
              ))}
            </div>
          )}

          {/* Bio and links live in the header rather than in cards of their
              own, so the top of the page reads as one introduction. */}
          {bio ? (
            <p className="max-w-3xl text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
              {bio}
            </p>
          ) : (
            isMe && (
              <p className="text-sm text-slate-400">
                Describe your promotion and the type of events you run.
              </p>
            )
          )}

          <SocialPills socialLinks={social_links} />
        </div>
      </section>

      {/* SECTION 3 – Fighters Roster */}
      {id && (
        <PromotionFighters promotionId={id} isOwner={isMe || false} />
      )}

      {/* SECTION 4 – Events */}
      <section className="card">
        <div className="section-header mb-4">
          <h2 className="section-title text-lg">Events</h2>
        </div>
        
        {eventsLoading ? (
          <p className="text-sm text-slate-600">Loading events…</p>
        ) : events.length === 0 ? (
          <p className="text-sm text-slate-600">
            No events found for this promotion. {isMe && "Use the create event page to add your first show."}
          </p>
        ) : (
          <>
            {/* Filter buttons */}
            <div className="flex items-center gap-2 mb-3">
              <button
                onClick={() => {
                  setEventsFilter("upcoming");
                  setEventsDisplayCount(5);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  eventsFilter === "upcoming"
                    ? "bg-purple-100 text-purple-700 border border-purple-300"
                    : "bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200"
                }`}
              >
                Upcoming
              </button>
              <button
                onClick={() => {
                  setEventsFilter("past");
                  setEventsDisplayCount(5);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  eventsFilter === "past"
                    ? "bg-purple-100 text-purple-700 border border-purple-300"
                    : "bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200"
                }`}
              >
                Past
              </button>
            </div>

            {getFilteredEvents().length === 0 ? (
              <p className="text-sm text-slate-600">
                No {eventsFilter === "upcoming" ? "upcoming" : "past"} events.
              </p>
            ) : (
              <>
                <div className="entry-grid">
                  {getFilteredEvents().map((ev) => {
                    const title = ev.title || ev.name || "Untitled event";
                    const dateLabel = ev.event_date
                      ? new Date(ev.event_date).toLocaleDateString()
                      : "Date TBC";
                    const upcoming = isEventUpcoming(ev.event_date || null);

                    return (
                      <Link
                        key={ev.id}
                        href={`/events/${ev.id}`}
                        className={`entry-card group flex items-stretch gap-4 ${
                          upcoming ? "entry-card-accent" : ""
                        }`}
                      >
                        <div className="entry-poster">
                          {ev.banner_url ? (
                            <Image
                              src={ev.banner_url}
                              alt={title}
                              width={112}
                              height={112}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="h-full w-full bg-gradient-to-br from-purple-100 to-slate-100" />
                          )}
                        </div>

                        <div className="flex-1 min-w-0 flex flex-col justify-center">
                          <span className="text-sm sm:text-base font-semibold text-slate-900 group-hover:text-purple-700 line-clamp-2">
                            {title}
                          </span>
                          <span className="mt-1 text-xs text-slate-500">{dateLabel}</span>
                          {ev.location && (
                            <span className="mt-0.5 text-xs text-slate-600 truncate">
                              {ev.location}
                            </span>
                          )}
                          <span className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-purple-700">
                            View event
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </span>
                        </div>
                      </Link>
                    );
                  })}
                </div>

                {/* Load more button */}
                {events.filter((ev) => {
                  const upcoming = isEventUpcoming(ev.event_date || null);
                  return eventsFilter === "upcoming" ? upcoming : !upcoming;
                }).length > eventsDisplayCount && (
                  <div className="mt-4 flex justify-center">
                    <button
                      onClick={() => setEventsDisplayCount(prev => prev + 5)}
                      className="px-4 py-2 rounded-lg border border-slate-300 bg-white text-slate-700 text-sm font-medium hover:bg-slate-50 transition-colors"
                    >
                      Load More
                    </button>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </section>

      {/* SECTION 5 – Social feed */}
      <section className="card">
        <div className="section-header mb-4">
          <h2 className="section-title text-lg">Social feed</h2>
        </div>
        <div className="flex items-center justify-between mb-4">
          {isMe && id && (
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
        {posts.length === 0 ? (
          <div className="h-32 rounded-xl border border-dashed border-slate-200 flex items-center justify-center text-xs text-slate-400">
            No posts yet.
          </div>
        ) : (
          <div className="relative">
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
        {isMe && id && (
          <CreatePostModal
            isOpen={isCreatePostModalOpen}
            onClose={() => setIsCreatePostModalOpen(false)}
            profileId={id}
          />
        )}
      </section>

    </div>
  );
}


