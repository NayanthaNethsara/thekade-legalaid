"use client";

import { motion } from "framer-motion";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { RotateCcw, Plus, Scale, Sparkles, Shield, Menu } from "lucide-react";

interface ChatHeaderProps {
  title?: string;
  subtitle?: string;
  isOnline?: boolean;
  onClearChat?: () => void;
  onNewChat?: () => void;
  onToggleSidebar?: () => void;
  isSidebarCollapsed?: boolean;
}

export function ChatHeader({
  title = "Legal AI Assistant",
  subtitle = "Professional legal guidance and support",
  isOnline = true,
  onClearChat,
  onNewChat,
  onToggleSidebar,
  isSidebarCollapsed = false,
}: ChatHeaderProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="sticky top-0 z-20 backdrop-blur-md bg-white/90 border-b border-slate-200/80 shadow-sm"
    >
      <div className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-4">
          {/* Enhanced avatar */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1, duration: 0.3 }}
          >
            <Avatar className="w-11 h-11 shadow-lg ring-2 ring-slate-200/80">
              <AvatarFallback className="bg-gradient-to-br from-blue-600 to-blue-700 text-white">
                <Scale className="w-5 h-5" />
              </AvatarFallback>
            </Avatar>
          </motion.div>

          {/* Title and subtitle */}
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2, duration: 0.4 }}
          >
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                {title}
              </h1>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <span className="text-xs font-medium text-green-600">Online</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <p className="text-sm text-slate-600 font-medium">{subtitle}</p>
              <div className="flex items-center gap-1">
                <Shield className="w-3.5 h-3.5 text-blue-500" />
                <span className="text-xs text-blue-600 font-medium">Secure</span>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Action buttons */}
        <motion.div 
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3, duration: 0.4 }}
          className="flex items-center gap-2"
        >
          {onToggleSidebar && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onToggleSidebar}
              className="lg:hidden h-9 px-4 text-slate-600 hover:text-slate-900 hover:bg-slate-100/80 transition-all duration-200 rounded-lg"
            >
              <Menu className="w-4 h-4 mr-2" />
              {isSidebarCollapsed ? "Show" : "Hide"} History
            </Button>
          )}
          {onNewChat && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onNewChat}
              className="h-9 px-4 text-slate-600 hover:text-slate-900 hover:bg-slate-100/80 transition-all duration-200 rounded-lg"
            >
              <Plus className="w-4 h-4 mr-2" />
              New Chat
            </Button>
          )}
          {onClearChat && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClearChat}
              className="h-9 px-4 text-slate-600 hover:text-slate-900 hover:bg-slate-100/80 transition-all duration-200 rounded-lg"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Clear
            </Button>
          )}
        </motion.div>
      </div>

      {/* Subtle gradient border */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent" />
    </motion.div>
  );
}
