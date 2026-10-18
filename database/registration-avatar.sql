-- Follow-up to registration.sql: save the signup avatar choice.
begin;

alter table public.profiles
add column avatar_choice text not null default 'prefer_not_to_say'
constraint profiles_avatar_choice_check check (avatar_choice in ('male', 'female', 'prefer_not_to_say'));

create or replace function private.create_registration_profile()
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

  insert into public.profiles (id, display_name, school_level_id, avatar_choice)
  values (new.id, profile_name, selected_level, coalesce(new.raw_user_meta_data ->> 'avatar_choice', 'prefer_not_to_say'));
  return new;
end;
$$;

revoke all on function private.create_registration_profile() from public, anon, authenticated;

commit;
