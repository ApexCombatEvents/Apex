// components/ui/FilterSelect.tsx
//
// The filter dropdown used on the events and search pages. It is styled to sit
// in the same strip as the segmented tab bars those pages use, so a list that
// grew too long to show as pills still reads as part of the same control.
//
// A native select is deliberate: it keeps keyboard support and the platform
// picker on mobile for free.

"use client";

export type FilterOption = { value: string; label: string };

export default function FilterSelect({
  value,
  onChange,
  options,
  label,
  /** The value that counts as "no filter", drawn in the inactive style. */
  neutralValue = "all",
  className = "",
}: {
  value: string;
  onChange: (value: string) => void;
  options: FilterOption[];
  /** Accessible name — there is no visible label beside the control. */
  label: string;
  neutralValue?: string;
  className?: string;
}) {
  const active = value !== neutralValue;

  return (
    <div className={`relative p-1 bg-slate-100 rounded-xl w-fit ${className}`}>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={label}
        className={`appearance-none rounded-lg pl-3 sm:pl-4 pr-8 py-1.5 text-xs font-semibold cursor-pointer transition-all focus:outline-none focus:ring-2 focus:ring-purple-300 ${
          active
            ? "bg-white text-purple-700 shadow-sm"
            : "bg-transparent text-slate-600 hover:text-slate-800"
        }`}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <svg
        aria-hidden="true"
        viewBox="0 0 20 20"
        fill="currentColor"
        className={`pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 ${
          active ? "text-purple-600" : "text-slate-500"
        }`}
      >
        <path
          fillRule="evenodd"
          d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 11.17l3.71-3.94a.75.75 0 1 1 1.08 1.04l-4.25 4.5a.75.75 0 0 1-1.08 0l-4.25-4.5a.75.75 0 0 1 .02-1.06Z"
          clipRule="evenodd"
        />
      </svg>
    </div>
  );
}
