"use client";

import React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import type { ChatMessage } from "@/types/chat";

import { MessageMarkdown } from "./message-markdown";
import { MessageActions } from "./message-actions";
import { ThinkingStatus, TypingDots } from "./thinking-status";

export function MessageList({
  messages,
  isTyping = false,
}: {
  messages: ChatMessage[];
  isTyping?: boolean;
}) {
  if (messages.length === 0 && !isTyping) return null;

  return (
    <div className="space-y-6">
      {messages.map((message, index) => {
        const isUser = message.role === "user";
        return (
          <MessageItem
            key={message.id ?? index}
            message={message}
            isUser={isUser}
          />
        );
      })}

      {isTyping && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative mx-auto flex min-h-[50vh] w-full max-w-2xl flex-col items-start gap-4 lg:max-w-3xl"
        >
          <div className="text-foreground/50 flex items-center gap-2 px-0 py-1 text-sm">
            <ThinkingStatus />
            <TypingDots />
          </div>
        </motion.div>
      )}
    </div>
  );
}

function MessageItem({
  message,
  isUser,
}: {
  message: ChatMessage;
  isUser: boolean;
}) {
  const hasContent = !!(message.images || message.content || message.actions);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring" as const, stiffness: 240, damping: 25 }}
      className="relative flex flex-col gap-3"
    >
      {hasContent && (
        <div
          className={cn(
            "mx-auto flex w-full max-w-2xl flex-col lg:max-w-3xl",
            isUser ? "items-end" : "items-start"
          )}
        >
          {message.images && message.images.length > 0 && (
            <div className="mb-2 flex max-w-[85%] flex-wrap justify-end gap-2">
              {message.images.map((image, imageIndex) => (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  key={imageIndex}
                  src={image || "/placeholder.svg"}
                  alt="Attached for image search"
                  className="border-foreground/10 h-24 w-24 rounded-2xl border object-cover"
                />
              ))}
            </div>
          )}

          {message.content && (
            <div
              className={cn(
                "text-sm",
                isUser
                  ? "bg-foreground/10 text-foreground w-fit max-w-[85%] rounded-2xl px-4 py-2.5 shadow-xs"
                  : "text-foreground/95 w-full border-none bg-transparent px-0 py-1 shadow-none"
              )}
            >
              <MessageMarkdown content={message.content} />
            </div>
          )}

          {message.actions && message.actions.length > 0 && (
            <div className="mt-2 max-w-[85%]">
              <MessageActions actions={message.actions} />
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
}
