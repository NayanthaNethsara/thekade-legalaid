// Server-side client for the kakilleAI admin-service (RAG builder).
//
// Reads use `cache: "no-store"` because RAG management data changes as soon as
// documents are parsed/approved/deleted. Import only from Server Components and
// Server Actions — this talks to the backend directly and is never bundled for
// the browser.

import { auth } from "@/auth";
import type {
  MarkdownDoc,
  ParseNewResult,
  RagChunk,
  RagDocument,
  SearchRequest,
  SearchResult,
} from "@/types/rag";

const BASE_URL = process.env.RAG_API_URL ?? "http://localhost:8001";

/** Raised when the backend responds with a non-2xx status (or is unreachable). */
export class RagApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "RagApiError";
    this.status = status;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  // Forward the verified role so admin-service can enforce RBAC on mutating
  // routes. The session is the source of truth; reads ignore the header.
  const session = await auth();
  const headers = new Headers(init?.headers);
  if (session?.user?.role) headers.set("X-User-Role", session.user.role);

  let res: Response;
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      cache: "no-store",
      ...init,
      headers,
    });
  } catch {
    throw new RagApiError(
      `Cannot reach the RAG service at ${BASE_URL}. Is admin-service running?`,
      0,
    );
  }

  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = await res.json();
      if (body?.detail) detail = body.detail;
    } catch {
      // non-JSON error body; keep statusText
    }
    throw new RagApiError(detail, res.status);
  }

  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export const ragApi = {
  listDocuments: () => request<RagDocument[]>("/documents"),

  getDocument: (id: number) => request<RagDocument>(`/documents/${id}`),

  getMarkdown: (id: number) => request<MarkdownDoc>(`/documents/${id}/markdown`),

  getChunks: (id: number) => request<RagChunk[]>(`/documents/${id}/chunks`),

  scan: () => request<ParseNewResult>("/documents/scan", { method: "POST" }),

  parse: (id: number, force: boolean) =>
    request<RagDocument>(
      `/documents/${id}/parse?force=${force ? "true" : "false"}`,
      { method: "POST" },
    ),

  approve: (id: number) =>
    request<RagDocument>(`/documents/${id}/approve`, { method: "POST" }),

  saveMarkdown: (id: number, content: string) =>
    request<RagDocument>(`/documents/${id}/markdown`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    }),

  remove: (id: number, drop: boolean) =>
    request<unknown>(`/documents/${id}?drop=${drop ? "true" : "false"}`, {
      method: "DELETE",
    }),

  upload: (formData: FormData) =>
    request<RagDocument>("/documents/upload", {
      method: "POST",
      body: formData,
    }),

  search: (body: SearchRequest) =>
    request<SearchResult>("/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
};
