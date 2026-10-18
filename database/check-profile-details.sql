-- Read-only: run in the Supabase SQL Editor before and after editing in the app.
-- 1. Replace your-email@example.com with your current login email and run.
-- 2. Copy user_uuid from the result. Replace NULL below with 'copied-uuid'::uuid.
--    This keeps the lookup working even if you change your email.
-- 3. Keep the before result (or take a screenshot).
-- 4. In the app: Edit Profile -> change details -> Save profile.
--    Email changes use the separate Request email change button.
-- 5. Run this same query again and compare with the before result.
--    user_uuid should stay the same; the edited values should change.

with target as (
  select
    'your-email@example.com'::text as login_email,
    null::uuid as user_uuid
)
select
  statement_timestamp() as checked_at,
  u.id as user_uuid,
  u.email as sign_in_email,
  (p.id is not null) as profile_exists,
  p.display_name,
  p.avatar_choice,
  p.school_level_id,
  l.level_number,
  l.name as school_level
from auth.users u
cross join target t
left join public.profiles p on p.id = u.id
left join public.levels l on l.id = p.school_level_id
where
  case
    when t.user_uuid is not null then u.id = t.user_uuid
    else lower(u.email) = lower(btrim(t.login_email))
  end;
