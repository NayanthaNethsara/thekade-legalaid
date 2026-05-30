"use client";

import { useTransition } from "react";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";

import { scanAction } from "@/app/actions/rag";
import { Button } from "@/components/ui/button";

// Triggers the parsing "hook": register new PDFs and parse the unparsed ones.
export function ScanButton() {
  const [pending, startTransition] = useTransition();

  function onClick() {
    startTransition(async () => {
      const res = await scanAction();
      if (!res.ok) {
        toast.error(res.error ?? "Scan failed");
        return;
      }
      const parsed = res.result?.parsed ?? [];
      const errs = res.result?.errors ?? [];
      if (parsed.length === 0 && errs.length === 0) {
        toast.info("No new documents to parse.");
      } else if (errs.length) {
        toast.warning(
          `Parsed ${parsed.length} document(s), ${errs.length} failed.`,
        );
      } else {
        toast.success(`Parsed ${parsed.length} new document(s).`);
      }
    });
  }

  return (
    <Button onClick={onClick} disabled={pending} size="lg">
      <RefreshCw className={pending ? "animate-spin" : undefined} />
      {pending ? "Scanning…" : "Scan & parse new"}
    </Button>
  );
}
