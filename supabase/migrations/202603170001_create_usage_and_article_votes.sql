create table if not exists public.usage (
  device_id text not null,
  date date not null,
  count integer not null default 0 check (count >= 0),
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now()),
  primary key (device_id, date)
);

create table if not exists public.article_votes (
  url text not null,
  device_id text not null,
  is_clickbait boolean not null,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now()),
  primary key (url, device_id)
);

create index if not exists article_votes_url_idx on public.article_votes (url);

alter table public.usage enable row level security;
alter table public.article_votes enable row level security;
