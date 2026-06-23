// components/fighters/FightPosterLightbox.tsx
"use client";

import { useEffect, useState } from "react";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  posterUrl: string | null;
  title: string;
};

export default function FightPosterLightbox({ isOpen, onClose, posterUrl, title }: Props) {
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (isOpen) {
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

  if (!isOpen || !posterUrl) return null;

  function safeFileName() {
    const base = (title || "fight-poster").replace(/[^a-zA-Z0-9-_]+/g, "-").replace(/^-+|-+$/g, "");
    const ext = (() => {
      const match = posterUrl?.split("?")[0].match(/\.(png|jpe?g|webp|gif)$/i);
      return match ? match[0] : ".jpg";
    })();
    return `${base || "fight-poster"}${ext}`;
  }

  async function handleDownload() {
    if (!posterUrl) return;
    setDownloading(true);
    try {
      const res = await fetch(posterUrl, { mode: "cors" });
      if (!res.ok) throw new Error("fetch failed");
      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = safeFileName();
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(objectUrl);
    } catch {
      // Fallback: open in a new tab so the user can save manually.
      window.open(posterUrl, "_blank", "noopener");
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[95] bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label={`${title} poster`}
      onClick={onClose}
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="Close"
        className="absolute top-4 right-4 h-10 w-10 rounded-full flex items-center justify-center text-white/80 hover:text-white hover:bg-white/10 transition-colors"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      <div
        className="max-w-full max-h-[78vh] flex items-center justify-center"
        onClick={(e) => e.stopPropagation()}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={posterUrl}
          alt={`${title} poster`}
          className="max-w-full max-h-[78vh] object-contain rounded-xl shadow-2xl"
        />
      </div>

      <div className="mt-4 flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          onClick={handleDownload}
          disabled={downloading}
          className="px-5 py-2.5 rounded-xl bg-purple-600 text-white text-sm font-semibold hover:bg-purple-700 transition-colors disabled:opacity-60 flex items-center gap-2"
        >
          {downloading ? (
            <>
              <span className="h-4 w-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
              Preparing…
            </>
          ) : (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5 5-5M12 15V3" />
              </svg>
              Download poster
            </>
          )}
        </button>
      </div>
      <p className="mt-2 text-xs text-white/60">Save it and share to promote your fight</p>
    </div>
  );
}
