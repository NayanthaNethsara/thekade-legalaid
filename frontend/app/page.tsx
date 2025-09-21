"use client"

import { motion } from "framer-motion"
import { Chatbot } from "@/components/chatbot"

export default function Home() {
  return (
    <main className="min-h-screen gradient-bg flex items-center justify-center p-4">
      <div className="w-full max-w-4xl">
        <motion.div
          className="text-center mb-8"
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          <motion.h1
            className="text-4xl font-bold text-foreground mb-2"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
          >
            AI Chat Assistant
          </motion.h1>
          <motion.p
            className="text-muted-foreground text-lg"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.5 }}
          >
            Start a conversation with our intelligent assistant
          </motion.p>
        </motion.div>

        <Chatbot />
      </div>
    </main>
  )
}
