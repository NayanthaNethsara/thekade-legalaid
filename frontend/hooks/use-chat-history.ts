"use client"

import { useState, useEffect, useCallback } from "react"

export interface Message {
  id: string
  content: string
  isUser: boolean
  timestamp: string
  error?: boolean
  lawyers?: Lawyer[]
}

export interface Lawyer {
  name: string
  place: string
  link: string
}

export interface ChatSession {
  id: string
  title: string
  messages: Message[]
  createdAt: string
  updatedAt: string
}

export interface ChatHistoryState {
  sessions: ChatSession[]
  currentSessionId: string | null
  isLoading: boolean
}

export function useChatHistory() {
  const [historyState, setHistoryState] = useState<ChatHistoryState>({
    sessions: [],
    currentSessionId: null,
    isLoading: false,
  })

  // Load chat history from localStorage on mount
  useEffect(() => {
    const savedHistory = localStorage.getItem("chatbot-history")
    const savedCurrentSession = localStorage.getItem("chatbot-current-session")

    if (savedHistory) {
      try {
        const parsedHistory: ChatSession[] = JSON.parse(savedHistory)
        setHistoryState({
          sessions: parsedHistory,
          currentSessionId: savedCurrentSession,
          isLoading: false,
        })
      } catch (error) {
        console.error("Failed to load chat history:", error)
        initializeFirstSession()
      }
    } else {
      initializeFirstSession()
    }
  }, [])

  // Save to localStorage whenever history changes
  useEffect(() => {
    if (historyState.sessions.length > 0) {
      localStorage.setItem("chatbot-history", JSON.stringify(historyState.sessions))
      if (historyState.currentSessionId) {
        localStorage.setItem("chatbot-current-session", historyState.currentSessionId)
      }
    }
  }, [historyState.sessions, historyState.currentSessionId])

  const initializeFirstSession = useCallback(() => {
    const welcomeMessage: Message = {
      id: "1",
      content: "Hello! How can I help you with your legal questions today?",
      isUser: false,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    }

    const firstSession: ChatSession = {
      id: `chat_${Date.now()}`,
      title: "New Chat",
      messages: [welcomeMessage],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    setHistoryState({
      sessions: [firstSession],
      currentSessionId: firstSession.id,
      isLoading: false,
    })
  }, [])

  const createNewSession = useCallback(() => {
    const welcomeMessage: Message = {
      id: "1",
      content: "Hello! How can I help you with your legal questions today?",
      isUser: false,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    }

    const newSession: ChatSession = {
      id: `chat_${Date.now()}`,
      title: "New Chat",
      messages: [welcomeMessage],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    setHistoryState(prev => ({
      ...prev,
      sessions: [newSession, ...prev.sessions],
      currentSessionId: newSession.id,
    }))

    return newSession.id
  }, [])

  const switchToSession = useCallback((sessionId: string) => {
    setHistoryState(prev => ({
      ...prev,
      currentSessionId: sessionId,
    }))
  }, [])

  const getCurrentSession = useCallback(() => {
    return historyState.sessions.find(session => session.id === historyState.currentSessionId)
  }, [historyState.sessions, historyState.currentSessionId])

  const addMessageToCurrentSession = useCallback((message: Omit<Message, "id" | "timestamp">) => {
    const newMessage: Message = {
      ...message,
      id: Date.now().toString(),
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    }

    setHistoryState(prev => ({
      ...prev,
      sessions: prev.sessions.map(session => {
        if (session.id === prev.currentSessionId) {
          const updatedSession = {
            ...session,
            messages: [...session.messages, newMessage],
            updatedAt: new Date().toISOString(),
          }
          
          // Auto-generate title based on first user message
          if (message.isUser && session.messages.length === 1 && session.title === "New Chat") {
            updatedSession.title = message.content.length > 50 
              ? message.content.substring(0, 47) + "..."
              : message.content
          }
          
          return updatedSession
        }
        return session
      }),
    }))

    return newMessage.id
  }, [historyState.currentSessionId])

  const updateSessionTitle = useCallback((sessionId: string, newTitle: string) => {
    setHistoryState(prev => ({
      ...prev,
      sessions: prev.sessions.map(session =>
        session.id === sessionId
          ? { ...session, title: newTitle, updatedAt: new Date().toISOString() }
          : session
      ),
    }))
  }, [])

  const deleteSession = useCallback((sessionId: string) => {
    setHistoryState(prev => {
      const updatedSessions = prev.sessions.filter(session => session.id !== sessionId)
      let newCurrentSessionId = prev.currentSessionId

      // If we're deleting the current session, switch to the next available one
      if (sessionId === prev.currentSessionId) {
        if (updatedSessions.length > 0) {
          newCurrentSessionId = updatedSessions[0].id
        } else {
          // If no sessions left, create a new one
          const welcomeMessage: Message = {
            id: "1",
            content: "Hello! How can I help you with your legal questions today?",
            isUser: false,
            timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          }

          const newSession: ChatSession = {
            id: `chat_${Date.now()}`,
            title: "New Chat",
            messages: [welcomeMessage],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          }

          return {
            sessions: [newSession],
            currentSessionId: newSession.id,
            isLoading: false,
          }
        }
      }

      return {
        ...prev,
        sessions: updatedSessions,
        currentSessionId: newCurrentSessionId,
      }
    })
  }, [])

  const clearAllHistory = useCallback(() => {
    localStorage.removeItem("chatbot-history")
    localStorage.removeItem("chatbot-current-session")
    initializeFirstSession()
  }, [initializeFirstSession])

  const setLoading = useCallback((loading: boolean) => {
    setHistoryState(prev => ({
      ...prev,
      isLoading: loading,
    }))
  }, [])

  return {
    sessions: historyState.sessions,
    currentSession: getCurrentSession(),
    currentSessionId: historyState.currentSessionId,
    isLoading: historyState.isLoading,
    createNewSession,
    switchToSession,
    addMessageToCurrentSession,
    updateSessionTitle,
    deleteSession,
    clearAllHistory,
    setLoading,
  }
}