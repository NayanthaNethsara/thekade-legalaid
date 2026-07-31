"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ImagePlus, LoaderIcon, Search, X } from "lucide-react";
import { fileToSearchImage, InvalidImageError } from "@/lib/chat/image";
import { searchByImage } from "@/lib/chat/image-search";

interface ImageSearchDialogProps {
  open: boolean;
  onClose: () => void;
  // Called with the identified product query when the image is shoppable. The
  // parent sends it to chat as a normal turn; the image itself never enters chat.
  onFound: (query: string) => void;
}

type Status = "empty" | "preview" | "scanning";

export function ImageSearchDialog({
  open,
  onClose,
  onFound,
}: ImageSearchDialogProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>("empty");
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Start fresh each time the dialog opens, releasing any leftover preview blob.
  useEffect(() => {
    if (!open) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setStatus("empty");
    setError(null);
    setDataUrl(null);
    setPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setError(null);
    setDataUrl(null);
    setPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return URL.createObjectURL(file);
    });
    setStatus("preview");

    fileToSearchImage(file)
      .then((prepared) => setDataUrl(prepared))
      .catch((err) => {
        setStatus("empty");
        setPreviewUrl((prev) => {
          if (prev) URL.revokeObjectURL(prev);
          return null;
        });
        setError(
          err instanceof InvalidImageError
            ? err.message
            : "Couldn't read that image. Please try another."
        );
      });
  };

  const handleSearch = async () => {
    if (!dataUrl) return;
    setStatus("scanning");
    setError(null);

    const verdict = await searchByImage(dataUrl, "");
    if (verdict.is_shoppable && verdict.query) {
      onFound(verdict.query);
      return;
    }
    setStatus("preview");
    setError(verdict.reason || "I couldn't find a product in that image.");
  };

  const isScanning = status === "scanning";

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="image-search-backdrop"
            className="fixed inset-0 z-40 bg-black/10 backdrop-blur-sm dark:bg-black/30"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              key="image-search-dialog"
              role="dialog"
              aria-modal="true"
              aria-label="Search with an image"
              className="border-foreground/6 bg-background/90 pointer-events-auto flex w-full max-w-md flex-col gap-5 rounded-[1.75rem] border p-6 shadow-2xl backdrop-blur-md dark:bg-zinc-950/90"
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: "spring", damping: 24, stiffness: 300 }}
            >
              <div className="flex items-center justify-between">
                <h2 className="text-foreground text-base font-semibold">
                  Search with an image
                </h2>
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Close"
                  className="text-foreground/50 hover:bg-foreground/6 hover:text-foreground/80 rounded-full p-1.5 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFile}
                className="hidden"
                aria-hidden="true"
                tabIndex={-1}
              />

              {status === "empty" ? (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="border-foreground/15 text-foreground/55 hover:text-foreground/80 flex h-44 w-full flex-col items-center justify-center gap-3 rounded-2xl border border-dashed transition-colors hover:border-violet-400/50"
                >
                  <ImagePlus className="h-7 w-7" />
                  <span className="text-sm">Upload a photo of an item</span>
                  <span className="text-foreground/35 text-xs">
                    We&apos;ll find similar items with Kakille
                  </span>
                </button>
              ) : (
                <div className="flex flex-col gap-4">
                  <div className="relative mx-auto overflow-hidden rounded-2xl">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={previewUrl ?? ""}
                      alt="Selected for search"
                      className="max-h-64 w-auto object-contain"
                    />
                    {isScanning && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm">
                        <LoaderIcon className="h-6 w-6 animate-[spin_2s_linear_infinite] text-white" />
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isScanning}
                      className="text-foreground/60 hover:text-foreground/90 text-sm transition-colors disabled:opacity-50"
                    >
                      Choose another
                    </button>
                    <button
                      type="button"
                      onClick={handleSearch}
                      disabled={isScanning || !dataUrl}
                      className="ml-auto flex items-center gap-2 rounded-full bg-violet-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-violet-500 disabled:opacity-50"
                    >
                      {isScanning ? (
                        <LoaderIcon className="h-4 w-4 animate-[spin_2s_linear_infinite]" />
                      ) : (
                        <Search className="h-4 w-4" />
                      )}
                      {isScanning ? "Scanning…" : "Search"}
                    </button>
                  </div>
                </div>
              )}

              {error && <p className="text-sm text-red-500">{error}</p>}
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
