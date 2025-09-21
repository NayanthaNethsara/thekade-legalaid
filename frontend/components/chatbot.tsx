"use client"

import { useRef, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { ChatMessage } from "./chat-message"
import { ChatInput } from "./chat-input"
import { ChatHeader } from "./chat-header"
import { ChatContainer } from "./chat-container"
import { Card } from "@/components/ui/card"
import { useChat } from "@/hooks/use-chat"

export function Chatbot() {
  const { messages, isLoading, sendMessage, clearChat, startNewChat } = useChat() // Added startNewChat from hook
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  return (
    <ChatContainer>
      <motion.div layout className="h-[600px] flex flex-col overflow-hidden">
        <Card className="flex-1 flex flex-col shadow-xl border-0 bg-background/95 backdrop-blur-sm">
          <ChatHeader onClearChat={clearChat} onNewChat={startNewChat} />

          <motion.div
            className="flex-1 overflow-y-auto p-4 space-y-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.4 }}
          >
            <AnimatePresence mode="popLayout">
              {messages.map((message, index) => (
                <motion.div
                  key={message.id}
                  layout
                  initial={{ opacity: 0, y: 20, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
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
                    lawyers={message.lawyers} // Pass lawyers data to message component
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
                  <ChatMessage message="" isUser={false} timestamp="" isTyping={true} />
                </motion.div>
              )}
            </AnimatePresence>

            <div ref={messagesEndRef} />
          </motion.div>

          <ChatInput onSendMessage={sendMessage} disabled={isLoading} placeholder="Type your message..." />
        </Card>
      </motion.div>
    </ChatContainer>
  )
}
