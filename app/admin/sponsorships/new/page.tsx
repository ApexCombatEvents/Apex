"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { createSupabaseBrowser } from "@/lib/supabase-browser";

type Placement = 
  | "homepage_hero"
  | "homepage_sidebar"
  | "stream_page"
  | "search_page"
  | "event_page"
  | "profile_page"
  | "rankings_page"
  | "messages_page";

export default function NewSponsorshipPage() {
  const router = useRouter();
  const supabase = createSupabaseBrowser();
  
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    placement: "" as Placement | "",
    variant: "horizontal" as "horizontal" | "vertical" | "compact" | "slideshow",
    image_url: "",
    link_url: "",
    button_text: "",
    background_color: "",
    text_color: "",
    display_order: 0,
    is_active: true,
  });

  async function handleImageUpload(file: File) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setMessage("You must be signed in.");
      return;
    }

    setLoading(true);
    try {
      const bucket = "event-banners";
      const path = `sponsorships/${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(path, file);

      if (uploadError) {
        setMessage("Failed to upload image: " + uploadError.message);
        return;
      }

      const { data: publicUrlData } = supabase.storage
        .from(bucket)
        .getPublicUrl(path);

      setFormData({ ...formData, image_url: publicUrlData.publicUrl });
    } catch (err: any) {
      setMessage("Upload failed: " + err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    // Check if user is admin
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setMessage("You must be signed in.");
      setLoading(false);
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile?.role !== "ADMIN") {
      setMessage("Access denied. Admin privileges required.");
      setLoading(false);
      return;
    }

    try {
      // Automatically set variant based on placement
      const variant = formData.placement === "homepage_hero" ? "slideshow" 
        : (formData.placement === "search_page" || formData.placement === "messages_page") ? "vertical"
        : formData.variant;
      
      console.log("Attempting to create sponsorship:", formData);
      
      const { data, error } = await supabase
        .from("sponsorships")
        .insert({
          title: formData.title,
          description: formData.description || null,
          placement: formData.placement,
          variant: variant,
          image_url: formData.image_url || null,
          link_url: formData.link_url || null,
          button_text: formData.button_text || null,
          background_color: formData.background_color || null,
          text_color: formData.text_color || null,
          display_order: formData.display_order,
          is_active: formData.is_active,
        })
        .select();

      if (error) {
        console.error("Sponsorship insert error:", error);
        setMessage("Failed to create sponsorship: " + error.message);
      } else {
        console.log("Sponsorship created successfully:", data);
        router.push("/admin/sponsorships");
      }
    } catch (err: any) {
      console.error("Unexpected error:", err);
      setMessage("An error occurred: " + err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">New Sponsorship</h1>
        <p className="text-sm text-slate-600 mt-1">Create a new promotional sponsorship</p>
      </div>

      {message && (
        <div className={`rounded-xl border px-4 py-3 text-sm mb-4 ${
          message.includes("Failed") || message.includes("Error") || message.includes("Access denied")
            ? "border-red-200 bg-red-50 text-red-700"
            : "border-green-200 bg-green-50 text-green-700"
        }`}>
          {message}
        </div>
      )}

      <div className="card">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Title *
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Placement *
            </label>
            <select
              value={formData.placement}
              onChange={(e) => {
                const newPlacement = e.target.value as Placement;
                setFormData({ 
                  ...formData, 
                  placement: newPlacement,
                  // Automatically set variant based on placement
                  variant: newPlacement === "homepage_hero" ? "slideshow" 
                    : (newPlacement === "search_page" || newPlacement === "messages_page") ? "vertical"
                    : formData.variant
                });
              }}
              required
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
            >
              <option value="">Select placement</option>
              <option value="homepage_hero">Homepage Hero</option>
              <option value="homepage_sidebar">Homepage Sidebar</option>
              <option value="stream_page">Stream Page</option>
              <option value="search_page">Search Page</option>
              <option value="event_page">Event Page</option>
              <option value="profile_page">Profile Page</option>
              <option value="rankings_page">Rankings Page</option>
              <option value="messages_page">Messages Page</option>
            </select>
          </div>

          {formData.placement !== "homepage_hero" && formData.placement !== "search_page" && formData.placement !== "messages_page" && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Variant
              </label>
              <select
                value={formData.variant}
                onChange={(e) => setFormData({ ...formData, variant: e.target.value as typeof formData.variant })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
              >
                <option value="horizontal">Horizontal</option>
                <option value="vertical">Vertical</option>
                <option value="compact">Compact</option>
                <option value="slideshow">Slideshow</option>
              </select>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Image
            </label>
            {(() => {
              // Get recommended image size based on placement and variant
              const getImageSizeGuide = (): string => {
                const placement = formData.placement;
                const variant = formData.variant;
                
                if (placement === "homepage_hero" || variant === "slideshow") {
                  return "Recommended: 1920×640px (3:1 ratio) - Full-width hero banner";
                }
                if (placement === "homepage_sidebar") {
                  if (variant === "vertical") return "Recommended: 800×320px (5:2 ratio) - Vertical sidebar banner";
                  if (variant === "compact") return "Recommended: 64×64px - Small square logo";
                  return "Recommended: 400×200px (2:1 ratio) - Horizontal sidebar banner";
                }
                if (placement === "search_page") {
                  if (variant === "vertical") return "Recommended: 800×320px (5:2 ratio) - Vertical banner";
                  if (variant === "compact") return "Recommended: 96×96px - Square logo";
                  return "Recommended: 600×300px (2:1 ratio) - Horizontal banner";
                }
                if (placement === "stream_page") {
                  if (variant === "vertical") return "Recommended: 800×320px (5:2 ratio) - Vertical banner";
                  if (variant === "compact") return "Recommended: 96×96px - Square logo";
                  return "Recommended: 600×300px (2:1 ratio) - Horizontal banner";
                }
                if (placement === "event_page" || placement === "profile_page" || placement === "rankings_page") {
                  if (variant === "vertical") return "Recommended: 800×320px (5:2 ratio) - Vertical banner";
                  if (variant === "compact") return "Recommended: 64×64px - Small square logo";
                  return "Recommended: 400×200px (2:1 ratio) - Horizontal banner";
                }
                if (placement === "messages_page") {
                  if (variant === "vertical") return "Recommended: 800×320px (5:2 ratio) - Vertical banner";
                  if (variant === "compact") return "Recommended: 96×96px - Square logo";
                  return "Recommended: 600×300px (2:1 ratio) - Horizontal banner";
                }
                // Default
                if (variant === "vertical") return "Recommended: 800×320px (5:2 ratio)";
                if (variant === "compact") return "Recommended: 64×64px - Square logo";
                return "Recommended: 600×300px (2:1 ratio) - Horizontal banner";
              };
              
              return (
                <>
                  {formData.image_url && (
                    <div className="mb-2">
                      <Image
                        src={formData.image_url}
                        alt="Preview"
                        width={200}
                        height={100}
                        className="rounded-lg border border-slate-200"
                      />
                    </div>
                  )}
                  {formData.placement && (
                    <div className="mb-2 p-3 bg-purple-50 border border-purple-200 rounded-lg">
                      <p className="text-xs font-medium text-purple-900 mb-1">📐 Image Size Guide</p>
                      <p className="text-xs text-purple-700">{getImageSizeGuide()}</p>
                      <p className="text-xs text-purple-600 mt-1 italic">
                        Images will automatically resize to fit while maintaining aspect ratio.
                      </p>
                    </div>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleImageUpload(file);
                    }}
                    disabled={loading}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                  />
                  {loading && <p className="text-xs text-slate-500 mt-1">Uploading...</p>}
                </>
              );
            })()}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Link URL
            </label>
            <input
              type="url"
              value={formData.link_url}
              onChange={(e) => setFormData({ ...formData, link_url: e.target.value })}
              placeholder="https://..."
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Button Text
            </label>
            <input
              type="text"
              value={formData.button_text}
              onChange={(e) => setFormData({ ...formData, button_text: e.target.value })}
              placeholder="e.g., Learn More, Visit Site"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Background Color (Tailwind classes)
              </label>
              <input
                type="text"
                value={formData.background_color}
                onChange={(e) => setFormData({ ...formData, background_color: e.target.value })}
                placeholder="from-purple-600 via-indigo-600 to-purple-800"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Text Color (Tailwind classes)
              </label>
              <input
                type="text"
                value={formData.text_color}
                onChange={(e) => setFormData({ ...formData, text_color: e.target.value })}
                placeholder="text-white"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Display Order
            </label>
            <input
              type="number"
              value={formData.display_order}
              onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) || 0 })}
              min={0}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={formData.is_active}
              onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
              className="h-4 w-4 rounded border-slate-300 text-purple-600 focus:ring-purple-500"
            />
            <label className="text-sm text-slate-700">Active</label>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={() => router.back()}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="rounded-lg border-2 border-purple-600 bg-purple-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:bg-purple-700 hover:shadow-md disabled:opacity-60"
            >
              {loading ? "Creating..." : "Create Sponsorship"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

