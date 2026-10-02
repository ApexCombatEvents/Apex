// components/profiles/ProfileIdentityCard.tsx
//
// One card covering "who is this person": photo, name, affiliation, record,
// bio and social links. Replaces the old banner header, the separate Bio card
// and the Social media links card that used to sit at the foot of the page.
//
// Fighters and coaches have no banner any more. The profile picture is a 3:4
// portrait rather than a circle so action shots survive the crop, matching the
// ratio used by the fight picture on fight cards.

"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import FollowStats from "@/components/social/FollowStats";
import MessageButton from "@/components/messaging/MessageButton";
import { useProfileVariant } from "@/hooks/useProfileVariant";
import { countryToFlagUrl } from "@/lib/countries";

export type IdentityProfile = {
  id: string;
  full_name?: string | null;
  username?: string | null;
  role?: string | null;
  avatar_url?: string | null;
  bio?: string | null;
  country?: string | null;
  martial_arts?: string[] | null;
  record?: string | null;
  social_links?: Record<string, any> | null;
};

/** Platforms rendered as pills, in the order they read best. */
const SOCIAL_PLATFORMS: Array<{ key: string; label: string; base?: string }> = [
  { key: "instagram", label: "Instagram", base: "https://instagram.com/" },
  { key: "tiktok", label: "TikTok", base: "https://tiktok.com/@" },
  { key: "youtube", label: "YouTube", base: "https://youtube.com/@" },
  { key: "twitter", label: "X", base: "https://twitter.com/" },
  { key: "facebook", label: "Facebook", base: "https://facebook.com/" },
];

function resolveSocialHref(value: string, base?: string): string {
  const trimmed = value.trim();
  if (trimmed.startsWith("@")) {
    return base ? `${base}${trimmed.slice(1)}` : trimmed;
  }
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

export default function ProfileIdentityCard({
  profile,
  isMe,
  hideBio = false,
}: {
  profile: IdentityProfile;
  isMe: boolean;
  hideBio?: boolean;
}) {
  const {
    full_name,
    username,
    role,
    avatar_url,
    bio,
    country,
    martial_arts,
    record,
    social_links,
  } = profile;

  // Variant C reuses this card exactly as variant A renders it; only the page
  // around it changes, so the photo treatment stays specific to variant B.
  const variant = useProfileVariant();
  const [bioExpanded, setBioExpanded] = useState(false);

  const onPhoto = variant === "photo" && Boolean(avatar_url);

  const displayName = full_name || "Fighter name";
  const initial = displayName.trim().charAt(0).toUpperCase();
  const flagUrl = countryToFlagUrl(country);
  const arts = martial_arts?.length ? martial_arts : [];
  const gymUsername = social_links?.gym_username || "";
  const displayRecord = record && String(record).trim() !== "" ? String(record) : null;
  const roleLabel = role ? role.charAt(0).toUpperCase() + role.slice(1) : null;

  const websites: Array<{ name: string; url: string }> = Array.isArray(
    social_links?.websites
  )
    ? social_links!.websites
    : social_links?.website
    ? [{ name: "Website", url: social_links.website }]
    : [];

  const socialPills = [
    ...SOCIAL_PLATFORMS.filter((p) => social_links?.[p.key]).map((p) => ({
      label: p.label,
      href: resolveSocialHref(String(social_links![p.key]), p.base),
    })),
    ...websites
      .filter((w) => w?.url)
      .map((w) => ({
        label: w.name || "Website",
        href: resolveSocialHref(w.url),
      })),
  ];

  // Colour sets differ because the photo variant puts text on a dark overlay.
  const nameClass = onPhoto ? "text-white" : "text-slate-900";
  const mutedClass = onPhoto ? "text-white/70" : "text-slate-600";
  const bodyClass = onPhoto ? "text-white/85" : "text-slate-700";
  const chipClass = onPhoto
    ? "bg-white/15 text-white border border-white/20"
    : "bg-purple-50 text-purple-700 border border-purple-100";
  const pillClass = onPhoto
    ? "border-white/25 text-white/90 hover:bg-white/15"
    : "border-slate-200 text-slate-700 hover:border-purple-300 hover:text-purple-700";

  return (
    <section
      className={`relative overflow-hidden rounded-2xl border shadow-sm ${
        onPhoto ? "border-slate-800" : "border-slate-200/60 bg-white"
      }`}
    >
      {onPhoto && (
        <>
          <Image
            src={avatar_url || ""}
            alt=""
            fill
            aria-hidden="true"
            className="object-cover scale-110 blur-2xl"
            quality={40}
            priority
          />
          <div className="absolute inset-0 bg-slate-900/75" aria-hidden="true" />
        </>
      )}

      <div className="relative flex gap-4 sm:gap-6 p-4 sm:p-6">
        {/* Portrait. 3:4 so action shots are not cropped to a circle. */}
        <div className="w-28 sm:w-40 shrink-0">
          <div
            className={`w-full aspect-[3/4] rounded-2xl overflow-hidden ${
              onPhoto ? "bg-white/10 ring-1 ring-white/20" : "bg-slate-100"
            }`}
          >
            {avatar_url ? (
              <Image
                src={avatar_url}
                alt={displayName}
                width={480}
                height={640}
                className="h-full w-full object-cover"
                quality={90}
                priority
              />
            ) : (
              <div
                className="h-full w-full flex items-center justify-center"
                aria-hidden="true"
              >
                <span
                  className={`text-4xl font-semibold ${
                    onPhoto ? "text-white/40" : "text-slate-400"
                  }`}
                >
                  {initial}
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="flex-1 min-w-0 space-y-3">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className={`text-xl sm:text-2xl font-bold ${nameClass}`}>
                {displayName}
              </h1>
              {roleLabel && (
                <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${chipClass}`}>
                  {roleLabel}
                </span>
              )}
            </div>

            <div className={`flex flex-wrap items-center gap-x-3 gap-y-1 text-xs ${mutedClass}`}>
              {username && (
                <Link href={`/profile/${username}`} className="hover:underline">
                  @{username}
                </Link>
              )}
              {country && (
                <span className="inline-flex items-center gap-1.5">
                  {flagUrl && (
                    <Image
                      src={flagUrl.replace("/w20/", "/w40/")}
                      alt=""
                      width={32}
                      height={24}
                      aria-hidden="true"
                      className="w-4 h-3 object-cover rounded-sm"
                      style={{ imageRendering: "crisp-edges" }}
                    />
                  )}
                  {country}
                </span>
              )}
              {gymUsername && (
                <Link
                  href={`/profile/${gymUsername}`}
                  className={onPhoto ? "hover:underline" : "text-purple-700 hover:underline"}
                >
                  Gym: @{gymUsername}
                </Link>
              )}
            </div>
          </div>

          {displayRecord && (
            <div className="flex items-baseline gap-2">
              <span className={`text-2xl sm:text-3xl font-bold tracking-tight ${nameClass}`}>
                {displayRecord}
              </span>
              <span className={`text-[11px] uppercase tracking-wide ${mutedClass}`}>
                Record
              </span>
            </div>
          )}

          {arts.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {arts.map((art) => (
                <span
                  key={art}
                  className={`px-2.5 py-1 rounded-full text-xs font-medium ${chipClass}`}
                >
                  {art}
                </span>
              ))}
            </div>
          )}

          {!hideBio && (bio || isMe) && (
            <div>
              <p
                className={`text-sm leading-relaxed ${bodyClass} ${
                  bioExpanded ? "" : "line-clamp-3"
                }`}
              >
                {bio ||
                  "Tell people about your fighting style, experience and goals."}
              </p>
              {bio && bio.length > 180 && (
                <button
                  type="button"
                  onClick={() => setBioExpanded((open) => !open)}
                  className={`mt-1 text-xs font-medium ${
                    onPhoto ? "text-white/80 hover:text-white" : "text-purple-700 hover:underline"
                  }`}
                >
                  {bioExpanded ? "Less" : "More"}
                </button>
              )}
            </div>
          )}

          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <FollowStats profileId={profile.id} username={username} />
            {!isMe && (
              <MessageButton targetProfileId={profile.id} targetUsername={username} />
            )}
          </div>

          {socialPills.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {socialPills.map((pill) => (
                <Link
                  key={`${pill.label}-${pill.href}`}
                  href={pill.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`px-2.5 py-1 rounded-full border text-xs font-medium transition-colors ${pillClass}`}
                >
                  {pill.label}
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
