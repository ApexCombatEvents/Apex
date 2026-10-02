// components/profiles/ProfileIdentityCard.tsx
//
// One card covering "who is this person": photo, name, nickname, affiliation,
// record and social links. Replaces the old banner header, the separate Bio
// card and the Social media links card that used to sit at the foot of the page.
//
// Fighters and coaches have no banner any more. The profile picture is a 3:4
// portrait rather than a circle so action shots survive the crop, matching the
// ratio used by the fight picture on fight cards.

"use client";

import Image from "next/image";
import Link from "next/link";
import FollowStats from "@/components/social/FollowStats";
import MessageButton from "@/components/messaging/MessageButton";
import { countryToFlagUrl } from "@/lib/countries";

export type IdentityProfile = {
  id: string;
  full_name?: string | null;
  username?: string | null;
  role?: string | null;
  avatar_url?: string | null;
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
}: {
  profile: IdentityProfile;
  isMe: boolean;
}) {
  const {
    full_name,
    username,
    role,
    avatar_url,
    country,
    martial_arts,
    record,
    social_links,
  } = profile;

  const displayName = full_name || "Fighter name";
  const initial = displayName.trim().charAt(0).toUpperCase();
  const flagUrl = countryToFlagUrl(country);
  const arts = martial_arts?.length ? martial_arts : [];
  const gymUsername = social_links?.gym_username || "";
  const nickname =
    typeof social_links?.nickname === "string" ? social_links.nickname.trim() : "";
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

  const nameClass = "text-slate-900";
  const mutedClass = "text-slate-600";
  const chipClass = "bg-purple-50 text-purple-700 border border-purple-100";
  const pillClass =
    "border-slate-200 text-slate-700 hover:border-purple-300 hover:text-purple-700";

  return (
    <section className="relative overflow-hidden rounded-2xl border border-slate-200/60 bg-white shadow-sm">
      {/* flex-wrap, so the credentials column sits beside the identity on wide
          screens and wraps to its own full-width row below on narrow ones. */}
      <div className="relative flex flex-wrap gap-4 sm:gap-6 p-4 sm:p-6">
        {/* Portrait. Stretches to the row height so it fills the card rather
            than stopping partway down, with a floor so it is never squat. */}
        <div className="w-32 sm:w-44 lg:w-48 shrink-0 self-stretch">
          <div className="h-full min-h-[11rem] sm:min-h-[14rem] rounded-2xl overflow-hidden bg-slate-100">
            {avatar_url ? (
              <Image
                src={avatar_url}
                alt={displayName}
                width={640}
                height={854}
                className="h-full w-full object-cover"
                quality={90}
                priority
              />
            ) : (
              <div
                className="h-full w-full flex items-center justify-center"
                aria-hidden="true"
              >
                <span className="text-4xl font-semibold text-slate-400">
                  {initial}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Identity. Capped width so the column beside it starts near the
            middle of the card rather than hugging the right edge. min-w-0 lets
            it shrink below its content on narrow phones instead of pushing the
            page wider than the viewport. */}
        <div className="flex-1 min-w-0 space-y-3 lg:max-w-[20rem]">
          <div className="space-y-1">
            <h1 className={`text-xl sm:text-2xl font-bold ${nameClass}`}>
              {displayName}
            </h1>

            {nickname && (
              <p className="text-sm font-semibold text-purple-700">
                &ldquo;{nickname}&rdquo;
              </p>
            )}

            <div className={`flex flex-wrap items-center gap-x-2 gap-y-1 text-xs ${mutedClass}`}>
              {username && (
                <Link href={`/profile/${username}`} className="hover:underline">
                  @{username}
                </Link>
              )}
              {roleLabel && (
                <span className={`px-1.5 py-px rounded text-[9px] font-semibold uppercase tracking-wide ${chipClass}`}>
                  {roleLabel}
                </span>
              )}
            </div>

            {gymUsername && (
              <div className={`text-xs ${mutedClass}`}>
                <Link
                  href={`/profile/${gymUsername}`}
                  className="text-purple-700 hover:underline"
                >
                  Gym: @{gymUsername}
                </Link>
              </div>
            )}
          </div>

          {displayRecord && (
            <div className="flex items-baseline gap-2">
              <span className={`text-xl sm:text-2xl font-bold tracking-tight ${nameClass}`}>
                {displayRecord}
              </span>
              <span className="text-[10px] uppercase tracking-wide text-slate-400">
                W-L-D
              </span>
            </div>
          )}
        </div>

        {/* Country, following, disciplines and links. */}
        <div className="w-full space-y-3 lg:flex-1 lg:border-l lg:border-slate-200/70 lg:pl-6">
          {country && (
            <div className={`flex items-center gap-1.5 text-xs ${mutedClass}`}>
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
            </div>
          )}

          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <FollowStats profileId={profile.id} username={username} />
            {!isMe && (
              <MessageButton targetProfileId={profile.id} targetUsername={username} />
            )}
          </div>

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

          {socialPills.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
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
