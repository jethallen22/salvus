-- Salvus: user profiles store first, middle and last name instead of one full_name.
-- Apply in the Supabase SQL editor after 20261017105630_usernames.sql.
-- Run it once: it drops profiles.full_name at the end.

alter table public.profiles
  add column first_name  text not null default '' check (char_length(first_name) <= 50),
  add column middle_name text check (char_length(middle_name) <= 50),
  add column last_name   text not null default '' check (char_length(last_name) <= 50);

-- Split existing names: first word → first name, last word → last name, anything between → middle.
-- A single word becomes the first name; a blank name stays blank. Edit it in Users to fix it up.
with parts as (
  select id, regexp_split_to_array(btrim(full_name), '\s+') as w
  from public.profiles
  where btrim(full_name) <> ''
)
update public.profiles p
set first_name  = left(parts.w[1], 50),
    last_name   = case when array_length(parts.w, 1) > 1 then left(parts.w[array_length(parts.w, 1)], 50) else '' end,
    middle_name = case when array_length(parts.w, 1) > 2
                       then left(array_to_string(parts.w[2:array_length(parts.w, 1) - 1], ' '), 50) end
from parts
where parts.id = p.id;

alter table public.profiles drop column full_name;
