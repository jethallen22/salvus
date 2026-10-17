-- Salvus: optional owner profile photo.
-- Apply in the Supabase SQL editor after 20261017093123_wallets.sql.

alter table public.wallets
  add column photo_path text check (photo_path ~ '^[0-9a-f-]{36}/[A-Za-z0-9._-]{1,100}$');

-- The tap function gains a column, and a function's result shape can't be altered in place.
drop function public.get_public_wallet(text);

create function public.get_public_wallet(p_token_hash text)
returns table (
  first_name text, middle_name text, last_name text, profile_type public.profile_type,
  school text, year_level text, company text, job_title text, logo_path text, photo_path text,
  email text, mobile text, social_links jsonb, bio text
)
language sql stable security definer set search_path = '' as $$
  select w.first_name, w.middle_name, w.last_name, w.profile_type,
         w.school, w.year_level, w.company, w.job_title, w.logo_path, w.photo_path,
         case when w.show_email  then w.email  end,
         case when w.show_mobile then w.mobile end,
         w.social_links, w.bio
  from public.wallets w
  where w.token_hash = p_token_hash and w.is_active;
$$;

revoke execute on function public.get_public_wallet(text) from public;
grant execute on function public.get_public_wallet(text) to anon, authenticated;

-- Photos: same rules as logos. Public read (the tap page shows them), owners write only in their
-- own folder. The app re-encodes photos to a small square before upload, so 1 MB is plenty.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('photos', 'photos', true, 1048576, array['image/png', 'image/jpeg', 'image/webp']);

create policy "owners read own photos" on storage.objects for select to authenticated
  using (bucket_id = 'photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "owners upload own photos" on storage.objects for insert to authenticated
  with check (bucket_id = 'photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "owners delete own photos" on storage.objects for delete to authenticated
  using (bucket_id = 'photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
