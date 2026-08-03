import { auth } from "@/lib/auth/config";
import { getGuestToken } from "@/lib/guest/session";
import { INTERNAL_KEY_HEADER } from "@/lib/guest/constants";

const API_URL = process.env.BACKEND_API_URL ?? "http://localhost:8000";
// The backend enforces SOURCES_MAX_FILE_BYTES as the authoritative limit; this
// mirrors it so an oversized upload is rejected before crossing the network.
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

function failure(detail: string, status = 400): Response {
  return Response.json({ detail }, { status });
}

/**
 * Proxy a workspace source file to the backend, keeping the backend URL and
 * internal key server-side. Server Actions cannot carry a File cleanly, so
 * uploads go through this route instead (same pattern as image search).
 */
export async function POST(request: Request): Promise<Response> {
  const session = await auth();
  const bearer = session?.accessToken ?? (await getGuestToken());
  if (!bearer) return failure("Your session expired. Please reload.", 401);

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return failure("That upload didn't come through. Please try again.");
  }

  const file = form.get("file");
  if (!(file instanceof Blob)) return failure("No file was provided.");
  if (file.size > MAX_UPLOAD_BYTES) return failure("That file is too large.", 413);
  if (!form.get("conversation_id")) return failure("Missing conversation id.");

  let upstream: Response;
  try {
    upstream = await fetch(`${API_URL}/sources/upload`, {
      method: "POST",
      headers: {
        [INTERNAL_KEY_HEADER]: process.env.INTERNAL_API_KEY ?? "",
        Authorization: `Bearer ${bearer}`,
      },
      body: form,
      cache: "no-store",
    });
  } catch {
    return failure("Cannot reach the server. Please try again.", 502);
  }

  const body = await upstream.json().catch(() => ({}));
  return Response.json(body, { status: upstream.status });
}
