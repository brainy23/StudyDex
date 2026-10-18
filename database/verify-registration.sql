-- Run in the SQL editor after registration.sql and registration-avatar.sql.
-- All temporary users and profiles are rolled back; no email is sent.
begin;

do $$
declare
  choice text;
  test_user uuid;
  invalid_user uuid := gen_random_uuid();
  level_number_to_test smallint := 1;
  expected_level uuid;
begin
  foreach choice in array array['male', 'female', 'prefer_not_to_say'] loop
    test_user := gen_random_uuid();
    select id into expected_level from public.levels where level_number = level_number_to_test;
    insert into auth.users (id, email, raw_user_meta_data)
    values (test_user, 'profile-verification-' || test_user || '@example.invalid',
      jsonb_build_object('display_name', ' Verification ', 'school_level_number', level_number_to_test, 'avatar_choice', choice));

    if not exists (select 1 from public.profiles where id = test_user
      and display_name = 'Verification' and school_level_id = expected_level and avatar_choice = choice) then
      raise exception 'Profile details were not saved correctly for %', choice;
    end if;
    if level_number_to_test = 1 then
      perform set_config('request.jwt.claim.sub', test_user::text, true);
    end if;
    level_number_to_test := level_number_to_test + 1;
  end loop;

  begin
    insert into auth.users (id, email, raw_user_meta_data)
    values (invalid_user, 'invalid-profile-' || invalid_user || '@example.invalid',
      jsonb_build_object('display_name', 'Invalid', 'school_level_number', 1, 'avatar_choice', 'invalid'));
    raise exception 'An invalid avatar was accepted';
  exception when check_violation then
    null;
  end;
  if exists (select 1 from auth.users where id = invalid_user) then
    raise exception 'Invalid avatar left a partial Auth account';
  end if;
end;
$$;

set local role authenticated;
do $$
begin
  if (select count(*) from public.profiles) <> 1 then
    raise exception 'Profile ownership policy failed';
  end if;
  if not exists (select 1 from public.profiles where id = auth.uid() and avatar_choice = 'male') then
    raise exception 'Saved profile is inaccessible to its owner';
  end if;
end;
$$;
reset role;

set local role anon;
do $$
begin
  if (select count(*) from public.levels) <> 6 then
    raise exception 'School levels are inaccessible';
  end if;
  begin
    perform * from public.profiles;
    raise exception 'Anonymous profile access was allowed';
  exception when insufficient_privilege then
    null;
  end;
end;
$$;
reset role;

rollback;
select 'All avatar choices, profile fields, ownership rules, and rollback checks passed' as verification;
