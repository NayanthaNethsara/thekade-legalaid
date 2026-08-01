"use client";

import React from "react";
import { motion } from "framer-motion";
import { CreditCard, MapPin } from "lucide-react";
import type { ChatAction } from "@/types/chat";

const actionsContainerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
    },
  },
};

const actionsItemVariants = {
  hidden: { opacity: 0, scale: 0.95, y: 5 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      type: "spring" as const,
      stiffness: 280,
      damping: 20,
    },
  },
};

const ACTION_ICONS = {
  pay: CreditCard,
  track: MapPin,
};

export function MessageActions({ actions }: { actions: ChatAction[] }) {
  if (actions.length === 0) return null;
  return (
    <motion.div
      variants={actionsContainerVariants}
      initial="hidden"
      animate="visible"
      className="flex flex-wrap gap-2"
    >
      {actions.map((action, index) => {
        const Icon = ACTION_ICONS[action.kind] ?? CreditCard;
        return (
          <motion.a
            key={`${action.kind}-${index}`}
            variants={actionsItemVariants}
            whileHover={{ scale: 1.02, y: -0.5 }}
            whileTap={{ scale: 0.97 }}
            href={action.url}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-normal transition-colors duration-200"
          >
            <Icon className="h-3.5 w-3.5" />
            {action.label}
          </motion.a>
        );
      })}
    </motion.div>
  );
}
