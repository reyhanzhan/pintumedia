-- Admin-curated picks for the homepage "Rekomendasi" shelf. Each entry is a
-- lightweight snapshot of a Drama (id/title/poster/episodes/source), stored as-is
-- since the catalog itself lives in third-party provider APIs with no stable
-- "get by id" lookup to re-fetch from later.
alter table public.app_settings add column if not exists recommended_dramas jsonb not null default '[]'::jsonb;
