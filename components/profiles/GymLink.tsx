// components/profiles/GymLink.tsx
//
// A fighter's gym is stored as a handle in social_links.gym_username, but a
// handle reads poorly next to a name ("apexcombatacademy"), so this resolves
// the gym's real name and links to its profile.
//
// Pages that already loaded the gym server-side should pass `name` to skip the
// lookup entirely. Everywhere else the handle renders immediately — the link
// works straight away — and the name replaces it once resolved.

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createSupabaseBrowser } from "@/lib/supabase-browser";

/**
 * Shared across every GymLink on the page, keyed by handle. A ten-bout card
 * usually draws from a handful of gyms, so this keeps the lookup to one
 * request per gym rather than one per fighter.
 */
const nameCache = new Map<string, Promise<string | null>>();

function fetchGymName(handle: string): Promise<string | null> {
  const key = handle.toLowerCase();
  const cached = nameCache.get(key);
  if (cached) return cached;

  const request = (async () => {
    try {
      const supabase = createSupabaseBrowser();
      const { data } = await supabase
        .from("profiles")
        .select("full_name")
        .ilike("username", handle)
        .maybeSingle();
      return data?.full_name?.trim() || null;
    } catch {
      // A failed lookup just means the handle stays on screen.
      return null;
    }
  })();

  nameCache.set(key, request);
  return request;
}

export default function GymLink({
  handle,
  name,
  className = "",
}: {
  handle?: string | null;
  /** The gym's real name, when the caller already has it. */
  name?: string | null;
  className?: string;
}) {
  const cleanHandle = (handle || "").trim().replace(/^@/, "");
  const [resolved, setResolved] = useState<string | null>(name?.trim() || null);

  useEffect(() => {
    if (name?.trim() || !cleanHandle) return;

    let cancelled = false;
    fetchGymName(cleanHandle).then((gymName) => {
      if (!cancelled && gymName) setResolved(gymName);
    });

    return () => {
      cancelled = true;
    };
  }, [cleanHandle, name]);

  if (!cleanHandle) return null;

  return (
    <Link href={`/profile/${cleanHandle}`} className={className}>
      {resolved || cleanHandle}
    </Link>
  );
}
