// components/profiles/ProfileBand.tsx
//
// Full-width colour stripe used by the "variant C" profile layout: the page
// alternates deep purple and white bands as you scroll, in the rhythm of a UFC
// fighter page. Section content stays in its normal white cards so nothing
// inside a purple band has to be restyled for contrast.
//
// When `active` is false the band renders nothing of its own, so the other
// profile variants keep their existing markup exactly.
"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type BandTone = "purple" | "light";

const TONE_CLASS: Record<BandTone, string> = {
  purple: "bg-gradient-to-b from-purple-800 to-purple-900",
  light: "bg-white",
};

export default function ProfileBand({
  active,
  tone,
  children,
}: {
  active: boolean;
  tone: BandTone;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [bleed, setBleed] = useState({ left: 0, right: 0 });

  // The bleed is measured instead of set to 100vw: a 100vw band is wider than
  // the document by the scrollbar width and would add a horizontal scrollbar.
  // The subpixel values are kept unrounded for the same reason — rounding up
  // by half a pixel on each side is enough to make the page scroll sideways.
  const measure = useCallback(() => {
    const parent = ref.current?.parentElement;
    if (!parent) return;
    const rect = parent.getBoundingClientRect();
    const viewport = document.documentElement.clientWidth;
    setBleed({
      left: Math.max(0, rect.left),
      right: Math.max(0, viewport - rect.right),
    });
  }, []);

  useEffect(() => {
    if (!active) return;
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [active, measure]);

  if (!active) return <>{children}</>;

  return (
    <div
      ref={ref}
      className={`space-y-6 py-8 sm:py-10 empty:hidden ${TONE_CLASS[tone]}`}
      style={{
        marginLeft: -bleed.left,
        marginRight: -bleed.right,
        paddingLeft: bleed.left,
        paddingRight: bleed.right,
      }}
    >
      {children}
    </div>
  );
}
