"use client";

import { useState } from "react";
import Image from "next/image";
import { createSupabaseBrowser } from "@/lib/supabase-browser";
import { useRouter } from "next/navigation";

type ShareEventButtonProps = {
  eventId: string;
  eventTitle: string;
  eventBannerUrl: string | null;
};

const MAX_DESCRIPTION_LENGTH = 2000;

export default function ShareEventButton({
  eventId,
  eventTitle,
  eventBannerUrl,
}: ShareEventButtonProps) {
  const supabase = createSupabaseBrowser();
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);
  const [description, setDescription] = useState("");
  const [sharing, setSharing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleShare() {
    setError(null);
    setSharing(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError("You must be signed in to share events.");
        setSharing(false);
        return;
      }

      // Get user's profile_id
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

      // Create post with event banner and link
      const eventUrl = `${window.location.origin}/events/${eventId}`;
      const content = description.trim() 
        ? `${description.trim()}\n\n${eventUrl}`
        : `Check out this event: ${eventTitle}\n\n${eventUrl}`;

      const { error: insertError } = await supabase
        .from("profile_posts")
        .insert({
          profile_id: profile.id,
          content: content,
          image_url: eventBannerUrl,
          image_urls: eventBannerUrl ? [eventBannerUrl] : null,
        });

      if (insertError) {
        console.error("Error sharing event:", insertError);
        setError(insertError.message || "Failed to share event.");
        setSharing(false);
        return;
      }

      // Success - reset and close
      setDescription("");
      setShowModal(false);
      router.refresh();
      setSharing(false);
    } catch (err: any) {
      console.error("Error sharing event:", err);
      setError(err.message || "An error occurred.");
      setSharing(false);
    }
  }

  function handleDescriptionChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const newDescription = e.target.value;
    if (newDescription.length <= MAX_DESCRIPTION_LENGTH) {
      setDescription(newDescription);
    }
  }

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="inline-flex items-center gap-2 rounded-full border border-purple-200 bg-purple-50 px-4 py-2 text-sm font-medium text-purple-700 hover:bg-purple-100"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-4 w-4"
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
        Share to Page
      </button>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-slate-900">Share Event to Your Page</h2>
                <button
                  onClick={() => {
                    setShowModal(false);
                    setDescription("");
                    setError(null);
                  }}
                  className="text-slate-400 hover:text-slate-600 transition-colors"
                  disabled={sharing}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-6 w-6"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>

              {/* Event Preview */}
              {eventBannerUrl && (
                <div className="mb-4 rounded-xl overflow-hidden bg-slate-100">
                  <Image
                    src={eventBannerUrl}
                    alt={eventTitle}
                    width={800}
                    height={400}
                    className="w-full h-48 object-cover"
                  />
                </div>
              )}

              <div className="mb-4">
                <p className="text-sm font-medium text-slate-700 mb-2">
                  Event: <span className="font-semibold">{eventTitle}</span>
                </p>
                <p className="text-xs text-slate-500">
                  A link to view the event will be automatically added to your post.
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Add a description (optional)
                  </label>
                  <textarea
                    value={description}
                    onChange={handleDescriptionChange}
                    placeholder="Share your thoughts about this event..."
                    maxLength={MAX_DESCRIPTION_LENGTH}
                    className="w-full min-h-[120px] p-3 border border-slate-300 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    disabled={sharing}
                  />
                  <div className="text-xs text-slate-500 mt-1 text-right">
                    {description.length}/{MAX_DESCRIPTION_LENGTH} characters
                  </div>
                </div>

                {error && (
                  <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">
                    {error}
                  </div>
                )}

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false);
                      setDescription("");
                      setError(null);
                    }}
                    className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 transition-colors"
                    disabled={sharing}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleShare}
                    disabled={sharing}
                    className="px-4 py-2 rounded-xl bg-purple-600 text-white hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {sharing ? "Sharing..." : "Share to Page"}
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
