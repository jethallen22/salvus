-- Salvus access-control check. Paste into the Supabase SQL editor and run.
-- Everything happens inside one transaction that is rolled back: the two test users,
-- their wallets and files never persist. Any failed check aborts with "FAIL: ...".
-- Success ends with a single row: ALL ACCESS-CONTROL CHECKS PASSED.

begin;

-- Two throwaway users.
insert into auth.users (id, email) values
  ('00000000-0000-4000-8000-00000000000a', 'rls-check-a@example.test'),
  ('00000000-0000-4000-8000-00000000000b', 'rls-check-b@example.test');

-- ── As user A ────────────────────────────────────────────────────────────────
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-00000000000a","role":"authenticated"}', true);

insert into public.wallets (token_hash, token_encrypted, owner_id, first_name, last_name, profile_type, school, year_level, email, mobile, show_email, show_mobile)
values (repeat('a', 64), 'x', '00000000-0000-4000-8000-00000000000a', 'Alice', 'A', 'student', 'Test School', 'Grade 7',
        'alice@example.test', '+639171234567', false, true);

insert into storage.objects (bucket_id, name) values ('logos', '00000000-0000-4000-8000-00000000000a/own.png');
insert into storage.objects (bucket_id, name) values ('photos', '00000000-0000-4000-8000-00000000000a/me.webp');
update public.wallets set photo_path = '00000000-0000-4000-8000-00000000000a/me.webp';

do $$
begin
  begin
    update public.wallets set owner_id = '00000000-0000-4000-8000-00000000000b';
    raise exception 'FAIL: A could hand their wallet to B';
  exception when insufficient_privilege then null;
  end;

  begin
    update public.wallets set company = 'Acme';
    raise exception 'FAIL: student row accepted company fields';
  exception when check_violation then null;
  end;
end $$;

-- ── As user B ────────────────────────────────────────────────────────────────
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-00000000000b","role":"authenticated"}', true);

do $$
declare n int;
begin
  select count(*) into n from public.wallets;
  if n <> 0 then raise exception 'FAIL: B can read A''s wallet'; end if;

  update public.wallets set first_name = 'Hacked';
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'FAIL: B updated A''s wallet'; end if;

  delete from public.wallets;
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'FAIL: B deleted A''s wallet'; end if;

  begin
    insert into public.wallets (token_hash, token_encrypted, owner_id, first_name, last_name, profile_type, school, year_level)
    values (repeat('b', 64), 'x', '00000000-0000-4000-8000-00000000000a', 'Mallory', 'B', 'student', 'S', 'Grade 7');
    raise exception 'FAIL: B created a wallet owned by A';
  exception when insufficient_privilege then null;
  end;

  begin
    insert into storage.objects (bucket_id, name) values ('logos', '00000000-0000-4000-8000-00000000000a/evil.png');
    raise exception 'FAIL: B uploaded into A''s logo folder';
  exception when insufficient_privilege then null;
  end;

  begin
    insert into storage.objects (bucket_id, name) values ('photos', '00000000-0000-4000-8000-00000000000a/evil.webp');
    raise exception 'FAIL: B uploaded into A''s photo folder';
  exception when insufficient_privilege then null;
  end;
end $$;

-- ── As an anonymous visitor ──────────────────────────────────────────────────
reset role;
set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);

do $$
declare r record; n int;
begin
  begin
    select count(*) into n from public.wallets;
    raise exception 'FAIL: anon can query the wallets table';
  exception when insufficient_privilege then null;
  end;

  select count(*) into n from public.get_public_wallet(repeat('f', 64));
  if n <> 0 then raise exception 'FAIL: unknown token returned a wallet'; end if;

  select * into r from public.get_public_wallet(repeat('a', 64));
  if r.first_name is distinct from 'Alice' then raise exception 'FAIL: tap lookup did not find the wallet'; end if;
  if r.email is not null then raise exception 'FAIL: email shown although show_email = false'; end if;
  if r.mobile is distinct from '+639171234567' then raise exception 'FAIL: mobile hidden although show_mobile = true'; end if;
  if r.photo_path is distinct from '00000000-0000-4000-8000-00000000000a/me.webp' then raise exception 'FAIL: tap lookup is missing the profile photo'; end if;
end $$;

-- ── Roles and permissions ────────────────────────────────────────────────────
-- A and B were given profiles with the default Wallet Owner role by the auth.users trigger.
reset role;
insert into public.roles (name) values ('rls-check Auditor'), ('rls-check Role Editor');
insert into public.role_permissions (role_id, permission_key)
  select id, 'wallets.view_all' from public.roles where name = 'rls-check Auditor'
  union all
  select id, 'roles.manage' from public.roles where name = 'rls-check Role Editor';

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-00000000000b","role":"authenticated"}', true);

do $$
declare n int;
begin
  select count(*) into n from public.profiles;
  if n <> 1 then raise exception 'FAIL: a Wallet Owner can see other users'' profiles'; end if;

  select count(*) into n from public.roles;
  if n <> 1 then raise exception 'FAIL: a Wallet Owner can see roles other than their own'; end if;

  begin
    update public.profiles set must_change_password = false;
    raise exception 'FAIL: a user can write to profiles';
  exception when insufficient_privilege then null;
  end;

  begin
    insert into public.roles (name) values ('Mallory Admins');
    raise exception 'FAIL: a Wallet Owner created a role';
  exception when insufficient_privilege then null;
  end;
end $$;

-- B becomes an Auditor: can see every wallet but not change any.
reset role;
update public.profiles set role_id = (select id from public.roles where name = 'rls-check Auditor')
  where id = '00000000-0000-4000-8000-00000000000b';
set local role authenticated;

do $$
declare n int;
begin
  select count(*) into n from public.wallets where owner_id = '00000000-0000-4000-8000-00000000000a';
  if n <> 1 then raise exception 'FAIL: wallets.view_all cannot see other wallets'; end if;

  update public.wallets set first_name = 'Hacked' where owner_id = '00000000-0000-4000-8000-00000000000a';
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'FAIL: wallets.view_all could edit another wallet'; end if;
end $$;

-- B becomes a Role Editor: may shape roles, but only with permissions B holds.
reset role;
update public.profiles set role_id = (select id from public.roles where name = 'rls-check Role Editor')
  where id = '00000000-0000-4000-8000-00000000000b';
set local role authenticated;

do $$
begin
  begin
    perform public.save_role(null, 'rls-check Escalation', '', array['users.manage']);
    raise exception 'FAIL: a Role Editor granted a permission they do not hold';
  exception when insufficient_privilege then null;
  end;

  perform public.save_role(null, 'rls-check Helpers', '', array['roles.manage']);

  begin
    update public.roles set name = 'Pwned' where is_super;
    raise exception 'FAIL: the System Administrator role could be renamed';
  exception when check_violation then null;
  end;

  begin
    delete from public.roles where name = 'Wallet Owner';
    raise exception 'FAIL: a built-in role could be deleted';
  exception when check_violation then null;
  end;
end $$;

-- Database-level guards (run as the owner, like a manual edit in the dashboard).
reset role;

do $$
begin
  begin
    delete from public.roles where name = 'rls-check Role Editor';  -- B still has it
    raise exception 'FAIL: a role in use could be deleted';
  exception when foreign_key_violation then null;
  end;

  -- Make A the only active System Administrator (real admins are switched off inside this
  -- rolled-back transaction), then try to switch A off too.
  update public.profiles set role_id = (select id from public.roles where is_super)
    where id = '00000000-0000-4000-8000-00000000000a';
  update public.profiles set is_active = false
    where id <> '00000000-0000-4000-8000-00000000000a'
      and role_id = (select id from public.roles where is_super);

  begin
    update public.profiles set is_active = false where id = '00000000-0000-4000-8000-00000000000a';
    raise exception 'FAIL: the last System Administrator could be deactivated';
  exception when check_violation then null;
  end;

  begin
    update public.profiles set role_id = (select id from public.roles where is_default)
      where id = '00000000-0000-4000-8000-00000000000a';
    raise exception 'FAIL: the last System Administrator could be demoted';
  exception when check_violation then null;
  end;
end $$;

-- A deactivated owner: no access to their own wallets, and their tap page goes dark.
update public.profiles set role_id = (select id from public.roles where is_default), is_active = false
  where id = '00000000-0000-4000-8000-00000000000b';
update public.wallets set owner_id = '00000000-0000-4000-8000-00000000000b'
  where token_hash = repeat('a', 64);
set local role authenticated;

do $$
declare n int;
begin
  select count(*) into n from public.wallets;
  if n <> 0 then raise exception 'FAIL: a deactivated user can still read their wallets'; end if;
end $$;

set local role anon;

do $$
declare n int;
begin
  select count(*) into n from public.get_public_wallet(repeat('a', 64));
  if n <> 0 then raise exception 'FAIL: a deactivated owner''s wallet is still on the tap page'; end if;
end $$;

-- ── Usernames ────────────────────────────────────────────────────────────────
reset role;

do $$
begin
  if not exists (
    select 1 from public.profiles
    where id = '00000000-0000-4000-8000-00000000000a' and username ~ '^user_[0-9a-f]{8}$'
  ) then
    raise exception 'FAIL: a new auth user did not get a placeholder username';
  end if;

  begin
    update public.profiles set username = 'Bad Name!' where id = '00000000-0000-4000-8000-00000000000a';
    raise exception 'FAIL: a malformed username was accepted';
  exception when check_violation then null;
  end;

  begin
    update public.profiles set username = 'ab' where id = '00000000-0000-4000-8000-00000000000a';
    raise exception 'FAIL: a too-short username was accepted';
  exception when check_violation then null;
  end;

  update public.profiles set username = 'rls.check.alice' where id = '00000000-0000-4000-8000-00000000000a';
  begin
    update public.profiles set username = 'rls.check.alice' where id = '00000000-0000-4000-8000-00000000000b';
    raise exception 'FAIL: a duplicate username was accepted';
  exception when unique_violation then null;
  end;
end $$;

-- ── Deactivated wallets disappear from the tap page ──────────────────────────
reset role;
update public.profiles set is_active = true where id = '00000000-0000-4000-8000-00000000000b';
update public.wallets set is_active = false where token_hash = repeat('a', 64);
set local role anon;

do $$
declare n int;
begin
  select count(*) into n from public.get_public_wallet(repeat('a', 64));
  if n <> 0 then raise exception 'FAIL: inactive wallet still visible on the tap page'; end if;
end $$;

reset role;
rollback;

select 'ALL ACCESS-CONTROL CHECKS PASSED' as result;
