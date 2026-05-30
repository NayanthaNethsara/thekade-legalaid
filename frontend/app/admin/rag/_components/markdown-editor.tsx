"use client";

import { useState, useTransition } from "react";
import { CheckCircle2, Save } from "lucide-react";
import { toast } from "sonner";

import { approveAction, saveMarkdownAction } from "@/app/actions/rag";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

// The human-in-the-loop surface: edit the parsed Markdown, save a draft, then
// approve to (re)build this document's vector index.
export function MarkdownEditor({
  id,
  initialContent,
}: {
  id: number;
  initialContent: string;
}) {
  const [content, setContent] = useState(initialContent);
  const [saved, setSaved] = useState(initialContent);
  const [pending, startTransition] = useTransition();

  const dirty = content !== saved;

  function save(thenApprove: boolean) {
    startTransition(async () => {
      const res = await saveMarkdownAction(id, content);
      if (!res.ok) {
        toast.error(res.error ?? "Failed to save");
        return;
      }
      setSaved(content);
      if (!thenApprove) {
        toast.success("Draft saved.");
        return;
      }
      const approved = await approveAction(id);
      if (!approved.ok) {
        toast.error(approved.error ?? "Approval failed");
        return;
      }
      toast.success("Approved — vector index rebuilt for this document.");
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium">
          Markdown
          {dirty ? (
            <span className="ml-2 text-xs font-normal text-amber-600 dark:text-amber-400">
              • unsaved changes
            </span>
          ) : null}
        </h2>
        <span className="text-xs text-muted-foreground tabular-nums">
          {content.length.toLocaleString()} chars
        </span>
      </div>

      <Textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        spellCheck={false}
        className="h-112 resize-y font-mono text-xs leading-relaxed"
      />

      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="outline"
          size="lg"
          onClick={() => save(false)}
          disabled={pending || !dirty}
        >
          <Save />
          Save draft
        </Button>
        <Button size="lg" onClick={() => save(true)} disabled={pending}>
          <CheckCircle2 />
          {pending ? "Working…" : "Save & approve"}
        </Button>
      </div>
    </div>
  );
}
