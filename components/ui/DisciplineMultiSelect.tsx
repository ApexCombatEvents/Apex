"use client";

import { useState, useRef, useEffect } from "react";
import { DISCIPLINES } from "@/lib/disciplines";

interface DisciplineMultiSelectProps {
  selected: string[];
  onChange: (disciplines: string[]) => void;
  label?: string;
}

export default function DisciplineMultiSelect({
  selected,
  onChange,
  label = "Martial arts",
}: DisciplineMultiSelectProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function toggle(discipline: string) {
    if (selected.includes(discipline)) {
      onChange(selected.filter((d) => d !== discipline));
    } else {
      onChange([...selected, discipline]);
    }
  }

  function remove(discipline: string) {
    onChange(selected.filter((d) => d !== discipline));
  }

  return (
    <div className="space-y-1" ref={containerRef}>
      <span className="text-xs text-slate-600">{label}</span>

      {/* Selected chips */}
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-1">
          {selected.map((d) => (
            <span
              key={d}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-purple-100 text-purple-800 text-xs font-medium"
            >
              {d}
              <button
                type="button"
                onClick={() => remove(d)}
                className="ml-0.5 text-purple-500 hover:text-purple-800 leading-none"
                aria-label={`Remove ${d}`}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Dropdown trigger */}
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="w-full rounded-xl border px-3 py-2 text-sm bg-white text-left flex items-center justify-between hover:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
      >
        <span className={selected.length === 0 ? "text-slate-400" : "text-slate-700"}>
          {selected.length === 0 ? "Select disciplines…" : `${selected.length} selected`}
        </span>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className={`h-4 w-4 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown list */}
      {open && (
        <div className="absolute z-50 mt-1 w-full max-w-xs rounded-xl border bg-white shadow-lg py-1">
          {DISCIPLINES.map((d) => {
            const isSelected = selected.includes(d);
            return (
              <button
                key={d}
                type="button"
                onClick={() => toggle(d)}
                className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2 hover:bg-purple-50 transition-colors ${
                  isSelected ? "text-purple-700 font-medium" : "text-slate-700"
                }`}
              >
                <span
                  className={`h-4 w-4 rounded border flex-shrink-0 flex items-center justify-center ${
                    isSelected ? "bg-purple-600 border-purple-600" : "border-slate-300"
                  }`}
                >
                  {isSelected && (
                    <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </span>
                {d}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
