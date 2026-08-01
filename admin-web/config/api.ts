export const API_BASE_URL =
  process.env.NEXT_PUBLIC_BACKEND_API_URL ?? "http://localhost:8000";

export const ADMIN_API_ENDPOINTS = {
  AUTH_LOGIN: `${API_BASE_URL}/api/v1/admin/auth/login`,
  AUTH_LOGOUT: `${API_BASE_URL}/api/v1/admin/auth/logout`,
  AUTH_ME: `${API_BASE_URL}/api/v1/admin/auth/me`,

  RAG_DOCUMENTS: `${API_BASE_URL}/api/v1/admin/rag/documents`,
  RAG_INGEST: (docId: string) => `${API_BASE_URL}/api/v1/admin/rag/documents/${docId}/ingest`,
  RAG_TEST_RETRIEVAL: `${API_BASE_URL}/api/v1/admin/rag/test-retrieval`,
  RAG_STATUS: `${API_BASE_URL}/api/v1/admin/rag/status`,

  VERIFICATION_DOCUMENTS: `${API_BASE_URL}/api/v1/admin/verification/documents`,
  VERIFICATION_DETAIL: (docId: string) => `${API_BASE_URL}/api/v1/admin/verification/documents/${docId}`,
  VERIFICATION_VERIFY: (docId: string) => `${API_BASE_URL}/api/v1/admin/verification/documents/${docId}/verify`,
} as const;

export function getAdminHeaders(): HeadersInit {
  if (typeof window === "undefined") return {};
  const token = localStorage.getItem("admin_token") || "";
  return {
    Authorization: `Bearer ${token}`,
  };
}
