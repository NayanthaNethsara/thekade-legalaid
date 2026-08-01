"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
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

  const start = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    const conversationId = newConversationId();
    stashFirstMessage(conversationId, { text: trimmed });
    router.push(`/${conversationId}`);
  };

  return (
    <div className="relative flex h-full min-h-0 flex-1 flex-col">
      <div className="scrollbar-thin flex-1 overflow-y-auto px-5 py-8 sm:px-8 md:px-10">
        <motion.div
          className="mx-auto w-full max-w-2xl space-y-5 lg:max-w-3xl"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/kakille-mascot.png"
            alt="Kakille"
            className="h-14 w-14 object-contain"
          />

          <h1 className="text-foreground text-3xl font-semibold tracking-[-0.01em] text-balance md:text-4xl">
            Let&apos;s start your case...
          </h1>

          <p className="text-foreground/60 max-w-xl leading-relaxed">
            This is your space to understand a legal problem, get guidance, or
            make progress on a matter. I can help you get started, or you can
            add your own case files and documents.
          </p>

          <p className="text-foreground/90 font-semibold">
            What would you like Kakille to help you with?
          </p>

          <div className="flex flex-col items-start gap-2.5">
            {quickMessages.map((quick, index) => (
              <motion.button
                key={quick.label}
                type="button"
                onClick={() => start(quick.message)}
                className="border-border bg-background text-foreground/75 hover:bg-pearl hover:text-foreground/95 press-scale rounded-full border px-4 py-2 text-sm transition-colors"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 + index * 0.06 }}
              >
                {quick.label}
              </motion.button>
            ))}
          </div>
        </motion.div>
      </div>

      <div className="shrink-0 px-4 pb-1 sm:px-6">
        <div className="mx-auto w-full max-w-2xl lg:max-w-3xl">
          <ChatComposer
            onSubmit={({ text }) => start(text)}
            onVoice={() => setVoiceOpen(true)}
          />
        </div>
      </div>

      <VoiceAgent
        open={voiceOpen}
        onClose={() => setVoiceOpen(false)}
        onSubmit={(transcript) => start(transcript)}
      />
    </div>
  );
}
