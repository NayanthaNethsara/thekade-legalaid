const STORAGE_KEY_PREFIX = "kakille.firstMessage.";

export interface FirstMessage {
  text: string;
}

export function stashFirstMessage(
  conversationId: string,
  message: FirstMessage
): void {
  try {
    sessionStorage.setItem(
      STORAGE_KEY_PREFIX + conversationId,
      JSON.stringify(message)
    );
  } catch {}
}

export function takeFirstMessage(conversationId: string): FirstMessage | null {
  try {
    const storageKey = STORAGE_KEY_PREFIX + conversationId;
    const rawData = sessionStorage.getItem(storageKey);
    if (!rawData) return null;
    sessionStorage.removeItem(storageKey);
    return JSON.parse(rawData) as FirstMessage;
  } catch {
    return null;
  }
}
