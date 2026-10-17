-- Salvus: NFC wallet profiles.
-- Apply in the Supabase SQL editor (or `supabase db push` if you add the CLI later).

create type public.profile_type as enum ('student', 'professional');

create table public.wallets (
  id              uuid primary key default gen_random_uuid(),
  token_hash      text not null unique check (token_hash ~ '^[0-9a-f]{64}$'),  -- sha256 of the URL token
  token_encrypted text not null,                                              -- AES-256-GCM, key lives only on the server
  owner_id        uuid not null default auth.uid() references auth.users on delete cascade,

  first_name      text not null check (char_length(first_name) between 1 and 50),
  middle_name     text          check (char_length(middle_name) <= 50),
  last_name       text not null check (char_length(last_name) between 1 and 50),

  profile_type    public.profile_type not null,
  school          text check (char_length(school) <= 100),
  year_level      text check (char_length(year_level) <= 30),
  company         text check (char_length(company) <= 100),
  job_title       text check (char_length(job_title) <= 100),
  logo_path       text check (logo_path ~ '^[0-9a-f-]{36}/[A-Za-z0-9._-]{1,100}$'),

  email           text check (char_length(email) <= 254),
  mobile          text check (mobile ~ '^\+639\d{9}$'),
  social_links    jsonb not null default '[]'
                  check (jsonb_typeof(social_links) = 'array' and jsonb_array_length(social_links) <= 8),
  bio             text check (char_length(bio) <= 300),

  show_email      boolean not null default false,
  show_mobile     boolean not null default false,
  is_active       boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),

  -- A student has school + year level; a professional has company + role. Never both.
  constraint profile_fields check (
    (profile_type = 'student'      and school is not null and year_level is not null and company is null and job_title is null)
 or (profile_type = 'professional' and company is not null and job_title is not null and school is null and year_level is null)
  )
);

create index wallets_owner_id_idx on public.wallets (owner_id);

create function public.set_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger wallets_set_updated_at before update on public.wallets
  for each row execute function public.set_updated_at();

-- Access: owners manage only their own rows. Anonymous visitors get no table access at all.
alter table public.wallets enable row level security;

revoke all on public.wallets from anon, authenticated;
grant select, insert, update, delete on public.wallets to authenticated;

create policy "owners read own wallets" on public.wallets for select to authenticated
  using ((select auth.uid()) = owner_id);
create policy "owners create own wallets" on public.wallets for insert to authenticated
  with check ((select auth.uid()) = owner_id);
create policy "owners update own wallets" on public.wallets for update to authenticated
  using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);
create policy "owners delete own wallets" on public.wallets for delete to authenticated
  using ((select auth.uid()) = owner_id);

-- Public tap page. Deliberately SECURITY DEFINER and callable by anon: it is the one public
-- read path, returns at most one active wallet for an exact token hash, and only the public
-- columns (email/mobile only when the owner opted in). It cannot list or enumerate wallets.
create function public.get_public_wallet(p_token_hash text)
returns table (
  first_name text, middle_name text, last_name text, profile_type public.profile_type,
  school text, year_level text, company text, job_title text, logo_path text,
  email text, mobile text, social_links jsonb, bio text
)
language sql stable security definer set search_path = '' as $$
  select w.first_name, w.middle_name, w.last_name, w.profile_type,
         w.school, w.year_level, w.company, w.job_title, w.logo_path,
         case when w.show_email  then w.email  end,
         case when w.show_mobile then w.mobile end,
         w.social_links, w.bio
  from public.wallets w
  where w.token_hash = p_token_hash and w.is_active;
$$;

revoke execute on function public.get_public_wallet(text) from public;
grant execute on function public.get_public_wallet(text) to anon, authenticated;

-- Logos: public read (school/company logos aren't sensitive), owners write only in their own folder.
-- No SVG: it can carry scripts. Limits are enforced by Storage, not just the form.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('logos', 'logos', true, 1048576, array['image/png', 'image/jpeg', 'image/webp']);

create policy "owners read own logos" on storage.objects for select to authenticated
  using (bucket_id = 'logos' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "owners upload own logos" on storage.objects for insert to authenticated
  with check (bucket_id = 'logos' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "owners delete own logos" on storage.objects for delete to authenticated
  using (bucket_id = 'logos' and (storage.foldername(name))[1] = (select auth.uid())::text);
