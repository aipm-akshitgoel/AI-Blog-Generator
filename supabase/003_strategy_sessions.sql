create table if not exists strategy_sessions (
    id uuid default gen_random_uuid() primary key,
    business_context_id uuid references business_context(id) on delete cascade not null,
    keyword_strategy jsonb not null default '{}'::jsonb,
    topic_options jsonb not null default '[]'::jsonb,
    status text not null default 'draft',
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Note: we don't enable row level security since this app seems to use 
-- the anon key globally as a singleton/development setup for now.
-- If needed:
-- alter table strategy_sessions enable row level security;
