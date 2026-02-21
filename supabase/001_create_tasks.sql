-- Run this once in Supabase Dashboard → SQL Editor → New query

create table if not exists tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  completed boolean not null default false,
  created_at timestamptz not null default now()
);

insert into tasks (title) values
  ('First task from Supabase'),
  ('Second task'),
  ('Learn Next.js + Supabase')
on conflict do nothing;
