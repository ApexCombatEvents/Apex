"use client";

import Link from "next/link";

type StartEventButtonProps = {
  eventId: string;
  boutCount: number;
};

export default function StartEventButton({
  eventId,
  boutCount,
}: StartEventButtonProps) {
  return (
    <div className="space-y-2">
      {boutCount === 0 ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-700">
          Please add bouts before managing the live event.
        </div>
      ) : (
        <Link
          href={`/events/${eventId}/live`}
          className="inline-flex items-center gap-2 rounded-lg border-2 border-purple-600 bg-purple-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:bg-purple-700 hover:shadow-md"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
          Manage Live Event
        </Link>
      )}
      <p className="text-xs text-slate-600">
        Go to the live control page to start the event and manage bouts
      </p>
    </div>
  );
}


