"use client"

import { useState, useEffect, useCallback } from "react"
import { useChatHistory } from "./use-chat-history"
import type { Message, Lawyer } from "./use-chat-history"

export type { Message, Lawyer } from "./use-chat-history"

export function useChat() {
  const {
    currentSession,
    currentSessionId,
    isLoading,
    addMessageToCurrentSession,
    setLoading,
    createNewSession,
    clearAllHistory,
    clearCurrentSessionMessages,
  } = useChatHistory();

  // Reset chat state (force update) when a new session is created
  const resetChat = () => {
    // This function can be expanded if you want to reset any local state in useChat
  };

  const parseLawyers = (content: string): Lawyer[] => {
    const lawyers: Lawyer[] = []

    // Format 1: lawyers{name: John Doe, place: New York, link: https://example.com}
    const lawyerRegex1 = /lawyers?\s*\{\s*name[:\s]*([^,]+),\s*place[:\s]*([^,]+),\s*link[:\s]*([^}\s]+)\s*\}/gi

    // Format 2: lawyer: John Doe (New York) - https://example.com
    const lawyerRegex2 = /lawyer[:\s]*([^(]+)\s*\(([^)]+)\)\s*[-–]\s*(https?:\/\/[^\s]+)/gi

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
      if (!currentSessionId) return

      // Add user message
      addMessageToCurrentSession({
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
            chat_id: currentSessionId,
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

          addMessageToCurrentSession({
            content: responseContent,
            isUser: false,
            lawyers: lawyers.length > 0 ? lawyers : undefined,
          })
          setLoading(false)
        }, 800)
      } catch (error) {
        console.error("Chat error:", error)

        setTimeout(() => {
          addMessageToCurrentSession({
            content:
              "Sorry, I encountered an error connecting to the server. Please check your connection and try again.",
            isUser: false,
            error: true,
          })
          setLoading(false)
        }, 800)
      }
    },
    [currentSessionId, addMessageToCurrentSession, setLoading],
  )

  return {
    messages: currentSession?.messages || [],
    isLoading,
    sendMessage,
    chatId: currentSessionId,
    resetChat,
    currentSession,
    createNewSession,
    clearAllHistory,
    clearCurrentSessionMessages,
  };
}
