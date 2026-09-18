// components/profile/MinorPhotoRules.tsx
// The clothing rules for under-18s, shown at the point of uploading rather
// than buried in the waiver.
//
// This is a warning, not enforcement. Nothing inspects the image: the rule is
// backed by reporting and takedown, which is exactly what the guardian
// consent text promises. If image review is built later, this wording should
// be revisited so it does not understate what actually happens.

"use client";

import { useEffect, useState } from "react";
import { createSupabaseBrowser } from "@/lib/supabase-browser";

export default function MinorPhotoRules() {
  const [isMinor, setIsMinor] = useState(false);

  useEffect(() => {
    const supabase = createSupabaseBrowser();
    let active = true;

    async function check() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.user) {
        if (active) setIsMinor(false);
        return;
      }

      const { data, error } = await supabase.rpc("is_minor", {
        profile_id: session.user.id,
      });

      if (!active) return;

      if (error) {
        console.error("is_minor check failed", error);
        setIsMinor(false);
        return;
      }

      setIsMinor(data === true);
    }

    check();

    return () => {
      active = false;
    };
  }, []);

  if (!isMinor) return null;

  return (
    <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3">
      <p className="text-xs font-semibold text-amber-900">
        Photo rules for under-18s
      </p>
      <p className="mt-1 text-xs leading-relaxed text-amber-900">
        Your profile picture and banner must show you fully clothed — a t-shirt,
        rash guard or full kit. Topless and bare-chested photos are not allowed,
        including training, sparring and weigh-in shots.
      </p>
      <p className="mt-1 text-xs leading-relaxed text-amber-900">
        Anyone can report a photo that breaks these rules and we will remove it
        without warning. Repeated breaches can get the account suspended.
      </p>
    </div>
  );
}
