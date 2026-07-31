import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ConversationClient } from "./conversation-client";
import { fetchConversationDetail } from "@/lib/chat/actions";
import { isConversationId } from "@/lib/chat/conversation-id";
import type { ChatMessage } from "@/types/chat";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function ConversationPage(
  props: PageProps<"/[conversationId]">
) {
  const { conversationId } = await props.params;
  if (!isConversationId(conversationId)) notFound();

  const detail = await fetchConversationDetail(conversationId);
  const initialMessages: ChatMessage[] = (detail?.messages ?? []).map((m) => ({
    id: m.id,
    role: m.role,
    content: m.content,
    cards: m.cards,
    actions: m.actions,
    tracking: m.tracking,
  }));

  return (
    <ConversationClient
      conversationId={conversationId}
      initialMessages={initialMessages}
    />
  );
}
