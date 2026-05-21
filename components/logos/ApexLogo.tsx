import React from "react";

type ApexLogoProps = {
  className?: string;
  /** White text for dark / gradient backgrounds (e.g. hero slideshow) */
  light?: boolean;
  size?: "default" | "lg" | "hero";
  /** Navbar: stacked. Hero banner: single row across the slide. */
  layout?: "stacked" | "horizontal";
};

const GRADIENT =
  "bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-500 bg-clip-text text-transparent";

export default function ApexLogo({
  className = "",
  light = false,
  size = "default",
  layout = "stacked",
}: ApexLogoProps) {
  const apexSize =
    size === "hero"
      ? "text-6xl sm:text-7xl md:text-8xl"
      : size === "lg"
        ? "text-3xl sm:text-4xl"
        : "text-2xl";
  const subSize =
    size === "hero"
      ? "text-base sm:text-lg md:text-xl"
      : size === "lg"
        ? "text-xs sm:text-sm"
        : "text-xs";
  const textStyle = light ? "text-white drop-shadow-md" : GRADIENT;

  if (layout === "horizontal") {
    return (
      <div
        className={`flex w-full max-w-5xl flex-row flex-wrap items-baseline justify-center gap-x-4 gap-y-1 px-4 sm:justify-between sm:gap-x-8 sm:px-10 md:px-16 notranslate ${className}`}
        translate="no"
      >
        <span className={`${apexSize} font-extrabold leading-none ${textStyle}`}>
          Apex
        </span>
        <span
          className={`${subSize} font-semibold uppercase tracking-[0.2em] leading-none ${textStyle}`}
        >
          Combat Events
        </span>
      </div>
    );
  }

  return (
    <div
      className={`flex flex-col items-center notranslate ${className}`}
      translate="no"
    >
      <div className={`${apexSize} font-extrabold leading-tight`}>
        <span className={textStyle}>Apex</span>
      </div>
      <div
        className={`${subSize} font-semibold uppercase tracking-wider leading-tight text-center ${size === "hero" ? "mt-3" : ""}`}
      >
        <span className={textStyle}>Combat Events</span>
      </div>
    </div>
  );
}
