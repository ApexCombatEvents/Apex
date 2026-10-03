// components/profiles/SocialPills.tsx
//
// A profile's social links as a row of pills, shared by the fighter, coach,
// gym and promotion headers so every profile type presents them the same way.

"use client";

import Link from "next/link";
import { getSocialPills } from "@/lib/social-links";

export default function SocialPills({
  socialLinks,
  className = "",
}: {
  socialLinks?: Record<string, any> | null;
  className?: string;
}) {
  const pills = getSocialPills(socialLinks);

  if (pills.length === 0) return null;

  return (
    <div className={`flex flex-wrap gap-1.5 ${className}`}>
      {pills.map((pill) => (
        <Link
          key={`${pill.label}-${pill.href}`}
          href={pill.href}
          target="_blank"
          rel="noopener noreferrer"
          className="px-2.5 py-1 rounded-full border border-slate-200 text-slate-700 text-xs font-medium transition-colors hover:border-purple-300 hover:text-purple-700"
        >
          {pill.label}
        </Link>
      ))}
    </div>
  );
}
