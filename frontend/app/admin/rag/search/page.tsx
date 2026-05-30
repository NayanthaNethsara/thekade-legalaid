import { ragApi } from "@/lib/api/rag";
import type { RagDocument } from "@/types/rag";
import { SearchForm } from "../_components/search-form";

export const metadata = {
  title: "RAG Search · kakilleAI Admin",
};

export default async function RagSearchPage() {
  let documents: RagDocument[] = [];
  try {
    documents = await ragApi.listDocuments();
  } catch {
    documents = [];
  }

  const indexed = documents
    .filter((d) => d.status === "indexed")
    .map((d) => ({ id: d.id, source_filename: d.source_filename }));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">RAG Search</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Verify retrieval against the indexed legal documents using semantic
          (vector) search.
        </p>
      </div>
      <SearchForm documents={indexed} />
    </div>
  );
}
