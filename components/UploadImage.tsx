"use client";

import { useState } from "react";
import { createSupabaseBrowser } from "@/lib/supabase-browser";

export default function UploadImage({
  bucket,
  userId,
  onUploaded,
  label,
}: {
  bucket: string;
  userId: string;
  onUploaded: (url: string) => void;
  label?: string;
}) {
  const [uploading, setUploading] = useState(false);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const supabase = createSupabaseBrowser();
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const fileName = `${Date.now()}.${ext}`;
      const path = `${userId}/${fileName}`;
      const { error: upErr } = await supabase.storage.from(bucket).upload(path, file, {
        cacheControl: "3600",
        upsert: true,
      });
      if (upErr) throw upErr;
      const { data } = supabase.storage.from(bucket).getPublicUrl(path);
      onUploaded(data.publicUrl);
    } catch (err: any) {
      alert(err.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div>
      <label className="cursor-pointer text-sm text-purple-600 hover:underline">
        {uploading ? "Uploading..." : label ?? "Upload"}
        <input type="file" accept="image/*" onChange={handleFile} className="hidden" disabled={uploading} />
      </label>
    </div>
  );
}
