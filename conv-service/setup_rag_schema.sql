-- RAG Schema Setup (Phase 1)
-- Run this SQL directly if Alembic migration chain is broken
-- This is idempotent and safe to run multiple times

-- 1. Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Create documents table (if not exists)
CREATE TABLE IF NOT EXISTS documents (
    id BIGSERIAL PRIMARY KEY,
    source TEXT NOT NULL,  -- e.g., "admin-bulk", "trusted-upload"
    source_id TEXT,  -- Original message/upload ID
    blob_url TEXT,  -- Azure blob URL
    content TEXT,  -- Full extracted text (optional)
    metadata JSONB,  -- mime type, author, date, etc.
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 3. Create document_chunks table (if not exists)
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'document_chunks') THEN
        CREATE TABLE document_chunks (
            id BIGSERIAL PRIMARY KEY,
            document_id BIGINT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
            chunk_index INT NOT NULL,
            text TEXT NOT NULL,
            embedding vector(768) NOT NULL,
            metadata JSONB,
            created_at TIMESTAMPTZ DEFAULT now() NOT NULL
        );
        
        -- Create IVFFlat index for vector similarity search
        CREATE INDEX document_chunks_embedding_idx 
        ON document_chunks 
        USING ivfflat (embedding vector_l2_ops) 
        WITH (lists = 100);
        
        -- Create index on document_id for faster joins
        CREATE INDEX idx_document_chunks_document_id ON document_chunks(document_id);
    END IF;
END $$;

-- 4. Update Alembic version table to mark this migration as applied
INSERT INTO alembic_version (version_num) 
VALUES ('d403647b5c4b')
ON CONFLICT (version_num) DO NOTHING;

-- Verify setup
SELECT 
    'documents' as table_name,
    EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'documents') as exists
UNION ALL
SELECT 
    'document_chunks',
    EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'document_chunks')
UNION ALL
SELECT 
    'pgvector extension',
    EXISTS (SELECT FROM pg_extension WHERE extname = 'vector');
