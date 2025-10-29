-- 013_create_story_reactions.sql
-- Creates story_reactions table to store simple reaction counts per story

create table if not exists public.story_reactions (
  id uuid not null default gen_random_uuid(),
  story_id uuid not null references public.stories(id) on delete cascade,
  type text not null, -- e.g. 'like','love','support'
  user_id uuid null,
  ip_address text null,
  created_at timestamp with time zone default now(),
  constraint story_reactions_pkey primary key (id)
) tablespace pg_default;

-- index for fast aggregation
create index if not exists idx_story_reactions_story_id on story_reactions(story_id);
create index if not exists idx_story_reactions_type on story_reactions(type);

-- end

