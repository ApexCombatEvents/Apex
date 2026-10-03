// lib/social-links.ts
//
// Profiles store social handles in the social_links JSON column, as either a
// bare @handle or a full URL, plus either a single `website` or a `websites`
// array. This turns that into a uniform list for display.

export type SocialPill = { label: string; href: string };

/** Platforms in the order they read best. */
const SOCIAL_PLATFORMS: Array<{ key: string; label: string; base?: string }> = [
  { key: "instagram", label: "Instagram", base: "https://instagram.com/" },
  { key: "tiktok", label: "TikTok", base: "https://tiktok.com/@" },
  { key: "youtube", label: "YouTube", base: "https://youtube.com/@" },
  { key: "twitter", label: "X", base: "https://twitter.com/" },
  { key: "facebook", label: "Facebook", base: "https://facebook.com/" },
];

export function resolveSocialHref(value: string, base?: string): string {
  const trimmed = value.trim();
  if (trimmed.startsWith("@")) {
    return base ? `${base}${trimmed.slice(1)}` : trimmed;
  }
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

export function getSocialPills(
  socialLinks?: Record<string, any> | null
): SocialPill[] {
  if (!socialLinks) return [];

  const websites: Array<{ name: string; url: string }> = Array.isArray(
    socialLinks.websites
  )
    ? socialLinks.websites
    : socialLinks.website
    ? [{ name: "Website", url: socialLinks.website }]
    : [];

  return [
    ...SOCIAL_PLATFORMS.filter((platform) => socialLinks[platform.key]).map(
      (platform) => ({
        label: platform.label,
        href: resolveSocialHref(String(socialLinks[platform.key]), platform.base),
      })
    ),
    ...websites
      .filter((website) => website?.url)
      .map((website) => ({
        label: website.name || "Website",
        href: resolveSocialHref(website.url),
      })),
  ];
}
