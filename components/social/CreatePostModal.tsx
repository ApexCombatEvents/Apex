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
  const MAX_CONTENT_LENGTH = 2000;
  const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB for images
  const MAX_VIDEO_SIZE = 50 * 1024 * 1024; // 50MB for videos (about 2 minutes)
  const MAX_VIDEO_DURATION = 120; // 2 minutes in seconds
  
  const [content, setContent] = useState("");
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const validFiles: File[] = [];
    const newPreviews: string[] = [];

    for (const file of files) {
      // Check file type
      const isImage = file.type.startsWith('image/');
      const isVideo = file.type.startsWith('video/');
      
      if (!isImage && !isVideo) {
        setError(`${file.name} is not a valid image or video file.`);
        continue;
      }

      // Check file size
      const maxSize = isImage ? MAX_IMAGE_SIZE : MAX_VIDEO_SIZE;
      if (file.size > maxSize) {
        const maxSizeMB = Math.round(maxSize / (1024 * 1024));
        setError(`${file.name} is too large. Maximum size is ${maxSizeMB}MB.`);
        continue;
      }

      // For videos, we can't check duration client-side easily, but we'll limit size
      if (isVideo && file.size > MAX_VIDEO_SIZE) {
        setError(`Videos must be under ${Math.round(MAX_VIDEO_SIZE / (1024 * 1024))}MB (approximately 2 minutes).`);
        continue;
      }

      validFiles.push(file);
      newPreviews.push(URL.createObjectURL(file));
    }

    if (validFiles.length > 0) {
      setImageFiles([...imageFiles, ...validFiles]);
      setImagePreviews([...imagePreviews, ...newPreviews]);
      setError(null);
    }
  }

  function removeImage(index: number) {
    const newFiles = imageFiles.filter((_, i) => i !== index);
    const newPreviews = imagePreviews.filter((_, i) => i !== index);
    setImageFiles(newFiles);
    setImagePreviews(newPreviews);
    if (currentImageIndex >= newPreviews.length && newPreviews.length > 0) {
      setCurrentImageIndex(newPreviews.length - 1);
    } else if (newPreviews.length === 0) {
      setCurrentImageIndex(0);
    }
  }

  function handleContentChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const newContent = e.target.value;
    if (newContent.length <= MAX_CONTENT_LENGTH) {
      setContent(newContent);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!content.trim() && imageFiles.length === 0) {
      setError("Please add some content or at least one image/video to your post.");
      return;
    }

    setUploading(true);

    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        setError("You must be signed in.");
        setUploading(false);
        return;
      }

      // 1) Upload all images/videos
      const imageUrls: string[] = [];
      const bucket = "post-images";
      
      for (const file of imageFiles) {
        const filePath = `${profileId}/${Date.now()}-${Math.random().toString(36).substring(7)}-${file.name}`;

        const { error: uploadError } = await supabase.storage
          .from(bucket)
          .upload(filePath, file, {
            cacheControl: "3600",
            upsert: false,
          });

        if (uploadError) {
          console.error("File upload error", uploadError);
          if (uploadError.message?.includes("not found") || uploadError.message?.includes("Bucket")) {
            setError("Storage bucket 'post-images' not found. Please check your Supabase Storage settings.");
          } else {
            setError(uploadError.message || `Failed to upload ${file.name}.`);
          }
          setUploading(false);
          return;
        }

        const { data: publicUrlData } = supabase.storage
          .from(bucket)
          .getPublicUrl(filePath);

        imageUrls.push(publicUrlData.publicUrl);
      }

      // 2) Insert post - use first image_url for backward compatibility, store all in image_urls JSON
      const { error: insertError } = await supabase
        .from("profile_posts")
        .insert({
          profile_id: profileId,
          content: content.trim() || "", // Use empty string instead of null (database requires not null)
          image_url: imageUrls.length > 0 ? imageUrls[0] : null,
          image_urls: imageUrls.length > 0 ? imageUrls : null, // Store all images as JSON array
        });

      if (insertError) {
        console.error("Post insert error", insertError);
        setError(insertError.message || "Failed to create post.");
        setUploading(false);
        return;
      }

      // 3) Success - reset and close
      setContent("");
      setImageFiles([]);
      setImagePreviews([]);
      setCurrentImageIndex(0);
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
                onChange={handleContentChange}
                placeholder="What's on your mind?"
                maxLength={MAX_CONTENT_LENGTH}
                className="w-full min-h-[120px] p-3 border border-slate-300 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                disabled={uploading}
              />
              <div className="text-xs text-slate-500 mt-1 text-right">
                {content.length}/{MAX_CONTENT_LENGTH} characters
              </div>
            </div>

            {imagePreviews.length > 0 && (
              <div className="relative">
                <div className="relative w-full aspect-video bg-slate-100 rounded-xl overflow-hidden">
                  {imagePreviews[currentImageIndex] && (
                    <>
                      {imageFiles[currentImageIndex]?.type.startsWith('video/') ? (
                        <video
                          src={imagePreviews[currentImageIndex]}
                          controls
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Image
                          src={imagePreviews[currentImageIndex]}
                          alt={`Preview ${currentImageIndex + 1}`}
                          fill
                          unoptimized
                          className="object-cover"
                        />
                      )}
                    </>
                  )}
                  
                  {/* Navigation arrows */}
                  {imagePreviews.length > 1 && (
                    <>
                      <button
                        type="button"
                        onClick={() => setCurrentImageIndex((prev) => (prev - 1 + imagePreviews.length) % imagePreviews.length)}
                        className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-2 transition-colors z-10"
                        disabled={uploading}
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-5 w-5"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                      </button>
                      <button
                        type="button"
                        onClick={() => setCurrentImageIndex((prev) => (prev + 1) % imagePreviews.length)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-2 transition-colors z-10"
                        disabled={uploading}
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-5 w-5"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                    </>
                  )}
                  
                  {/* Image counter */}
                  {imagePreviews.length > 1 && (
                    <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-black/50 text-white px-3 py-1 rounded-full text-xs">
                      {currentImageIndex + 1} / {imagePreviews.length}
                    </div>
                  )}
                  
                  {/* Remove button */}
                  <button
                    type="button"
                    onClick={() => removeImage(currentImageIndex)}
                    className="absolute top-2 right-2 bg-black/50 hover:bg-black/70 text-white rounded-full p-2 transition-colors z-10"
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
                
                {/* Thumbnail strip */}
                {imagePreviews.length > 1 && (
                  <div className="flex gap-2 mt-2 overflow-x-auto">
                    {imagePreviews.map((preview, index) => (
                      <button
                        key={index}
                        type="button"
                        onClick={() => setCurrentImageIndex(index)}
                        className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 ${
                          index === currentImageIndex ? 'border-purple-600' : 'border-transparent'
                        }`}
                      >
                        <Image
                          src={preview}
                          alt={`Thumbnail ${index + 1}`}
                          width={64}
                          height={64}
                          unoptimized
                          className="w-full h-full object-cover"
                        />
                      </button>
                    ))}
                  </div>
                )}
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
                <span className="text-sm text-slate-700">Add Photos/Videos</span>
                <input
                  type="file"
                  accept="image/*,video/*"
                  multiple
                  onChange={handleImageChange}
                  className="hidden"
                  disabled={uploading}
                />
              </label>
              <span className="text-xs text-slate-500">
                Max 10MB images, 50MB videos (~2 min)
              </span>
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
                disabled={uploading || (!content.trim() && imageFiles.length === 0)}
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

