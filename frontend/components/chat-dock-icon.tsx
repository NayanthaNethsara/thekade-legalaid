"use client"

import React from 'react'
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { MessageCircle, Scale, X } from "lucide-react"

interface ChatDockIconProps {
  isOpen: boolean
  onToggle: () => void
  unreadCount?: number
}

export default function ChatDockIcon({ isOpen, onToggle, unreadCount = 0 }: ChatDockIconProps) {
  return (
    <div className="fixed bottom-6 right-6 z-40">
      <Button
        onClick={onToggle}
        className={`
          w-16 h-16 rounded-full shadow-lg hover:shadow-xl 
          transition-all duration-300 ease-in-out transform
          ${isOpen 
            ? 'bg-red-600 hover:bg-red-700 rotate-0' 
            : 'bg-blue-600 hover:bg-blue-700 hover:scale-110'
          }
          group relative overflow-hidden border-2 border-white
        `}
        size="lg"
      >
        {/* Background gradient animation */}
        <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-blue-700 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-full" />
        
        {/* Icon container */}
        <div className="relative z-10 flex items-center justify-center">
          {isOpen ? (
            <X className="w-6 h-6 text-white transition-transform duration-200" />
          ) : (
            <div className="relative">
              <div className="flex items-center justify-center">
                <Scale className="w-5 h-5 text-white mr-1" />
                <MessageCircle className="w-6 h-6 text-white" />
              </div>
              
              {/* Notification badge */}
              {unreadCount > 0 && (
                <Badge 
                  variant="destructive" 
                  className="absolute -top-2 -right-2 w-5 h-5 p-0 flex items-center justify-center text-xs animate-pulse bg-red-500 border-white"
                >
                  {unreadCount > 9 ? '9+' : unreadCount}
                </Badge>
              )}
            </div>
          )}
        </div>

        {/* Ripple effect */}
        {!isOpen && (
          <div className="absolute inset-0 rounded-full animate-ping bg-blue-400/30" 
               style={{ animationDuration: '3s', animationDelay: '1s' }} />
        )}

        {/* Tooltip */}
        <div className={`
          absolute bottom-full right-0 mb-2 px-3 py-1 
          bg-slate-800 text-white text-sm rounded-lg
          opacity-0 group-hover:opacity-100 transition-opacity duration-200
          whitespace-nowrap pointer-events-none
          ${isOpen ? 'hidden' : 'block'}
        `}>
          Ask Legal AI Assistant
          <div className="absolute top-full right-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-slate-800" />
        </div>
      </Button>

      {/* Floating helper text (shows on first visit) */}
      {!isOpen && (
        <div className="absolute bottom-20 right-0 max-w-xs">
          <div className="bg-blue-600 text-white text-sm p-3 rounded-lg shadow-lg animate-bounce border border-blue-500">
            <div className="flex items-start gap-2">
              <Scale className="w-4 h-4 mt-0.5 flex-shrink-0 text-blue-200" />
              <div>
                <p className="font-medium">Need Legal Help?</p>
                <p className="text-xs text-blue-100">Click here to chat with our AI Legal Assistant!</p>
              </div>
            </div>
            <div className="absolute top-full right-8 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-blue-600" />
          </div>
        </div>
      )}
    </div>
  )
}