-- Follow-up to registration.sql and registration-avatar.sql.
-- Users can update only their own editable profile fields.
begin;

alter table public.profiles enable row level security;

alter table public.profiles
add constraint profiles_display_name_valid
check (char_length(btrim(display_name)) between 1 and 80);

-- The update response reads the saved profile and joins its school level.
grant select on public.profiles to authenticated;
-- Keep id and created_at read-only; do not grant table-wide UPDATE.
grant update (display_name, school_level_id, avatar_choice)
on public.profiles to authenticated;

create policy "Users can update their own profile"
on public.profiles for update to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

commit;
