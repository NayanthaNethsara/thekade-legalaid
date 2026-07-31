import { auth } from "@/lib/auth/config";
import { getGuestToken } from "@/lib/guest/session";
import { INTERNAL_KEY_HEADER } from "@/lib/guest/constants";

const API_URL = process.env.BACKEND_API_URL ?? "http://localhost:8000";
// Generous cap (images are downscaled client-side to a few hundred KB); the
// backend enforces its own VISION_MAX_IMAGE_BYTES as the authoritative limit.
const MAX_UPLOAD_BYTES = 12 * 1024 * 1024;

interface ImageSearchVerdict {
  is_shoppable: boolean;
  query: string;
  reason: string;
}

/**
 * Deliver a failure as a not-shoppable verdict (HTTP 200) so the client shows a
 * friendly reason instead of throwing, matching how the backend refuses.
 */
function refusal(reason: string): Response {
  return Response.json({
    is_shoppable: false,
    query: "",
    reason,
  } satisfies ImageSearchVerdict);
}

/**
 * Proxy a KakilleVision image to the backend's identification endpoint, keeping the
 * backend URL and internal key server-side. The multipart body (raw image) is
 * forwarded straight through; nothing is stored here.
 */
export async function POST(request: Request): Promise<Response> {
  const session = await auth();
  const bearer = session?.accessToken ?? (await getGuestToken());
  if (!bearer) return refusal("Your session expired. Please reload.");

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return refusal("That upload didn't come through. Please try again.");
  }

  // Validate before forwarding so an invalid upload never reaches the backend.
  const file = form.get("file");
  if (!(file instanceof Blob)) return refusal("No image was provided.");
  if (file.type && !file.type.startsWith("image/")) {
    return refusal("That file isn't an image.");
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return refusal("That image is too large.");
  }

  let upstream: Response;
  try {
    upstream = await fetch(`${API_URL}/chat/image-search`, {
      method: "POST",
      headers: {
        [INTERNAL_KEY_HEADER]: process.env.INTERNAL_API_KEY ?? "",
        Authorization: `Bearer ${bearer}`,
      },
      body: form,
      cache: "no-store",
    });
  } catch {
    return refusal("Cannot reach the server. Please try again.");
  }

  if (!upstream.ok) return refusal("Sorry, I couldn't analyze that image.");
  return Response.json((await upstream.json()) as ImageSearchVerdict);
}
