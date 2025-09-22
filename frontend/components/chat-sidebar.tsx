"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { 
  Plus, 
  MessageSquare, 
  MoreHorizontal, 
  Trash2, 
  Edit3, 
  X,
  Menu,
  History,
  Clock
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import type { ChatSession } from "@/hooks/use-chat-history";

interface ChatSidebarProps {
  sessions: ChatSession[];
  currentSessionId: string | null;
  onSessionSelect: (sessionId: string) => void;
  onNewChat: () => void;
  onDeleteSession: (sessionId: string) => void;
  onRenameSession: (sessionId: string, newTitle: string) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

export function ChatSidebar({
  sessions,
  currentSessionId,
  onSessionSelect,
  onNewChat,
  onDeleteSession,
  onRenameSession,
  isCollapsed,
  onToggleCollapse,
}: ChatSidebarProps) {
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [hoveredSessionId, setHoveredSessionId] = useState<string | null>(null);

  const handleStartEdit = (session: ChatSession) => {
    setEditingSessionId(session.id);
    setEditingTitle(session.title);
  };

  const handleSaveEdit = () => {
    if (editingSessionId && editingTitle.trim()) {
      onRenameSession(editingSessionId, editingTitle.trim());
    }
    setEditingSessionId(null);
    setEditingTitle("");
  };

  const handleCancelEdit = () => {
    setEditingSessionId(null);
    setEditingTitle("");
  };

  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
    const diffInDays = Math.floor(diffInHours / 24);

    if (diffInDays === 0) {
      if (diffInHours === 0) return "Just now";
      return `${diffInHours}h ago`;
    } else if (diffInDays === 1) {
      return "Yesterday";
    } else if (diffInDays < 7) {
      return `${diffInDays}d ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  const sortedSessions = [...sessions].sort((a, b) => 
    new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );

  return (
    <>
      {/* Mobile overlay */}
      <AnimatePresence>
        {!isCollapsed && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 lg:hidden"
            onClick={onToggleCollapse}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.div
        initial={false}
        animate={{
          width: isCollapsed ? 0 : 320,
          opacity: isCollapsed ? 0 : 1,
        }}
        transition={{
          duration: 0.3,
          ease: [0.16, 1, 0.3, 1],
        }}
        className={cn(
          "fixed left-0 top-0 h-full bg-gradient-to-b from-slate-50/95 to-white/95 backdrop-blur-md border-r border-slate-200/80 z-50 overflow-hidden",
          "lg:relative lg:z-auto"
        )}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.4 }}
            className="flex items-center justify-between p-4 border-b border-slate-200/80"
          >
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 shadow-sm">
                <History className="w-4 h-4 text-white" />
              </div>
              <div>
                <h2 className="font-semibold text-slate-900 text-sm">Chat History</h2>
                <p className="text-xs text-slate-500">{sessions.length} conversations</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onToggleCollapse}
              className="lg:hidden h-8 w-8 p-0 hover:bg-slate-100"
            >
              <X className="w-4 h-4" />
            </Button>
          </motion.div>

          {/* New Chat Button */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.4 }}
            className="p-4"
          >
            <Button
              onClick={onNewChat}
              className="w-full h-10 bg-gradient-to-r from-slate-700 to-slate-800 hover:from-slate-800 hover:to-slate-900 text-white shadow-sm hover:shadow-md transition-all duration-200"
            >
              <Plus className="w-4 h-4 mr-2" />
              New Chat
            </Button>
          </motion.div>

          {/* Chat Sessions List */}
          <div className="flex-1 overflow-y-auto px-2 pb-4">
            <div className="space-y-1">
              <AnimatePresence mode="popLayout">
                {sortedSessions.map((session, index) => (
                  <motion.div
                    key={session.id}
                    layout
                    initial={{ opacity: 0, x: -20, scale: 0.95 }}
                    animate={{ opacity: 1, x: 0, scale: 1 }}
                    exit={{ opacity: 0, x: -20, scale: 0.95 }}
                    transition={{
                      duration: 0.3,
                      delay: index * 0.05,
                      ease: [0.16, 1, 0.3, 1],
                    }}
                    onMouseEnter={() => setHoveredSessionId(session.id)}
                    onMouseLeave={() => setHoveredSessionId(null)}
                    className={cn(
                      "group relative rounded-xl p-3 mx-2 cursor-pointer transition-all duration-200",
                      currentSessionId === session.id
                        ? "bg-gradient-to-r from-blue-50 to-blue-50/80 border border-blue-200/60 shadow-sm"
                        : "hover:bg-slate-50/80 hover:shadow-sm"
                    )}
                    onClick={() => onSessionSelect(session.id)}
                  >
                    <div className="flex items-start gap-3">
                      <div className={cn(
                        "flex items-center justify-center w-8 h-8 rounded-lg shadow-sm transition-colors duration-200",
                        currentSessionId === session.id
                          ? "bg-gradient-to-br from-blue-500 to-blue-600 text-white"
                          : "bg-slate-100 text-slate-600 group-hover:bg-slate-200"
                      )}>
                        <MessageSquare className="w-4 h-4" />
                      </div>

                      <div className="flex-1 min-w-0">
                        {editingSessionId === session.id ? (
                          <div className="space-y-2">
                            <input
                              type="text"
                              value={editingTitle}
                              onChange={(e) => setEditingTitle(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") handleSaveEdit();
                                if (e.key === "Escape") handleCancelEdit();
                              }}
                              onBlur={handleSaveEdit}
                              className="w-full px-2 py-1 text-sm font-medium bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              autoFocus
                            />
                          </div>
                        ) : (
                          <>
                            <h3 className={cn(
                              "font-medium text-sm leading-tight truncate transition-colors duration-200",
                              currentSessionId === session.id
                                ? "text-blue-900"
                                : "text-slate-900 group-hover:text-slate-700"
                            )}>
                              {session.title}
                            </h3>
                            <div className="flex items-center gap-2 mt-1">
                              <Clock className="w-3 h-3 text-slate-400" />
                              <span className="text-xs text-slate-500">
                                {formatRelativeTime(session.updatedAt)}
                              </span>
                              <span className="text-xs text-slate-400">•</span>
                              <span className="text-xs text-slate-500">
                                {session.messages.length} messages
                              </span>
                            </div>
                          </>
                        )}
                      </div>

                      {/* Action Menu */}
                      <AnimatePresence>
                        {(hoveredSessionId === session.id || currentSessionId === session.id) && editingSessionId !== session.id && (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.8 }}
                            transition={{ duration: 0.15 }}
                            className="flex items-center gap-1"
                          >
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleStartEdit(session);
                              }}
                              className="h-6 w-6 p-0 hover:bg-slate-200 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <Edit3 className="w-3 h-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                onDeleteSession(session.id);
                              }}
                              className="h-6 w-6 p-0 hover:bg-red-100 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            {/* Empty State */}
            {sessions.length === 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.4 }}
                className="text-center py-8 px-4"
              >
                <MessageSquare className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-sm text-slate-500 mb-2">No conversations yet</p>
                <p className="text-xs text-slate-400">Start a new chat to begin</p>
              </motion.div>
            )}
          </div>
        </div>
      </motion.div>

      {/* Mobile Toggle Button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={onToggleCollapse}
        className={cn(
          "fixed top-4 left-4 z-50 lg:hidden h-10 w-10 p-0 bg-white/90 backdrop-blur-sm border border-slate-200 shadow-sm hover:shadow-md transition-all duration-200",
          !isCollapsed && "opacity-0 pointer-events-none"
        )}
      >
        <Menu className="w-4 h-4" />
      </Button>
    </>
  );
}