"use client"

import { motion } from "framer-motion"
import type { ReactNode } from "react"

interface ChatContainerProps {
  children: ReactNode
}

export function ChatContainer({ children }: ChatContainerProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{
        duration: 0.5,
        ease: [0.23, 1, 0.32, 1], // Custom easing for smooth entrance
      }}
      className="w-full max-w-2xl mx-auto"
    >
      {children}
    </motion.div>
  )
}
