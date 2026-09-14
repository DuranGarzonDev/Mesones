-- Reduce la superficie del Data API a los permisos mínimos requeridos.
-- RLS continúa aplicándose como segunda capa de autorización por fila.

revoke all privileges on table public.articles from anon, authenticated;
revoke all privileges on table public.editor_profiles from anon, authenticated;

grant select on table public.articles to anon;
grant select, insert, update, delete on table public.articles to authenticated;
grant select on table public.editor_profiles to authenticated;
