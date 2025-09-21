"use client"

import { motion } from "framer-motion"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { AlertCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import { LawyerSuggestions } from "./lawyer-suggestions"
import type { Lawyer } from "@/hooks/use-chat"

interface ChatMessageProps {
  message: string
  isUser: boolean
  timestamp: string
  isTyping?: boolean
  error?: boolean
  lawyers?: Lawyer[] // Added lawyers prop
}

export function ChatMessage({
  message,
  isUser,
  timestamp,
  isTyping = false,
  error = false,
  lawyers, // Added lawyers parameter
}: ChatMessageProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className={cn("flex gap-3 mb-4", isUser ? "justify-end" : "justify-start")}
    >
      {!isUser && (
        <Avatar className="w-8 h-8 mt-1">
          <AvatarFallback
            className={cn(
              "text-sm",
              error ? "bg-destructive text-destructive-foreground" : "bg-primary text-primary-foreground",
            )}
          >
            {error ? <AlertCircle className="w-4 h-4" /> : "AI"}
          </AvatarFallback>
        </Avatar>
      )}

      <div className={cn("max-w-[80%] space-y-1", isUser ? "items-end" : "items-start")}>
        <motion.div
          initial={{ scale: 0.95 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.2 }}
          className={cn(
            "px-4 py-3 rounded-2xl text-sm leading-relaxed",
            isUser
              ? "bg-chat-user text-white rounded-br-md"
              : error
                ? "bg-destructive/10 border border-destructive/20 rounded-bl-md text-destructive"
                : "bg-chat-bot border rounded-bl-md",
          )}
        >
          {isTyping ? (
            <div className="flex items-center gap-1">
              <motion.div
                animate={{ opacity: [0.4, 1, 0.4] }}
                transition={{ duration: 1.5, repeat: Number.POSITIVE_INFINITY, delay: 0 }}
                className="w-2 h-2 bg-muted-foreground rounded-full"
              />
              <motion.div
                animate={{ opacity: [0.4, 1, 0.4] }}
                transition={{ duration: 1.5, repeat: Number.POSITIVE_INFINITY, delay: 0.2 }}
                className="w-2 h-2 bg-muted-foreground rounded-full"
              />
              <motion.div
                animate={{ opacity: [0.4, 1, 0.4] }}
                transition={{ duration: 1.5, repeat: Number.POSITIVE_INFINITY, delay: 0.4 }}
                className="w-2 h-2 bg-muted-foreground rounded-full"
              />
            </div>
          ) : (
            <span className="text-pretty">{message}</span>
          )}
        </motion.div>

        {!isUser && lawyers && lawyers.length > 0 && (
          <div className="w-full">
            <LawyerSuggestions lawyers={lawyers} />
          </div>
        )}

        <div className={cn("text-xs text-muted-foreground px-1", isUser ? "text-right" : "text-left")}>{timestamp}</div>
      </div>

      {isUser && (
        <Avatar className="w-8 h-8 mt-1">
          <AvatarFallback className="bg-secondary text-secondary-foreground text-sm">You</AvatarFallback>
        </Avatar>
      )}
    </motion.div>
  )
}
