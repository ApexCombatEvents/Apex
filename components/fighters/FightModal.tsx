// components/fighters/FightModal.tsx
"use client";

import { useEffect } from "react";
import FightHistoryManager from "./FightHistoryManager";

type Props = {
  fighterId: string;
  isOpen: boolean;
  onClose: () => void;
  onUpdate?: () => void;
};

export default function FightModal({ fighterId, isOpen, onClose, onUpdate }: Props) {
  // Lock body scroll while open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop — sits above mobile nav (z-50) */}
      <div
        className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm"
        aria-hidden="true"
        onClick={onClose}
      />

      {/* Drawer — slides up on mobile, centred panel on desktop */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Manage fights"
        className="fixed z-[70] inset-x-0 bottom-0 md:inset-0 md:flex md:items-center md:justify-center"
      >
        {/* On mobile: full-width sheet from bottom, capped at 90% viewport height */}
        <div className="relative w-full md:max-w-2xl md:mx-4 bg-white rounded-t-3xl md:rounded-2xl shadow-2xl flex flex-col"
          style={{ maxHeight: "min(90dvh, 90vh)" }}
        >
          {/* Handle bar (mobile only) */}
          <div className="flex justify-center pt-3 pb-1 md:hidden shrink-0">
            <div className="w-10 h-1 rounded-full bg-slate-300" />
          </div>

          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 shrink-0">
            <div>
              <h2 className="text-base font-bold text-slate-900">My Fights</h2>
              <p className="text-xs text-slate-500 mt-0.5">Manage your upcoming & past fights</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="h-8 w-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Scrollable content — fills remaining height and scrolls independently */}
          <div className="overflow-y-auto flex-1 px-5 py-4 overscroll-contain">
            <FightHistoryManager
              fighterId={fighterId}
              onUpdate={onUpdate}
            />
          </div>
        </div>
      </div>
    </>
  );
}
