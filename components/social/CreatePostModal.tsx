"use client";

import { useState } from "react";
import Image from "next/image";
import { createSupabaseBrowser } from "@/lib/supabase-browser";
import { useRouter } from "next/navigation";

type CreatePostModalProps = {
  isOpen: boolean;
  onClose: () => void;
  profileId: string;
};

export default function CreatePostModal({
  isOpen,
  onClose,
  profileId,
}: CreatePostModalProps) {
  const supabase = createSupabaseBrowser();
  const router = useRouter();
  const [content, setContent] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    setError(null);
  }

  function removeImage() {
    setImageFile(null);
    setImagePreview(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!content.trim() && !imageFile) {
      setError("Please add some content or an image to your post.");
      return;
    }

    setUploading(true);

    try {
      // 1) Upload image if present
      let imageUrl: string | null = null;
      if (imageFile) {
        const { data: userData } = await supabase.auth.getUser();
        if (!userData.user) {
          setError("You must be signed in.");
          setUploading(false);
          return;
        }

        // Use the post-images bucket
        const bucket = "post-images";
        const filePath = `${profileId}/${Date.now()}-${imageFile.name}`;

        const { error: uploadError } = await supabase.storage
          .from(bucket)
          .upload(filePath, imageFile, {
            cacheControl: "3600",
            upsert: false,
          });

        if (uploadError) {
          console.error("Image upload error", uploadError);
          if (uploadError.message?.includes("not found") || uploadError.message?.includes("Bucket")) {
            setError("Storage bucket 'post-images' not found. Please check your Supabase Storage settings.");
          } else {
            setError(uploadError.message || "Failed to upload image.");
          }
          setUploading(false);
          return;
        }

        const { data: publicUrlData } = supabase.storage
          .from(bucket)
          .getPublicUrl(filePath);

        imageUrl = publicUrlData.publicUrl;
      }

      // 2) Insert post
      const { error: insertError } = await supabase
        .from("profile_posts")
        .insert({
          profile_id: profileId,
          content: content.trim() || null,
          image_url: imageUrl,
        });

      if (insertError) {
        console.error("Post insert error", insertError);
        setError(insertError.message || "Failed to create post.");
        setUploading(false);
        return;
      }

      // 3) Success - reset and close
      setContent("");
      setImageFile(null);
      setImagePreview(null);
      onClose();
      router.refresh(); // Refresh to show new post
    } catch (err: any) {
      console.error("Unexpected error", err);
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-slate-900">Create Post</h2>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 transition-colors"
              disabled={uploading}
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

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="What's on your mind?"
                className="w-full min-h-[120px] p-3 border border-slate-300 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                disabled={uploading}
              />
            </div>

            {imagePreview && (
              <div className="relative">
                <Image
                  src={imagePreview}
                  alt="Preview"
                  width={1200}
                  height={800}
                  unoptimized
                  className="w-full max-h-64 object-cover rounded-xl"
                />
                <button
                  type="button"
                  onClick={removeImage}
                  className="absolute top-2 right-2 bg-black/50 hover:bg-black/70 text-white rounded-full p-2 transition-colors"
                  disabled={uploading}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5"
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
            )}

            <div className="flex items-center gap-3">
              <label className="cursor-pointer flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-300 hover:bg-slate-50 transition-colors">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 text-slate-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
                <span className="text-sm text-slate-700">Add Photo</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                  disabled={uploading}
                />
              </label>
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">
                {error}
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 transition-colors"
                disabled={uploading}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={uploading || (!content.trim() && !imageFile)}
                className="px-4 py-2 rounded-xl bg-purple-600 text-white hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {uploading ? "Posting..." : "Post"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

