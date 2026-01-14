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

  async function handleClick() {
    if (loading) return;
    setLoading(true);
    try {
      const res = await fetch("/api/messages/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ otherProfileId: targetProfileId }),
      });

      const data = await res.json();

      if (!res.ok) {
        console.error("Failed to start chat", data);
        setLoading(false);
        return;
      }

      if (data.threadId) {
        router.push(`/messages/${data.threadId}`);
      }
    } catch (err) {
      console.error("MessageButton error", err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className="inline-flex items-center rounded-full border border-slate-300 px-3 py-1 text-[11px] font-medium text-slate-700 hover:border-purple-500 hover:text-purple-700 disabled:opacity-60 transition-colors"
      disabled={loading}
    >
      {loading ? "Opening…" : "Message"}
    </button>
  );
}



