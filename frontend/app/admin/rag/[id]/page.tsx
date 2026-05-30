import Link from "next/link";
import { notFound } from "next/navigation";
import { AlertCircle, ArrowLeft, TriangleAlert } from "lucide-react";

import { ragApi, RagApiError } from "@/lib/api/rag";
import type { MarkdownDoc, RagChunk, RagDocument } from "@/types/rag";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent } from "@/components/ui/card";
import { DocumentActions } from "../_components/document-actions";
import { MarkdownEditor } from "../_components/markdown-editor";
import { StatusBadge } from "../_components/status-badge";

function formatDate(value: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleString();
}

export default async function DocumentDetailPage(
  props: PageProps<"/admin/rag/[id]">,
) {
  const { id } = await props.params;
  const docId = Number(id);
  if (!Number.isInteger(docId)) notFound();

  let doc: RagDocument;
  try {
    doc = await ragApi.getDocument(docId);
  } catch (err) {
    if (err instanceof RagApiError && err.status === 404) notFound();
    throw err;
  }

  // Markdown only exists once parsed; tolerate its absence.
  let markdown: MarkdownDoc | null = null;
  if (doc.status !== "pending") {
    try {
      markdown = await ragApi.getMarkdown(docId);
    } catch {
      markdown = null;
    }
  }

  let chunks: RagChunk[] = [];
  if (doc.chunk_count > 0) {
    try {
      chunks = await ragApi.getChunks(docId);
    } catch {
      chunks = [];
    }
  }

  const meta: { label: string; value: string }[] = [
    { label: "Chunks", value: String(doc.chunk_count) },
    { label: "Parsed", value: formatDate(doc.parsed_at) },
    { label: "Indexed", value: formatDate(doc.indexed_at) },
    { label: "Updated", value: formatDate(doc.updated_at) },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href="/admin/rag"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:underline"
        >
          <ArrowLeft className="size-3.5" />
          All documents
        </Link>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-xl font-semibold tracking-tight break-all">
            {doc.source_filename}
          </h1>
          <StatusBadge status={doc.status} stale={doc.is_stale} />
        </div>
      </div>

      {doc.is_stale ? (
        <Alert>
          <TriangleAlert />
          <AlertTitle>Markdown changed since last index</AlertTitle>
          <AlertDescription>
            Approve again to rebuild this document’s chunks.
          </AlertDescription>
        </Alert>
      ) : null}

      {doc.error ? (
        <Alert variant="destructive">
          <AlertCircle />
          <AlertTitle>Last operation failed</AlertTitle>
          <AlertDescription>{doc.error}</AlertDescription>
        </Alert>
      ) : null}

      <Card>
        <CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {meta.map((m) => (
            <div key={m.label}>
              <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                {m.label}
              </dt>
              <dd className="mt-1 text-sm font-medium tabular-nums">
                {m.value}
              </dd>
            </div>
          ))}
        </CardContent>
      </Card>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-medium">Actions</h2>
        <DocumentActions id={doc.id} status={doc.status} />
      </section>

      {markdown ? (
        <Card>
          <CardContent>
            <MarkdownEditor id={doc.id} initialContent={markdown.content} />
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            {doc.status === "pending"
              ? "Not parsed yet. Use “Parse to Markdown” above to generate an editable draft from the PDF."
              : "Markdown file is missing on the server. Re-parse to regenerate it."}
          </CardContent>
        </Card>
      )}

      <section className="flex flex-col gap-3">
        <div className="flex items-baseline justify-between">
          <h2 className="text-sm font-medium">Chunks</h2>
          <span className="text-xs text-muted-foreground">
            how this document is split for retrieval
          </span>
        </div>

        {chunks.length > 0 ? (
          <div className="flex flex-col gap-2">
            {chunks.map((chunk) => (
              <Card key={chunk.chunk_index} className="gap-0 py-0">
                <div className="flex items-center justify-between border-b px-3 py-1.5 text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">
                    Chunk #{chunk.chunk_index}
                    {chunk.heading ? (
                      <span className="ml-1.5 font-normal text-muted-foreground">
                        · {chunk.heading}
                      </span>
                    ) : null}
                  </span>
                  <span className="tabular-nums">
                    {chunk.content.length.toLocaleString()} chars · ~
                    {chunk.token_count ?? "?"} tokens
                  </span>
                </div>
                <pre className="max-h-64 overflow-auto px-3 py-2 font-mono text-xs leading-relaxed whitespace-pre-wrap text-foreground/80">
                  {chunk.content}
                </pre>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="py-6 text-center text-sm text-muted-foreground">
              {doc.status === "indexed"
                ? "This document is indexed but has no stored chunks."
                : "No chunks yet — approve the document to split and embed it."}
            </CardContent>
          </Card>
        )}
      </section>
    </div>
  );
}
