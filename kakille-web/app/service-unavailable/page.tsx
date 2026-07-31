"use client";

import { ServerCrash } from "lucide-react";
import { motion } from "framer-motion";
import { AmbientBackground } from "@/components/ambient-background";

export default function ServiceUnavailablePage() {
  const handleRetry = () => {
    window.location.href = "/";
  };

  return (
    <main className="bg-background text-foreground relative flex min-h-screen w-full flex-col items-center justify-center overflow-hidden px-4">
      <AmbientBackground />

      {/* Card Container */}
      <div className="border-foreground/6 bg-background/90 hover:border-foreground/10 relative z-10 flex w-full max-w-md flex-col items-center rounded-[1.75rem] border bg-violet-600/[0.03] p-8 text-center shadow-2xl backdrop-blur-md transition-all duration-300 md:p-10 dark:bg-violet-500/[0.03] dark:bg-zinc-950/90">
        {/* Animated Mascot with Error Badge */}
        <div className="relative mb-6 flex items-center justify-center">
          <motion.img
            src="/kakille-mascot.png"
            alt="Kakille"
            initial={{ y: 5, rotate: -1 }}
            animate={{ y: -5, rotate: 1 }}
            transition={{
              repeat: Infinity,
              repeatType: "reverse",
              duration: 3,
              ease: "easeInOut",
            }}
            className="h-32 w-32 object-contain drop-shadow-md filter"
          />
          <div className="bg-destructive/10 text-destructive ring-destructive/20 absolute -right-1 -bottom-1 rounded-full p-2 ring-1 backdrop-blur-xs">
            <ServerCrash className="h-4 w-4" />
          </div>
        </div>

        {/* Heading */}
        <h1 className="text-foreground/90 mb-3 font-sans text-2xl font-bold tracking-tight md:text-3xl">
          Service Unavailable
        </h1>

        {/* Description */}
        <p className="text-foreground/50 mb-8 font-sans text-sm leading-relaxed">
          We are currently experiencing backend service connectivity issues. Our
          team is actively investigating the outage. Please try again shortly.
        </p>

        {/* Retry Button */}
        <button
          type="button"
          onClick={handleRetry}
          className="w-full rounded-xl bg-violet-600 py-3 text-sm font-semibold text-white shadow-lg shadow-violet-500/20 transition-all duration-200 hover:bg-violet-500 active:scale-[0.98] dark:bg-violet-600 dark:hover:bg-violet-500"
        >
          Retry Connection
        </button>
      </div>
    </main>
  );
}
