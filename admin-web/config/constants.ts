export const APP_CONFIG = {
  APP_NAME: "Kakille Legal Aid",
  PORTAL_NAME: "Admin Management Portal",
  AUTH_TOKEN_KEY: "admin_token",
  SESSION_MAX_AGE_SECONDS: 86400,
} as const;

export const RAG_CONFIG = {
  DEFAULT_CHUNK_SIZE: 500,
  DEFAULT_CHUNK_OVERLAP: 50,
  DEFAULT_TOP_K: 3,
  DEFAULT_SIMILARITY_THRESHOLD: 0.65,
  EMBEDDING_PROVIDER: "Google Vertex AI",
  EMBEDDING_MODEL: "models/text-embedding-004",
  VECTOR_STORE: "PostgreSQL pgvector (HNSW Index)",
} as const;

export const LEGAL_CATEGORIES = [
  "Legislation",
  "Property Law",
  "Criminal Defense",
  "Family Law",
  "Labor & Employment",
] as const;

export const VERIFICATION_STATUS_BADGES: Record<
  string,
  { label: string; style: string }
> = {
  approved: {
    label: "Approved",
    style: "bg-emerald-500/10 text-emerald-500 border-emerald-500/30",
  },
  pending: {
    label: "Pending Review",
    style: "bg-amber-500/10 text-amber-500 border-amber-500/30",
  },
  rejected: {
    label: "Rejected",
    style: "bg-rose-500/10 text-rose-500 border-rose-500/30",
  },
  flagged: {
    label: "Flagged",
    style: "bg-rose-500/10 text-rose-500 border-rose-500/30",
  },
};
