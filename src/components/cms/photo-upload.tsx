"use client";

import Image from "next/image";
import { useState } from "react";
import { IconCamera } from "@tabler/icons-react";
import { uploadToCloudinary } from "@/lib/cloudinary";

interface PhotoUploadProps {
  currentUrl: string | null;
  onUploaded: (url: string) => void;
  label?: string;
}

// Click-to-upload with an immediate local preview (PRD 4.5) — the preview
// shows before the Cloudinary upload even finishes, using a local blob URL.
export function PhotoUpload({ currentUrl, onUploaded, label }: PhotoUploadProps) {
  const [preview, setPreview] = useState<string | null>(currentUrl);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File) {
    setPreview(URL.createObjectURL(file));
    setUploading(true);
    setError(null);
    try {
      const url = await uploadToCloudinary(file);
      onUploaded(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  return (
    <label className="flex cursor-pointer flex-col items-center gap-1">
      <div className="relative h-16 w-16 overflow-hidden rounded-xl border-2 border-dashed border-brand-red/30 bg-brand-amber-soft">
        {preview ? (
          <Image src={preview} alt="" fill className="object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-brand-red">
            <IconCamera size={22} stroke={1.5} />
          </div>
        )}
        {uploading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40 text-xs text-white">
            …
          </div>
        )}
      </div>
      {label && <span className="text-xs text-zinc-500">{label}</span>}
      {error && <span className="text-xs text-brand-red">{error}</span>}
      <input
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
        }}
      />
    </label>
  );
}
