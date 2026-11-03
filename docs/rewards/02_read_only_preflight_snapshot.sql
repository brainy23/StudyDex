-- single-result replacement; proposed only: project sbrteylcizwkzetcqdro; requires explicit approval.
-- metadata and aggregate counts only; no student identifiers or answer keys.
begin transaction isolation level repeatable read read only;
set local statement_timeout = '20s';
set local lock_timeout = '3s';
select jsonb_build_object(
  'identity', (select coalesce(jsonb_agg(to_jsonb(r)), '[]'::jsonb) from (
select current_database() as database_name, current_user as executing_role,
  current_setting('transaction_read_only') as read_only,
  version() as postgres_version
  ) r),
  'relations', (select coalesce(jsonb_agg(to_jsonb(r)), '[]'::jsonb) from (
select n.nspname as schema_name, c.relname as table_name,
  c.relrowsecurity as rls_enabled, c.relforcerowsecurity as force_rls
from pg_catalog.pg_class c
join pg_catalog.pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname in ('user_packs', 'user_pokemon', 'pokemon', 'profiles')
order by c.relname
  ) r),
  'columns', (select coalesce(jsonb_agg(to_jsonb(r)), '[]'::jsonb) from (
select table_name, column_name, data_type, is_nullable, column_default
from information_schema.columns
where table_schema = 'public'
  and table_name in ('user_packs', 'user_pokemon', 'pokemon')
order by table_name, ordinal_position
  ) r),
  'constraints', (select coalesce(jsonb_agg(to_jsonb(r)), '[]'::jsonb) from (
select c.relname as table_name, k.conname as constraint_name,
  pg_catalog.pg_get_constraintdef(k.oid) as definition, k.convalidated
from pg_catalog.pg_constraint k
join pg_catalog.pg_class c on c.oid = k.conrelid
join pg_catalog.pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname in ('user_packs', 'user_pokemon', 'pokemon')
order by c.relname, k.conname
  ) r),
  'policies', (select coalesce(jsonb_agg(to_jsonb(r)), '[]'::jsonb) from (
select tablename, policyname, roles, cmd, qual, with_check
from pg_catalog.pg_policies
where schemaname = 'public'
  and tablename in ('user_packs', 'user_pokemon', 'pokemon')
order by tablename, policyname
  ) r),
  'privileges', (select coalesce(jsonb_agg(to_jsonb(r)), '[]'::jsonb) from (
select r.rolname as role_name, t.table_name, p.privilege,
  has_table_privilege(r.oid, 'public.' || t.table_name, p.privilege) as effective
from pg_catalog.pg_roles r
cross join (values ('user_packs'), ('user_pokemon'), ('pokemon')) t(table_name)
cross join (values ('select'), ('insert'), ('update'), ('delete'), ('truncate')) p(privilege)
where r.rolname in ('anon', 'authenticated')
order by r.rolname, t.table_name, p.privilege
  ) r),
  'functions', (select coalesce(jsonb_agg(to_jsonb(r)), '[]'::jsonb) from (
select n.nspname as schema_name, p.proname as function_name,
  pg_catalog.pg_get_function_identity_arguments(p.oid) as arguments,
  p.prosecdef as security_definer, p.proconfig as settings,
  p.proacl as explicit_privileges
from pg_catalog.pg_proc p
join pg_catalog.pg_namespace n on n.oid = p.pronamespace
where n.nspname in ('public', 'private')
order by n.nspname, p.proname
  ) r),
  'packs', (select coalesce(jsonb_agg(to_jsonb(r)), '[]'::jsonb) from (
select count(*) as earned_packs,
  count(*) filter (where opened_at is null) as unopened_packs,
  count(*) filter (where opened_at is not null) as opened_packs
from public.user_packs
  ) r),
  'catalogue', (select coalesce(jsonb_agg(to_jsonb(r)), '[]'::jsonb) from (
select count(*) as catalogue_size,
  count(*) filter (where evolves_from_id is null) as catalogue_base_forms
from public.pokemon
  ) r),
  'ownership', (select coalesce(jsonb_agg(to_jsonb(r)), '[]'::jsonb) from (
select count(*) as owned_pokemon from public.user_pokemon
  ) r),
  'triggers', (select coalesce(jsonb_agg(to_jsonb(r)), '[]'::jsonb) from (
select event_object_table, trigger_name, action_timing, event_manipulation,
  action_statement
from information_schema.triggers
where event_object_schema = 'public'
  and event_object_table in ('user_packs', 'user_pokemon', 'pokemon')
order by event_object_table, trigger_name
  ) r)
) as rewards_preflight;
commit;
