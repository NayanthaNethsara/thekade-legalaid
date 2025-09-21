"use client"

import { motion } from "framer-motion"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { RotateCcw, Plus } from "lucide-react"

interface ChatHeaderProps {
  title?: string
  subtitle?: string
  isOnline?: boolean
  onClearChat?: () => void
  onNewChat?: () => void // Added onNewChat prop
}

export function ChatHeader({
  title = "AI Assistant",
  subtitle = "Always here to help",
  isOnline = true,
  onClearChat,
  onNewChat, // Added onNewChat parameter
}: ChatHeaderProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="flex items-center gap-3 p-4 bg-background/80 backdrop-blur-sm border-b"
    >
      <Avatar className="w-10 h-10">
        <AvatarFallback className="bg-primary text-primary-foreground">AI</AvatarFallback>
      </Avatar>

      <div className="flex-1">
        <div className="flex items-center gap-2">
          <h2 className="font-semibold text-foreground">{title}</h2>
          {isOnline && (
            <Badge variant="secondary" className="text-xs px-2 py-0.5">
              <div className="w-2 h-2 bg-green-500 rounded-full mr-1" />
              Online
            </Badge>
          )}
        </div>
        <p className="text-sm text-muted-foreground">{subtitle}</p>
      </div>

      <div className="flex items-center gap-1">
        {onNewChat && (
          <Button variant="ghost" size="icon" onClick={onNewChat} className="h-8 w-8" title="Start new chat">
            <Plus className="w-4 h-4" />
          </Button>
        )}
        {onClearChat && (
          <Button variant="ghost" size="icon" onClick={onClearChat} className="h-8 w-8" title="Clear chat history">
            <RotateCcw className="w-4 h-4" />
          </Button>
        )}
      </div>
    </motion.div>
  )
}
