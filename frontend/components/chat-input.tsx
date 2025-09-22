"use client";

import type React from "react";
import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Mic, Paperclip, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

export function ChatInput({
  onSendMessage,
  disabled = false,
  placeholder = "Ask your legal question...",
}: ChatInputProps) {
  const [message, setMessage] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = Math.min(textarea.scrollHeight, 120) + "px";
    }
  }, [message]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim() && !disabled) {
      onSendMessage(message.trim());
      setMessage("");
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const suggestedQuestions = [
    "What are my rights during arrest?",
    "How to file a complaint?",
    "Legal advice for contracts",
    "Employment law questions"
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="space-y-4"
    >
      {/* Suggested questions when input is empty and not focused */}
      <AnimatePresence>
        {!message && !isFocused && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="flex flex-wrap gap-2 mb-3">
              {suggestedQuestions.map((question, index) => (
                <motion.button
                  key={question}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.1, duration: 0.3 }}
                  onClick={() => setMessage(question)}
                  className="px-3 py-2 text-sm text-slate-600 bg-white border border-slate-200 rounded-lg hover:border-slate-300 hover:text-slate-900 hover:shadow-sm transition-all duration-200 hover:scale-105"
                >
                  {question}
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main input container */}
      <div className="relative">
        <motion.div
          animate={{
            scale: isFocused ? 1.01 : 1,
            boxShadow: isFocused 
              ? "0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)"
              : "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)"
          }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className={cn(
            "relative rounded-2xl border-2 transition-all duration-300 overflow-hidden",
            isFocused || message
              ? "border-slate-300 bg-white"
              : "border-slate-200 bg-slate-50/50",
            disabled && "opacity-60"
          )}
        >
          <form onSubmit={handleSubmit} className="relative">
            {/* Textarea */}
            <Textarea
              ref={textareaRef}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyPress}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              placeholder={placeholder}
              disabled={disabled}
              className={cn(
                "min-h-[56px] max-h-[120px] resize-none border-0 bg-transparent px-6 py-4 pr-32 text-[15px] placeholder:text-slate-400 focus:outline-none focus:ring-0 leading-relaxed",
                "scrollbar-thin scrollbar-track-transparent scrollbar-thumb-slate-200"
              )}
              rows={1}
              style={{ height: "auto" }}
            />

            {/* Action buttons container */}
            <div className="absolute right-3 bottom-3 flex items-center gap-2">
              {/* Attachment button */}
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="h-8 w-8 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all duration-200"
                disabled={disabled}
              >
                <Paperclip className="w-4 h-4" />
              </Button>

              {/* Voice input button */}
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="h-8 w-8 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all duration-200"
                disabled={disabled}
              >
                <Mic className="w-4 h-4" />
              </Button>

              {/* Send button */}
              <motion.div
                animate={{
                  scale: message.trim() ? 1 : 0.9,
                  opacity: message.trim() ? 1 : 0.5
                }}
                transition={{ duration: 0.2 }}
              >
                <Button
                  type="submit"
                  size="icon"
                  disabled={!message.trim() || disabled}
                  className={cn(
                    "h-9 w-9 rounded-xl transition-all duration-200 shadow-sm",
                    message.trim() && !disabled
                      ? "bg-gradient-to-r from-slate-700 to-slate-800 hover:from-slate-800 hover:to-slate-900 text-white shadow-md hover:shadow-lg"
                      : "bg-slate-200 text-slate-400 cursor-not-allowed"
                  )}
                >
                  {disabled ? (
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    >
                      <Sparkles className="w-4 h-4" />
                    </motion.div>
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </Button>
              </motion.div>
            </div>
          </form>

          {/* Character count indicator */}
          <AnimatePresence>
            {message.length > 200 && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="absolute bottom-1 left-4 text-xs text-slate-400"
              >
                {message.length}/1000
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Focus ring */}
        <AnimatePresence>
          {isFocused && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="absolute inset-0 rounded-2xl bg-gradient-to-r from-blue-500/20 to-purple-500/20 -z-10 blur-xl"
            />
          )}
        </AnimatePresence>
      </div>

      {/* Typing indicator */}
      <AnimatePresence>
        {disabled && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex items-center gap-2 text-sm text-slate-500 px-2"
          >
            <motion.div
              animate={{ opacity: [0.4, 1, 0.4] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="w-2 h-2 bg-blue-500 rounded-full"
            />
            <span>AI is processing your request...</span>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
