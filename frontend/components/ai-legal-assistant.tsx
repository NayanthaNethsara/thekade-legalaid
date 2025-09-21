"use client"

import React, { useState, useRef, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { 
  MessageCircle, 
  Send, 
  Bot, 
  User, 
  X, 
  Minimize2,
  Maximize2,
  Loader2,
  Scale,
  AlertCircle
} from "lucide-react"

interface Message {
  id: string
  content: string
  sender: 'user' | 'assistant'
  timestamp: Date
  isLoading?: boolean
}

interface AILegalAssistantProps {
  isOpen: boolean
  onToggle: () => void
  isMinimized: boolean
  onMinimize: () => void
}

import { chatApi, handleApiError, validateChatResponse } from "@/lib/api"

export default function AILegalAssistant({ 
  isOpen, 
  onToggle, 
  isMinimized, 
  onMinimize 
}: AILegalAssistantProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      content: "Hello! I'm your AI Legal Assistant. I can help you with legal questions, document analysis, case research, and more. How can I assist you today?",
      sender: 'assistant',
      timestamp: new Date()
    }
  ])
  const [inputMessage, setInputMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Auto-scroll to bottom when new messages are added
  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]')
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight
      }
    }
  }, [messages])

  // Focus input when chatbot opens
  useEffect(() => {
    if (isOpen && !isMinimized && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isOpen, isMinimized])

  const sendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return

    const userMessage: Message = {
      id: Date.now().toString(),
      content: inputMessage.trim(),
      sender: 'user',
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setInputMessage('')
    setIsLoading(true)
    setError(null)

    // Add loading message
    const loadingMessage: Message = {
      id: `loading-${Date.now()}`,
      content: '',
      sender: 'assistant',
      timestamp: new Date(),
      isLoading: true
    }
    setMessages(prev => [...prev, loadingMessage])

    try {
      const response = await chatApi.sendMessage(
        userMessage.content,
        'session-' + Date.now() // You can implement proper session management
      )

      // Validate response
      if (!validateChatResponse(response)) {
        throw new Error('Invalid response format from server')
      }

      // Remove loading message and add actual response
      setMessages(prev => {
        const filtered = prev.filter(msg => !msg.isLoading)
        return [...filtered, {
          id: Date.now().toString(),
          content: response.response,
          sender: 'assistant',
          timestamp: new Date()
        }]
      })

    } catch (error) {
      console.error('Error sending message:', error)
      const errorMessage = handleApiError(error)
      setError(errorMessage)
      
      // Remove loading message and add error message
      setMessages(prev => {
        const filtered = prev.filter(msg => !msg.isLoading)
        return [...filtered, {
          id: Date.now().toString(),
          content: 'I apologize, but I\'m having trouble connecting to my services right now. Please try again in a moment.',
          sender: 'assistant',
          timestamp: new Date()
        }]
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const clearChat = () => {
    setMessages([{
      id: '1',
      content: "Chat cleared. How can I help you with your legal questions?",
      sender: 'assistant',
      timestamp: new Date()
    }])
    setError(null)
  }

  if (!isOpen) return null

  return (
    <Card className={`fixed bottom-4 right-4 w-96 shadow-2xl chatbot-card transition-all duration-300 z-50 ${
      isMinimized ? 'h-16' : 'h-[600px]'
    }`}>
      {/* Header */}
      <CardHeader className="flex flex-row items-center justify-between p-4 bg-blue-600 text-white rounded-t-lg border-b border-blue-700">
        <div className="flex items-center gap-2">
          <Avatar className="w-8 h-8 bg-blue-100">
            <AvatarImage src="/legal-ai-avatar.png" alt="AI Legal Assistant" />
            <AvatarFallback className="bg-blue-100 text-blue-600">
              <Scale className="w-4 h-4" />
            </AvatarFallback>
          </Avatar>
          <div>
            <CardTitle className="text-sm font-semibold text-white">AI Legal Assistant</CardTitle>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span className="text-xs text-blue-100">Online</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={onMinimize}
            className="text-white hover:bg-blue-700 h-8 w-8 p-0"
          >
            {isMinimized ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggle}
            className="text-white hover:bg-blue-700 h-8 w-8 p-0"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>

      {!isMinimized && (
        <CardContent className="flex flex-col h-[calc(600px-80px)] p-0 bg-white dark:bg-slate-900">
          {/* Chat Header Info */}
          <div className="p-3 bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between">
              <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-700 border-blue-200">
                <Bot className="w-3 h-3 mr-1" />
                Legal AI Assistant
              </Badge>
              <Button
                variant="ghost"
                size="sm"
                onClick={clearChat}
                className="text-xs h-6 text-slate-600 hover:text-slate-800 hover:bg-slate-200"
              >
                Clear Chat
              </Button>
            </div>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="p-3 bg-red-50 border-b border-red-200">
              <div className="flex items-center gap-2 text-sm text-red-700">
                <AlertCircle className="w-4 h-4" />
                {error}
              </div>
            </div>
          )}

          {/* Messages Area */}
          <ScrollArea className="flex-1 p-4 bg-slate-50 dark:bg-slate-800" ref={scrollAreaRef}>
            <div className="space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex gap-3 ${
                    message.sender === 'user' ? 'justify-end' : 'justify-start'
                  }`}
                >
                  {message.sender === 'assistant' && (
                    <Avatar className="w-8 h-8 mt-1 bg-blue-100">
                      <AvatarImage src="/legal-ai-avatar.png" alt="AI Assistant" />
                      <AvatarFallback className="bg-blue-100 text-blue-600">
                        <Bot className="w-4 h-4" />
                      </AvatarFallback>
                    </Avatar>
                  )}
                  
                  <div
                    className={`max-w-[80%] rounded-lg p-3 shadow-sm ${
                      message.sender === 'user'
                        ? 'message-bubble-user ml-auto'
                        : 'message-bubble-assistant'
                    }`}
                  >
                    {message.isLoading ? (
                      <div className="flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                        <span className="text-sm text-slate-600 dark:text-slate-400">Thinking...</span>
                      </div>
                    ) : (
                      <>
                        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                        <span className={`text-xs mt-1 block ${
                          message.sender === 'user' 
                            ? 'text-blue-200' 
                            : 'text-slate-500 dark:text-slate-400'
                        }`}>
                          {message.timestamp.toLocaleTimeString([], { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })}
                        </span>
                      </>
                    )}
                  </div>

                  {message.sender === 'user' && (
                    <Avatar className="w-8 h-8 mt-1 bg-slate-200 dark:bg-slate-600">
                      <AvatarImage src="/user-avatar.png" alt="You" />
                      <AvatarFallback className="bg-slate-200 dark:bg-slate-600 text-slate-600 dark:text-slate-300">
                        <User className="w-4 h-4" />
                      </AvatarFallback>
                    </Avatar>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>

          <Separator className="border-slate-200 dark:border-slate-700" />

          {/* Input Area */}
          <div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700">
            <div className="flex gap-2">
              <Input
                ref={inputRef}
                placeholder="Ask me about legal matters, documents, or cases..."
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                disabled={isLoading}
                className="flex-1 border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-500 dark:placeholder-slate-400"
              />
              <Button
                onClick={sendMessage}
                disabled={!inputMessage.trim() || isLoading}
                size="sm"
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </Button>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
              Press Enter to send • Shift+Enter for new line
            </p>
          </div>
        </CardContent>
      )}
    </Card>
  )
}