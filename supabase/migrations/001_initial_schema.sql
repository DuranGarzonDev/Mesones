-- IER Los Mesones: esquema editorial seguro para Supabase/PostgreSQL.
-- Ejecutar una sola vez desde el SQL Editor de un proyecto nuevo.

create type public.article_status as enum ('draft', 'published', 'archived');
create type public.editor_role as enum ('editor', 'admin');

create table public.editor_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 2 and 80),
  role public.editor_role not null default 'editor',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.articles (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 8 and 120),
  excerpt text not null check (char_length(excerpt) between 20 and 240),
  content text not null check (char_length(content) between 30 and 30000),
  category text not null check (category in ('institucional','academico','eventos','logros','comunidad')),
  author_id uuid not null references public.editor_profiles(id) on delete restrict,
  author_name text not null check (char_length(author_name) between 2 and 80),
  image_url text,
  image_path text,
  status public.article_status not null default 'draft',
  featured boolean not null default false,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint published_date_required check (status <> 'published' or published_at is not null)
);

create index articles_public_feed_idx
  on public.articles (featured desc, published_at desc)
  where status = 'published';
create index articles_author_idx on public.articles (author_id, created_at desc);

create schema if not exists private;

create or replace function private.is_active_editor(check_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select check_user_id is not null and exists (
    select 1 from public.editor_profiles
    where id = check_user_id and active = true
  );
$$;

revoke all on function private.is_active_editor(uuid) from public;
grant usage on schema private to authenticated;
grant execute on function private.is_active_editor(uuid) to authenticated;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

revoke all on function public.set_updated_at() from public;

create trigger editor_profiles_updated_at
before update on public.editor_profiles
for each row execute function public.set_updated_at();

create trigger articles_updated_at
before update on public.articles
for each row execute function public.set_updated_at();

alter table public.editor_profiles enable row level security;
alter table public.articles enable row level security;

create policy "Editors can read their own profile"
on public.editor_profiles for select
to authenticated
using ((select auth.uid()) = id and active = true);

create policy "Public can read published articles"
on public.articles for select
to anon, authenticated
using (status = 'published' and published_at <= now());

create policy "Editors can read all articles"
on public.articles for select
to authenticated
using (private.is_active_editor((select auth.uid())));

create policy "Editors can create their articles"
on public.articles for insert
to authenticated
with check (
  private.is_active_editor((select auth.uid()))
  and author_id = (select auth.uid())
);

create policy "Editors can update their articles"
on public.articles for update
to authenticated
using (
  private.is_active_editor((select auth.uid()))
  and author_id = (select auth.uid())
)
with check (
  private.is_active_editor((select auth.uid()))
  and author_id = (select auth.uid())
);

create policy "Editors can delete their articles"
on public.articles for delete
to authenticated
using (
  private.is_active_editor((select auth.uid()))
  and author_id = (select auth.uid())
);

-- Las concesiones son explícitas por el cambio de Data API de 2026.
grant select on public.articles to anon;
grant select, insert, update, delete on public.articles to authenticated;
grant select on public.editor_profiles to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('news-images', 'news-images', true, 8388608, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "Public can view news images"
on storage.objects for select
to anon, authenticated
using (bucket_id = 'news-images');

create policy "Editors can upload to their folder"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'news-images'
  and private.is_active_editor((select auth.uid()))
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

create policy "Editors can delete from their folder"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'news-images'
  and private.is_active_editor((select auth.uid()))
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

comment on table public.editor_profiles is 'Allowlist of authenticated users authorized to publish institutional news.';
comment on table public.articles is 'Institutional news with public-read and editor-owned write policies.';
