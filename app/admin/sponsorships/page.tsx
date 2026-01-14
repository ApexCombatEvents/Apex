"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { createSupabaseBrowser } from "@/lib/supabase-browser";

type Sponsorship = {
  id: string;
  title: string;
  description?: string | null;
  image_url?: string | null;
  link_url?: string | null;
  button_text?: string | null;
  background_color?: string | null;
  text_color?: string | null;
  placement: string;
  variant: string;
  is_active: boolean;
  display_order: number;
  start_date?: string | null;
  end_date?: string | null;
  click_count?: number | null;
  created_at: string;
  updated_at: string;
};

type Placement = 
  | "homepage_hero"
  | "homepage_sidebar"
  | "stream_page"
  | "search_page"
  | "event_page"
  | "profile_page"
  | "rankings_page";

export default function AdminSponsorshipsPage() {
  const router = useRouter();
  const supabase = createSupabaseBrowser();
  
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [sponsorships, setSponsorships] = useState<Sponsorship[]>([]);
  const [selectedPlacement, setSelectedPlacement] = useState<Placement | "all">("all");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  // Check if user is admin
  useEffect(() => {
    async function checkAdmin() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      if (profile?.role === "ADMIN") {
        setIsAdmin(true);
        loadSponsorships();
      } else {
        setMessage("Access denied. Admin privileges required.");
        setLoading(false);
      }
    }
    checkAdmin();
  }, [router, supabase]);

  async function loadSponsorships() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("sponsorships")
        .select("*")
        .order("placement", { ascending: true })
        .order("display_order", { ascending: true });

      if (error) {
        console.error("Error loading sponsorships:", error);
        setMessage("Failed to load sponsorships: " + error.message);
      } else {
        setSponsorships((data as Sponsorship[]) || []);
      }
    } catch (err: any) {
      console.error("Error:", err);
      setMessage("An error occurred: " + err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Are you sure you want to delete this sponsorship?")) return;

    const { error } = await supabase
      .from("sponsorships")
      .delete()
      .eq("id", id);

    if (error) {
      setMessage("Failed to delete: " + error.message);
    } else {
      await loadSponsorships();
      setMessage("Sponsorship deleted successfully.");
    }
  }

  async function handleToggleActive(id: string, currentActive: boolean) {
    const { error } = await supabase
      .from("sponsorships")
      .update({ is_active: !currentActive, updated_at: new Date().toISOString() })
      .eq("id", id);

    if (error) {
      setMessage("Failed to update: " + error.message);
    } else {
      await loadSponsorships();
    }
  }

  async function handleUpdateOrder(id: string, newOrder: number) {
    const { error } = await supabase
      .from("sponsorships")
      .update({ display_order: newOrder, updated_at: new Date().toISOString() })
      .eq("id", id);

    if (error) {
      setMessage("Failed to update order: " + error.message);
    } else {
      await loadSponsorships();
    }
  }

  const filteredSponsorships = selectedPlacement === "all"
    ? sponsorships
    : sponsorships.filter(s => s.placement === selectedPlacement);

  const placements: { value: Placement | "all"; label: string }[] = [
    { value: "all", label: "All Placements" },
    { value: "homepage_hero", label: "Homepage Hero" },
    { value: "homepage_sidebar", label: "Homepage Sidebar" },
    { value: "stream_page", label: "Stream Page" },
    { value: "search_page", label: "Search Page" },
    { value: "event_page", label: "Event Page" },
    { value: "profile_page", label: "Profile Page" },
    { value: "rankings_page", label: "Rankings Page" },
  ];

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="card">
          <p className="text-sm text-slate-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="card">
          <p className="text-sm text-red-600">{message || "Access denied. Admin privileges required."}</p>
          <Link href="/" className="text-purple-700 hover:underline mt-2 inline-block">
            Go to homepage
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Sponsorship Management</h1>
          <p className="text-sm text-slate-600 mt-1">Manage promotional content across the platform</p>
        </div>
        <Link
          href="/admin/sponsorships/new"
          className="inline-flex items-center gap-2 rounded-lg border-2 border-purple-600 bg-purple-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:bg-purple-700 hover:shadow-md"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          New Sponsorship
        </Link>
      </div>

      {message && (
        <div className={`rounded-xl border px-4 py-3 text-sm ${
          message.includes("Failed") || message.includes("Error")
            ? "border-red-200 bg-red-50 text-red-700"
            : "border-green-200 bg-green-50 text-green-700"
        }`}>
          {message}
        </div>
      )}

      {/* Filter */}
      <div className="card">
        <label className="block text-sm font-medium text-slate-700 mb-2">
          Filter by Placement
        </label>
        <select
          value={selectedPlacement}
          onChange={(e) => setSelectedPlacement(e.target.value as Placement | "all")}
          className="w-full max-w-xs rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
        >
          {placements.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
        </select>
      </div>

      {/* Sponsorships List */}
      <div className="space-y-4">
        {filteredSponsorships.length === 0 ? (
          <div className="card">
            <p className="text-sm text-slate-600 text-center py-8">
              {selectedPlacement === "all"
                ? "No sponsorships found. Create your first sponsorship to get started."
                : `No sponsorships found for ${placements.find(p => p.value === selectedPlacement)?.label}.`}
            </p>
          </div>
        ) : (
          filteredSponsorships.map((sponsorship) => (
            <SponsorshipCard
              key={sponsorship.id}
              sponsorship={sponsorship}
              onEdit={() => setEditingId(sponsorship.id)}
              onDelete={() => handleDelete(sponsorship.id)}
              onToggleActive={() => handleToggleActive(sponsorship.id, sponsorship.is_active)}
              onUpdateOrder={(newOrder) => handleUpdateOrder(sponsorship.id, newOrder)}
              samePlacementCount={filteredSponsorships.filter(s => s.placement === sponsorship.placement).length}
            />
          ))
        )}
      </div>

      {/* Edit Modal */}
      {editingId && (
        <EditSponsorshipModal
          sponsorshipId={editingId}
          onClose={() => {
            setEditingId(null);
            loadSponsorships();
          }}
          onSave={() => {
            setEditingId(null);
            loadSponsorships();
          }}
        />
      )}
    </div>
  );
}

function SponsorshipCard({
  sponsorship,
  onEdit,
  onDelete,
  onToggleActive,
  onUpdateOrder,
  samePlacementCount,
}: {
  sponsorship: Sponsorship;
  onEdit: () => void;
  onDelete: () => void;
  onToggleActive: () => void;
  onUpdateOrder: (newOrder: number) => void;
  samePlacementCount: number;
}) {
  const placementLabels: Record<string, string> = {
    homepage_hero: "Homepage Hero",
    homepage_sidebar: "Homepage Sidebar",
    stream_page: "Stream Page",
    search_page: "Search Page",
    event_page: "Event Page",
    profile_page: "Profile Page",
    rankings_page: "Rankings Page",
  };

  return (
    <div className={`card ${!sponsorship.is_active ? "opacity-60" : ""}`}>
      <div className="flex items-start gap-4">
        {/* Image Preview */}
        {sponsorship.image_url && (
          <div className="flex-shrink-0 w-32 h-32 rounded-lg overflow-hidden bg-slate-100 border border-slate-200">
            <Image
              src={sponsorship.image_url}
              alt={sponsorship.title}
              width={128}
              height={128}
              className="w-full h-full object-cover"
            />
          </div>
        )}

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-4 mb-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-lg font-semibold text-slate-900">{sponsorship.title}</h3>
                {!sponsorship.is_active && (
                  <span className="px-2 py-0.5 rounded text-xs font-medium bg-slate-200 text-slate-600">
                    Inactive
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3 text-xs text-slate-600">
                <span className="font-medium">{placementLabels[sponsorship.placement] || sponsorship.placement}</span>
                <span>•</span>
                <span>{sponsorship.variant}</span>
                <span>•</span>
                <span>Order: {sponsorship.display_order}</span>
              </div>
              {sponsorship.description && (
                <p className="text-sm text-slate-700 mt-2 line-clamp-2">{sponsorship.description}</p>
              )}
              {sponsorship.link_url && (
                <a
                  href={sponsorship.link_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-purple-600 hover:underline mt-1 inline-block"
                >
                  {sponsorship.link_url}
                </a>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 mt-4 pt-4 border-t border-slate-200">
            <button
              onClick={onEdit}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Edit
            </button>
            <button
              onClick={onToggleActive}
              className={`inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                sponsorship.is_active
                  ? "border-green-300 bg-green-50 text-green-700 hover:bg-green-100"
                  : "border-slate-300 bg-slate-50 text-slate-700 hover:bg-slate-100"
              }`}
            >
              {sponsorship.is_active ? "Deactivate" : "Activate"}
            </button>
            <div className="flex items-center gap-1">
              <label className="text-xs text-slate-600">Order:</label>
              <select
                value={sponsorship.display_order}
                onChange={(e) => onUpdateOrder(parseInt(e.target.value))}
                className="rounded border border-slate-300 px-2 py-1 text-xs focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
              >
                {Array.from({ length: samePlacementCount }, (_, i) => (
                  <option key={i} value={i}>
                    {i}
                  </option>
                ))}
              </select>
            </div>
            <button
              onClick={onDelete}
              className="inline-flex items-center gap-1 rounded-lg border border-red-300 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100 transition-colors ml-auto"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function EditSponsorshipModal({
  sponsorshipId,
  onClose,
  onSave,
}: {
  sponsorshipId: string;
  onClose: () => void;
  onSave: () => void;
}) {
  const supabase = createSupabaseBrowser();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [sponsorship, setSponsorship] = useState<Partial<Sponsorship>>({});

  useEffect(() => {
    async function loadSponsorship() {
      const { data, error } = await supabase
        .from("sponsorships")
        .select("*")
        .eq("id", sponsorshipId)
        .single();

      if (error) {
        setMessage("Failed to load sponsorship: " + error.message);
      } else {
        setSponsorship(data as Sponsorship);
      }
      setLoading(false);
    }
    loadSponsorship();
  }, [sponsorshipId, supabase]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      const { error } = await supabase
        .from("sponsorships")
        .update({
          title: sponsorship.title,
          description: sponsorship.description || null,
          placement: sponsorship.placement,
          variant: sponsorship.variant,
          image_url: sponsorship.image_url || null,
          link_url: sponsorship.link_url || null,
          button_text: sponsorship.button_text || null,
          background_color: sponsorship.background_color || null,
          text_color: sponsorship.text_color || null,
          display_order: sponsorship.display_order,
          is_active: sponsorship.is_active,
          updated_at: new Date().toISOString(),
        })
        .eq("id", sponsorshipId);

      if (error) {
        setMessage("Failed to update: " + error.message);
      } else {
        onSave();
      }
    } catch (err: any) {
      setMessage("An error occurred: " + err.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="card max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          <p className="text-sm text-slate-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <SponsorshipForm
      sponsorship={sponsorship}
      onClose={onClose}
      onSave={handleSubmit}
      saving={saving}
      message={message}
      setSponsorship={setSponsorship}
    />
  );
}

function SponsorshipForm({
  sponsorship,
  onClose,
  onSave,
  saving,
  message,
  setSponsorship,
}: {
  sponsorship: Partial<Sponsorship>;
  onClose: () => void;
  onSave: (e: React.FormEvent) => void;
  saving: boolean;
  message: string | null;
  setSponsorship: (s: Partial<Sponsorship>) => void;
}) {
  const supabase = createSupabaseBrowser();
  const [uploading, setUploading] = useState(false);

  async function handleImageUpload(file: File) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      alert("You must be signed in.");
      return;
    }

    setUploading(true);
    try {
      const bucket = "event-banners"; // Reuse event-banners bucket
      const path = `sponsorships/${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(path, file);

      if (uploadError) {
        alert("Failed to upload image: " + uploadError.message);
        return;
      }

      const { data: publicUrlData } = supabase.storage
        .from(bucket)
        .getPublicUrl(path);

      setSponsorship({ ...sponsorship, image_url: publicUrlData.publicUrl });
    } catch (err: any) {
      alert("Upload failed: " + err.message);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="card max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-slate-900">
            {sponsorship.id ? "Edit Sponsorship" : "New Sponsorship"}
          </h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {message && (
          <div className={`rounded-lg border px-4 py-3 text-sm mb-4 ${
            message.includes("Failed") || message.includes("Error")
              ? "border-red-200 bg-red-50 text-red-700"
              : "border-green-200 bg-green-50 text-green-700"
          }`}>
            {message}
          </div>
        )}

        <form onSubmit={onSave} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Title *
            </label>
            <input
              type="text"
              value={sponsorship.title || ""}
              onChange={(e) => setSponsorship({ ...sponsorship, title: e.target.value })}
              required
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Description
            </label>
            <textarea
              value={sponsorship.description || ""}
              onChange={(e) => setSponsorship({ ...sponsorship, description: e.target.value })}
              rows={3}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Placement *
            </label>
            <select
              value={sponsorship.placement || ""}
              onChange={(e) => setSponsorship({ ...sponsorship, placement: e.target.value })}
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
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Variant
            </label>
            <select
              value={sponsorship.variant || "horizontal"}
              onChange={(e) => setSponsorship({ ...sponsorship, variant: e.target.value })}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
            >
              <option value="horizontal">Horizontal</option>
              <option value="vertical">Vertical</option>
              <option value="compact">Compact</option>
              <option value="slideshow">Slideshow</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Image
            </label>
            {sponsorship.image_url && (
              <div className="mb-2">
                <Image
                  src={sponsorship.image_url}
                  alt={sponsorship.title || "Preview"}
                  width={200}
                  height={100}
                  className="rounded-lg border border-slate-200"
                />
              </div>
            )}
            <input
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleImageUpload(file);
              }}
              disabled={uploading}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
            />
            {uploading && <p className="text-xs text-slate-500 mt-1">Uploading...</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Link URL
            </label>
            <input
              type="url"
              value={sponsorship.link_url || ""}
              onChange={(e) => setSponsorship({ ...sponsorship, link_url: e.target.value })}
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
              value={sponsorship.button_text || ""}
              onChange={(e) => setSponsorship({ ...sponsorship, button_text: e.target.value })}
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
                value={sponsorship.background_color || ""}
                onChange={(e) => setSponsorship({ ...sponsorship, background_color: e.target.value })}
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
                value={sponsorship.text_color || ""}
                onChange={(e) => setSponsorship({ ...sponsorship, text_color: e.target.value })}
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
              value={sponsorship.display_order || 0}
              onChange={(e) => setSponsorship({ ...sponsorship, display_order: parseInt(e.target.value) || 0 })}
              min={0}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={sponsorship.is_active !== false}
              onChange={(e) => setSponsorship({ ...sponsorship, is_active: e.target.checked })}
              className="h-4 w-4 rounded border-slate-300 text-purple-600 focus:ring-purple-500"
            />
            <label className="text-sm text-slate-700">Active</label>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg border-2 border-purple-600 bg-purple-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:bg-purple-700 hover:shadow-md disabled:opacity-60"
            >
              {saving ? "Saving..." : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

