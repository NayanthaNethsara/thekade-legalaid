"use client";

import { motion } from "framer-motion";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { AlertCircle, Scale, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { LawyerSuggestions } from "./lawyer-suggestions";
import type { Lawyer } from "@/hooks/use-chat";

interface ChatMessageProps {
  message: string;
  isUser: boolean;
  timestamp: string;
  isTyping?: boolean;
  error?: boolean;
  lawyers?: Lawyer[];
}

export function ChatMessage({
  message,
  isUser,
  timestamp,
  isTyping = false,
  error = false,
  lawyers,
}: ChatMessageProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ 
        duration: 0.4, 
        ease: [0.16, 1, 0.3, 1], // Custom easing for smooth entrance
        type: "spring",
        stiffness: 350,
        damping: 40
      }}
      className={cn(
        "group w-full py-8 px-6 transition-all duration-300 ease-out hover:bg-gradient-to-r",
        isUser 
          ? "hover:from-slate-50/30 hover:to-transparent" 
          : "bg-gradient-to-br from-slate-50/40 via-slate-50/20 to-transparent hover:from-slate-50/60 hover:via-slate-50/30"
      )}
    >
      <div className="max-w-4xl mx-auto flex gap-5">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1, duration: 0.3 }}
        >
          <Avatar className={cn(
            "w-10 h-10 shrink-0 shadow-sm ring-2 transition-all duration-300",
            isUser 
              ? "ring-slate-200 group-hover:ring-slate-300 group-hover:shadow-md" 
              : error
              ? "ring-red-200 group-hover:ring-red-300" 
              : "ring-blue-200 group-hover:ring-blue-300 group-hover:shadow-md"
          )}>
            <AvatarFallback
              className={cn(
                "text-sm font-semibold transition-colors duration-300",
                isUser
                  ? "bg-gradient-to-br from-slate-700 to-slate-900 text-white"
                  : error
                  ? "bg-gradient-to-br from-red-500 to-red-600 text-white"
                  : "bg-gradient-to-br from-blue-600 to-blue-700 text-white"
              )}
            >
              {isUser ? (
                <User className="w-5 h-5" />
              ) : error ? (
                <AlertCircle className="w-5 h-5" />
              ) : (
                <Scale className="w-5 h-5" />
              )}
            </AvatarFallback>
          </Avatar>
        </motion.div>

        <div className="flex-1 space-y-4 min-w-0"> {/* Added min-w-0 for proper text wrapping */}
          <div className={cn(
            "prose prose-slate max-w-none transition-all duration-300",
            isUser && "prose-slate prose-strong:text-slate-800"
          )}>
            {isTyping ? (
              <div className="flex items-center gap-2 py-2">
                <div className="flex items-center gap-1">
                  <motion.div
                    animate={{ 
                      scale: [1, 1.2, 1],
                      opacity: [0.4, 1, 0.4] 
                    }}
                    transition={{
                      duration: 1.2,
                      repeat: Number.POSITIVE_INFINITY,
                      delay: 0,
                      ease: "easeInOut"
                    }}
                    className="w-2.5 h-2.5 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full"
                  />
                  <motion.div
                    animate={{ 
                      scale: [1, 1.2, 1],
                      opacity: [0.4, 1, 0.4] 
                    }}
                    transition={{
                      duration: 1.2,
                      repeat: Number.POSITIVE_INFINITY,
                      delay: 0.2,
                      ease: "easeInOut"
                    }}
                    className="w-2.5 h-2.5 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full"
                  />
                  <motion.div
                    animate={{ 
                      scale: [1, 1.2, 1],
                      opacity: [0.4, 1, 0.4] 
                    }}
                    transition={{
                      duration: 1.2,
                      repeat: Number.POSITIVE_INFINITY,
                      delay: 0.4,
                      ease: "easeInOut"
                    }}
                    className="w-2.5 h-2.5 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full"
                  />
                </div>
                <span className="text-sm text-slate-500 ml-2 animate-pulse">
                  AI is thinking...
                </span>
              </div>
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2, duration: 0.4 }}
                className={cn(
                  "text-[15px] leading-relaxed font-normal tracking-wide",
                  isUser 
                    ? "text-slate-800 font-medium" 
                    : error 
                    ? "text-red-600" 
                    : "text-slate-700",
                  "whitespace-pre-wrap break-words" // Better text wrapping
                )}
              >
                {message}
              </motion.div>
            )}
          </div>

          {!isUser && lawyers && lawyers.length > 0 && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.4 }}
              className="mt-6"
            >
              <LawyerSuggestions lawyers={lawyers} />
            </motion.div>
          )}

          {timestamp && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 0 }}
              whileHover={{ opacity: 1 }}
              transition={{ duration: 0.2 }}
              className="text-xs text-slate-400 font-medium pt-2"
            >
              {timestamp}
            </motion.div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
