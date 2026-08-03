import { auth } from "@/lib/auth/config";
import { getGuestToken } from "@/lib/guest/session";
import { INTERNAL_KEY_HEADER } from "@/lib/guest/constants";

const API_URL = process.env.BACKEND_API_URL ?? "http://localhost:8000";

interface StreamRequestBody {
  message?: string;
  conversationId?: string;
  isUi?: boolean;
  sourceIds?: string[];
}

/**
 * Deliver a failure as a terminal SSE `error` event rather than an HTTP error,
 * so the client's stream loop ends the turn the same way as a backend error
 * instead of hanging or throwing.
 */
function sseError(reply: string): Response {
  return new Response(`data: ${JSON.stringify({ type: "error", reply })}\n\n`, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-store",
    },
  });
}

/**
 * Proxy a chat turn to the backend's SSE endpoint, keeping tokens, the backend
 * URL, and the internal key server-side. The backend stream is piped straight
 * through to the browser without buffering.
 */
export async function POST(request: Request): Promise<Response> {
  const session = await auth();
  const bearer = session?.accessToken ?? (await getGuestToken());
  if (!bearer) {
    return sseError("Your session expired. Please reload.");
  }

  let payload: StreamRequestBody;
  try {
    payload = (await request.json()) as StreamRequestBody;
  } catch {
    return sseError("Sorry, something went wrong. Please try again.");
  }

  const message = payload.message?.trim();
  if (!message || !payload.conversationId) {
    return sseError("Message is empty.");
  }

  let upstream: Response;
  try {
    upstream = await fetch(`${API_URL}/chat/stream`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        [INTERNAL_KEY_HEADER]: process.env.INTERNAL_API_KEY ?? "",
        Authorization: `Bearer ${bearer}`,
      },
      body: JSON.stringify({
        message,
        conversation_id: payload.conversationId,
        is_ui: payload.isUi ?? false,
        source_ids: payload.sourceIds ?? [],
      }),
      cache: "no-store",
    });
  } catch {
    return sseError("Cannot reach the server. Try again.");
  }

  if (!upstream.ok || !upstream.body) {
    return sseError("Sorry, I'm having trouble right now. Please try again.");
  }

  return new Response(upstream.body, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-store, no-transform",
      Connection: "keep-alive",
    },
  });
}
