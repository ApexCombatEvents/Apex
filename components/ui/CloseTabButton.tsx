"use client";

export default function CloseTabButton() {
  return (
    <button
      onClick={() => window.close()}
      className="text-xs text-slate-500 hover:text-slate-700 hover:underline"
    >
      ← Close this tab
    </button>
  );
}
