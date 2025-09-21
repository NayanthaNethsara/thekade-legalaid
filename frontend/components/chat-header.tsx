"use client";

import { motion } from "framer-motion";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { RotateCcw, Plus, Scale } from "lucide-react";

interface ChatHeaderProps {
  title?: string;
  subtitle?: string;
  isOnline?: boolean;
  onClearChat?: () => void;
  onNewChat?: () => void;
}

export function ChatHeader({
  title = "Legal AI Assistant",
  subtitle = "Professional legal guidance and support",
  isOnline = true,
  onClearChat,
  onNewChat,
}: ChatHeaderProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="sticky top-0 z-10 flex items-center justify-between px-4 py-3 bg-background border-b border-border"
    >
      <div className="flex items-center gap-3">
        <Avatar className="w-8 h-8">
          <AvatarFallback className="bg-slate-100 text-slate-700 border border-slate-200">
            <Scale className="w-4 h-4" />
          </AvatarFallback>
        </Avatar>
        <div>
          <h1 className="text-lg font-semibold text-foreground">{title}</h1>
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        </div>
      </div>

      <div className="flex items-center gap-1">
        {onNewChat && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onNewChat}
            className="h-8 px-3 text-muted-foreground hover:text-foreground"
          >
            <Plus className="w-4 h-4 mr-1" />
            New chat
          </Button>
        )}
        {onClearChat && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearChat}
            className="h-8 px-3 text-muted-foreground hover:text-foreground"
          >
            <RotateCcw className="w-4 h-4 mr-1" />
            Clear
          </Button>
        )}
      </div>
    </motion.div>
  );
}
