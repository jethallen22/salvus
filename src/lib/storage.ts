import { SUPABASE_URL } from "@/lib/supabase/env";

export const LOGO_BUCKET = "logos";
export const PHOTO_BUCKET = "photos";
export type ImageBucket = typeof LOGO_BUCKET | typeof PHOTO_BUCKET;

// Mirrors the buckets' file_size_limit / allowed_mime_types in the migrations.
export const IMAGE_MAX_BYTES = 1024 * 1024;
export const IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp"] as const;

/** Both buckets are public, so the URL can be built without a client round-trip. */
export function publicImageUrl(bucket: ImageBucket, path: string): string {
  return `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${path}`;
}
