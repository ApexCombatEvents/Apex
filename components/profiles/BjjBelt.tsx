type BeltStyle = {
  belt: string;
  bar: string;
  stripe: string;
  outline: string;
};

// Rank bars follow the real convention: coloured belts carry a black bar, and
// black belts a red one. Coral belts are genuinely two-tone, so they are drawn
// as a repeating gradient rather than a flat fill.
const BELT_STYLES: Record<string, BeltStyle> = {
  white: {
    belt: "bg-slate-100",
    bar: "bg-slate-900",
    stripe: "bg-white",
    outline: "ring-slate-300",
  },
  blue: {
    belt: "bg-blue-700",
    bar: "bg-slate-900",
    stripe: "bg-white",
    outline: "ring-blue-900/40",
  },
  purple: {
    // Deliberately a different purple from the brand accent so the rank reads
    // as the belt's own colour and not as site chrome.
    belt: "bg-violet-800",
    bar: "bg-slate-900",
    stripe: "bg-white",
    outline: "ring-violet-950/40",
  },
  brown: {
    belt: "bg-amber-800",
    bar: "bg-slate-900",
    stripe: "bg-white",
    outline: "ring-amber-950/40",
  },
  black: {
    belt: "bg-slate-900",
    bar: "bg-red-700",
    stripe: "bg-white",
    outline: "ring-slate-700",
  },
  coralRedBlack: {
    belt: "bg-[repeating-linear-gradient(90deg,#b91c1c_0_14px,#0f172a_14px_28px)]",
    bar: "bg-white",
    stripe: "bg-slate-900",
    outline: "ring-slate-400",
  },
  coralRedWhite: {
    belt: "bg-[repeating-linear-gradient(90deg,#b91c1c_0_14px,#f8fafc_14px_28px)]",
    bar: "bg-slate-900",
    stripe: "bg-white",
    outline: "ring-slate-400",
  },
  red: {
    belt: "bg-red-700",
    bar: "bg-white",
    stripe: "bg-red-700",
    outline: "ring-red-900/40",
  },
};

function beltKey(value: string): keyof typeof BELT_STYLES | null {
  const normalized = value.toLowerCase();
  // Checked first: both coral labels also contain "red", and one contains "white".
  if (normalized.includes("coral")) {
    return normalized.includes("white") ? "coralRedWhite" : "coralRedBlack";
  }
  if (normalized.includes("white")) return "white";
  if (normalized.includes("blue")) return "blue";
  if (normalized.includes("purple")) return "purple";
  if (normalized.includes("brown")) return "brown";
  if (normalized.includes("black")) return "black";
  if (normalized.includes("red")) return "red";
  return null;
}

function beltLabel(value: string, stripes: number): string {
  const name = value.toLowerCase().startsWith("coral")
    ? value.replace(/^Coral\s*\((.+)\)$/i, (_, tones: string) => `Coral belt (${tones.toLowerCase()})`)
    : `${value} belt`;
  if (stripes <= 0) return name;
  return `${name} • ${stripes} stripe${stripes === 1 ? "" : "s"}`;
}

export default function BjjBelt({
  belt,
  stripes,
  captionClass = "text-slate-500",
}: {
  belt: string;
  stripes: number;
  captionClass?: string;
}) {
  const key = beltKey(belt);
  if (!key) return null;

  const style = BELT_STYLES[key];
  const clampedStripes = Math.max(0, Math.min(4, Math.round(stripes)));
  const label = beltLabel(belt, clampedStripes);

  return (
    <div className="space-y-1.5">
      {/* Decorative: the caption below carries the rank for screen readers. */}
      <div
        aria-hidden="true"
        className={`relative h-7 w-40 overflow-hidden rounded-sm ring-1 sm:h-9 sm:w-52 ${style.belt} ${style.outline}`}
      >
        <div className={`absolute inset-y-0 right-4 w-11 sm:w-14 ${style.bar}`}>
          <div className="flex h-full items-center justify-center gap-1 px-1 sm:gap-1.5">
            {Array.from({ length: clampedStripes }).map((_, index) => (
              <span
                key={index}
                className={`h-[65%] w-1 rounded-[1px] sm:w-1.5 ${style.stripe}`}
              />
            ))}
          </div>
        </div>
      </div>
      <p className={`text-xs ${captionClass}`}>{label}</p>
    </div>
  );
}
