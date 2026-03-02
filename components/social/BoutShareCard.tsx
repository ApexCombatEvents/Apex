import Link from "next/link";

export interface BoutShareMetadata {
  type: "bout_share";
  bout_id: string;
  event_id: string;
  red_name: string;
  blue_name: string;
  weight: string | null;
  bout_details: string | null;
  bout_label: string;
  event_title: string;
  red_looking_for_opponent: boolean | null;
  blue_looking_for_opponent: boolean | null;
}

interface BoutShareCardProps {
  metadata: BoutShareMetadata;
  /** compact = small grid thumbnail, full = single post / feed card */
  compact?: boolean;
}

export default function BoutShareCard({ metadata, compact = false }: BoutShareCardProps) {
  const {
    bout_id,
    event_id,
    red_name,
    blue_name,
    weight,
    bout_details,
    bout_label,
    event_title,
    red_looking_for_opponent,
    blue_looking_for_opponent,
  } = metadata;

  const boutHref = `/events/${event_id}#bout-${bout_id}`;
  const isLookingForOpponent = red_looking_for_opponent || blue_looking_for_opponent;

  if (compact) {
    return (
      <div className="h-full w-full flex flex-col bg-gradient-to-br from-slate-900 to-slate-800 p-3">
        <p className="text-[9px] uppercase tracking-widest text-slate-500 mb-auto">
          {bout_label}
        </p>

        {isLookingForOpponent && (
          <div className="flex items-center gap-1 mb-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-2.5 w-2.5 text-amber-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <span className="text-[9px] text-amber-400 font-medium">
              {red_looking_for_opponent ? "Red" : "Blue"} corner open
            </span>
          </div>
        )}

        <div className="flex items-center justify-between gap-1 my-2">
          <p className={`flex-1 text-center font-bold text-[11px] leading-tight truncate ${red_looking_for_opponent ? "text-amber-400" : "text-red-400"}`}>
            {red_name}
          </p>
          <div className="flex-shrink-0 flex flex-col items-center px-1">
            <span className="text-[9px] font-bold text-slate-500 tracking-widest">VS</span>
            {weight && <span className="text-[8px] text-slate-600 mt-0.5">{weight}</span>}
          </div>
          <p className={`flex-1 text-center font-bold text-[11px] leading-tight truncate ${blue_looking_for_opponent ? "text-amber-400" : "text-blue-400"}`}>
            {blue_name}
          </p>
        </div>

        {bout_details && (
          <p className="text-[9px] text-slate-500 text-center truncate mb-1">{bout_details}</p>
        )}

        <div className="flex items-center gap-1 mt-auto pt-2 border-t border-slate-700">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-2.5 w-2.5 text-slate-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <p className="text-[9px] text-slate-500 truncate">{event_title}</p>
        </div>
      </div>
    );
  }

  return (
    <Link
      href={boutHref}
      className="block rounded-xl border border-slate-200 bg-slate-50 hover:border-purple-300 hover:bg-purple-50/30 transition-colors overflow-hidden"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="p-4 space-y-3">
        {isLookingForOpponent && (
          <div className="flex items-center gap-2 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 text-amber-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <span className="text-xs font-medium text-amber-700">
              {red_looking_for_opponent ? "Red" : "Blue"} corner is open — fighter needed
            </span>
          </div>
        )}

        <p className="text-[10px] uppercase tracking-widest font-semibold text-slate-400">
          {bout_label}
        </p>

        {/* Red vs Blue row */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex-1 text-center">
            <p className={`font-bold text-sm leading-tight ${red_looking_for_opponent ? "text-amber-600" : "text-red-600"}`}>
              {red_name}
            </p>
            {red_looking_for_opponent && (
              <span className="text-[10px] text-amber-500 font-medium">Open spot</span>
            )}
          </div>

          <div className="flex flex-col items-center flex-shrink-0 px-3">
            <span className="text-xs font-bold text-slate-500 tracking-widest">VS</span>
            {weight && (
              <span className="text-[10px] text-slate-500 mt-0.5">{weight}</span>
            )}
          </div>

          <div className="flex-1 text-center">
            <p className={`font-bold text-sm leading-tight ${blue_looking_for_opponent ? "text-amber-600" : "text-blue-600"}`}>
              {blue_name}
            </p>
            {blue_looking_for_opponent && (
              <span className="text-[10px] text-amber-500 font-medium">Open spot</span>
            )}
          </div>
        </div>

        {bout_details && (
          <p className="text-center text-[11px] text-slate-500">{bout_details}</p>
        )}

        <div className="flex items-center justify-between pt-2 border-t border-slate-200">
          <div className="flex items-center gap-1.5 min-w-0">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-slate-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span className="text-[11px] text-slate-500 truncate">{event_title}</span>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0 ml-2 text-purple-600">
            <span className="text-[11px] font-medium">View bout</span>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </div>
        </div>
      </div>
    </Link>
  );
}
