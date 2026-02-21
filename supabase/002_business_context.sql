-- Business context (project setup) — one per project/business.
-- Run in Supabase SQL Editor.

create table if not exists business_context (
  id uuid primary key default gen_random_uuid(),
  business_name text not null,
  business_type text not null check (business_type in ('salon', 'spa', 'barbershop', 'other')),
  location_city text,
  location_region text,
  location_country text,
  services text[] not null default '{}',
  target_audience text not null,
  positioning text not null,
  confirmed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Optional: link to Clerk user when you add auth to setup
-- alter table business_context add column if not exists user_id text;
