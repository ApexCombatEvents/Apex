// components/profiles/ProfileIdentityCard.tsx
//
// One card covering "who is this person", in three columns beside the photo:
// identity (role, name, nickname, handle, gym), vitals (record, weight,
// height, age, country) and engagement (disciplines, follow, social links).
//
// Fighters and coaches have no banner any more. The profile picture is a 3:4
// portrait rather than a circle so action shots survive the crop, matching the
// ratio used by the fight picture on fight cards.
//
// Column order differs by breakpoint. The DOM runs portrait, vitals, identity,
// engagement — the stacked order wanted on phones, where the vitals sit beside
// the photo and the other two take full-width rows underneath. `lg:order-*`
// then reshuffles them into identity, vitals, engagement on wide screens.

"use client";

import Image from "next/image";
import Link from "next/link";
import FollowStats from "@/components/social/FollowStats";
import MessageButton from "@/components/messaging/MessageButton";
import GymLink from "@/components/profiles/GymLink";
import SocialPills from "@/components/profiles/SocialPills";
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

/** A row in the vitals column, already formatted for display by the caller. */
export type IdentityVital = { label: string; value: string };

export default function ProfileIdentityCard({
  profile,
  isMe,
  vitals = [],
}: {
  profile: IdentityProfile;
  isMe: boolean;
  vitals?: IdentityVital[];
}) {
  const {
    full_name,
    username,
    role,
    avatar_url,
    country,
    martial_arts,
    social_links,
  } = profile;

  const displayName = full_name || "Fighter name";
  const initial = displayName.trim().charAt(0).toUpperCase();
  const flagUrl = countryToFlagUrl(country);
  const arts = martial_arts?.length ? martial_arts : [];
  const gymUsername = social_links?.gym_username || "";
  const nickname =
    typeof social_links?.nickname === "string" ? social_links.nickname.trim() : "";
  const roleLabel = role ? role.charAt(0).toUpperCase() + role.slice(1) : null;

  // A column of dashes says nothing, so unset figures are left out rather than
  // padding the card out with placeholders.
  const shownVitals = vitals.filter(
    (vital) => vital.value && vital.value.trim() !== "" && vital.value !== "–"
  );

  const chipClass = "bg-purple-50 text-purple-700 border border-purple-100";
  const labelClass =
    "text-[10px] font-semibold uppercase tracking-wider text-slate-400";
  // Full-width stacked rows on phones, an inline column with a divider from lg.
  const stackedColumnClass =
    "w-full min-w-0 space-y-3 border-t border-slate-200/70 pt-4 lg:w-auto lg:border-t-0 lg:pt-0";

  return (
    <section className="relative overflow-hidden rounded-2xl border border-slate-200/60 bg-white shadow-sm">
      <div className="relative flex flex-wrap gap-4 sm:gap-6 p-4 sm:p-6">
        {/* Portrait. Stretches to the row height so it fills the card rather
            than stopping partway down, with a floor so it is never squat. */}
        <div className="w-32 sm:w-44 lg:w-48 shrink-0 self-stretch lg:order-1">
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

        {/* Vitals. Beside the photo at every width — on a phone this is the
            column worth seeing first, so it takes the space next to it. */}
        <div className="flex-1 min-w-0 lg:order-3 lg:flex-1 lg:border-l lg:border-slate-200/70 lg:pl-6">
          <dl className="space-y-2.5">
            {shownVitals.map((vital) => (
              <div key={vital.label}>
                <dt className={labelClass}>{vital.label}</dt>
                <dd
                  className={`font-semibold text-slate-900 ${
                    vital.label.toLowerCase() === "record"
                      ? "text-lg leading-tight tracking-tight"
                      : "text-sm"
                  }`}
                >
                  {vital.value}
                </dd>
              </div>
            ))}

            {country && (
              <div>
                <dt className={labelClass}>Country</dt>
                <dd className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                  {flagUrl && (
                    <Image
                      src={flagUrl}
                      alt=""
                      width={80}
                      height={60}
                      aria-hidden="true"
                      className="w-6 h-[18px] shrink-0 rounded-sm object-cover ring-1 ring-slate-200"
                    />
                  )}
                  <span className="min-w-0 truncate">{country}</span>
                </dd>
              </div>
            )}
          </dl>
        </div>

        {/* Identity. */}
        <div className={`${stackedColumnClass} lg:order-2 lg:flex-[1.2]`}>
          <div className="space-y-1">
            {roleLabel && (
              <p className="text-[10px] font-semibold uppercase tracking-wider text-purple-600">
                {roleLabel}
              </p>
            )}

            <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
              {displayName}
            </h1>

            {nickname && (
              <p className="text-sm font-semibold text-purple-700">
                &ldquo;{nickname}&rdquo;
              </p>
            )}

            {username && (
              <p className="text-xs text-slate-600">
                <Link href={`/profile/${username}`} className="hover:underline">
                  @{username}
                </Link>
              </p>
            )}

            {gymUsername && (
              <GymLink
                handle={gymUsername}
                className="block text-xs font-medium text-purple-700 hover:underline"
              />
            )}
          </div>
        </div>

        {/* Disciplines, following and links. */}
        <div
          className={`${stackedColumnClass} lg:order-4 lg:flex-1 lg:border-l lg:border-slate-200/70 lg:pl-6`}
        >
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

          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <FollowStats profileId={profile.id} username={username} />
            {!isMe && (
              <MessageButton targetProfileId={profile.id} targetUsername={username} />
            )}
          </div>

          <SocialPills socialLinks={social_links} />
        </div>
      </div>
    </section>
  );
}
