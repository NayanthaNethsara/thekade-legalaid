'use client'

import React, { useState, useRef, useEffect } from 'react'
import { ChatSidebar } from '@/components/ChatSidebar'
import { ChatWindow } from '@/components/ChatWindow'
import { ChatBar } from '@/components/ChatBar'
import { Info, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

// --- Types ---
export interface Source {
  title: string
  url?: string
}

export interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  sources?: Source[]
}

export interface ChatSession {
  id: string
  title: string
  date: string
}

export interface UserData {
  name: string
  plan: string
}

interface AIChatPageProps {
  user?: UserData
  initialSessionId?: string
}

export default function AIChatPage({ user, initialSessionId }: AIChatPageProps) {
  // Chat session and message state
  const [history, setHistory] = useState<ChatSession[]>([])
  const [messages, setMessages] = useState<Message[]>([])
  const [activeSessionId, setActiveSessionId] = useState<string | undefined>(initialSessionId)

  // Handler for starting a new chat
  const handleNewChat = () => {
    const newSession: ChatSession = {
      id: Date.now().toString(),
      title: 'New Chat',
      date: new Date().toISOString(),
    }
    setHistory(prev => [newSession, ...prev])
    setActiveSessionId(newSession.id)
    setMessages([])
  }

  // Handler for selecting a chat session
  const handleSelectChat = (id: string) => {
    setActiveSessionId(id)
    // Optionally, load messages for the selected session
    setMessages([]) // Replace with actual loading logic if needed
  }

  return (
    <div className="flex flex-row h-screen bg-background relative overflow-hidden font-sans">
      <div className="flex-shrink-0 w-72">
        <ChatSidebar
          user={user}
          history={history}
          onNewChat={handleNewChat}
          onSelectChat={handleSelectChat}
        />
      </div>
      <main className="flex-1 flex flex-col relative min-w-0">
        <div className="flex items-center justify-end h-16 px-4 border-b bg-background/80">
          <Link href="/" className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors">
            <ArrowLeft className="w-5 h-5" />
            <span className="text-sm font-medium">Back</span>
          </Link>
        </div>
        <ChatWindow />
        <ChatBar onNavigateToChat={handleNewChat} />
        <div className="mt-3 text-center">
          <p className="text-[10px] text-muted-foreground">
            <Info className="w-3 h-3 inline mr-1" />
            AI generated content. Consult a qualified attorney for professional advice.
          </p>
        </div>
      </main>
    </div>
  )
}
