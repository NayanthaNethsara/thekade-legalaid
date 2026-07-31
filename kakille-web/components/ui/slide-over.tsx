"use client";

import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";

/**
 * Floating glass panel for mobile sheets: an inset, rounded box with margins
 * rather than a full-bleed edge sheet. Backdrop click and the close control
 * both dismiss it.
 */
export function SlideOver({
  open,
  onClose,
  title,
  icon,
  children,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 z-40 bg-black/10 backdrop-blur-sm dark:bg-black/30"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={title}
            onClick={(e) => e.stopPropagation()}
            className="glass-panel fixed inset-3 z-50 mx-auto flex max-w-md flex-col overflow-hidden rounded-lg"
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ type: "spring", damping: 30, stiffness: 320 }}
          >
            <header className="border-foreground/6 flex items-center justify-between border-b px-5 py-4">
              <h2 className="text-foreground/90 inline-flex items-center gap-2 text-sm font-medium">
                {icon}
                {title}
              </h2>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="text-foreground/40 hover:text-foreground/90 rounded-lg p-1 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </header>

            <div className="flex-1 scrollbar-thin overflow-y-auto px-5 py-4">
              {children}
            </div>

            {footer && (
              <footer className="border-foreground/6 border-t px-5 py-4">
                {footer}
              </footer>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
