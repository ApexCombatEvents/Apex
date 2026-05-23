"use client";

import { DISCIPLINES } from "@/lib/disciplines";

interface DisciplineSelectProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  required?: boolean;
  includeBlank?: boolean;
}

export default function DisciplineSelect({
  value,
  onChange,
  label = "Martial art / discipline",
  required = false,
  includeBlank = true,
}: DisciplineSelectProps) {
  return (
    <label className="text-xs text-slate-600 space-y-1 block">
      {label}
      <select
        className="w-full rounded-xl border px-3 py-2 text-sm bg-white"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
      >
        {includeBlank && <option value="">Select discipline…</option>}
        {DISCIPLINES.map((d) => (
          <option key={d} value={d}>
            {d}
          </option>
        ))}
      </select>
    </label>
  );
}
