"use server";

import { auth } from "@/lib/auth/config";
import { apiFetch } from "@/lib/api";
import { getGuestToken } from "@/lib/guest/session";
import type {
  ChatApiResponse,
  ChatResult,
  ConversationDetail,
  ConversationSummary,
  QuickMessageItem,
} from "@/types/chat";

export async function sendChatMessage(
  message: string,
  conversationId: string,
  isUi: boolean = false
): Promise<ChatResult> {
  const text = message.trim();
  if (!text) {
    return { ok: false, error: "Message is empty." };
  }

  const session = await auth();
  const bearer = session?.accessToken ?? (await getGuestToken());
  if (!bearer) {
    return { ok: false, error: "Your session expired. Please reload." };
  }

  const result = await apiFetch<ChatApiResponse>("/chat", {
    method: "POST",
    headers: { Authorization: `Bearer ${bearer}` },
    body: JSON.stringify({
      message: text,
      conversation_id: conversationId,
      is_ui: isUi,
    }),
  });

  if (!result.ok) {
    return { ok: false, error: result.detail };
  }
  return {
    ok: true,
    reply: result.data.reply,
    cards: result.data.cards ?? [],
    actions: result.data.actions ?? [],
    tracking: result.data.tracking ?? [],
  };
}

/**
 * Fully delete a conversation's stored history on the backend (checkpointer
 * thread). The backend confirms deletion (404 if the thread did not exist), so
 * the caller can keep the UI in step with what is actually stored.
 */
export async function deleteConversation(
  conversationId: string
): Promise<{ ok: boolean; status: number }> {
  const session = await auth();
  const bearer = session?.accessToken ?? (await getGuestToken());
  if (!bearer) return { ok: false, status: 401 };

  const query = `?conversation_id=${encodeURIComponent(conversationId)}`;
  const result = await apiFetch<unknown>(`/chat${query}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${bearer}` },
  });
  return result.ok
    ? { ok: true, status: 204 }
    : { ok: false, status: result.status };
}

/**
 * List the active principal's conversations as id + title only, for the
 * sidebar. Lightweight: the backend does not deserialize message history here.
 */
export async function fetchConversationList(): Promise<ConversationSummary[]> {
  const session = await auth();
  const bearer = session?.accessToken ?? (await getGuestToken());
  if (!bearer) return [];

  const result = await apiFetch<ConversationSummary[]>("/chat/conversations", {
    method: "GET",
    headers: { Authorization: `Bearer ${bearer}` },
  });
  return result.ok ? result.data : [];
}

/**
 * Fetch one conversation's full message history and running summary, loaded
 * lazily when the user opens it. Returns null if it no longer exists.
 */
export async function fetchConversationDetail(
  conversationId: string
): Promise<ConversationDetail | null> {
  const session = await auth();
  const bearer = session?.accessToken ?? (await getGuestToken());
  if (!bearer) return null;

  const result = await apiFetch<ConversationDetail>(
    `/chat/conversations/${encodeURIComponent(conversationId)}`,
    {
      method: "GET",
      headers: { Authorization: `Bearer ${bearer}` },
    }
  );
  return result.ok ? result.data : null;
}

/**
 * Fetch list of fast-show quick messages from the backend (mocked as a server action).
 */
export async function fetchQuickMessages(): Promise<QuickMessageItem[]> {
  // TODO: Switch this to a real backend endpoint call (e.g. GET /chat/quick-messages) later.
  // Placeholder starters. Replace with prompts that match the real domain --
  // they are the first thing a new user sees, so they set expectations.
  return [
    {
      iconName: "search",
      label: "Look something up",
      message: "Can you help me find information on a topic I am researching?",
    },
    {
      iconName: "question",
      label: "Ask a question",
      message: "I have a question I am not sure how to phrase. Can you help me work through it?",
    },
    {
      iconName: "checklist",
      label: "What can you do",
      message: "What can you help me with? Give me a short list of what you handle.",
    },
    {
      iconName: "status",
      label: "Check a status",
      message: "Can you check the status of my most recent request?",
    },
  ];
}

export interface GuestSessionInfo {
  name: string;
  color: string;
}

/**
 * Generate randomized guest name and color info (mocked as a server action).
 */
export async function generateGuestSessionInfo(): Promise<GuestSessionInfo> {
  const guestNames = [
    "Curious Explorer",
    "Quiet Reader",
    "Fact Finder",
    "First Timer",
    "Night Owl",
    "Kakille Guest",
  ];
  const colors = [
    "bg-red-500/10 text-red-500 border border-red-500/20",
    "bg-blue-500/10 text-blue-500 border border-blue-500/20",
    "bg-green-500/10 text-green-500 border border-green-500/20",
    "bg-yellow-500/10 text-yellow-500 border border-yellow-500/20",
    "bg-violet-500/10 text-violet-500 border border-violet-500/20",
    "bg-pink-500/10 text-pink-500 border border-pink-500/20",
  ];
  const randomName = `${guestNames[Math.floor(Math.random() * guestNames.length)]} #${Math.floor(1000 + Math.random() * 9000)}`;
  const randomColor = colors[Math.floor(Math.random() * colors.length)];
  return { name: randomName, color: randomColor };
}
