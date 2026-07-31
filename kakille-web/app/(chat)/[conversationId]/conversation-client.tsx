"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ChatComposer,
  type ComposerSubmission,
} from "@/components/animated-ai-chat/chat-composer";
import { MessageList } from "@/components/animated-ai-chat/message-list";
import { VoiceAgent } from "@/components/animated-ai-chat/voice-agent";
import { streamChatMessage, type ChatStreamEvent } from "@/lib/chat/stream";
import { takeFirstMessage } from "@/lib/chat/handoff";
import type { ChatMessage } from "@/types/chat";

export function ConversationClient({
  conversationId,
  initialMessages,
}: {
  conversationId: string;
  initialMessages: ChatMessage[];
}) {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  // `isTyping` shows the pre-token "Thinking" skeleton; `isStreaming` stays true
  // for the whole turn (skeleton + token streaming) and gates the composer so a
  // second turn cannot start on the same thread mid-stream.
  const [isTyping, setIsTyping] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [voiceOpen, setVoiceOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const sentHandoff = useRef(false);

  // Stream the assistant reply for an already-shown user turn. Appends the
  // assistant message on first write, then updates it in place as tokens stream.
  const streamAssistant = useCallback(
    (message: string, isUi: boolean = false) => {
      setIsTyping(true);
      setIsStreaming(true);

      // `appended` is captured before setMessages so React's double-invoked
      // updater (dev strict mode) cannot append twice.
      let appended = false;
      let streamed = "";
      let finalized = false;

      const writeAssistant = (patch: Partial<ChatMessage>) => {
        const wasAppended = appended;
        appended = true;
        setMessages((prev) => {
          if (!wasAppended) {
            return [...prev, { role: "assistant", content: "", ...patch }];
          }
          const next = [...prev];
          const last = next.length - 1;
          if (last >= 0 && next[last].role === "assistant") {
            next[last] = { ...next[last], ...patch };
          }
          return next;
        });
      };

      const handleEvent = (event: ChatStreamEvent) => {
        switch (event.type) {
          case "token":
            streamed += event.text;
            setIsTyping(false);
            writeAssistant({ content: streamed });
            break;
          case "reset":
            // A later agent step replaced earlier streamed text (e.g. after a
            // tool call); drop what we showed and stream the real reply.
            streamed = "";
            writeAssistant({ content: "" });
            break;
          case "done":
            finalized = true;
            setIsTyping(false);
            writeAssistant({
              content: event.reply,
              actions: event.actions ?? [],
            });
            window.dispatchEvent(
              new CustomEvent("refresh-conversations", {
                detail: { conversationId, title: event.title },
              })
            );
            break;
          case "error":
            finalized = true;
            setIsTyping(false);
            writeAssistant({ content: streamed || event.reply });
            break;
        }
      };

      void (async () => {
        try {
          await streamChatMessage(message, conversationId, isUi, handleEvent);
          if (!finalized) {
            setIsTyping(false);
            writeAssistant({
              content:
                streamed || "Sorry, the connection dropped. Please try again.",
            });
          }
        } finally {
          setIsTyping(false);
          setIsStreaming(false);
        }
      })();
    },
    [conversationId]
  );

  // Send a plain text turn: show the user bubble, then stream the reply.
  const send = useCallback(
    (text: string, isUi: boolean = false) => {
      const trimmed = text.trim();
      if (!trimmed) return;
      setMessages((prev) => [...prev, { role: "user", content: trimmed }]);
      streamAssistant(trimmed, isUi);
    },
    [streamAssistant]
  );

  useEffect(() => {
    if (sentHandoff.current) return;
    sentHandoff.current = true;
    const handoff = takeFirstMessage(conversationId);
    if (!handoff) return;
    queueMicrotask(() => send(handoff.text));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId]);

  useEffect(() => {
    const handleSubmitMessage = (e: Event) => {
      const customEvent = e as CustomEvent<
        string | { text: string; isUi?: boolean }
      >;
      const detail = customEvent.detail;
      if (detail) {
        if (typeof detail === "string") {
          send(detail);
        } else {
          send(detail.text, !!detail.isUi);
        }
      }
    };
    window.addEventListener("submit-chat-message", handleSubmitMessage);
    return () => {
      window.removeEventListener("submit-chat-message", handleSubmitMessage);
    };
  }, [send]);

  useEffect(() => {
    if (isTyping) {
      const scrollEl = scrollRef.current;
      if (scrollEl) {
        const userMessages = scrollEl.querySelectorAll(".items-end");
        const lastUserMessage = userMessages[userMessages.length - 1];
        if (lastUserMessage) {
          lastUserMessage.scrollIntoView({
            behavior: "smooth",
            block: "start",
          });
          return;
        }
      }
    }
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages, isTyping]);

  const handleSubmit = ({ text }: ComposerSubmission) => send(text);

  return (
    <div className="relative flex h-full min-h-0 flex-1">
      <div className="relative flex h-full min-h-0 flex-1 flex-col">
        <div ref={scrollRef} className="flex-1 scrollbar-thin overflow-y-auto">
          <div className="mx-auto w-full px-4 py-6 sm:px-6 md:px-8">
            <MessageList messages={messages} isTyping={isTyping} />
          </div>
        </div>

        <div className="shrink-0 px-4 pb-4 sm:px-6 sm:pb-6 lg:pb-4">
          <div className="mx-auto w-full max-w-2xl lg:max-w-3xl">
            <ChatComposer
              disabled={isStreaming}
              onSubmit={handleSubmit}
              onVoice={() => setVoiceOpen(true)}
            />
            <p className="text-foreground/35 mt-2.5 text-center text-xs leading-relaxed select-none">
              Kakille is AI and can make mistakes.
            </p>
          </div>
        </div>
      </div>

      <VoiceAgent
        open={voiceOpen}
        onClose={() => setVoiceOpen(false)}
        onSubmit={(transcript) => send(transcript)}
      />
    </div>
  );
}
