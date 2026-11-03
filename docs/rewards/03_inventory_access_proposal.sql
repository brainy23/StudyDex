-- proposed only; do not execute without separate explicit approval.
-- apply only after the approved preflight confirms the expected schema/policies.
-- grants own-pack reads only; creates no packs, pokemon, xp, or earning rules.
begin;
set local lock_timeout = '3s';
set local statement_timeout = '20s';

create policy studydex_read_own_packs
on public.user_packs for select to authenticated
using ((select auth.uid()) = user_id);

grant select (id, user_id, earned_at, opened_at) on public.user_packs to authenticated;

create function public.get_reward_inventory()
returns jsonb
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  student_id uuid := auth.uid();
  inventory jsonb;
begin
  if student_id is null then
    raise exception 'authentication required' using errcode = '28000';
  end if;
  with unopened as materialized (
    select id, earned_at
    from public.user_packs
    where user_id = student_id and opened_at is null
  ), first_packs as (
    select id, earned_at from unopened order by earned_at, id limit 20
  )
  select jsonb_build_object(
    'user_id', student_id,
    'unopened_count', (select count(*) from unopened),
    'packs', coalesce((select jsonb_agg(to_jsonb(p) order by p.earned_at, p.id)
      from first_packs p), '[]'::jsonb)
  ) into inventory;
  return inventory;
end;
$$;

revoke all on function public.get_reward_inventory() from public, anon;
grant execute on function public.get_reward_inventory() to authenticated;
commit;
