"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Search, HelpCircle, ListChecks, Truck } from "lucide-react";
import { ChatComposer } from "@/components/animated-ai-chat/chat-composer";
import { VoiceAgent } from "@/components/animated-ai-chat/voice-agent";
import { stashFirstMessage } from "@/lib/chat/handoff";
import { newConversationId } from "@/lib/chat/conversation-id";
import { fetchQuickMessages } from "@/lib/chat/actions";
import type { QuickMessageItem } from "@/types/chat";

export default function Home() {
  const router = useRouter();
  const [voiceOpen, setVoiceOpen] = useState(false);
  const [quickMessages, setQuickMessages] = useState<QuickMessageItem[]>([]);

  useEffect(() => {
    fetchQuickMessages().then(setQuickMessages);
  }, []);

  const getIconElement = (iconName: string) => {
    switch (iconName) {
      case "search":
        return <Search className="h-3.5 w-3.5" />;
      case "question":
        return <HelpCircle className="h-3.5 w-3.5" />;
      case "checklist":
        return <ListChecks className="h-3.5 w-3.5" />;
      case "status":
        return <Truck className="h-3.5 w-3.5" />;
      default:
        return null;
    }
  };

  const start = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    const conversationId = newConversationId();
    stashFirstMessage(conversationId, { text: trimmed });
    router.push(`/${conversationId}`);
  };

  return (
    <div className="relative flex h-full flex-1 flex-col items-center justify-center overflow-y-auto px-4 py-16 sm:p-6">
      <div className="relative mx-auto w-full max-w-2xl lg:max-w-3xl">
        <motion.div
          className="relative z-10 space-y-10"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          <div className="space-y-3 text-center">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.4 }}
            >
              <span className="text-foreground/35 text-xs font-medium tracking-[0.18em] uppercase">
                AI Assistant
              </span>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="inline-block"
            >
              <h1 className="from-foreground/90 to-foreground/40 bg-linear-to-r bg-clip-text pb-1 text-4xl font-semibold tracking-tighter text-balance text-transparent">
                Hi, I am Kakille
              </h1>
              <motion.div
                className="dark:via-foreground/20 h-px bg-linear-to-r from-transparent via-violet-500/40 to-transparent"
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: "100%", opacity: 1 }}
                transition={{ delay: 0.5, duration: 0.8 }}
              />
            </motion.div>
            <motion.p
              className="text-foreground/40 text-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              always here to lend a hand whenever you need.
            </motion.p>
          </div>

          <ChatComposer
            onSubmit={({ text }) => start(text)}
            onVoice={() => setVoiceOpen(true)}
          />

          <div className="flex flex-wrap items-center justify-center gap-2">
            {quickMessages.map((quick, index) => (
              <motion.button
                key={quick.label}
                type="button"
                onClick={() => start(quick.message)}
                className="border-foreground/8 bg-background/30 text-foreground/65 hover:bg-background/50 hover:text-foreground/85 dark:border-foreground/10 flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs backdrop-blur-xl transition-all duration-200"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.08 }}
                whileTap={{ scale: 0.96 }}
              >
                <span className="text-violet-500/70 dark:text-violet-400/70">
                  {getIconElement(quick.iconName)}
                </span>
                <span>{quick.label}</span>
              </motion.button>
            ))}
          </div>
        </motion.div>
      </div>

      <VoiceAgent
        open={voiceOpen}
        onClose={() => setVoiceOpen(false)}
        onSubmit={(transcript) => start(transcript)}
      />
    </div>
  );
}
