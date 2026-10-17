"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { toSquareImage } from "@/lib/image";
import { IMAGE_MAX_BYTES, IMAGE_TYPES, LOGO_BUCKET, PHOTO_BUCKET, publicImageUrl } from "@/lib/storage";
import { createClient } from "@/lib/supabase/client";

type ImageType = (typeof IMAGE_TYPES)[number];

const EXTENSIONS: Record<ImageType, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
};

const VARIANTS = {
  logo: {
    bucket: LOGO_BUCKET,
    field: "logo_path",
    accept: IMAGE_TYPES.join(","),
    maxInputBytes: IMAGE_MAX_BYTES,
    hint: "PNG, JPG or WebP, up to 1 MB.",
    tooBig: "Keep the logo under 1 MB.",
    willRemove: "Logo will be removed when you save.",
  },
  photo: {
    bucket: PHOTO_BUCKET,
    field: "photo_path",
    accept: "image/*",
    // Phone photos are large; they're shrunk to a small square before upload.
    maxInputBytes: 15 * 1024 * 1024,
    hint: "Any photo up to 15 MB. It's cropped to a square.",
    tooBig: "Choose a photo under 15 MB.",
    willRemove: "Photo will be removed when you save.",
  },
} as const;

const UPLOADED = "Uploaded. Save to keep it.";

type Props = { variant: keyof typeof VARIANTS; userId: string; savedPath: string; label: string; error?: string };

/**
 * Uploads straight to Supabase Storage as the signed-in owner (storage policies limit them to
 * their own folder), then hands the path to the form via a hidden input.
 */
export function ImageUpload({ variant, userId, savedPath, label, error }: Props) {
  const config = VARIANTS[variant];
  const [path, setPath] = useState(savedPath);
  const [status, setStatus] = useState<string | undefined>(error);
  const [busy, setBusy] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  // A file uploaded in this session but replaced before saving would be orphaned; clean it up.
  async function discardUnsaved(previous: string) {
    if (previous && previous !== savedPath) await createClient().storage.from(config.bucket).remove([previous]);
  }

  async function prepare(file: File): Promise<Blob | string> {
    if (file.size > config.maxInputBytes) return config.tooBig;
    if (variant === "logo") {
      return (IMAGE_TYPES as readonly string[]).includes(file.type) ? file : "Use a PNG, JPG or WebP image.";
    }
    try {
      return await toSquareImage(file);
    } catch {
      return "Couldn't read that image. Try a JPG or PNG.";
    }
  }

  async function onFile(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    setStatus(variant === "photo" ? "Preparing…" : "Uploading…");

    const prepared = await prepare(file);
    if (typeof prepared === "string") {
      setBusy(false);
      return setStatus(prepared);
    }

    const ext = EXTENSIONS[prepared.type as ImageType];
    if (!ext) {
      setBusy(false);
      return setStatus("Use a PNG, JPG or WebP image.");
    }

    setStatus("Uploading…");
    const nextPath = `${userId}/${crypto.randomUUID()}.${ext}`;
    const { error: uploadError } = await createClient()
      .storage.from(config.bucket)
      .upload(nextPath, prepared, { contentType: prepared.type });
    setBusy(false);
    if (fileInput.current) fileInput.current.value = "";

    if (uploadError) return setStatus("Upload failed. Please try again.");
    await discardUnsaved(path);
    setPath(nextPath);
    setStatus(UPLOADED);
  }

  async function remove() {
    await discardUnsaved(path);
    setPath("");
    setStatus(savedPath ? config.willRemove : undefined);
  }

  // Once the form is saved, savedPath catches up with path and the "save to…" notes no longer apply.
  const pendingSave: string[] = [UPLOADED, config.willRemove];
  const shownStatus = path === savedPath && pendingSave.includes(status ?? "") ? undefined : status;
  const src = path ? publicImageUrl(config.bucket, path) : null;

  return (
    <div className="flex items-center gap-5">
      <input type="hidden" name={config.field} value={path} />
      {variant === "photo" ? (
        <Avatar src={src} alt={`${label} preview`} size={80} />
      ) : (
        <div className="flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-md border border-border bg-card">
          {src ? (
            <Image src={src} alt={`${label} preview`} width={80} height={80} unoptimized className="size-full object-contain p-2" />
          ) : (
            <span className="small-caps text-[0.6rem] text-muted-foreground">No logo</span>
          )}
        </div>
      )}
      <div className="flex flex-col items-start gap-1">
        <div className="flex flex-wrap gap-2">
          <label className="inline-flex">
            <span className="sr-only">Upload {label.toLowerCase()}</span>
            <input
              ref={fileInput}
              type="file"
              accept={config.accept}
              disabled={busy}
              onChange={(e) => onFile(e.target.files?.[0])}
              className="peer sr-only"
            />
            <span className="inline-flex min-h-11 cursor-pointer items-center rounded-md border border-foreground px-5 text-sm font-medium tracking-[0.05em] transition-all duration-200 ease-out hover:bg-muted peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-background peer-disabled:opacity-50">
              {path ? "Replace" : "Upload"}
            </span>
          </label>
          {path && (
            <Button variant="ghost" onClick={remove} disabled={busy}>
              Remove
            </Button>
          )}
        </div>
        <p role="status" aria-live="polite" className={`text-sm ${error ? "text-destructive" : "text-muted-foreground"}`}>
          {shownStatus ?? config.hint}
        </p>
      </div>
    </div>
  );
}
