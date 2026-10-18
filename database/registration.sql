-- Registration setup for the existing StudyDex profiles and levels tables.
-- Auth owns email and password; the profile contains only app information.
begin;

create schema if not exists private;

create function private.create_registration_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  profile_name text;
  selected_level uuid;
begin
  profile_name := coalesce(nullif(btrim(new.raw_user_meta_data ->> 'display_name'), ''), split_part(new.email, '@', 1));
  if profile_name is null or char_length(profile_name) > 80 then
    raise exception 'Display name must contain between 1 and 80 characters';
  end if;

  if new.raw_user_meta_data ? 'school_level_number' then
    select id into selected_level from public.levels
    where level_number = (new.raw_user_meta_data ->> 'school_level_number')::smallint;
    if selected_level is null then
      raise exception 'Choose a valid Primary level';
    end if;
  end if;

  insert into public.profiles (id, display_name, school_level_id)
  values (new.id, profile_name, selected_level);
  return new;
end;
$$;

-- This function runs only through the Auth trigger, never through the Data API.
revoke all on function private.create_registration_profile() from public, anon, authenticated;

create trigger studydex_registration_profile
after insert on auth.users
for each row execute function private.create_registration_profile();

alter table public.profiles enable row level security;
alter table public.levels enable row level security;
revoke all on public.profiles from anon, authenticated;
grant select on public.profiles to authenticated;
revoke all on public.levels from anon, authenticated;
grant select on public.levels to anon, authenticated;

create policy "Users can read their own profile"
on public.profiles for select to authenticated
using ((select auth.uid()) = id);

create policy "Anyone can read school levels"
on public.levels for select to anon, authenticated
using (true);

commit;
