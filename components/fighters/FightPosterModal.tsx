// components/fighters/FightPosterModal.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { createSupabaseBrowser } from "@/lib/supabase-browser";
import { isValidImageType, isValidFileSize } from "@/lib/validation";
import ALogo from "@/components/logos/ALogo";

export type FightPosterTarget = {
  /** "platform" = Apex event bout (event_bouts), "manual" = off-platform fight (fighter_fight_history). */
  kind: "platform" | "manual";
  /** bout_id for platform fights, fight-history row id for manual fights. */
  refId: string;
  title: string;
  /** The matched event's banner (auto-used when no custom poster). Platform fights only. */
  eventBanner: string | null;
  /** The fighter's custom override poster, if any. */
  customPoster: string | null;
};

type Props = {
  isOpen: boolean;
  onClose: () => void;
  fighterId: string;
  target: FightPosterTarget | null;
  onUpdated: () => void;
};

export default function FightPosterModal({
  isOpen,
  onClose,
  fighterId,
  target,
  onUpdated,
}: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setError(null);
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  if (!isOpen || !target) return null;

  const currentPoster = target.customPoster || target.eventBanner || null;
  const hasCustom = Boolean(target.customPoster);

  async function persistPosterUrl(posterUrl: string | null) {
    if (!target) return;
    const supabase = createSupabaseBrowser();

    if (target.kind === "manual") {
      const res = await fetch(`/api/fighters/fight-history/${target.refId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ poster_url: posterUrl }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to save poster");
      }
      return;
    }

    // Platform bout: upsert / delete the per-fighter override row.
    if (posterUrl) {
      const { error: upsertError } = await supabase
        .from("fighter_bout_posters")
        .upsert(
          {
            fighter_profile_id: fighterId,
            bout_id: target.refId,
            poster_url: posterUrl,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "fighter_profile_id,bout_id" }
        );
      if (upsertError) throw new Error(upsertError.message);
    } else {
      const { error: deleteError } = await supabase
        .from("fighter_bout_posters")
        .delete()
        .eq("fighter_profile_id", fighterId)
        .eq("bout_id", target.refId);
      if (deleteError) throw new Error(deleteError.message);
    }
  }

  async function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    // Reset so selecting the same file again still fires onChange
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (!file || !target) return;

    if (!isValidImageType(file)) {
      setError("Please choose a JPG, PNG, WEBP or GIF image.");
      return;
    }
    if (!isValidFileSize(file, 5)) {
      setError("Image must be 5MB or smaller.");
      return;
    }

    setBusy(true);
    setError(null);
    try {
      const supabase = createSupabaseBrowser();
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const path = `${fighterId}/fight-posters/${Date.now()}-${safeName}`;
      const { error: uploadError } = await supabase.storage
        .from("event-banners")
        .upload(path, file, { upsert: false });
      if (uploadError) throw new Error(uploadError.message);

      const { data: publicUrlData } = supabase.storage
        .from("event-banners")
        .getPublicUrl(path);

      await persistPosterUrl(publicUrlData.publicUrl);
      onUpdated();
      onClose();
    } catch (err: any) {
      console.error("Fight poster upload failed:", err);
      setError(err?.message || "Failed to upload poster. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function handleRevert() {
    if (!target) return;
    setBusy(true);
    setError(null);
    try {
      await persistPosterUrl(null);
      onUpdated();
      onClose();
    } catch (err: any) {
      console.error("Failed to remove custom poster:", err);
      setError(err?.message || "Failed to remove poster. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div
        className="fixed inset-0 z-[80] bg-black/50 backdrop-blur-sm"
        aria-hidden="true"
        onClick={busy ? undefined : onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Edit fight poster"
        className="fixed z-[90] inset-x-0 bottom-0 md:inset-0 md:flex md:items-center md:justify-center"
      >
        <div
          className="relative w-full md:max-w-md md:mx-4 bg-white rounded-t-3xl md:rounded-2xl shadow-2xl flex flex-col"
          style={{ maxHeight: "min(90dvh, 90vh)" }}
        >
          <div className="flex justify-center pt-3 pb-1 md:hidden shrink-0">
            <div className="w-10 h-1 rounded-full bg-slate-300" />
          </div>

          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 shrink-0">
            <div className="min-w-0">
              <h2 className="text-base font-bold text-slate-900">Fight Poster</h2>
              <p className="text-xs text-slate-500 mt-0.5 truncate">{target.title}</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={busy}
              aria-label="Close"
              className="h-8 w-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors disabled:opacity-50"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="overflow-y-auto flex-1 px-5 py-4 space-y-4 overscroll-contain">
            {/* Current poster preview */}
            <div className="rounded-xl overflow-hidden border border-slate-200 bg-slate-100 aspect-[4/5] w-full max-w-[260px] mx-auto flex items-center justify-center">
              {currentPoster ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={currentPoster} alt={target.title} className="w-full h-full object-cover" />
              ) : (
                <div className="h-full w-full flex flex-col items-center justify-center gap-2 bg-gradient-to-br from-purple-100 to-slate-100">
                  <ALogo size={44} className="opacity-20" />
                  <span className="text-xs text-slate-400">No poster yet</span>
                </div>
              )}
            </div>

            <p className="text-xs text-slate-500 text-center">
              {hasCustom
                ? "Showing your custom promo poster."
                : target.eventBanner
                ? "Currently using the event's poster automatically."
                : "Upload a promo poster to share on social media."}
            </p>

            {error && (
              <div className="text-xs rounded-xl px-3 py-2 bg-red-50 text-red-700 border border-red-200">
                {error}
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/jpg,image/webp,image/gif"
              onChange={handleFileSelected}
              className="hidden"
            />

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={busy}
              className="w-full px-4 py-2.5 rounded-xl bg-purple-600 text-white text-sm font-semibold hover:bg-purple-700 transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {busy ? (
                <>
                  <span className="h-4 w-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                  Working…
                </>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  {hasCustom ? "Replace poster" : "Upload custom poster"}
                </>
              )}
            </button>

            {hasCustom && target.kind === "platform" && target.eventBanner && (
              <button
                type="button"
                onClick={handleRevert}
                disabled={busy}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-700 text-sm font-medium hover:bg-slate-50 transition-colors disabled:opacity-60"
              >
                Use event poster instead
              </button>
            )}

            {hasCustom && (target.kind === "manual" || !target.eventBanner) && (
              <button
                type="button"
                onClick={handleRevert}
                disabled={busy}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-700 text-sm font-medium hover:bg-slate-50 transition-colors disabled:opacity-60"
              >
                Remove poster
              </button>
            )}

            <p className="text-[11px] text-slate-400 text-center">
              JPG, PNG, WEBP or GIF · up to 5MB.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
