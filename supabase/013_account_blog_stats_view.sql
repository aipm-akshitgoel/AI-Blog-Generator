-- Optional analytics: draft/published counts per Clerk user_id (run in Supabase SQL Editor).
-- Accounts live in Clerk; this view summarizes app data keyed by user_id.

create or replace view account_blog_stats as
select
  user_id,
  count(*) as total_blogs,
  count(*) filter (where status = 'draft') as draft_blogs,
  count(*) filter (where status = 'published') as published_blogs,
  max(created_at) as last_blog_at
from blogs
where user_id is not null
group by user_id;

-- Total distinct users seen in blogs table:
-- select count(*) from account_blog_stats;

-- Drafts per account:
-- select user_id, draft_blogs from account_blog_stats order by draft_blogs desc;
