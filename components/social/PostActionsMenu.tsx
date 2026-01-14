"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { createSupabaseBrowser } from "@/lib/supabase-browser";
import { useRouter } from "next/navigation";

export default function PostActionsMenu({
  postId,
  initialContent,
  initialImageUrl,
  variant = "light",
}: {
  postId: string;
  initialContent: string | null;
  initialImageUrl?: string | null;
  variant?: "light" | "dark";
}) {
  const supabase = createSupabaseBrowser();
  const router = useRouter();

  const rootRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [content, setContent] = useState(initialContent ?? "");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Image state
  const [imageUrl, setImageUrl] = useState<string | null>(initialImageUrl || null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(initialImageUrl || null);
  const [imageToDelete, setImageToDelete] = useState(false);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!rootRef.current) return;
      const target = e.target as Node;
      if (!rootRef.current.contains(target)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  async function handleDelete() {
    if (deleting) return;
    setError(null);
    setOpen(false);

    const ok = window.confirm("Delete this post? This can't be undone.");
    if (!ok) return;

    setDeleting(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        setError("You must be signed in.");
        return;
      }

      const { error: delError } = await supabase
        .from("profile_posts")
        .delete()
        .eq("id", postId);

      if (delError) {
        console.error("Delete post error", delError);
        setError(delError.message || "Could not delete post.");
        return;
      }

      router.refresh();
    } catch (e: any) {
      console.error("Delete post fatal", e);
      setError(e?.message || "Could not delete post.");
    } finally {
      setDeleting(false);
    }
  }

  function openEdit() {
    setError(null);
    setContent(initialContent ?? "");
    setImageUrl(initialImageUrl || null);
    setImagePreview(initialImageUrl || null);
    setImageFile(null);
    setImageToDelete(false);
    setEditOpen(true);
    setOpen(false);
  }

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    setImageToDelete(false);
    setError(null);
  }

  function handleRemoveImage() {
    setImageFile(null);
    setImagePreview(null);
    setImageToDelete(true);
    setError(null);
  }

  async function getProfileId(): Promise<string | null> {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return null;

    // Get profile_id from the post
    const { data: post } = await supabase
      .from("profile_posts")
      .select("profile_id")
      .eq("id", postId)
      .single();

    return post?.profile_id || userData.user.id;
  }

  async function handleSaveEdit() {
    if (saving) return;
    setError(null);

    const next = content.trim();
    const finalImageUrl = imageToDelete ? null : (imagePreview || imageUrl);
    
    if (!next && !finalImageUrl) {
      setError("Post must have either text or an image.");
      return;
    }

    setSaving(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        setError("You must be signed in.");
        return;
      }

      const profileId = await getProfileId();
      if (!profileId) {
        setError("Could not find profile.");
        return;
      }

      // 1) Upload new image if a file was selected
      let newImageUrl: string | null = finalImageUrl;
      if (imageFile) {
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
          setError(uploadError.message || "Failed to upload image.");
          setSaving(false);
          return;
        }

        const { data: publicUrlData } = supabase.storage
          .from(bucket)
          .getPublicUrl(filePath);

        newImageUrl = publicUrlData.publicUrl;
      }

      // 2) Update post
      const { error: upError } = await supabase
        .from("profile_posts")
        .update({
          content: next ? next : null,
          image_url: newImageUrl,
        })
        .eq("id", postId);

      if (upError) {
        console.error("Update post error", upError);
        setError(upError.message || "Could not update post.");
        return;
      }

      setEditOpen(false);
      router.refresh();
    } catch (e: any) {
      console.error("Update post fatal", e);
      setError(e?.message || "Could not update post.");
    } finally {
      setSaving(false);
    }
  }

  const buttonClass =
    variant === "dark"
      ? "bg-black/45 text-white border-white/20 hover:bg-black/55"
      : "bg-white/80 text-slate-700 border-purple-100 hover:bg-white";

  return (
    <div ref={rootRef} className="absolute top-2 right-2 z-30">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        className={`rounded-lg border backdrop-blur px-2 py-1 ${buttonClass}`}
        aria-label="Post actions"
        title="Post actions"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-4 w-4"
          fill="currentColor"
          viewBox="0 0 24 24"
        >
          <circle cx="5" cy="12" r="1.8" />
          <circle cx="12" cy="12" r="1.8" />
          <circle cx="19" cy="12" r="1.8" />
        </svg>
      </button>

      {open && (
        <div
          className="absolute right-0 mt-2 w-40 rounded-xl border border-purple-100 bg-white shadow-lg overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            onClick={openEdit}
            className="w-full text-left px-3 py-2 text-xs text-slate-700 hover:bg-purple-50"
          >
            Edit post
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            className="w-full text-left px-3 py-2 text-xs text-red-600 hover:bg-red-50 disabled:opacity-60"
          >
            {deleting ? "Deleting…" : "Delete post"}
          </button>
        </div>
      )}

      {/* Edit modal */}
      {editOpen && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 p-4"
          onClick={() => !saving && setEditOpen(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-xl max-w-lg w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-slate-900">
                  Edit post
                </h3>
                <button
                  type="button"
                  onClick={() => setEditOpen(false)}
                  disabled={saving}
                  className="text-slate-400 hover:text-slate-600"
                  aria-label="Close"
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

              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Update your post…"
                className="w-full min-h-[120px] p-3 border border-slate-200 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
                disabled={saving}
              />

              {/* Image preview/editing */}
              {imagePreview && (
                <div className="mt-3 relative">
                  <Image
                    src={imagePreview}
                    alt="Post preview"
                    width={1200}
                    height={800}
                    unoptimized
                    className="w-full max-h-64 object-cover rounded-xl"
                  />
                  <button
                    type="button"
                    onClick={handleRemoveImage}
                    disabled={saving}
                    className="absolute top-2 right-2 bg-black/50 hover:bg-black/70 text-white rounded-full p-2 transition-colors disabled:opacity-60"
                    aria-label="Remove image"
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

              {/* Image upload/change button */}
              <div className="mt-3">
                <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-300 bg-white text-slate-700 text-xs font-medium hover:bg-slate-50 transition-colors disabled:opacity-60">
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
                      d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                  {imagePreview ? "Change image" : "Add image"}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    disabled={saving}
                    className="hidden"
                  />
                </label>
              </div>

              {error && (
                <div className="mt-3 p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700">
                  {error}
                </div>
              )}

              <div className="mt-4 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditOpen(false)}
                  disabled={saving}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 text-xs hover:bg-slate-50 disabled:opacity-60"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveEdit}
                  disabled={saving}
                  className="px-4 py-2 rounded-xl bg-purple-600 text-white text-xs font-medium hover:bg-purple-700 disabled:opacity-60"
                >
                  {saving ? "Saving…" : "Save"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

