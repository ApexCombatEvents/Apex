// components/events/FightCardPortrait.tsx
//
// The fighter portrait shown on every fight card surface. Not a client
// component, so it works in both the server-rendered event page and the
// client-rendered live and stream views.

import Image from "next/image";
import {
  fightCardIcon,
  fightCardIconHeight,
  FIGHT_CARD_ICON_QUALITY,
  type FightCardIconSource,
} from "@/lib/fight-card-icon";

export default function FightCardPortrait({
  profile,
  name,
  widthClass,
  requestWidth,
  rounded = "rounded-xl",
  initialClass = "text-lg",
}: {
  /** Omitted for bouts with a typed-in name and no linked profile. */
  profile?: FightCardIconSource | null;
  name: string;
  /** Tailwind width classes, e.g. "w-12 sm:w-20". Height follows the 3:4 ratio. */
  widthClass: string;
  /** Pixels to request from the optimiser; roughly 3x the rendered width. */
  requestWidth: number;
  rounded?: string;
  initialClass?: string;
}) {
  const src = fightCardIcon(profile);
  const initial = name.trim().charAt(0).toUpperCase();

  return (
    <div
      className={`${widthClass} aspect-[3/4] ${rounded} bg-slate-200 overflow-hidden flex-shrink-0`}
    >
      {src ? (
        <Image
          src={src}
          alt={name}
          width={requestWidth}
          height={fightCardIconHeight(requestWidth)}
          className="h-full w-full object-cover"
          quality={FIGHT_CARD_ICON_QUALITY}
        />
      ) : (
        // An empty portrait is far more conspicuous than the old small square,
        // so it carries the fighter's initial rather than reading as broken.
        <div
          className="h-full w-full flex items-center justify-center"
          aria-hidden="true"
        >
          <span className={`font-semibold text-slate-400 ${initialClass}`}>
            {initial}
          </span>
        </div>
      )}
    </div>
  );
}
