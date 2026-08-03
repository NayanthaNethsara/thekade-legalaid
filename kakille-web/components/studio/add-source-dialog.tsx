"use client";

import { useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ClipboardPaste,
  Globe,
  Link2,
  SquarePlay,
  Upload,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { createLinkSource, createTextSource } from "@/lib/sources/actions";
import { useWorkspace } from "./workspace-store";

const SOURCE_LIMIT = 300;

/**
 * NotebookLM-style source intake: paste a website or YouTube link, upload or
 * drop files, or paste raw text. Every source is stored on the backend, which
 * extracts its text so the agent can read it.
 */
export function AddSourceDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { sources, conversationId } = useWorkspace();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const urlInputRef = useRef<HTMLInputElement>(null);
  const [url, setUrl] = useState("");
  const [showTextPanel, setShowTextPanel] = useState(false);
  const [pastedText, setPastedText] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const count = sources.items.length;
  const isAtLimit = count >= SOURCE_LIMIT;

  const addFiles = async (files: File[]) => {
    if (!files.length) return;
    setIsBusy(true);
    setError(null);
    for (const file of files) {
      const form = new FormData();
      form.append("file", file);
      form.append("conversation_id", conversationId);
      try {
        const response = await fetch("/api/sources/upload", {
          method: "POST",
          body: form,
        });
        if (!response.ok) {
          const body = await response.json().catch(() => ({}));
          setError(body?.detail ?? `Could not upload ${file.name}.`);
          break;
        }
      } catch {
        setError("Cannot reach the server. Please try again.");
        break;
      }
    }
    setIsBusy(false);
    sources.refresh();
  };

  const addUrl = async () => {
    const trimmed = url.trim();
    if (!trimmed) return;
    setIsBusy(true);
    setError(null);
    const result = await createLinkSource(conversationId, trimmed);
    setIsBusy(false);
    if (result.ok) {
      setUrl("");
      sources.insert(result.source);
    } else {
      setError(result.error);
    }
  };

  const addText = async () => {
    const trimmed = pastedText.trim();
    if (!trimmed) return;
    setIsBusy(true);
    setError(null);
    const result = await createTextSource(conversationId, trimmed);
    setIsBusy(false);
    if (result.ok) {
      setPastedText("");
      setShowTextPanel(false);
      sources.insert(result.source);
    } else {
      setError(result.error);
    }
  };

  const chipClass =
    "border-border bg-background text-foreground/75 hover:bg-pearl hover:text-foreground/95 press-scale inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm transition-colors";

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="add-source-backdrop"
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm dark:bg-black/60"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              key="add-source-dialog"
              role="dialog"
              aria-modal="true"
              aria-label="Add sources"
              onClick={(e) => e.stopPropagation()}
              className="border-border bg-background pointer-events-auto flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-lg border"
              initial={{ opacity: 0, scale: 0.96, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 12 }}
              transition={{ type: "spring", damping: 26, stiffness: 320 }}
            >
              <header className="border-border flex items-center justify-between border-b px-6 py-4">
                <h2 className="text-foreground text-base font-semibold tracking-tight">
                  Add sources
                </h2>
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Close"
                  className="text-foreground/40 hover:text-foreground/90 rounded-full p-1.5 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </header>

              <div className="scrollbar-thin flex-1 space-y-5 overflow-y-auto px-6 py-5">
                <p className="text-foreground/50 text-sm">
                  Add case files, legal documents, websites, or YouTube links
                  for Kakille to work with.
                </p>

                {/* Website / YouTube link */}
                <div className="border-border flex items-center gap-2 rounded-full border px-4 py-1.5">
                  <Link2 className="text-foreground/40 h-4 w-4 shrink-0" />
                  <input
                    ref={urlInputRef}
                    type="text"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        void addUrl();
                      }
                    }}
                    placeholder="Paste a website or YouTube link"
                    className="text-foreground/90 placeholder:text-foreground/30 min-w-0 flex-1 bg-transparent py-1.5 text-sm focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => void addUrl()}
                    disabled={!url.trim() || isAtLimit || isBusy}
                    className="bg-primary text-primary-foreground hover:bg-primary/90 press-scale shrink-0 rounded-full px-4 py-1.5 text-xs font-normal transition-colors disabled:opacity-40"
                  >
                    Add
                  </button>
                </div>

                {/* Dropzone */}
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept=".pdf,.doc,.docx,.txt,image/*,audio/*"
                  onChange={(e) => {
                    void addFiles(Array.from(e.target.files ?? []));
                    e.target.value = "";
                  }}
                  className="hidden"
                  aria-hidden="true"
                  tabIndex={-1}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragging(true);
                  }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDragging(false);
                    void addFiles(Array.from(e.dataTransfer.files ?? []));
                  }}
                  disabled={isAtLimit || isBusy}
                  className={cn(
                    "flex w-full flex-col items-center justify-center gap-2 rounded-2xl border border-dashed px-6 py-10 transition-colors",
                    isDragging
                      ? "border-primary bg-primary/5"
                      : "border-foreground/15 hover:border-primary/50"
                  )}
                >
                  <span className="bg-muted flex h-11 w-11 items-center justify-center rounded-full">
                    <Upload className="text-primary h-5 w-5" />
                  </span>
                  <span className="text-foreground/80 text-sm font-semibold">
                    Upload files or drop them here
                  </span>
                  <span className="text-foreground/40 text-xs">
                    PDF, images, docs, audio and more
                  </span>
                </button>

                {/* Intake chips */}
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className={chipClass}
                  >
                    <Upload className="h-4 w-4" />
                    Upload files
                  </button>
                  <button
                    type="button"
                    onClick={() => urlInputRef.current?.focus()}
                    className={chipClass}
                  >
                    <Globe className="h-4 w-4" />
                    Website
                  </button>
                  <button
                    type="button"
                    onClick={() => urlInputRef.current?.focus()}
                    className={chipClass}
                  >
                    <SquarePlay className="h-4 w-4" />
                    YouTube
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowTextPanel((prev) => !prev)}
                    className={cn(
                      chipClass,
                      showTextPanel && "border-primary text-primary"
                    )}
                  >
                    <ClipboardPaste className="h-4 w-4" />
                    Copied text
                  </button>
                </div>

                {showTextPanel && (
                  <div className="space-y-2">
                    <textarea
                      value={pastedText}
                      onChange={(e) => setPastedText(e.target.value)}
                      rows={5}
                      autoFocus
                      placeholder="Paste your text here"
                      className="border-border bg-background text-foreground/90 placeholder:text-foreground/30 w-full resize-none rounded-lg border px-3 py-2.5 text-sm focus:outline-none"
                    />
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={() => void addText()}
                        disabled={!pastedText.trim() || isAtLimit || isBusy}
                        className="bg-primary text-primary-foreground hover:bg-primary/90 press-scale rounded-full px-4 py-1.5 text-xs font-normal transition-colors disabled:opacity-40"
                      >
                        Add text
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {error && (
                <p className="text-destructive px-6 pb-2 text-xs">{error}</p>
              )}

              {/* Source counter */}
              <footer className="border-border flex items-center gap-3 border-t px-6 py-4">
                <div className="bg-muted h-1.5 min-w-0 flex-1 overflow-hidden rounded-full">
                  <div
                    className="bg-primary h-full rounded-full transition-all"
                    style={{
                      width: `${Math.min(100, (count / SOURCE_LIMIT) * 100)}%`,
                    }}
                  />
                </div>
                <span className="text-foreground/45 shrink-0 text-xs">
                  {count} / {SOURCE_LIMIT}
                </span>
              </footer>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
