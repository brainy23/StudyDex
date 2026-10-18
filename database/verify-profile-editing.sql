-- Run after registration.sql, registration-avatar.sql, and profile-editing.sql.
-- Tests the authenticated/anonymous roles, not the SQL editor's admin access.
-- Temporary Auth users are created directly in a transaction; no emails are sent.
-- Everything is rolled back, including successful profile edits.
begin;

do $$
declare
  owner_id uuid := gen_random_uuid();
  other_id uuid := gen_random_uuid();
  next_level uuid;
begin
  select id into strict next_level from public.levels where level_number = 2;

  insert into auth.users (id, email, raw_user_meta_data)
  values
    (owner_id, 'profile-edit-owner-' || owner_id || '@example.invalid',
      jsonb_build_object('display_name', 'Original trainer', 'school_level_number', 1, 'avatar_choice', 'male')),
    (other_id, 'profile-edit-other-' || other_id || '@example.invalid',
      jsonb_build_object('display_name', 'Other trainer', 'school_level_number', 1, 'avatar_choice', 'female'));

  perform set_config('studydex.profile_test_owner', owner_id::text, true);
  perform set_config('studydex.profile_test_other', other_id::text, true);
  perform set_config('studydex.profile_test_level', next_level::text, true);
  perform set_config('request.jwt.claim.sub', owner_id::text, true);
  perform set_config('request.jwt.claims', jsonb_build_object('sub', owner_id, 'role', 'authenticated')::text, true);
end;
$$;

set local role authenticated;
do $$
declare
  saved public.profiles%rowtype;
  choice text;
  affected integer;
  next_level uuid := current_setting('studydex.profile_test_level')::uuid;
begin
  if auth.uid() is distinct from current_setting('studydex.profile_test_owner')::uuid then
    raise exception 'Test authentication context was not set';
  end if;
  if (select count(*) from public.profiles) <> 1 then
    raise exception 'Users must only be able to read their own profile';
  end if;

  foreach choice in array array['male', 'female', 'prefer_not_to_say'] loop
    update public.profiles
    set display_name = 'Edited trainer', school_level_id = next_level, avatar_choice = choice
    where id = auth.uid()
    returning * into saved;

    if not found then
      raise exception 'Owner update affected no rows';
    end if;
    if saved.display_name is distinct from 'Edited trainer'
      or saved.school_level_id is distinct from next_level
      or saved.avatar_choice is distinct from choice then
      raise exception 'The updated profile fields were not returned correctly';
    end if;
    if not exists (
      select 1 from public.profiles p
      join public.levels l on l.id = p.school_level_id
      where p.id = auth.uid() and l.level_number = 2 and p.avatar_choice = choice
    ) then
      raise exception 'The saved profile and readable school level could not be reloaded';
    end if;
  end loop;

  update public.profiles set display_name = 'Not allowed'
  where id = current_setting('studydex.profile_test_other')::uuid;
  get diagnostics affected = row_count;
  if affected <> 0 then
    raise exception 'A user updated another user''s profile';
  end if;

  begin
    update public.profiles set id = gen_random_uuid() where id = auth.uid();
    raise exception 'Updating the profile owner ID was allowed';
  exception when insufficient_privilege then null;
  end;

  begin
    update public.profiles set created_at = now() where id = auth.uid();
    raise exception 'Updating the creation timestamp was allowed';
  exception when insufficient_privilege then null;
  end;

  begin
    update public.profiles set display_name = '   ' where id = auth.uid();
    raise exception 'A blank display name was accepted';
  exception when check_violation then null;
  end;

  begin
    update public.profiles set avatar_choice = 'invalid' where id = auth.uid();
    raise exception 'An invalid avatar was accepted';
  exception when check_violation then null;
  end;

  begin
    delete from public.profiles where id = auth.uid();
    raise exception 'Deleting a profile was allowed';
  exception when insufficient_privilege then null;
  end;

  begin
    insert into public.profiles (id, display_name) values (gen_random_uuid(), 'Not allowed');
    raise exception 'Direct profile creation was allowed';
  exception when insufficient_privilege then null;
  end;
end;
$$;
reset role;

do $$
begin
  if not exists (
    select 1 from public.profiles
    where id = current_setting('studydex.profile_test_other')::uuid
      and display_name = 'Other trainer' and avatar_choice = 'female'
  ) then
    raise exception 'The other user''s profile was changed';
  end if;
  perform set_config('request.jwt.claim.sub', '', true);
  perform set_config('request.jwt.claims', '{}', true);
end;
$$;

set local role authenticated;
do $$
declare
  affected integer;
begin
  if (select count(*) from public.profiles) <> 0 then
    raise exception 'A request without a user ID could read profiles';
  end if;
  update public.profiles set avatar_choice = 'male';
  get diagnostics affected = row_count;
  if affected <> 0 then
    raise exception 'A request without a user ID could update profiles';
  end if;
end;
$$;
reset role;

set local role anon;
do $$
begin
  begin
    perform * from public.profiles;
    raise exception 'Anonymous profile reads were allowed';
  exception when insufficient_privilege then null;
  end;
  begin
    update public.profiles set avatar_choice = 'male';
    raise exception 'Anonymous profile updates were allowed';
  exception when insufficient_privilege then null;
  end;
end;
$$;
reset role;

rollback;
select 'PASS: profile edits, all avatar choices, level lookup, ownership, protected columns, validation, and anonymous denial; all test data rolled back' as verification;
