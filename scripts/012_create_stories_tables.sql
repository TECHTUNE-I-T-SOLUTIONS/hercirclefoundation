-- 012_create_stories_tables.sql
-- Creates stories and story_themes tables for user-submitted stories

create table if not exists public.story_themes (
  id uuid not null default gen_random_uuid(),
  name text not null,
  description text null,
  created_at timestamp with time zone default now(),
  constraint story_themes_pkey primary key (id)
) tablespace pg_default;

create table if not exists public.stories (
  id uuid not null default gen_random_uuid(),
  author_name text null,
  author_email text null,
  title text null,
  content text null,
  excerpt text null,
  file_url text null,
  theme_id uuid null references public.story_themes(id) on delete set null,
  status text not null default 'pending'::text, -- pending | approved | rejected | draft
  approved_by uuid null,
  approved_at timestamp with time zone null,
  ip_address text null,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  constraint stories_pkey primary key (id)
) tablespace pg_default;

-- Trigger to update updated_at
create or replace function stories_updated_at_trigger() returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end
$$;

create trigger trg_stories_updated_at
before update on stories
for each row
execute function stories_updated_at_trigger();

-- Optionally index status and theme for fast queries
create index if not exists idx_stories_status on stories(status);
create index if not exists idx_stories_theme on stories(theme_id);
create index if not exists idx_stories_created_at on stories(created_at desc);

-- end

