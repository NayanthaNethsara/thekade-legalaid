"use client";

import { useTransition } from "react";
import { FileText, RotateCcw, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { deleteAction, parseAction } from "@/app/actions/rag";
import { Button } from "@/components/ui/button";
import type { ActionResult } from "@/types/action";
import type { DocStatus } from "@/types/rag";

export function DocumentActions({
  id,
  status,
}: {
  id: number;
  status: DocStatus;
}) {
  const [pending, startTransition] = useTransition();

  function run(fn: () => Promise<ActionResult>, success: string) {
    startTransition(async () => {
      const res = await fn();
      // A successful drop redirects, so res may be undefined-ish; guard anyway.
      if (res && !res.ok) {
        toast.error(res.error ?? "Action failed");
        return;
      }
      toast.success(success);
    });
  }

  const parsed = status !== "pending";

  return (
    <div className="flex flex-wrap gap-2">
      {!parsed ? (
        <Button
          size="lg"
          disabled={pending}
          onClick={() =>
            run(() => parseAction(id, false), "Parsed to Markdown.")
          }
        >
          <FileText />
          Parse to Markdown
        </Button>
      ) : (
        <Button
          variant="outline"
          size="lg"
          disabled={pending}
          onClick={() => {
            if (
              confirm(
                "Re-parse from the PDF? This overwrites the current Markdown and discards any edits.",
              )
            ) {
              run(() => parseAction(id, true), "Re-parsed from PDF.");
            }
          }}
        >
          <RotateCcw />
          Re-parse from PDF
        </Button>
      )}

      <Button
        variant="outline"
        size="lg"
        disabled={pending}
        className="border-amber-500/40 text-amber-600 hover:bg-amber-500/10 dark:text-amber-400"
        onClick={() => {
          if (
            confirm(
              "Remove this document's Markdown and clear all of its RAG chunks? It will reset to pending (the PDF is kept).",
            )
          ) {
            run(() => deleteAction(id, false), "Markdown and index cleared.");
          }
        }}
      >
        <Trash2 />
        Clear Markdown &amp; index
      </Button>

      <Button
        variant="destructive"
        size="lg"
        disabled={pending}
        onClick={() => {
          if (
            confirm(
              "Permanently remove this document, its Markdown, and all chunks from the tracking list?",
            )
          ) {
            run(() => deleteAction(id, true), "Document removed.");
          }
        }}
      >
        <Trash2 />
        Remove document
      </Button>
    </div>
  );
}
