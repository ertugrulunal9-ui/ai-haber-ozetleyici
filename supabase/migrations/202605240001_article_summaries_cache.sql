-- Server-side summary cache: avoids redundant OpenAI calls when multiple users
-- request a summary of the same URL. url_hash is SHA-256(url) as hex so we never
-- store raw URLs in the primary key column.
CREATE TABLE IF NOT EXISTS public.article_summaries (
  url_hash TEXT NOT NULL,
  lang     TEXT NOT NULL DEFAULT 'tr',
  summary  TEXT NOT NULL,
  keywords TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (url_hash, lang)
);

CREATE INDEX IF NOT EXISTS article_summaries_created_at_idx
  ON public.article_summaries (created_at);

ALTER TABLE public.article_summaries ENABLE ROW LEVEL SECURITY;

-- Edge function accesses via service-role key (bypasses RLS).
-- Deny direct PostgREST access to prevent summary leakage through the anon key.
REVOKE ALL ON public.article_summaries FROM anon, authenticated;
