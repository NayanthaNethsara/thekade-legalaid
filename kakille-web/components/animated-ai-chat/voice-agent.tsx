"use client";

import { motion, AnimatePresence } from "framer-motion";
import { MicOff } from "lucide-react";

interface VoiceAgentProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (transcript: string) => void;
}

export function VoiceAgent({ open, onClose }: VoiceAgentProps) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="voice-backdrop"
            className="fixed inset-0 z-40 bg-black/10 backdrop-blur-sm dark:bg-black/30"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              key="voice-dialog"
              role="dialog"
              aria-modal="true"
              aria-label="Voice assistant"
              className="border-foreground/6 bg-background/90 pointer-events-auto flex w-full max-w-sm flex-col items-center gap-6 rounded-[1.75rem] border bg-violet-600/[0.03] p-8 shadow-2xl backdrop-blur-md dark:bg-violet-500/[0.03] dark:bg-zinc-950/90"
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: "spring", damping: 24, stiffness: 300 }}
            >
              <div className="relative flex h-32 w-32 items-center justify-center">
                <div className="from-foreground/15 to-foreground/5 relative flex h-20 w-20 items-center justify-center rounded-full bg-linear-to-br shadow-lg">
                  <MicOff className="text-foreground/45 h-8 w-8" />
                </div>
              </div>

              <div className="w-full text-center">
                <p className="text-foreground/90 text-base leading-relaxed font-semibold">
                  Voice assistant is not available yet
                </p>
                <p className="text-foreground/40 mt-1.5 text-xs leading-relaxed">
                  We are working on bringing voice capabilities to Kakille soon.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="bg-foreground/5 text-foreground/80 hover:bg-foreground/10 inline-flex h-10 items-center justify-center rounded-full px-6 text-sm font-medium transition-all"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
