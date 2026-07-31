const MAX_DIMENSION = 1280;
const JPEG_QUALITY = 0.85;

const MAX_FILE_BYTES = 15 * 1024 * 1024;
const MIN_DIMENSION = 64;

/**
 * Thrown when a selected file fails client-side validation. The message is safe
 * to show the user.
 */
export class InvalidImageError extends Error {}

export async function fileToSearchImage(file: File): Promise<string> {
  if (file.type && !file.type.startsWith("image/")) {
    throw new InvalidImageError("Please choose an image file.");
  }
  if (file.size > MAX_FILE_BYTES) {
    throw new InvalidImageError("That image is too large (max 15 MB).");
  }

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new InvalidImageError("That file isn't a readable image.");
  }
  try {
    if (Math.min(bitmap.width, bitmap.height) < MIN_DIMENSION) {
      throw new InvalidImageError("That image is too small to search with.");
    }
    const scale = Math.min(
      1,
      MAX_DIMENSION / Math.max(bitmap.width, bitmap.height)
    );
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Canvas 2D context unavailable");

    context.drawImage(bitmap, 0, 0, width, height);
    return canvas.toDataURL("image/jpeg", JPEG_QUALITY);
  } finally {
    bitmap.close();
  }
}
