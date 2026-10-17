-- Salvus: usernames as the sign-in name. Emails stay on every account (used internally).
-- Apply in the Supabase SQL editor after 20261017102711_rbac.sql.
-- Afterwards, open Users → your row and set the username you actually want.

alter table public.profiles add column username text;

-- Backfill from the part of each email before the "@": lowercase, characters outside
-- [a-z0-9._] become "_", at least 3 and at most 30 characters. Later duplicates get an id suffix.
with cleaned as (
  select id, created_at,
         left(
           rpad(regexp_replace(lower(split_part(email, '@', 1)), '[^a-z0-9._]', '_', 'g'), 3, '_'),
           30
         ) as name
  from public.profiles
),
ranked as (
  select id, name, row_number() over (partition by name order by created_at, id) as rn
  from cleaned
)
update public.profiles p
set username = case
  when r.rn = 1 then r.name
  else left(r.name, 21) || '_' || left(replace(p.id::text, '-', ''), 8)
end
from ranked r
where r.id = p.id;

alter table public.profiles
  alter column username set not null,
  add constraint profiles_username_format check (username ~ '^[a-z0-9._]{3,30}$');

create unique index profiles_username_key on public.profiles (username);

-- Accounts made any other way (e.g. the Supabase dashboard) still get a valid, unique placeholder;
-- the Users screen overwrites it with the real username right after creating an account.
create or replace function private.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, email, username, role_id)
  values (
    new.id,
    coalesce(new.email, ''),
    'user_' || left(replace(new.id::text, '-', ''), 8),
    (select id from public.roles where is_default)
  );
  return new;
end;
$$;
