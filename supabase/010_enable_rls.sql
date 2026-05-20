-- Enable Row Level Security on all public app tables.
-- Run in Supabase Dashboard → SQL Editor after prior migrations.
--
-- Bloggie AI uses Clerk for auth and the service_role key on the server only.
-- With RLS enabled and no anon/authenticated policies, the public anon key
-- cannot read or write these tables (fixes "rls_disabled_in_public" alerts).
-- The service_role key continues to bypass RLS for API routes.

-- Feedbacks (created manually in some projects — define if missing)
create table if not exists feedbacks (
  id uuid primary key default gen_random_uuid(),
  blog_id text not null,
  blog_title text,
  user_email text not null,
  overall_rating integer not null,
  content_score integer,
  content_feedback text,
  seo_score integer,
  seo_feedback text,
  agent_feedback jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists feedbacks_blog_id_idx on feedbacks (blog_id);
create index if not exists feedbacks_created_at_idx on feedbacks (created_at desc);

alter table if exists tasks enable row level security;
alter table if exists business_context enable row level security;
alter table if exists strategy_sessions enable row level security;
alter table if exists blogs enable row level security;
alter table if exists feedbacks enable row level security;

-- No policies for anon / authenticated roles — deny direct client access.
-- Server routes use SUPABASE_SERVICE_ROLE_KEY and bypass RLS.
