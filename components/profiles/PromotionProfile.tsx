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
import PromotionFighters from "@/components/promotions/PromotionFighters";

type Profile = {
  id?: string;
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
};

export default function PromotionProfile({ 
  profile, 
  posts = [],
  isOwnProfile = false 
}: { 
  profile: Profile;
  posts?: Post[];
  isOwnProfile?: boolean;
}) {
  const router = useRouter();
  const {
    id,
    full_name,
    username,
    avatar_url,
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

  const isMe = id && myId === id;
  const [isCreatePostModalOpen, setIsCreatePostModalOpen] = useState(false);
  // Start at page 0 (newest posts)
  const [postPage, setPostPage] = useState(0);

  return (
    <div className="space-y-6">
      {/* SECTION 1 – Banner / header */}
      <section className="rounded-2xl overflow-hidden border border-slate-200 bg-white shadow-sm">
        {/* Banner */}
        <div className="relative h-40 w-full bg-slate-200">
          {banner_url && (
            <Image
              src={banner_url}
              alt="Promotion banner"
              fill
              className="object-cover"
            />
          )}
        </div>

        <div className="px-5 pb-5 relative">
          <div className="flex items-center gap-4">
            {/* Avatar overlapping banner */}
            <div className="-mt-14 md:-mt-16">
              <div className="h-28 w-28 md:h-32 md:w-32 rounded-full border-4 border-white bg-slate-200 overflow-hidden">
                {avatar_url && (
                  <Image
                    src={avatar_url}
                    alt={full_name || "Promotion"}
                    width={128}
                    height={128}
                    className="h-full w-full object-cover"
                  />
                )}
              </div>
            </div>

            {/* Name + location + arts */}
            <div className="flex-1">
              <div className="flex flex-col md:flex-row md:items-center gap-3">
                <div className="flex flex-col">
                  <h1 className="text-lg md:text-xl font-semibold">
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
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 2 – Bio */}
      <section className="card">
        <div className="section-header mb-4">
          <h2 className="section-title text-lg">Bio</h2>
        </div>
        <p className="text-sm text-slate-700 leading-relaxed min-h-[60px]">
          {bio || (isMe ? "Describe your promotion and the type of events you run." : "")}
        </p>
      </section>

      {/* SECTION 3 – Fighters Roster */}
      {id && (
        <PromotionFighters promotionId={id} isOwner={isMe || false} />
      )}

      {/* SECTION 4 – Created events */}
      <section className="card">
        <div className="section-header mb-4">
          <h2 className="section-title text-lg">Created events</h2>
        </div>
        <p className="text-sm text-slate-600 mb-3">
          This will list events created by the promotion and allow gyms/head
          coaches to send fighters for open slots.
        </p>
        <div className="rounded-xl border border-dashed border-slate-200 p-4 text-xs text-slate-500">
          Event list coming soon. For now we&apos;ll focus on the profile UI and
          settings.
        </div>
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
                  {post.image_url ? (
                    <div className="relative aspect-square overflow-hidden bg-slate-100">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={post.image_url}
                        alt={post.content || "Post image"}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      {/* Overlay with content and date */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        <div className="absolute bottom-0 left-0 right-0 p-3 text-white">
                          {post.content && (
                            <p className="text-xs font-medium mb-1 line-clamp-2">
                              {post.content}
                            </p>
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
                  ) : (
                    <div className="aspect-square p-4 flex flex-col justify-between bg-gradient-to-br from-purple-50 to-slate-50">
                      <div>
                        {post.content && (
                          <p className="text-sm text-slate-800 line-clamp-4 mb-2">
                            {post.content}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="text-[10px] text-slate-500">
                          {new Date(post.created_at).toLocaleDateString()}
                        </div>
                        <PostReactions
                          postId={post.id}
                          commentHref={`/posts/${post.id}`}
                        />
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

      {/* SECTION 6 – Social links */}
      {((social_links?.instagram || social_links?.facebook || social_links?.twitter || social_links?.tiktok || social_links?.youtube) ||
        (social_links?.websites && Array.isArray(social_links.websites) && social_links.websites.length > 0) ||
        (social_links?.website)) && (
        <section className="card">
          <div className="section-header mb-4">
            <h2 className="section-title text-lg">Social media links</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
            {social_links?.instagram && (
              <PromoSocialRow label="Instagram" value={social_links.instagram} />
            )}
            {social_links?.facebook && (
              <PromoSocialRow label="Facebook" value={social_links.facebook} />
            )}
            {social_links?.twitter && (
              <PromoSocialRow label="Twitter / X" value={social_links.twitter} />
            )}
            {social_links?.tiktok && (
              <PromoSocialRow label="TikTok" value={social_links.tiktok} />
            )}
            {social_links?.youtube && (
              <PromoSocialRow label="YouTube" value={social_links.youtube} />
            )}
            {/* Multiple website links */}
            {social_links?.websites && Array.isArray(social_links.websites) && social_links.websites.length > 0
              ? social_links.websites.map((website: { name: string; url: string }, index: number) => (
                  <PromoSocialRow key={index} label={website.name || "Website"} value={website.url} />
                ))
              : social_links?.website && (
                  <PromoSocialRow label="Website" value={social_links.website} />
                )}
          </div>
        </section>
      )}
    </div>
  );
}

function PromoSocialRow({ label, value }: { label: string; value?: string }) {
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

