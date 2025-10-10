"use client";
import { useState } from "react";
import {
  Home, MessageSquare, FileText, Users, Calendar, Search,
  Briefcase, Settings, Menu, X, MessageCircle
} from "lucide-react";
import { Button } from "./ui/button";
import { cn } from "./ui/utils";
import { motion } from "framer-motion";

interface SidebarProps {
  currentPage: string;
  onNavigateAction: (page: string) => void;
}

const navigation = [
  { id: "dashboard", name: "Dashboard", icon: Home },
  { id: "chat", name: "AI Chat", icon: MessageSquare },
  { id: "forum", name: "Forum", icon: MessageCircle },
  { id: "documents", name: "Documents", icon: FileText },
  { id: "calendar", name: "Calendar", icon: Calendar },
  { id: "research", name: "Research", icon: Search },
];

export function Sidebar({ currentPage, onNavigateAction }: SidebarProps) {
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  return (
    <>
      {/* Mobile toggle */}
      <Button
        variant="ghost"
        size="sm"
        className="fixed top-4 left-4 z-50 lg:hidden bg-white/80 backdrop-blur-sm shadow-lg hover:bg-white/90"
        onClick={() => setIsMobileOpen(v => !v)}
        aria-label="Toggle menu"
      >
        {isMobileOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
      </Button>

      {/* Mobile overlay */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <motion.div
        className={cn(
          "flex-shrink-0 backdrop-blur-xl border-r border-white/20 shadow-2xl w-16",
          "fixed top-0 left-0 h-screen z-50 lg:relative lg:h-auto", // fixed on mobile, relative on desktop
          "transition-transform duration-300",
          isMobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
        style={{
          background:
            "linear-gradient(135deg, rgba(255,255,255,0.8) 0%, rgba(248,248,248,0.6) 100%)",
          boxShadow:
            "0 8px 32px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.9)",
        }}
        whileHover={{
          boxShadow:
            "0 12px 40px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.9)",
        }}
      >
        <div className="flex flex-col h-full lg:h-auto lg:min-h-screen">
          {/* Logo */}
          <div className="flex items-center justify-center p-4 border-b border-white/20 flex-shrink-0">
            <div className="w-8 h-8 bg-gradient-to-br from-gray-700 to-gray-900 rounded-lg flex items-center justify-center shadow-lg">
              <span className="text-white text-sm font-semibold">L</span>
            </div>
          </div>

          {/* Nav */}
          <nav className="flex-1 p-2">
            <div className="space-y-2">
              {navigation.map((item) => {
                const Icon = item.icon;
                const isActive = currentPage === item.id;

                return (
                  <motion.div
                    key={item.id}
                    className="group relative"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Button
                      variant="ghost"
                      className={cn(
                        "w-12 h-12 p-0 transition-all duration-200 rounded-xl",
                        isActive
                          ? "bg-gradient-to-r from-gray-800 to-gray-700 text-white shadow-lg hover:from-gray-700 hover:to-gray-600"
                          : "hover:bg-white/60 text-gray-700"
                      )}
                      onClick={() => {
                        onNavigateAction(item.id);
                        setIsMobileOpen(false);
                      }}
                    >
                      <motion.div
                        animate={isActive ? { rotate: [0, 5, -5, 0] } : {}}
                        transition={{ duration: 0.5 }}
                      >
                        <Icon className="w-5 h-5" />
                      </motion.div>
                    </Button>

                    {/* Tooltip */}
                    <motion.div
                      className="absolute left-full ml-2 top-1/2 -translate-y-1/2 px-2 py-1 bg-gray-900 text-white text-xs rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50"
                      initial={{ opacity: 0, x: -10 }}
                      whileHover={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      {item.name}
                      <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-gray-900" />
                    </motion.div>
                  </motion.div>
                );
              })}
            </div>
          </nav>

          {/* Footer */}
          <div className="p-2 border-t border-white/20 flex-shrink-0">
            <div className="group relative">
              <Button
                variant="ghost"
                className="w-12 h-12 p-0 text-gray-700 hover:bg-white/60 rounded-xl"
              >
                <Settings className="w-5 h-5" />
              </Button>
              <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 px-2 py-1 bg-gray-900 text-white text-xs rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50">
                Settings
                <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-gray-900" />
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </>
  );
}