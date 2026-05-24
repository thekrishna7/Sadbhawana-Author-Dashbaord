import { createClient } from "@/lib/supabase/client";

export type StorageBucket =
  | "avatars"
  | "banners"
  | "book-covers"
  | "manuscripts"
  | "cover-designs"
  | "documents"
  | "message-attachments";

/** Upload to public bucket — returns permanent public URL */
export async function uploadPublic(
  bucket: "avatars" | "banners" | "book-covers",
  userId: string,
  file: File,
  subpath = ""
) {
  const supabase = createClient();
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const path = `${userId}/${subpath}${Date.now()}-${safeName}`;
  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(path, file, { upsert: true, contentType: file.type || undefined });
  if (error) throw error;
  const { data: url } = supabase.storage.from(bucket).getPublicUrl(data.path);
  return { path: data.path, publicUrl: url.publicUrl };
}

/** Upload to private bucket — returns storage path (store in DB, not signed URL) */
export async function uploadPrivate(
  bucket: "manuscripts" | "cover-designs" | "documents" | "message-attachments",
  path: string,
  file: File
) {
  const supabase = createClient();
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const fullPath = path.includes(".") ? path : `${path}/${Date.now()}-${safeName}`;
  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(fullPath, file, {
      upsert: false,
      contentType: file.type || undefined,
    });
  if (error) throw error;
  return { path: data.path, bucket };
}

/** Resolve file_url from DB — supports legacy signed URLs or storage paths */
export async function resolveFileUrl(
  fileUrl: string,
  bucket?: StorageBucket
): Promise<string> {
  if (fileUrl.startsWith("http://") || fileUrl.startsWith("https://")) {
    return fileUrl;
  }
  if (!bucket) return fileUrl;
  const supabase = createClient();
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(fileUrl, 60 * 60 * 24);
  if (error) throw error;
  return data.signedUrl;
}

/** Resolve file_url via API route to bypass RLS restrictions */
export async function resolveFileUrlViaApi(bucket: StorageBucket, path: string): Promise<string> {
  const response = await fetch("/api/storage/signed-url", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ bucket, path }),
  });
  if (!response.ok) throw new Error("Failed to fetch signed URL");
  const { signedUrl } = await response.json();
  return signedUrl;
}

export function storageRef(bucket: StorageBucket, path: string) {
  return `${bucket}:${path}`;
}

export function parseStorageRef(ref: string): { bucket: StorageBucket; path: string } | null {
  const idx = ref.indexOf(":");
  if (idx < 1) return null;
  return {
    bucket: ref.slice(0, idx) as StorageBucket,
    path: ref.slice(idx + 1),
  };
}
