import { useState } from "react";
import { Send, Paperclip, Mic, Sparkles, Image as ImageIcon } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { motion } from "framer-motion";
import { Popover } from "@headlessui/react";

interface ChatBarProps {
  onNavigateToChat: () => void;
}

export function ChatBar({ onNavigateToChat }: ChatBarProps) {
  const [message, setMessage] = useState("");
  const [isListening, setIsListening] = useState(false);

  const handleSend = () => {
    if (message.trim()) {
      // Navigate to chat window and handle sending message
      onNavigateToChat();
      console.log("Sending:", message);
      setMessage("");
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <motion.div 
      className="fixed bottom-0 left-0 right-0 z-50 p-4"
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
    >
      <div className="max-w-4xl mx-auto">
        <motion.div 
          className="backdrop-blur-xl border border-white/20 rounded-2xl p-4 shadow-2xl"
          style={{
            background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.8) 0%, rgba(240, 240, 240, 0.6) 100%)',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.9)',
          }}
          whileHover={{ 
            boxShadow: '0 12px 40px rgba(0, 0, 0, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.9)' 
          }}
        >
          <div className="flex items-center gap-3">
            {/* AI Indicator */}
            <div className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-amber-100/80 to-yellow-100/80 rounded-xl border border-amber-200/50">
              <Sparkles className="w-4 h-4 text-amber-600" />
              <span className="text-xs font-medium text-amber-700">Kakille AI</span>
            </div>

            {/* Chat Input */}
            <div className="flex-1 flex items-center gap-2 bg-white/60 rounded-xl border border-gray-200/50 px-3 py-2">
              <Input
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="What's on your mind today?"
                className="flex-1 border-0 bg-transparent placeholder:text-gray-500 focus-visible:ring-0 px-0"
              />
              
              <Popover className="relative">
                {({ open }) => (
                  <>
                    <Popover.Button
                      type="button"
                      className="w-8 h-8 p-0 flex items-center justify-center rounded hover:bg-gray-100/60"
                      aria-label="Add attachment"
                    >
                      <Paperclip className="w-4 h-4 text-gray-600" />
                    </Popover.Button>
                    {open && (
                      <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 8 }}
                        className="absolute left-0 bottom-12 z-50 bg-white border rounded-xl shadow-lg p-2 flex flex-col gap-1 min-w-[160px]"
                      >
                        <button
                          type="button"
                          className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors text-sm"
                          // onClick={handleFileUpload}
                        >
                          <Paperclip className="w-4 h-4 text-primary" />
                          Upload File
                        </button>
                        <button
                          type="button"
                          className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors text-sm"
                          // onClick={handleImageUpload}
                        >
                          <ImageIcon className="w-4 h-4 text-primary" />
                          Upload Image
                        </button>
                        <button
                          type="button"
                          className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors text-sm"
                          // onClick={handleVoiceInput}
                        >
                          <Mic className="w-4 h-4 text-primary" />
                          Voice Input
                        </button>
                      </motion.div>
                    )}
                  </>
                )}
              </Popover>
              
              <Button
                variant="ghost"
                size="sm"
                className={`w-8 h-8 p-0 ${isListening ? 'bg-red-100 hover:bg-red-200' : 'hover:bg-gray-100/60'}`}
                onClick={() => setIsListening(!isListening)}
              >
                <Mic className={`w-4 h-4 ${isListening ? 'text-red-600' : 'text-gray-600'}`} />
              </Button>
            </div>

            {/* Send Button */}
            <motion.div whileTap={{ scale: 0.95 }}>
              <Button
                onClick={handleSend}
                disabled={!message.trim()}
                className="bg-gradient-to-r from-gray-800 to-gray-900 hover:from-gray-700 hover:to-gray-800 text-white shadow-lg disabled:opacity-50 disabled:cursor-not-allowed px-6"
              >
                <Send className="w-4 h-4" />
              </Button>
            </motion.div>
          </div>

          {/* Quick Actions */}
          <motion.div 
            className="flex gap-2 mt-3 flex-wrap"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            {[
              "Analyze contract",
              "Draft legal brief",
              "Research case law",
              "Review document"
            ].map((action, index) => (
              <motion.div
                key={index}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs bg-gray-100/60 hover:bg-gray-200/60 text-gray-700 border border-gray-200/50"
                  onClick={() => {
                    setMessage(action);
                    onNavigateToChat();
                  }}
                >
                  {action}
                </Button>
              </motion.div>
            ))}
          </motion.div>
        </motion.div>
      </div>
    </motion.div>
  );
}