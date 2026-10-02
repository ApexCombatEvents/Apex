// hooks/useProfileVariant.ts
//
// Temporary switch so the profile layout treatments can be compared on
// localhost:
//   (no param)      – "plain",  variant A: light cards on the page background
//   ?header=photo   – "photo",  variant B: blurred portrait behind the header
//   ?header=c       – "banded", variant C: variant A inside alternating
//                     full-width purple / white stripes
//
// Read from window.location rather than useSearchParams so the profile page
// does not need a Suspense boundary.
"use client";

import { useEffect, useState } from "react";

export type ProfileVariant = "plain" | "photo" | "banded";

export function useProfileVariant(): ProfileVariant {
  const [variant, setVariant] = useState<ProfileVariant>("plain");

  useEffect(() => {
    const requested = new URLSearchParams(window.location.search).get("header");
    if (requested === "photo") {
      setVariant("photo");
    } else if (requested === "c") {
      setVariant("banded");
    } else {
      setVariant("plain");
    }
  }, []);

  return variant;
}
