"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { ImagePlus, LoaderIcon, Mic, SendIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useWorkspace } from "@/components/studio/workspace-store";
import { ImageSearchDialog } from "./image-search-dialog";

export interface ComposerSubmission {
  text: string;
}

export function ChatComposer({
  disabled = false,
  onSubmit,
  onVoice,
}: {
  disabled?: boolean;
  onSubmit: (submission: ComposerSubmission) => void;
  onVoice: () => void;
}) {
  const [value, setValue] = useState("");
  const [imageDialogOpen, setImageDialogOpen] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { sources } = useWorkspace();
  const selectedSourceCount = sources.items.filter(
    (source) => source.isSelected !== false
  ).length;

  const adjustHeight = (reset?: boolean) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    if (reset) {
      textarea.style.height = "36px";
      return;
    }

    textarea.style.height = "36px";
    const newHeight = Math.max(36, Math.min(textarea.scrollHeight, 120));
    textarea.style.height = `${newHeight}px`;
  };

  useEffect(() => {
    const handleFocus = () => textareaRef.current?.focus();
    window.addEventListener("focus-composer", handleFocus);
    return () => window.removeEventListener("focus-composer", handleFocus);
  }, []);

  useEffect(() => {
    const handleResize = () => adjustHeight();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const canSend = Boolean(value.trim());

  const handleSubmit = () => {
    if (disabled || !canSend) return;
    onSubmit({ text: value.trim() });
    setValue("");
    adjustHeight(true);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <>
      <motion.div
        className="border-border bg-background relative rounded-[28px] border"
        initial={{ scale: 0.98 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.1 }}
      >
        <div className="flex items-center gap-2 px-4 py-2 lg:px-5 lg:py-2.5">
          <div className="flex shrink-0 items-center">
            <motion.button
              type="button"
              onClick={() => setImageDialogOpen(true)}
              disabled={disabled}
              whileTap={{ scale: 0.94 }}
              aria-label="Search with an image"
              title="Search with an image"
              className="text-foreground/50 hover:bg-foreground/6 hover:text-foreground/80 rounded-full p-2 transition-colors duration-200 disabled:opacity-40"
            >
              <ImagePlus className="h-5 w-5" />
            </motion.button>
          </div>

          <div className="flex min-w-0 flex-1 items-center">
            <textarea
              ref={textareaRef}
              value={value}
              onChange={(e) => {
                setValue(e.target.value);
                adjustHeight();
              }}
              onKeyDown={handleKeyDown}
              placeholder="Ask a question or create something"
              className={cn(
                "text-foreground/90 placeholder:text-foreground/20 h-9 w-full resize-none overflow-y-auto border-none bg-transparent px-2 py-2 text-sm placeholder:text-xs focus:outline-none lg:px-3 lg:py-2.5"
              )}
            />
          </div>

          <div className="flex shrink-0 items-center gap-1.5">
            <span className="text-foreground/35 hidden px-1 text-xs whitespace-nowrap select-none sm:inline">
              {selectedSourceCount} source{selectedSourceCount === 1 ? "" : "s"}
            </span>
            <motion.button
              type="button"
              onClick={onVoice}
              whileTap={{ scale: 0.94 }}
              aria-label="Talk to Kakille"
              title="Talk to Kakille"
              className="text-foreground/50 hover:bg-foreground/6 hover:text-foreground/80 rounded-full p-2 transition-colors duration-200"
            >
              <Mic className="h-5 w-5" />
            </motion.button>

            <motion.button
              type="button"
              onClick={handleSubmit}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              disabled={disabled || !canSend}
              aria-label="Send message"
              className={cn(
                "flex shrink-0 items-center justify-center rounded-full p-2.5 transition-all duration-200",
                canSend
                  ? "bg-primary text-primary-foreground hover:bg-primary/90"
                  : "bg-foreground/5 text-foreground/45"
              )}
            >
              {disabled ? (
                <LoaderIcon className="h-4 w-4 animate-[spin_2s_linear_infinite]" />
              ) : (
                <SendIcon className="h-4 w-4" />
              )}
            </motion.button>
          </div>
        </div>
      </motion.div>

      <ImageSearchDialog
        open={imageDialogOpen}
        onClose={() => setImageDialogOpen(false)}
        onFound={(query) => {
          setImageDialogOpen(false);
          onSubmit({ text: query });
        }}
      />
    </>
  );
}
