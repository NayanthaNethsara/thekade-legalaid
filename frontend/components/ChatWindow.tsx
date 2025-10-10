import { useState, useRef, useEffect } from "react";
import { Send, Paperclip, Mic, User, Bot, Copy, ThumbsUp, ThumbsDown } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { GlassCard } from "./GlassCard";
import { motion, AnimatePresence } from "framer-motion";
interface Message {
  id: string;
  content: string;
  sender: "user" | "ai";
  timestamp: Date;
}

const initialMessages: Message[] = [
  {
    id: "1",
    content: "Hey there! I'm Kakille AI, your legal assistant. Whether you need help with contracts, research, case analysis, or just want to brainstorm—I'm here for you. What would you like to work on?",
    sender: "ai",
    timestamp: new Date(Date.now() - 300000),
  },
];

export function ChatWindow() {
  const [messages] = useState<Message[]>(initialMessages);
  const [isTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="flex flex-col h-full">
      {/* Chat Header */}
      <GlassCard className="mb-4 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-gray-700 to-gray-900 rounded-full flex items-center justify-center">
            <Bot className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">Kakille AI</h3>
            <p className="text-sm text-gray-600">Online • Ready to help</p>
          </div>
        </div>
      </GlassCard>

      {/* Messages Container - Scrollable */}
      <GlassCard className="flex-1 flex flex-col min-h-0 p-0 overflow-hidden">
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <AnimatePresence>
            {messages.map((message, index) => (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
                className={`flex gap-3 ${
                  message.sender === "user" ? "justify-end" : "justify-start"
                }`}
              >
              {message.sender === "ai" && (
                <div className="w-8 h-8 bg-gradient-to-br from-gray-700 to-gray-900 rounded-full flex items-center justify-center flex-shrink-0">
                  <Bot className="w-4 h-4 text-white" />
                </div>
              )}
              
              <div
                className={`max-w-[80%] sm:max-w-[70%] ${
                  message.sender === "user"
                    ? "bg-gradient-to-r from-gray-800 to-gray-700 text-white"
                    : "bg-white/60 text-gray-900"
                } rounded-2xl px-4 py-3 shadow-lg backdrop-blur-sm border border-white/20`}
              >
                <p className="text-sm leading-relaxed">{message.content}</p>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-xs opacity-70">
                    {formatTime(message.timestamp)}
                  </span>
                  {message.sender === "ai" && (
                    <div className="flex gap-1 ml-3">
                      <Button variant="ghost" size="sm" className="w-6 h-6 p-0 hover:bg-gray-100/60">
                        <Copy className="w-3 h-3" />
                      </Button>
                      <Button variant="ghost" size="sm" className="w-6 h-6 p-0 hover:bg-gray-100/60">
                        <ThumbsUp className="w-3 h-3" />
                      </Button>
                      <Button variant="ghost" size="sm" className="w-6 h-6 p-0 hover:bg-gray-100/60">
                        <ThumbsDown className="w-3 h-3" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>

              {message.sender === "user" && (
                <div className="w-8 h-8 bg-gradient-to-br from-amber-500 to-amber-700 rounded-full flex items-center justify-center flex-shrink-0">
                  <User className="w-4 h-4 text-white" />
                </div>
              )}
            </motion.div>
          ))}
          </AnimatePresence>
          
          {isTyping && (
            <motion.div 
              className="flex gap-3 justify-start"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
            >
              <div className="w-8 h-8 bg-gradient-to-br from-gray-700 to-gray-900 rounded-full flex items-center justify-center flex-shrink-0">
                <Bot className="w-4 h-4 text-white" />
              </div>
              <div className="bg-white/60 rounded-2xl px-4 py-3 shadow-lg backdrop-blur-sm border border-white/20">
                <div className="flex gap-1">
                  <motion.div 
                    className="w-2 h-2 bg-gray-400 rounded-full"
                    animate={{ y: [0, -4, 0] }}
                    transition={{ duration: 0.6, repeat: Infinity, repeatDelay: 0.1 }}
                  />
                  <motion.div 
                    className="w-2 h-2 bg-gray-400 rounded-full"
                    animate={{ y: [0, -4, 0] }}
                    transition={{ duration: 0.6, repeat: Infinity, repeatDelay: 0.2 }}
                  />
                  <motion.div 
                    className="w-2 h-2 bg-gray-400 rounded-full"
                    animate={{ y: [0, -4, 0] }}
                    transition={{ duration: 0.6, repeat: Infinity, repeatDelay: 0.3 }}
                  />
                </div>
              </div>
            </motion.div>
          )}
          
          <div ref={messagesEndRef} />
        </div>
      </GlassCard>
    </div>
  );
}