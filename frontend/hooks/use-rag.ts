import { useState } from "react";

export interface RAGCitation {
  source_number: number;
  document_id: number;
  chunk_id: number;
  chunk_index: number;
  filename: string;
  file_type: string;
  distance: number;
  excerpt: string;
}

export interface RAGResponse {
  answer: string;
  citations: RAGCitation[];
  metadata: {
    chunks_retrieved: number;
    top_k: number;
    avg_distance?: number;
    documents_referenced?: number;
  };
}

export interface RAGError {
  error: string;
  details?: string;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export function useRAG() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const query = async (
    question: string,
    options?: {
      top_k?: number;
      chat_history?: ChatMessage[];
    }
  ): Promise<RAGResponse | null> => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/rag", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          question,
          top_k: options?.top_k || 5,
          chat_history: options?.chat_history || [],
        }),
      });

      if (!response.ok) {
        const errorData: RAGError = await response.json();
        throw new Error(errorData.details || errorData.error || "Failed to query RAG");
      }

      const data: RAGResponse = await response.json();
      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      setError(errorMessage);
      console.error("RAG query error:", err);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const checkHealth = async (): Promise<boolean> => {
    try {
      const response = await fetch("/api/rag");
      return response.ok;
    } catch (err) {
      console.error("RAG health check error:", err);
      return false;
    }
  };

  return {
    query,
    checkHealth,
    loading,
    error,
  };
}
