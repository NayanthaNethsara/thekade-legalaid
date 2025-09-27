"use client";


import { useRef, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChatMessage } from "./chat-message";
import { ChatInput } from "./chat-input";
import { ChatHeader } from "./chat-header";
import { useChat } from "@/hooks/use-chat";
import { useChatHistory } from "@/hooks/use-chat-history";
import { Card } from "@/components/ui/card";

export function Chatbot() {
  const { messages, isLoading, sendMessage, resetChat, createNewSession, clearAllHistory, clearCurrentSessionMessages } = useChat();
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleNewChat = () => {
    createNewSession();
    resetChat();
  };

  const handleClearChat = () => {
    clearCurrentSessionMessages();
  };



  return (
    <div className="flex h-screen bg-gradient-to-br from-slate-50/50 via-white to-slate-50/30 justify-center pt-2">
    <Card className="w-full max-w-4xl h-[90vh] flex flex-col border-2 border-blue-200/60 bg-white/80 backdrop-blur-md rounded-3xl shadow-2xl hover:shadow-blue-200/60 transition-shadow duration-300 ">
        <motion.div 
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="flex flex-col flex-1 relative min-w-0 h-full"
        >
          {/* Header always visible */}
          <div className="rounded-t-3xl overflow-hidden">
            <ChatHeader 
              onClearChat={handleClearChat} 
              onNewChat={handleNewChat}
              onToggleSidebar={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              isSidebarCollapsed={isSidebarCollapsed}
            />
          </div>
          {/* Main chat area, flex column, input always visible */}
          <div className="flex-1 flex flex-col relative min-h-0">
            {/* Background decoration */}
            <div className="absolute inset-0 bg-gradient-to-br from-blue-50/20 via-transparent to-purple-50/20 pointer-events-none" />
            {/* Messages container, scrollable */}
            <div className="flex-1 overflow-y-auto relative">
              <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Welcome message when no messages */}
                <AnimatePresence>
                  {messages.length === 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{ duration: 0.6, ease: "easeOut" }}
                      className="text-center py-16 space-y-6"
                    >
                      <div className="mx-auto w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
                        <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                        </svg>
                      </div>
                      <div className="space-y-3">
                        <h2 className="text-2xl font-bold text-slate-900">Legal AI Assistant</h2>
                        <p className="text-slate-600 max-w-md mx-auto leading-relaxed">
                          Ask me any legal question and I&apos;ll provide expert guidance along with recommendations for qualified lawyers.
                        </p>
                      </div>
                      <div className="flex flex-wrap justify-center gap-2 max-w-lg mx-auto">
                        {[
                          "What are my rights?",
                          "Contract help",
                          "Employment law",
                          "Criminal defense"
                        ].map((suggestion, index) => (
                          <motion.button
                            key={suggestion}
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.3 + index * 0.1, duration: 0.3 }}
                            onClick={() => sendMessage(suggestion)}
                            className="px-4 py-2 text-sm text-slate-600 bg-white/80 border border-slate-200 rounded-lg hover:border-slate-300 hover:text-slate-900 hover:shadow-sm transition-all duration-200 hover:scale-105"
                          >
                            {suggestion}
                          </motion.button>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
                {/* Messages */}
                <AnimatePresence mode="popLayout">
                  {messages.map((message, index) => (
                    <motion.div
                      key={message.id}
                      layout
                      initial={{ opacity: 0, y: 30, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95, y: -30 }}
                      transition={{
                        duration: 0.5,
                        delay: index * 0.08,
                        ease: [0.16, 1, 0.3, 1],
                        layout: { duration: 0.3 }
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
                {/* Loading message with enhanced animation */}
                <AnimatePresence>
                  {isLoading && (
                    <motion.div
                      initial={{ opacity: 0, y: 30, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -30, scale: 0.95 }}
                      transition={{ 
                        duration: 0.4,
                        ease: [0.16, 1, 0.3, 1]
                      }}
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
            {/* Input area with enhanced styling, never shrinks */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.4 }}
              className="border-t border-slate-200/80 bg-gradient-to-r from-white/80 via-white/90 to-white/80 backdrop-blur-sm flex-shrink-0"
            >
              <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                <ChatInput
                  onSendMessage={sendMessage}
                  disabled={isLoading}
                  placeholder="Ask your legal question..."
                />
              </div>
            </motion.div>
          </div>
        </motion.div>
      </Card>
    </div>
  );
}
