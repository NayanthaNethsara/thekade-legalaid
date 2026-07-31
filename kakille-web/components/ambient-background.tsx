"use client";

import { motion } from "framer-motion";

export function AmbientBackground() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-0 overflow-hidden"
    >
      {/* top-left violet - slowly drifting and pulsing */}
      <motion.div
        animate={{
          x: [0, 80, -40, 0],
          y: [0, -60, 40, 0],
          scale: [1, 1.15, 0.9, 1],
        }}
        transition={{
          duration: 22,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="absolute -top-32 -left-32 h-[500px] w-[500px] rounded-full bg-violet-400/20 blur-[160px] filter dark:bg-violet-500/10"
      />

      {/* bottom-right amber / indigo - moving in opposite pattern */}
      <motion.div
        animate={{
          x: [0, -90, 60, 0],
          y: [0, 80, -50, 0],
          scale: [1, 0.85, 1.1, 1],
        }}
        transition={{
          duration: 28,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="absolute -right-32 -bottom-32 h-[500px] w-[500px] rounded-full bg-amber-300/25 blur-[160px] filter dark:bg-indigo-500/10"
      />

      {/* top-right fuchsia accent - drifting diagonally */}
      <motion.div
        animate={{
          x: [0, 50, -70, 0],
          y: [0, 90, -40, 0],
          scale: [1, 1.2, 0.8, 1],
        }}
        transition={{
          duration: 25,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="absolute -top-16 right-1/4 h-72 w-72 rounded-full bg-fuchsia-400/15 blur-[120px] filter dark:bg-fuchsia-500/10"
      />

      {/* bottom-left violet soft fill */}
      <motion.div
        animate={{
          x: [0, -40, 50, 0],
          y: [0, -80, 60, 0],
          scale: [1, 1.1, 0.95, 1],
        }}
        transition={{
          duration: 20,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="absolute bottom-1/4 -left-16 h-64 w-64 rounded-full bg-violet-300/15 blur-[100px] filter dark:hidden"
      />
    </div>
  );
}
