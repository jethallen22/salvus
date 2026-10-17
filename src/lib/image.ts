/**
 * Centre-crops an image to a square no larger than `size` px and re-encodes it.
 * Redrawing through a canvas also drops EXIF metadata, including any GPS location
 * a phone camera embedded: important for a photo shown on a public page.
 */
export async function toSquareImage(file: File, size = 512): Promise<Blob> {
  const bitmap = await createImageBitmap(file); // honours EXIF orientation
  const side = Math.min(bitmap.width, bitmap.height);
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = Math.min(size, side);

  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas unavailable");
  context.drawImage(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side, 0, 0, canvas.width, canvas.height);
  bitmap.close();

  // Browsers without WebP encoding fall back to PNG; callers read blob.type.
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", 0.85));
  if (!blob) throw new Error("Could not encode image");
  return blob;
}
