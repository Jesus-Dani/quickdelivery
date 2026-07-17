// Unsigned upload straight from the browser — no server round-trip needed,
// which is what keeps the CMS's "click-to-upload with immediate preview"
// flow (PRD 4.5) simple. Requires an unsigned upload preset configured in
// the Cloudinary dashboard.
export async function uploadToCloudinary(file: File): Promise<string> {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

  if (!cloudName || !uploadPreset) {
    throw new Error("Cloudinary is not configured (missing cloud name or upload preset).");
  }

  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", uploadPreset);

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
    { method: "POST", body: formData }
  );

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.error?.message ?? "Upload failed");
  }

  const data = (await response.json()) as { secure_url: string };
  return data.secure_url;
}
