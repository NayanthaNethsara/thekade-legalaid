"use client";

import { ServerCrash } from "lucide-react";
import { motion } from "framer-motion";

export default function ServiceUnavailablePage() {
  const handleRetry = () => {
    window.location.href = "/";
  };

  return (
    <main className="bg-muted text-foreground relative flex min-h-screen w-full flex-col items-center justify-center overflow-hidden px-4">
      {/* Card Container */}
      <div className="border-border bg-background relative z-10 flex w-full max-w-md flex-col items-center rounded-lg border p-8 text-center md:p-10">
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
        <h1 className="text-foreground mb-3 font-sans text-2xl font-semibold tracking-tight md:text-3xl">
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
          className="bg-primary text-primary-foreground hover:bg-primary/90 press-scale w-full rounded-full py-3 text-sm font-normal transition-colors duration-200"
        >
          Retry Connection
        </button>
      </div>
    </main>
  );
}
