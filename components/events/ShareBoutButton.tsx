"use client";

import { useState } from "react";
import { createSupabaseBrowser } from "@/lib/supabase-browser";

interface ShareBoutButtonProps {
  boutId: string;
  eventId: string;
  eventTitle: string;
  redName: string;
  blueName: string;
  weight?: string | null;
  boutDetails?: string | null;
  boutLabel: string;
  redLookingForOpponent?: boolean | null;
  blueLookingForOpponent?: boolean | null;
}

const MAX_DESCRIPTION_LENGTH = 2000;

export default function ShareBoutButton({
  boutId,
  eventId,
  eventTitle,
  redName,
  blueName,
  weight,
  boutDetails,
  boutLabel,
  redLookingForOpponent,
  blueLookingForOpponent,
}: ShareBoutButtonProps) {
  const supabase = createSupabaseBrowser();

  const isLookingForOpponent = redLookingForOpponent || blueLookingForOpponent;
  // The corner that is EMPTY needs a fighter to fill it
  const openCorner = redLookingForOpponent ? "Red corner" : blueLookingForOpponent ? "Blue corner" : null;

  const defaultText = isLookingForOpponent
    ? `🔍 ${openCorner} is open — looking for a fighter!\n\n${redName} vs ${blueName}`
    : `🥊 ${redName} vs ${blueName} — can't wait for this one!`;

  const [showModal, setShowModal] = useState(false);
  const [description, setDescription] = useState("");
  const [sharing, setSharing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function handleShare() {
    setError(null);
    setSharing(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setError("You must be signed in to share.");
        setSharing(false);
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("id", user.id)
        .single();

      if (!profile) {
        setError("Profile not found.");
        setSharing(false);
        return;
      }

      // Content is just the caption — the bout card (via post_metadata) provides the link
      const content = description.trim() || defaultText;

      const boutMetadata = {
        type: "bout_share",
        bout_id: boutId,
        event_id: eventId,
        red_name: redName,
        blue_name: blueName,
        weight: weight ?? null,
        bout_details: boutDetails ?? null,
        bout_label: boutLabel,
        event_title: eventTitle,
        red_looking_for_opponent: redLookingForOpponent ?? null,
        blue_looking_for_opponent: blueLookingForOpponent ?? null,
      };

      const { error: insertError } = await supabase
        .from("profile_posts")
        .insert({
          profile_id: profile.id,
          content,
          image_url: null,
          image_urls: null,
          post_metadata: boutMetadata,
        });

      if (insertError) {
        setError(insertError.message || "Failed to share bout.");
        setSharing(false);
        return;
      }

      setDescription("");
      setShowModal(false);
      setSharing(false);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "An error occurred.";
      setError(message);
      setSharing(false);
    }
  }

  async function handleCopyLink() {
    const url = `${window.location.origin}/events/${eventId}#bout-${boutId}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Could not copy link.");
    }
  }

  function handleClose() {
    setShowModal(false);
    setDescription("");
    setError(null);
  }

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        title="Share this bout"
        className="inline-flex items-center gap-1 rounded-full border border-purple-200 bg-purple-50 px-2 py-1 text-[10px] sm:text-xs font-medium text-purple-700 hover:bg-purple-100 transition-colors"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-3 w-3"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
          />
        </svg>
        Share
      </button>

      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) handleClose();
          }}
        >
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 space-y-5">

              {/* Header */}
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-slate-900">Share Bout to Your Feed</h2>
                <button
                  onClick={handleClose}
                  disabled={sharing}
                  className="text-slate-400 hover:text-slate-600 transition-colors"
                  aria-label="Close"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Bout preview card */}
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">

                {/* Looking for opponent banner */}
                {isLookingForOpponent && (
                  <div className="flex items-center gap-2 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-amber-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <span className="text-xs font-medium text-amber-700">
                      {openCorner} is open — fighter needed
                    </span>
                  </div>
                )}

                {/* Fight label */}
                <p className="text-[10px] uppercase tracking-wide font-semibold text-slate-400">
                  {boutLabel}
                </p>

                {/* Red vs Blue */}
                <div className="flex items-center justify-between gap-3">
                  <div className="flex-1 text-center">
                    <p className={`font-bold text-sm leading-tight ${redLookingForOpponent ? "text-amber-600" : "text-red-600"}`}>
                      {redName}
                    </p>
                    {redLookingForOpponent && (
                      <span className="text-[10px] text-amber-500 font-medium">Open spot</span>
                    )}
                  </div>

                  <div className="flex flex-col items-center px-3">
                    <span className="text-xs font-bold text-slate-500 tracking-widest">VS</span>
                    {weight && (
                      <span className="text-[10px] text-slate-500 mt-0.5">{weight}</span>
                    )}
                  </div>

                  <div className="flex-1 text-center">
                    <p className={`font-bold text-sm leading-tight ${blueLookingForOpponent ? "text-amber-600" : "text-blue-600"}`}>
                      {blueName}
                    </p>
                    {blueLookingForOpponent && (
                      <span className="text-[10px] text-amber-500 font-medium">Open spot</span>
                    )}
                  </div>
                </div>

                {boutDetails && (
                  <p className="text-center text-[11px] text-slate-500">{boutDetails}</p>
                )}

                {/* Event name */}
                <div className="flex items-center gap-1.5 pt-1 border-t border-slate-200">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span className="text-[11px] text-slate-500 truncate">{eventTitle}</span>
                </div>
              </div>

              {/* Caption textarea */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Add a caption <span className="text-slate-400 font-normal">(optional)</span>
                </label>
                <textarea
                  value={description}
                  onChange={(e) => {
                    if (e.target.value.length <= MAX_DESCRIPTION_LENGTH) {
                      setDescription(e.target.value);
                    }
                  }}
                  placeholder={defaultText}
                  disabled={sharing}
                  className="w-full min-h-[100px] p-3 border border-slate-300 rounded-xl resize-none text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent placeholder:text-slate-400"
                />
                <div className="flex items-center justify-between mt-1">
                  <p className="text-[11px] text-slate-400">
                    A link to this bout will be added automatically.
                  </p>
                  <span className="text-[11px] text-slate-400">
                    {description.length}/{MAX_DESCRIPTION_LENGTH}
                  </span>
                </div>
              </div>

              {/* Error */}
              {error && (
                <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center justify-between gap-3 pt-2 border-t border-slate-100">
                {/* Copy link */}
                <button
                  type="button"
                  onClick={handleCopyLink}
                  disabled={sharing}
                  className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-purple-700 transition-colors"
                >
                  {copied ? (
                    <>
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="text-green-600 font-medium">Copied!</span>
                    </>
                  ) : (
                    <>
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                      </svg>
                      Copy link
                    </>
                  )}
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleClose}
                    disabled={sharing}
                    className="px-4 py-2 rounded-xl border border-slate-300 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleShare}
                    disabled={sharing}
                    className="px-4 py-2 rounded-xl bg-purple-600 text-white text-sm font-medium hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {sharing ? "Sharing…" : "Share to Feed"}
                  </button>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}
    </>
  );
}
