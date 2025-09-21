"use client"

import { useState, useEffect, useCallback } from "react"

export interface Message {
  id: string
  content: string
  isUser: boolean
  timestamp: string
  error?: boolean
  lawyers?: Lawyer[] // Added lawyers field for lawyer suggestions
}

export interface Lawyer {
  name: string
  place: string
  link: string
}

export interface ChatState {
  messages: Message[]
  isLoading: boolean
  chatId: string
}

export function useChat() {
  const [chatState, setChatState] = useState<ChatState>({
    messages: [],
    isLoading: false,
    chatId: `chat_${Date.now()}`,
  })

  useEffect(() => {
    const savedChat = localStorage.getItem("chatbot-messages")
    const savedChatId = localStorage.getItem("chatbot-chat-id")

    if (savedChat) {
      try {
        const parsedMessages = JSON.parse(savedChat)
        setChatState((prev) => ({
          ...prev,
          messages: parsedMessages,
          chatId: savedChatId || prev.chatId,
        }))
      } catch (error) {
        console.error("Failed to load chat history:", error)
        // Initialize with welcome message if loading fails
        initializeChat()
      }
    } else {
      initializeChat()
    }
  }, [])

  useEffect(() => {
    if (chatState.messages.length > 0) {
      localStorage.setItem("chatbot-messages", JSON.stringify(chatState.messages))
      localStorage.setItem("chatbot-chat-id", chatState.chatId)
    }
  }, [chatState.messages, chatState.chatId])

  const initializeChat = useCallback(() => {
    const welcomeMessage: Message = {
      id: "1",
      content: "Hello! How can I help you today?",
      isUser: false,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    }

    setChatState((prev) => ({
      ...prev,
      messages: [welcomeMessage],
    }))
  }, [])

  const addMessage = useCallback((message: Omit<Message, "id" | "timestamp">) => {
    const newMessage: Message = {
      ...message,
      id: Date.now().toString(),
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    }

    setChatState((prev) => ({
      ...prev,
      messages: [...prev.messages, newMessage],
    }))

    return newMessage.id
  }, [])

  const setLoading = useCallback((loading: boolean) => {
    setChatState((prev) => ({
      ...prev,
      isLoading: loading,
    }))
  }, [])

  const parseLawyers = (content: string): Lawyer[] => {
    const lawyers: Lawyer[] = []

    // Format 1: lawyers{name: John Doe, place: New York, link: https://example.com}
    const lawyerRegex1 = /lawyers?\s*\{\s*name[:\s]*([^,]+),\s*place[:\s]*([^,]+),\s*link[:\s]*([^}\s]+)\s*\}/gi

    // Format 2: lawyer: John Doe (New York) - https://example.com
    const lawyerRegex2 = /lawyer[:\s]*([^(]+)\s*$$([^)]+)$$\s*[-–]\s*(https?:\/\/[^\s]+)/gi

    // Format 3: JSON-like format
    const lawyerRegex3 =
      /\{\s*"?name"?[:\s]*"?([^",]+)"?,\s*"?place"?[:\s]*"?([^",]+)"?,\s*"?link"?[:\s]*"?([^"}\s]+)"?\s*\}/gi

    let match

    // Try format 1
    while ((match = lawyerRegex1.exec(content)) !== null) {
      lawyers.push({
        name: match[1].trim(),
        place: match[2].trim(),
        link: match[3].trim(),
      })
    }

    // Try format 2 if no matches found
    if (lawyers.length === 0) {
      while ((match = lawyerRegex2.exec(content)) !== null) {
        lawyers.push({
          name: match[1].trim(),
          place: match[2].trim(),
          link: match[3].trim(),
        })
      }
    }

    // Try format 3 if still no matches
    if (lawyers.length === 0) {
      while ((match = lawyerRegex3.exec(content)) !== null) {
        lawyers.push({
          name: match[1].trim(),
          place: match[2].trim(),
          link: match[3].trim(),
        })
      }
    }

    // Remove duplicates based on name
    const uniqueLawyers = lawyers.filter(
      (lawyer, index, self) => index === self.findIndex((l) => l.name === lawyer.name),
    )

    return uniqueLawyers
  }

  const sendMessage = useCallback(
    async (content: string) => {
      // Add user message
      addMessage({
        content,
        isUser: true,
      })

      setLoading(true)

      try {
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            chat_id: chatState.chatId,
            query: content,
          }),
        })

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }

        const data = await response.json()

        // Simulate natural delay
        setTimeout(() => {
          const responseContent =
            data.answer || "I received your message but couldn't generate a response. Please try again."
          const lawyers = parseLawyers(responseContent)

          addMessage({
            content: responseContent,
            isUser: false,
            lawyers: lawyers.length > 0 ? lawyers : undefined,
          })
          setLoading(false)
        }, 800)
      } catch (error) {
        console.error("Chat error:", error)

        setTimeout(() => {
          addMessage({
            content:
              "Sorry, I encountered an error connecting to the server. Please check your connection and try again.",
            isUser: false,
            error: true,
          })
          setLoading(false)
        }, 800)
      }
    },
    [chatState.chatId, addMessage, setLoading],
  )

  const clearChat = useCallback(() => {
    localStorage.removeItem("chatbot-messages")
    localStorage.removeItem("chatbot-chat-id")
    setChatState({
      messages: [],
      isLoading: false,
      chatId: `chat_${Date.now()}`,
    })
    initializeChat()
  }, [initializeChat])

  const startNewChat = useCallback(() => {
    const newChatId = `chat_${Date.now()}`
    localStorage.removeItem("chatbot-messages")
    localStorage.removeItem("chatbot-chat-id")
    setChatState({
      messages: [],
      isLoading: false,
      chatId: newChatId,
    })
    initializeChat()
  }, [initializeChat])

  return {
    messages: chatState.messages,
    isLoading: chatState.isLoading,
    sendMessage,
    clearChat,
    startNewChat, // Exposed startNewChat function
    chatId: chatState.chatId,
  }
}
