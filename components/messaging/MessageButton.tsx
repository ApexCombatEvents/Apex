// components/messaging/MessageButton.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function MessageButton({
  targetProfileId,
  targetUsername,
}: {
  targetProfileId: string;
  targetUsername?: string | null;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    if (loading) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/messages/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ otherProfileId: targetProfileId }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to start chat");
        setLoading(false);
        // Clear error after 3 seconds
        setTimeout(() => setError(null), 3000);
        return;
      }

      if (data.threadId) {
        router.push(`/messages/${data.threadId}`);
      }
    } catch (err) {
      console.error("MessageButton error", err);
      setError("An unexpected error occurred");
      setTimeout(() => setError(null), 3000);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative inline-block">
      <button
        type="button"
        onClick={handleClick}
        className={`inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-medium transition-colors ${
          error 
            ? "border-red-300 text-red-600 bg-red-50" 
            : "border-slate-300 text-slate-700 hover:border-purple-500 hover:text-purple-700"
        } disabled:opacity-60`}
        disabled={loading}
      >
        {loading ? "Opening…" : error ? "Restricted" : "Message"}
      </button>
      
      {error && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-slate-800 text-white text-[10px] rounded shadow-lg z-50">
          {error}
          <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-slate-800"></div>
        </div>
      )}
    </div>
  );
}



