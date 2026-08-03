import type { ChatAction } from "@/types/chat";

/**
 * One event from the chat SSE stream. `token`/`reset` drive the live reply;
 * `done`/`error` are terminal and carry the authoritative result.
 */
export type ChatStreamEvent =
  | { type: "token"; text: string }
  | { type: "reset" }
  | {
      type: "done";
      reply: string;
      actions?: ChatAction[];
      title?: string;
    }
  | { type: "error"; reply: string };

/**
 * Stream a chat turn from the SSE proxy, invoking `onEvent` for each event as it
 * arrives. Resolves when the stream closes; transport failures are surfaced as a
 * terminal `error` event so callers handle one failure path.
 */
export async function streamChatMessage(
  message: string,
  conversationId: string,
  isUi: boolean,
  sourceIds: string[],
  onEvent: (event: ChatStreamEvent) => void,
): Promise<void> {
  let response: Response;
  try {
    response = await fetch("/api/chat/stream", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, conversationId, isUi, sourceIds }),
    });
  } catch {
    onEvent({ type: "error", reply: "Cannot reach the server. Try again." });
    return;
  }

  if (!response.ok || !response.body) {
    onEvent({
      type: "error",
      reply: "Sorry, something went wrong. Please try again.",
    });
    return;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      // SSE frames are separated by a blank line.
      let boundary = buffer.indexOf("\n\n");
      while (boundary !== -1) {
        const frame = buffer.slice(0, boundary);
        buffer = buffer.slice(boundary + 2);

        const dataLine = frame
          .split("\n")
          .find((line) => line.startsWith("data:"));
        const json = dataLine?.slice(5).trim();
        if (json) {
          try {
            onEvent(JSON.parse(json) as ChatStreamEvent);
          } catch {
            // Skip a malformed frame rather than aborting the whole stream.
          }
        }

        boundary = buffer.indexOf("\n\n");
      }
    }
  } catch {
    onEvent({ type: "error", reply: "Connection lost. Please try again." });
  }
}
