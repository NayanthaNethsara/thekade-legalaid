"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Header } from "./../components/Header";
import { Sidebar } from "./../components/Sidebar";
import { Dashboard } from "./../components/Dashboard";
import { ChatWindow } from "./../components/ChatWindow";
import { ChatBar } from "./../components/ChatBar";
import { Forum } from "./../components/Forum";
import { DocumentsPage } from "./../components/DocumentsPage";
import { CalendarPage } from "./../components/CalendarPage";
import { ResearchPage } from "./../components/ResearchPage";

export default function App() {
  const [currentPage, setCurrentPage] = useState("dashboard");
  const userName = "Counselor";
  
  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 18) return "Good Afternoon";
    return "Good Evening";
  };

  const handleNavigateToChat = () => {
    setCurrentPage("chat");
  };

  const renderCurrentPage = () => {
    switch (currentPage) {
      case "dashboard":
        return <Dashboard userName={userName} greeting={greeting()} />;
      case "chat":
        return <ChatWindow />;
      case "forum":
        return <Forum />;
      case "documents":
        return <DocumentsPage />;
      case "calendar":
        return <CalendarPage />;
      case "research":
        return <ResearchPage />;
      default:
        return <Dashboard userName={userName} greeting={greeting()} />;
    }
  };

  return (
    <div 
      className="min-h-screen flex"
      style={{
        background: `
          linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%),
          radial-gradient(circle at 20% 80%, rgba(108, 117, 125, 0.15) 0%, transparent 50%),
          radial-gradient(circle at 80% 20%, rgba(212, 175, 55, 0.08) 0%, transparent 50%),
          radial-gradient(circle at 40% 40%, rgba(173, 181, 189, 0.1) 0%, transparent 50%)
        `,
      }}
    >
      {/* Sidebar */}
    <div className="fixed top-0 left-0 h-screen z-50">
      <Sidebar currentPage={currentPage} onNavigateAction={setCurrentPage} />
    </div>
      
      {/* Main Content */}
  <div className="flex-1 flex flex-col min-w-0 ml-16">
        <div className="flex-1 p-4 sm:p-6 lg:p-8 pb-32 overflow-auto">
          <div className="max-w-7xl mx-auto">
            <Header />
            <AnimatePresence mode="wait">
              <motion.div
                key={currentPage}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                {renderCurrentPage()}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
        
        {/* Chat Bar - always show at bottom */}
        <ChatBar onNavigateToChat={handleNavigateToChat} />
      </div>

      {/* Bottom floating decoration */}
      
    </div>
  );
}