const CONVERSATION_ID_BYTES = 8;

const CONVERSATION_ID_PATTERN = new RegExp(
  `^[0-9a-f]{${CONVERSATION_ID_BYTES * 2}}$`
);

export function isConversationId(value: string): boolean {
  return CONVERSATION_ID_PATTERN.test(value);
}

export function newConversationId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(CONVERSATION_ID_BYTES));
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join(
    ""
  );
}
