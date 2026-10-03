-- Semantic event index for cost-controlled source comparison.
-- Stores compact article metadata plus pgvector embeddings for recent-event
-- matching. Raw article text is not stored here.

CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA extensions;

SET search_path = public, extensions;

CREATE TABLE IF NOT EXISTS public.article_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  url_hash TEXT NOT NULL,
  lang TEXT NOT NULL DEFAULT 'tr',
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  source_host TEXT NOT NULL,
  embedding vector(1536) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (url_hash, lang)
);

CREATE INDEX IF NOT EXISTS article_events_created_at_idx
  ON public.article_events (created_at DESC);

CREATE INDEX IF NOT EXISTS article_events_source_host_idx
  ON public.article_events (source_host);

CREATE INDEX IF NOT EXISTS article_events_embedding_idx
  ON public.article_events
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

ALTER TABLE public.article_events ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.article_events FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.match_recent_article_events(
  query_embedding vector(1536),
  match_lang TEXT,
  source_url_hash TEXT,
  since_time TIMESTAMPTZ,
  match_count INTEGER DEFAULT 5,
  similarity_threshold DOUBLE PRECISION DEFAULT 0.78
)
RETURNS TABLE (
  title TEXT,
  url TEXT,
  source_host TEXT,
  similarity DOUBLE PRECISION,
  created_at TIMESTAMPTZ
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, extensions
AS $$
  SELECT
    article_events.title,
    article_events.url,
    article_events.source_host,
    1 - (article_events.embedding <=> query_embedding) AS similarity,
    article_events.created_at
  FROM public.article_events
  WHERE article_events.lang = match_lang
    AND article_events.url_hash <> source_url_hash
    AND article_events.created_at >= since_time
    AND 1 - (article_events.embedding <=> query_embedding) >= similarity_threshold
  ORDER BY article_events.embedding <=> query_embedding
  LIMIT LEAST(GREATEST(match_count, 1), 10);
$$;

REVOKE ALL ON FUNCTION public.match_recent_article_events(
  vector,
  TEXT,
  TEXT,
  TIMESTAMPTZ,
  INTEGER,
  DOUBLE PRECISION
) FROM PUBLIC;
