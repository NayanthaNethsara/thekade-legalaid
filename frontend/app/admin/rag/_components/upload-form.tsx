"use client";

import { useActionState, useEffect, useRef } from "react";
import { Upload } from "lucide-react";
import { toast } from "sonner";

import { uploadAction } from "@/app/actions/rag";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { ActionResult } from "@/types/action";

const INITIAL: ActionResult = { ok: false, error: null };

// Uploads a new PDF into the data/ folder; it then appears in the list as
// `pending`, ready to be parsed.
export function UploadForm() {
  const [state, formAction, pending] = useActionState(uploadAction, INITIAL);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) {
      toast.success("PDF uploaded.");
      formRef.current?.reset();
    } else if (state.error) {
      toast.error(state.error);
    }
  }, [state]);

  return (
    <form
      ref={formRef}
      action={formAction}
      className="flex flex-col gap-2 sm:flex-row sm:items-center"
    >
      <Input
        type="file"
        name="file"
        accept="application/pdf,.pdf"
        required
        className="sm:max-w-sm"
      />
      <Button type="submit" variant="outline" size="lg" disabled={pending}>
        <Upload />
        {pending ? "Uploading…" : "Upload PDF"}
      </Button>
    </form>
  );
}
