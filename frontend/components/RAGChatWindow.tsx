import { useState, useRef, useEffect } from "react";
import { Send, Bot, User, Copy, ExternalLink, FileText, AlertCircle } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { GlassCard } from "./GlassCard";
import { motion, AnimatePresence } from "framer-motion";
import { useRAG, type RAGResponse, type ChatMessage } from "@/hooks/use-rag";
import { Alert, AlertDescription } from "./ui/alert";

interface Message extends ChatMessage {
  id: string;
  timestamp: Date;
  citations?: RAGResponse["citations"];
  metadata?: RAGResponse["metadata"];
}

const initialMessage: Message = {
  id: "1",
  role: "assistant",
  content: "Hello! I'm your Sri Lankan legal assistant. I can help answer questions about criminal procedure, motor traffic laws, and other legal matters based on official legal documents. What would you like to know?",
  timestamp: new Date(),
};

export function RAGChatWindow() {
  const [messages, setMessages] = useState<Message[]>([initialMessage]);
  const [inputValue, setInputValue] = useState("");
  const { query, loading, error } = useRAG();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!inputValue.trim() || loading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: inputValue.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");

    // Build chat history for context
    const chatHistory: ChatMessage[] = messages.map((msg) => ({
      role: msg.role,
      content: msg.content,
    }));

    // Query RAG system
    const result = await query(userMessage.content, {
      top_k: 5,
      chat_history: chatHistory,
    });

    if (result) {
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: result.answer,
        timestamp: new Date(),
        citations: result.citations,
        metadata: result.metadata,
      };

      setMessages((prev) => [...prev, aiMessage]);
    } else {
      // Error message
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "I apologize, but I encountered an error processing your question. Please try again or rephrase your question.",
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, errorMessage]);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Chat Header */}
      <GlassCard className="mb-4 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-800 rounded-full flex items-center justify-center">
            <Bot className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">Legal RAG Assistant</h3>
            <p className="text-sm text-gray-600">
              {loading ? "Thinking..." : "Ready to help with Sri Lankan law"}
            </p>
          </div>
        </div>
      </GlassCard>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Messages Container */}
      <GlassCard className="flex-1 flex flex-col min-h-0 p-0 overflow-hidden">
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <AnimatePresence>
            {messages.map((message) => (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
                className={`flex gap-3 ${
                  message.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                {message.role === "assistant" && (
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-blue-800 rounded-full flex items-center justify-center flex-shrink-0">
                    <Bot className="w-4 h-4 text-white" />
                  </div>
                )}

                <div className="max-w-[85%] space-y-2">
                  <div
                    className={`${
                      message.role === "user"
                        ? "bg-gradient-to-r from-blue-600 to-blue-700 text-white"
                        : "bg-white/80 text-gray-900"
                    } rounded-2xl px-4 py-3 shadow-lg backdrop-blur-sm border border-white/20`}
                  >
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">
                      {message.content}
                    </p>

                    <div className="flex items-center justify-between mt-2">
                      <span className="text-xs opacity-70">
                        {formatTime(message.timestamp)}
                      </span>
                      {message.role === "assistant" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-6 h-6 p-0"
                          onClick={() => copyToClipboard(message.content)}
                        >
                          <Copy className="w-3 h-3" />
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Citations */}
                  {message.citations && message.citations.length > 0 && (
                    <div className="bg-white/60 backdrop-blur-sm border border-white/20 rounded-xl p-3 space-y-2">
                      <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                        <FileText className="w-4 h-4" />
                        <span>Sources ({message.citations.length})</span>
                      </div>
                      <div className="space-y-1.5">
                        {message.citations.map((citation, idx) => (
                          <div
                            key={`${citation.document_id}-${citation.chunk_id}`}
                            className="text-xs bg-white/40 rounded-lg p-2 space-y-1"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <span className="font-medium text-gray-900">
                                [{idx + 1}] {citation.filename}
                              </span>
                              <span className="text-gray-500 text-[10px] whitespace-nowrap">
                                {(citation.distance * 100).toFixed(1)}% match
                              </span>
                            </div>
                            <p className="text-gray-600 line-clamp-2">
                              {citation.excerpt}
                            </p>
                          </div>
                        ))}
                      </div>
                      {message.metadata && (
                        <div className="text-xs text-gray-500 pt-1 border-t border-gray-200">
                          Retrieved {message.metadata.chunks_retrieved} chunks from{" "}
                          {message.metadata.documents_referenced || 1} document(s)
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {message.role === "user" && (
                  <div className="w-8 h-8 bg-gradient-to-br from-gray-700 to-gray-900 rounded-full flex items-center justify-center flex-shrink-0">
                    <User className="w-4 h-4 text-white" />
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Loading indicator */}
          {loading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex gap-3"
            >
              <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-blue-800 rounded-full flex items-center justify-center flex-shrink-0">
                <Bot className="w-4 h-4 text-white" />
              </div>
              <div className="bg-white/80 backdrop-blur-sm border border-white/20 rounded-2xl px-4 py-3">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-100" />
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-200" />
                </div>
              </div>
            </motion.div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="flex-shrink-0 border-t border-white/20 bg-white/40 backdrop-blur-sm p-4">
          <div className="flex gap-2">
            <Input
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask a legal question..."
              className="flex-1 bg-white/60 border-white/30 focus:border-blue-500"
              disabled={loading}
            />
            <Button
              onClick={handleSend}
              disabled={!inputValue.trim() || loading}
              className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Answers are based on Sri Lankan legal documents. Always verify with a legal professional.
          </p>
        </div>
      </GlassCard>
    </div>
  );
}
