-- Salvus: role-based access. Admin-managed users, custom roles with permissions.
-- Apply in the Supabase SQL editor after 20261017101538_profile_photos.sql.
-- Afterwards, make yourself System Administrator (see the bottom of this file).

-- ── Helpers live in a schema the Data API doesn't expose ─────────────────────
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;

-- ── Permission catalog (mirrors src/constants/permissions.ts) ────────────────
create table public.permissions (
  key         text primary key check (key ~ '^[a-z_]+\.[a-z_]+$'),
  label       text not null,
  description text not null
);

insert into public.permissions (key, label, description) values
  ('wallets.manage_own', 'Manage own wallets', 'Create, edit, deactivate and delete their own wallets'),
  ('wallets.view_all',   'View all wallets',   'See every wallet and who owns it'),
  ('wallets.manage_all', 'Manage all wallets', 'Edit, deactivate, relink or delete any wallet, and create wallets for other users'),
  ('users.manage',       'Manage users',       'Create, edit, deactivate and delete users, reset passwords, assign roles'),
  ('roles.manage',       'Manage roles',       'Create, edit and delete roles and choose their permissions');

-- ── Roles ────────────────────────────────────────────────────────────────────
create table public.roles (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (char_length(trim(name)) between 2 and 40),
  description text check (char_length(description) <= 200),
  is_super    boolean not null default false,  -- every permission, now and future
  is_system   boolean not null default false,  -- seeded; can't be deleted or renamed
  is_default  boolean not null default false,  -- given to newly created users
  created_at  timestamptz not null default now()
);
create unique index roles_name_key on public.roles (lower(name));
create unique index roles_one_super on public.roles (is_super) where is_super;
create unique index roles_one_default on public.roles (is_default) where is_default;

create table public.role_permissions (
  role_id        uuid not null references public.roles on delete cascade,
  permission_key text not null references public.permissions on delete cascade,
  primary key (role_id, permission_key)
);

insert into public.roles (name, description, is_super, is_system, is_default) values
  ('System Administrator', 'Full access to everything, including users and roles', true, true, false),
  ('Wallet Owner', 'Manages their own wallets', false, true, true);

insert into public.role_permissions (role_id, permission_key)
select id, 'wallets.manage_own' from public.roles where name = 'Wallet Owner';

-- ── Profiles: one per auth user, carrying role and status ────────────────────
create table public.profiles (
  id                   uuid primary key references auth.users on delete cascade,
  email                text not null default '',
  full_name            text not null default '' check (char_length(full_name) <= 100),
  role_id              uuid not null references public.roles on delete restrict,
  is_active            boolean not null default true,
  must_change_password boolean not null default false,
  created_at           timestamptz not null default now()
);
create index profiles_role_id_idx on public.profiles (role_id);

-- Existing accounts become Wallet Owners.
insert into public.profiles (id, email, role_id)
select u.id, coalesce(u.email, ''), (select id from public.roles where is_default)
from auth.users u
on conflict (id) do nothing;

-- Lets PostgREST embed a wallet's owner profile (owner_id already references auth.users).
alter table public.wallets
  add constraint wallets_owner_profile_fkey foreign key (owner_id) references public.profiles (id) on delete cascade;

-- New auth users (only the admin API can create them once sign-ups are off) get a profile.
create function private.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, email, role_id)
  values (new.id, coalesce(new.email, ''), (select id from public.roles where is_default));
  return new;
end;
$$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function private.handle_new_user();

create function private.sync_profile_email() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  update public.profiles set email = coalesce(new.email, '') where id = new.id;
  return new;
end;
$$;

create trigger on_auth_user_email_changed after update of email on auth.users
  for each row execute function private.sync_profile_email();

-- ── Permission checks used by RLS (always read fresh from the database) ──────
create function private.is_active_user() returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce((select p.is_active from public.profiles p where p.id = (select auth.uid())), false);
$$;

create function private.has_permission(p_key text) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1
    from public.profiles p
    join public.roles r on r.id = p.role_id
    where p.id = (select auth.uid())
      and p.is_active
      and (r.is_super or exists (
        select 1 from public.role_permissions rp where rp.role_id = r.id and rp.permission_key = p_key
      ))
  );
$$;

revoke all on function private.handle_new_user(), private.sync_profile_email() from public, anon, authenticated;
revoke all on function private.is_active_user(), private.has_permission(text) from public, anon;
grant execute on function private.is_active_user(), private.has_permission(text) to authenticated;

-- ── Guard rails enforced in the database ─────────────────────────────────────
-- Seeded roles keep their identity; the System Administrator role is fully locked.
create function private.guard_roles() returns trigger
language plpgsql set search_path = '' as $$
begin
  if tg_op = 'DELETE' then
    if old.is_system then raise exception 'Built-in roles cannot be deleted' using errcode = 'check_violation'; end if;
    return old;
  end if;
  if new.is_super <> old.is_super or new.is_system <> old.is_system or new.is_default <> old.is_default then
    raise exception 'Role flags cannot be changed' using errcode = 'check_violation';
  end if;
  if old.is_super then raise exception 'The System Administrator role is locked' using errcode = 'check_violation'; end if;
  if old.is_system and new.name <> old.name then
    raise exception 'Built-in roles cannot be renamed' using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

create trigger roles_guard before update or delete on public.roles
  for each row execute function private.guard_roles();

create function private.guard_super_permissions() returns trigger
language plpgsql set search_path = '' as $$
begin
  if exists (select 1 from public.roles r where r.id = coalesce(new.role_id, old.role_id) and r.is_super) then
    raise exception 'The System Administrator role is locked' using errcode = 'check_violation';
  end if;
  return coalesce(new, old);
end;
$$;

create trigger role_permissions_guard before insert or update or delete on public.role_permissions
  for each row execute function private.guard_super_permissions();

-- There must always be at least one active System Administrator.
create function private.guard_last_super() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  was_super boolean;
  stays_super boolean := false;
begin
  select r.is_super and old.is_active into was_super from public.roles r where r.id = old.role_id;
  if tg_op = 'UPDATE' then
    select r.is_super and new.is_active into stays_super from public.roles r where r.id = new.role_id;
  end if;

  if was_super and not stays_super and not exists (
    select 1 from public.profiles p join public.roles r on r.id = p.role_id
    where r.is_super and p.is_active and p.id <> old.id
  ) then
    raise exception 'At least one active System Administrator is required' using errcode = 'check_violation';
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

create trigger profiles_guard_last_super before update or delete on public.profiles
  for each row execute function private.guard_last_super();

revoke all on function private.guard_roles(), private.guard_super_permissions(), private.guard_last_super()
  from public, anon, authenticated;

-- ── Row level security ───────────────────────────────────────────────────────
alter table public.permissions enable row level security;
alter table public.roles enable row level security;
alter table public.role_permissions enable row level security;
alter table public.profiles enable row level security;

revoke all on public.permissions, public.roles, public.role_permissions, public.profiles from anon, authenticated;
grant select on public.permissions, public.profiles to authenticated;
grant select, insert, update, delete on public.roles, public.role_permissions to authenticated;
-- Profiles are written only by the server's secret-key client (user CRUD) and the triggers above.
grant all on public.permissions, public.roles, public.role_permissions, public.profiles to service_role;

create policy "signed-in users read the permission catalog" on public.permissions for select to authenticated
  using (true);

create policy "read own or managed profiles" on public.profiles for select to authenticated
  using (
    id = (select auth.uid())
    or (select private.has_permission('users.manage'))
    or (select private.has_permission('wallets.view_all'))
  );

create policy "read own or managed roles" on public.roles for select to authenticated
  using (
    id = (select p.role_id from public.profiles p where p.id = (select auth.uid()))
    or (select private.has_permission('roles.manage'))
    or (select private.has_permission('users.manage'))
  );
create policy "role managers create roles" on public.roles for insert to authenticated
  with check ((select private.has_permission('roles.manage')) and not is_super and not is_system and not is_default);
create policy "role managers update roles" on public.roles for update to authenticated
  using ((select private.has_permission('roles.manage')))
  with check ((select private.has_permission('roles.manage')));
create policy "role managers delete roles" on public.roles for delete to authenticated
  using ((select private.has_permission('roles.manage')));

create policy "read own or managed role permissions" on public.role_permissions for select to authenticated
  using (
    role_id = (select p.role_id from public.profiles p where p.id = (select auth.uid()))
    or (select private.has_permission('roles.manage'))
    or (select private.has_permission('users.manage'))
  );
-- You can only grant a permission you hold yourself (a System Administrator holds them all).
create policy "role managers grant permissions they hold" on public.role_permissions for insert to authenticated
  with check ((select private.has_permission('roles.manage')) and private.has_permission(permission_key));
create policy "role managers revoke permissions" on public.role_permissions for delete to authenticated
  using ((select private.has_permission('roles.manage')));

-- Atomic role save (name, description and the full permission set) running under the caller's RLS.
create function public.save_role(p_id uuid, p_name text, p_description text, p_permissions text[])
returns uuid
language plpgsql security invoker set search_path = '' as $$
declare
  v_id uuid := p_id;
begin
  if v_id is null then
    insert into public.roles (name, description) values (trim(p_name), nullif(trim(p_description), ''))
    returning id into v_id;
  else
    update public.roles set name = trim(p_name), description = nullif(trim(p_description), '') where id = v_id;
    if not found then raise exception 'Role not found' using errcode = 'no_data_found'; end if;
    delete from public.role_permissions where role_id = v_id and permission_key <> all (p_permissions);
  end if;

  -- Only genuinely new grants are inserted (and so checked against the editor's own permissions).
  insert into public.role_permissions (role_id, permission_key)
  select v_id, k from unnest(p_permissions) as k
  where not exists (select 1 from public.role_permissions rp where rp.role_id = v_id and rp.permission_key = k);

  return v_id;
end;
$$;

revoke all on function public.save_role(uuid, text, text, text[]) from public, anon;
grant execute on function public.save_role(uuid, text, text, text[]) to authenticated;

-- Wallets: own wallets need an active account (and manage_own to write); others need the "all" permissions.
drop policy "owners read own wallets" on public.wallets;
drop policy "owners create own wallets" on public.wallets;
drop policy "owners update own wallets" on public.wallets;
drop policy "owners delete own wallets" on public.wallets;

create policy "read own or all wallets" on public.wallets for select to authenticated
  using (
    (owner_id = (select auth.uid()) and (select private.is_active_user()))
    or (select private.has_permission('wallets.view_all'))
  );
create policy "create own or any wallet" on public.wallets for insert to authenticated
  with check (
    (owner_id = (select auth.uid()) and (select private.has_permission('wallets.manage_own')))
    or (select private.has_permission('wallets.manage_all'))
  );
create policy "update own or any wallet" on public.wallets for update to authenticated
  using (
    (owner_id = (select auth.uid()) and (select private.has_permission('wallets.manage_own')))
    or (select private.has_permission('wallets.manage_all'))
  )
  with check (
    (owner_id = (select auth.uid()) and (select private.has_permission('wallets.manage_own')))
    or (select private.has_permission('wallets.manage_all'))
  );
create policy "delete own or any wallet" on public.wallets for delete to authenticated
  using (
    (owner_id = (select auth.uid()) and (select private.has_permission('wallets.manage_own')))
    or (select private.has_permission('wallets.manage_all'))
  );

-- Tap page: also hidden when the owner's account is deactivated.
create or replace function public.get_public_wallet(p_token_hash text)
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
  join public.profiles p on p.id = w.owner_id
  where w.token_hash = p_token_hash and w.is_active and p.is_active;
$$;

revoke execute on function public.get_public_wallet(text) from public;
grant execute on function public.get_public_wallet(text) to anon, authenticated;

-- Storage: uploads need an active account; wallet managers may write into any owner's folder
-- (images always live in the wallet owner's folder, whoever uploads them).
drop policy "owners read own logos" on storage.objects;
drop policy "owners upload own logos" on storage.objects;
drop policy "owners delete own logos" on storage.objects;
drop policy "owners read own photos" on storage.objects;
drop policy "owners upload own photos" on storage.objects;
drop policy "owners delete own photos" on storage.objects;

create policy "wallet images: read own or managed" on storage.objects for select to authenticated
  using (
    bucket_id in ('logos', 'photos')
    and ((storage.foldername(name))[1] = (select auth.uid())::text or (select private.has_permission('wallets.manage_all')))
  );
create policy "wallet images: upload own or managed" on storage.objects for insert to authenticated
  with check (
    bucket_id in ('logos', 'photos')
    and (
      ((storage.foldername(name))[1] = (select auth.uid())::text and (select private.is_active_user()))
      or (select private.has_permission('wallets.manage_all'))
    )
  );
create policy "wallet images: delete own or managed" on storage.objects for delete to authenticated
  using (
    bucket_id in ('logos', 'photos')
    and ((storage.foldername(name))[1] = (select auth.uid())::text or (select private.has_permission('wallets.manage_all')))
  );

-- ── After applying: make yourself System Administrator ───────────────────────
-- update public.profiles
--   set role_id = (select id from public.roles where is_super)
--   where email = 'you@example.com';
