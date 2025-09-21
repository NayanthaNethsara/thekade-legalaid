"use client";

import { useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChatMessage } from "./chat-message";
import { ChatInput } from "./chat-input";
import { ChatHeader } from "./chat-header";
import { useChat } from "@/hooks/use-chat";

export function Chatbot() {
  const { messages, isLoading, sendMessage, clearChat, startNewChat } =
    useChat();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  return (
    <div className="flex flex-col h-screen max-w-4xl mx-auto bg-background">
      <ChatHeader onClearChat={clearChat} onNewChat={startNewChat} />

      <div className="flex-1 overflow-hidden flex flex-col">
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-3xl mx-auto px-4 py-6">
            <AnimatePresence mode="popLayout">
              {messages.map((message, index) => (
                <motion.div
                  key={message.id}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{
                    duration: 0.3,
                    delay: index * 0.05,
                    ease: "easeOut",
                  }}
                >
                  <ChatMessage
                    message={message.content}
                    isUser={message.isUser}
                    timestamp={message.timestamp}
                    error={message.error}
                    lawyers={message.lawyers}
                  />
                </motion.div>
              ))}
            </AnimatePresence>

            <AnimatePresence>
              {isLoading && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <ChatMessage
                    message=""
                    isUser={false}
                    timestamp=""
                    isTyping={true}
                  />
                </motion.div>
              )}
            </AnimatePresence>

            <div ref={messagesEndRef} />
          </div>
        </div>

        <div className="border-t border-border bg-background">
          <div className="max-w-3xl mx-auto px-4 py-4">
            <ChatInput
              onSendMessage={sendMessage}
              disabled={isLoading}
              placeholder="Ask your legal question..."
            />
          </div>
        </div>
      </div>
    </div>
  );
}
