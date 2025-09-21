"use client";

import { motion } from "framer-motion";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { AlertCircle, Scale } from "lucide-react";
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
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className={cn(
        "group w-full py-6 px-4 transition-colors",
        !isUser && "bg-muted/30"
      )}
    >
      <div className="max-w-3xl mx-auto flex gap-4">
        <Avatar className="w-8 h-8 shrink-0">
          <AvatarFallback
            className={cn(
              "text-sm font-medium",
              isUser
                ? "bg-primary text-primary-foreground"
                : error
                ? "bg-destructive text-destructive-foreground"
                : "bg-muted text-muted-foreground"
            )}
          >
            {isUser ? (
              "U"
            ) : error ? (
              <AlertCircle className="w-4 h-4" />
            ) : (
              <Scale className="w-4 h-4" />
            )}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 space-y-3">
          <div className="prose prose-slate max-w-none">
            {isTyping ? (
              <div className="flex items-center gap-1">
                <motion.div
                  animate={{ opacity: [0.4, 1, 0.4] }}
                  transition={{
                    duration: 1.5,
                    repeat: Number.POSITIVE_INFINITY,
                    delay: 0,
                  }}
                  className="w-2 h-2 bg-muted-foreground rounded-full"
                />
                <motion.div
                  animate={{ opacity: [0.4, 1, 0.4] }}
                  transition={{
                    duration: 1.5,
                    repeat: Number.POSITIVE_INFINITY,
                    delay: 0.2,
                  }}
                  className="w-2 h-2 bg-muted-foreground rounded-full"
                />
                <motion.div
                  animate={{ opacity: [0.4, 1, 0.4] }}
                  transition={{
                    duration: 1.5,
                    repeat: Number.POSITIVE_INFINITY,
                    delay: 0.4,
                  }}
                  className="w-2 h-2 bg-muted-foreground rounded-full"
                />
              </div>
            ) : (
              <div
                className={cn(
                  "text-sm leading-relaxed",
                  error && "text-destructive"
                )}
              >
                {message}
              </div>
            )}
          </div>

          {!isUser && lawyers && lawyers.length > 0 && (
            <div className="mt-4">
              <LawyerSuggestions lawyers={lawyers} />
            </div>
          )}

          {timestamp && (
            <div className="text-xs text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
              {timestamp}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
