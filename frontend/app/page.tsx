"use client"

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import AILegalAssistant from "@/components/ai-legal-assistant";
import ChatDockIcon from "@/components/chat-dock-icon";
import { Scale, MessageSquare, FileText, Search, Shield } from "lucide-react";

export default function Home() {
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isChatMinimized, setIsChatMinimized] = useState(false);

  const toggleChat = () => {
    setIsChatOpen(!isChatOpen);
    if (!isChatOpen) {
      setIsChatMinimized(false);
    }
  };

  const toggleMinimize = () => {
    setIsChatMinimized(!isChatMinimized);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto py-12 px-4">
        {/* Header Section */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Scale className="w-10 h-10 text-primary" />
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white">
              Legal Aid
            </h1>
          </div>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            Your AI-powered legal assistant for professional legal guidance, document analysis, and case research
          </p>
        </div>

        {/* Main Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          {/* AI Legal Assistant Feature */}
          <Card className="hover:shadow-lg transition-shadow duration-300 border-2 border-primary/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-primary" />
                AI Legal Assistant
                <Badge variant="default">Active</Badge>
              </CardTitle>
              <CardDescription>
                Chat with our advanced AI for instant legal guidance and answers to your questions.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Shield className="w-4 h-4" />
                  Confidential & Secure
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Scale className="w-4 h-4" />
                  Legal expertise powered by AI
                </div>
                <Button 
                  onClick={toggleChat} 
                  className="w-full"
                  variant={isChatOpen ? "secondary" : "default"}
                >
                  {isChatOpen ? "Close Chat" : "Start Conversation"}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Document Analysis */}
          <Card className="hover:shadow-lg transition-shadow duration-300">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                Document Analysis
              </CardTitle>
              <CardDescription>
                Upload and analyze legal documents, contracts, and agreements with AI precision.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Contract review & analysis</li>
                  <li>• Legal document summarization</li>
                  <li>• Risk assessment</li>
                </ul>
                <Button variant="outline" className="w-full">
                  Upload Document
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Case Research */}
          <Card className="hover:shadow-lg transition-shadow duration-300">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="w-5 h-5 text-primary" />
                Case Research
              </CardTitle>
              <CardDescription>
                Search through legal databases and case law for relevant precedents and insights.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Case law research</li>
                  <li>• Legal precedent analysis</li>
                  <li>• Jurisdiction-specific results</li>
                </ul>
                <Button variant="outline" className="w-full">
                  Start Research
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Getting Started Section */}
        <Card className="max-w-4xl mx-auto">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Get Started with AI Legal Assistance</CardTitle>
            <CardDescription className="text-lg">
              Our AI legal assistant is ready to help you with various legal matters
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-8">
              <div>
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-primary" />
                  What you can ask:
                </h3>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>• Legal advice and guidance</li>
                  <li>• Contract and document review</li>
                  <li>• Case law research and analysis</li>
                  <li>• Legal procedure explanations</li>
                  <li>• Rights and obligations clarification</li>
                  <li>• Legal document drafting assistance</li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <Shield className="w-4 h-4 text-primary" />
                  Features:
                </h3>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>• 24/7 availability</li>
                  <li>• Instant responses</li>
                  <li>• Confidential conversations</li>
                  <li>• Multi-jurisdiction support</li>
                  <li>• Document upload capability</li>
                  <li>• Case research integration</li>
                </ul>
              </div>
            </div>
            <div className="text-center mt-8">
              <Button 
                onClick={toggleChat} 
                size="lg" 
                className="px-8"
              >
                <MessageSquare className="w-5 h-5 mr-2" />
                Start Your Legal Consultation
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Disclaimer */}
        <div className="text-center mt-8 text-sm text-muted-foreground max-w-2xl mx-auto">
          <p>
            <strong>Disclaimer:</strong> This AI legal assistant provides general legal information and should not be considered as legal advice. 
            For specific legal matters, please consult with a qualified attorney.
          </p>
        </div>
      </div>

      {/* Floating Chat Dock Icon */}
      <ChatDockIcon 
        isOpen={isChatOpen} 
        onToggle={toggleChat}
        unreadCount={0}
      />

      {/* AI Legal Assistant Chatbot */}
      <AILegalAssistant 
        isOpen={isChatOpen} 
        onToggle={toggleChat}
        isMinimized={isChatMinimized}
        onMinimize={toggleMinimize}
      />
    </div>
  );
}
