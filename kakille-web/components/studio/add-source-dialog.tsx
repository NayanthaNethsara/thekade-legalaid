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
import {
  newWorkspaceItemId,
  useWorkspace,
  type SourceKind,
} from "./workspace-store";

const SOURCE_LIMIT = 300;

function kindForUrl(url: string): SourceKind {
  return /(?:youtube\.com|youtu\.be)\//i.test(url) ? "youtube" : "website";
}

/**
 * NotebookLM-style source intake: paste a website or YouTube link, upload or
 * drop files, or paste raw text. Everything lands in the local workspace
 * store as metadata; nothing is uploaded anywhere yet.
 */
export function AddSourceDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { sources } = useWorkspace();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const urlInputRef = useRef<HTMLInputElement>(null);
  const [url, setUrl] = useState("");
  const [showTextPanel, setShowTextPanel] = useState(false);
  const [pastedText, setPastedText] = useState("");
  const [isDragging, setIsDragging] = useState(false);

  const count = sources.items.length;
  const isAtLimit = count >= SOURCE_LIMIT;

  const addFiles = (files: File[]) => {
    files.forEach((file) => {
      sources.add({
        id: newWorkspaceItemId(),
        name: file.name,
        size: file.size,
        type: file.type,
        addedAt: new Date().toISOString(),
        kind: "file",
        isSelected: true,
      });
    });
  };

  const addUrl = () => {
    const trimmed = url.trim();
    if (!trimmed) return;
    const withScheme = /^https?:\/\//i.test(trimmed)
      ? trimmed
      : `https://${trimmed}`;
    sources.add({
      id: newWorkspaceItemId(),
      name: trimmed.replace(/^https?:\/\//i, ""),
      size: 0,
      type: "text/html",
      addedAt: new Date().toISOString(),
      kind: kindForUrl(withScheme),
      url: withScheme,
      isSelected: true,
    });
    setUrl("");
  };

  const addText = () => {
    const trimmed = pastedText.trim();
    if (!trimmed) return;
    const firstLine = trimmed.split("\n")[0];
    sources.add({
      id: newWorkspaceItemId(),
      name: firstLine.length > 60 ? `${firstLine.slice(0, 60)}...` : firstLine,
      size: trimmed.length,
      type: "text/plain",
      addedAt: new Date().toISOString(),
      kind: "text",
      isSelected: true,
    });
    setPastedText("");
    setShowTextPanel(false);
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
                        addUrl();
                      }
                    }}
                    placeholder="Paste a website or YouTube link"
                    className="text-foreground/90 placeholder:text-foreground/30 min-w-0 flex-1 bg-transparent py-1.5 text-sm focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={addUrl}
                    disabled={!url.trim() || isAtLimit}
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
                    addFiles(Array.from(e.target.files ?? []));
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
                    addFiles(Array.from(e.dataTransfer.files ?? []));
                  }}
                  disabled={isAtLimit}
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
                        onClick={addText}
                        disabled={!pastedText.trim() || isAtLimit}
                        className="bg-primary text-primary-foreground hover:bg-primary/90 press-scale rounded-full px-4 py-1.5 text-xs font-normal transition-colors disabled:opacity-40"
                      >
                        Add text
                      </button>
                    </div>
                  </div>
                )}
              </div>

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
