-- ====================================================================
-- ZOLVE SEMANTIC SERVICE MATCHING — Feature 1: pgvector Migration
-- Optional: enables server-side embeddings with pgvector + Supabase Edge Function
-- Safe to run if pgvector is available; otherwise client-side TF-IDF fallback works without DB changes.
-- Do NOT modify existing RLS / auth. This adds an optional vector column + index.
-- ====================================================================

-- 1. Enable pgvector (requires Supabase pgvector extension)
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Add embedding column to providers for server-side semantic search (384-dim for MiniLM, 768 for larger)
-- Client-side fallback uses in-memory TF-IDF; this column is for future Edge Function embedding upserts.
ALTER TABLE providers ADD COLUMN IF NOT EXISTS embedding vector(384);
ALTER TABLE providers ADD COLUMN IF NOT EXISTS embedding_text TEXT; -- source text used to generate embedding

-- 3. Add embedding to services if a separate services table exists (seeded from SERVICE_CATEGORIES)
-- This is optional — some deployments keep services as seed data, not a table.
-- Uncomment if you have a services table:
-- ALTER TABLE services ADD COLUMN IF NOT EXISTS embedding vector(384);
-- ALTER TABLE services ADD COLUMN IF NOT EXISTS embedding_text TEXT;

-- 4. Index for fast cosine / L2 search (ivfflat requires some rows; use hnsw if pg supports)
-- Drop if exists then create
DROP INDEX IF EXISTS idx_providers_embedding_cosine;
CREATE INDEX IF NOT EXISTS idx_providers_embedding_cosine
  ON providers USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Alternative HNSW (if your pgvector version supports it, preferable):
-- CREATE INDEX IF NOT EXISTS idx_providers_embedding_hnsw
--   ON providers USING hnsw (embedding vector_cosine_ops);

-- 5. Helper function: semantic match (server-side) — call from Edge Function or RPC
-- Example RPC: SELECT * FROM match_providers(query_embedding vector(384), match_count int)
CREATE OR REPLACE FUNCTION match_providers(query_embedding vector(384), match_count INT DEFAULT 5)
RETURNS TABLE (id UUID, name TEXT, title TEXT, similarity FLOAT) AS $$
  SELECT id, name, title, 1 - (embedding <=> query_embedding) AS similarity
  FROM providers
  WHERE embedding IS NOT NULL
  ORDER BY embedding <=> query_embedding
  LIMIT match_count;
$$ LANGUAGE SQL STABLE;

-- Notes:
-- - Generation of embeddings should happen once per provider (on insert/update) via Supabase Edge Function
--   that calls a SentenceTransformers / lightweight embedding model server-side (never expose key to frontend).
-- - Client-side fallback (src/services/semanticService.js) works without this migration.
-- - No RLS changes required: reuse existing provider SELECT policies (public-safe fields only).
