import Link from "next/link";
import { AlertCircle, ArrowRight } from "lucide-react";

import { ragApi, RagApiError } from "@/lib/api/rag";
import type { RagDocument } from "@/types/rag";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScanButton } from "./_components/scan-button";
import { StatusBadge } from "./_components/status-badge";
import { UploadForm } from "./_components/upload-form";

export const metadata = {
  title: "RAG Documents · kakilleAI Admin",
};

function formatDate(value: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleString();
}

export default async function RagDocumentsPage() {
  let documents: RagDocument[] = [];
  let loadError: string | null = null;

  try {
    documents = await ragApi.listDocuments();
  } catch (err) {
    loadError =
      err instanceof RagApiError
        ? err.message
        : "Failed to load documents from the RAG service.";
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            RAG Documents
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Parse legal PDFs to Markdown, review and edit, then approve to build
            the per-file vector index.
          </p>
        </div>
        <ScanButton />
      </div>

      <Card>
        <CardContent>
          <UploadForm />
        </CardContent>
      </Card>

      {loadError ? (
        <Alert variant="destructive">
          <AlertCircle />
          <AlertTitle>Could not load documents</AlertTitle>
          <AlertDescription>{loadError}</AlertDescription>
        </Alert>
      ) : documents.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            No documents yet. Upload a PDF or drop files into the service{" "}
            <code className="rounded-none bg-muted px-1">data/</code> folder,
            then “Scan &amp; parse new”.
          </CardContent>
        </Card>
      ) : (
        <Card className="overflow-hidden p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Document</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Chunks</TableHead>
                <TableHead>Indexed</TableHead>
                <TableHead className="w-0" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {documents.map((doc) => (
                <TableRow key={doc.id}>
                  <TableCell>
                    <Link
                      href={`/admin/rag/${doc.id}`}
                      className="font-medium hover:underline"
                    >
                      {doc.source_filename}
                    </Link>
                    {doc.error ? (
                      <p className="mt-0.5 max-w-md truncate text-xs text-destructive">
                        {doc.error}
                      </p>
                    ) : null}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={doc.status} stale={doc.is_stale} />
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-muted-foreground">
                    {doc.chunk_count}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDate(doc.indexed_at)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Link
                      href={`/admin/rag/${doc.id}`}
                      className="inline-flex items-center gap-1 text-sm font-medium text-emerald-600 hover:underline dark:text-emerald-400"
                    >
                      Manage <ArrowRight className="size-3.5" />
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}
