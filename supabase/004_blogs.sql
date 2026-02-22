-- Blog posts table — replaces the local mock_db.json file.
-- Run in Supabase SQL Editor.

create table if not exists blogs (
  id text primary key,
  user_id text not null,
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  title text not null,
  slug text not null,
  created_at timestamptz not null default now(),
  template_id text,
  live_url text,
  category text,
  payload jsonb not null default '{}'::jsonb
);

-- Index for fast user-scoped queries
create index if not exists blogs_user_id_idx on blogs (user_id);
create index if not exists blogs_slug_idx on blogs (slug);
create index if not exists blogs_status_idx on blogs (status);
