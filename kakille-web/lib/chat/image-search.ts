export interface ImageSearchVerdict {
  is_shoppable: boolean;
  query: string;
  reason: string;
}

const REFUSAL_FALLBACK: ImageSearchVerdict = {
  is_shoppable: false,
  query: "",
  reason: "I couldn't analyze that image. Please try again.",
};

export async function searchByImage(
  imageDataUrl: string,
  caption: string
): Promise<ImageSearchVerdict> {
  let blob: Blob;
  try {
    blob = await (await fetch(imageDataUrl)).blob();
  } catch {
    return REFUSAL_FALLBACK;
  }

  const form = new FormData();
  form.append("file", blob, "image.jpg");
  if (caption.trim()) form.append("caption", caption.trim());

  try {
    const response = await fetch("/api/chat/image-search", {
      method: "POST",
      body: form,
    });
    if (!response.ok) return REFUSAL_FALLBACK;
    return (await response.json()) as ImageSearchVerdict;
  } catch {
    return REFUSAL_FALLBACK;
  }
}
