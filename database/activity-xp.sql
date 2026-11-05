-- Run manually in the Supabase SQL Editor for the project used by this app.
-- Example rules: timer +10 (first four per user per Singapore day), flashcards +10,
-- boss victory +30, boss loss -10. Edit these rules before running if needed.
-- This saves activity XP only. It does not open packs, evolve Pokemon,
-- change levels, or verify activity completion against server-side records.
begin;

create table public.studydex_xp_events (
  user_id uuid not null references public.profiles(id),
  event_id uuid not null,
  pokemon_record_id uuid not null references public.user_pokemon(id),
  reward_type text not null check (reward_type in ('timer', 'flashcards', 'boss')),
  requested_delta integer not null,
  applied_delta integer not null,
  result jsonb not null,
  created_at timestamptz not null default now(),
  primary key (user_id, event_id)
);

alter table public.studydex_xp_events enable row level security;
create policy read_own_xp_events on public.studydex_xp_events
  for select to authenticated using ((select auth.uid()) = user_id);
revoke all on public.studydex_xp_events from public, anon, authenticated;
grant select on public.studydex_xp_events to authenticated;

create or replace function public.award_studydex_xp(
  p_event_id uuid,
  p_pokemon_record_id text,
  p_reward_type text,
  p_correct integer default null,
  p_total integer default null,
  p_boss_health integer default null
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_buddy public.user_pokemon%rowtype;
  v_previous public.studydex_xp_events%rowtype;
  v_name text;
  v_delta integer;
  v_xp integer;
  v_count integer;
  v_day_start timestamptz;
  v_result jsonb;
begin
  if v_uid is null then
    raise exception 'Sign in before earning XP.';
  end if;
  if p_event_id is null or p_pokemon_record_id is null then
    raise exception 'An event ID and Pokemon record ID are required.';
  end if;

  -- Serialize this user's awards, including timer-limit checks and retries.
  perform 1 from public.profiles where id = v_uid for update;
  if not found then raise exception 'Your profile was not found.'; end if;

  select * into v_previous from public.studydex_xp_events
    where user_id = v_uid and event_id = p_event_id;
  if found then
    if v_previous.pokemon_record_id <> p_pokemon_record_id::uuid
       or v_previous.reward_type is distinct from p_reward_type then
      raise exception 'This event ID was already used for a different reward.';
    end if;
    return v_previous.result || jsonb_build_object('duplicate', true);
  end if;

  select * into v_buddy from public.user_pokemon
    where id = p_pokemon_record_id::uuid and user_id = v_uid
    for update;
  if not found then raise exception 'This Pokemon does not belong to you.'; end if;
  if not v_buddy.is_selected then
    raise exception 'Select this Pokemon as your buddy before earning XP.';
  end if;
  if v_buddy.is_defeated then
    raise exception 'Choose a buddy that is not defeated.';
  end if;

  -- The current app sends no quiz scores for these three activity types.
  if p_correct is not null or p_total is not null then
    raise exception 'Quiz rewards are not configured in this function.';
  end if;

  case p_reward_type
    when 'timer' then
      if p_boss_health is not null then raise exception 'Unexpected boss health.'; end if;
      v_day_start := date_trunc('day', now() at time zone 'Asia/Singapore')
        at time zone 'Asia/Singapore';
      select count(*) into v_count from public.studydex_xp_events
        where user_id = v_uid and reward_type = 'timer' and requested_delta = 10
          and created_at >= v_day_start
          and created_at < v_day_start + interval '24 hours';
      v_delta := case when v_count < 4 then 10 else 0 end;
    when 'flashcards' then
      if p_boss_health is not null then raise exception 'Unexpected boss health.'; end if;
      v_delta := 10;
    when 'boss' then
      if p_boss_health is null or p_boss_health < 0 then
        raise exception 'Boss health must be zero or greater.';
      end if;
      v_delta := case when p_boss_health = 0 then 30 else -10 end;
    else
      raise exception 'Unsupported reward type: %', p_reward_type;
  end case;

  v_xp := greatest(0, v_buddy.xp + v_delta);
  update public.user_pokemon set xp = v_xp where id = v_buddy.id;
  select name into v_name from public.pokemon where id = v_buddy.pokemon_id;

  v_result := jsonb_build_object(
    'pokemonRecordId', v_buddy.id,
    'pokemonName', v_name,
    'delta', v_delta,
    'appliedDelta', v_xp - v_buddy.xp,
    'xp', v_xp,
    'level', v_buddy.level,
    'duplicate', false,
    'reachedMaxEvolution', false
  );

  insert into public.studydex_xp_events
    (user_id, event_id, pokemon_record_id, reward_type, requested_delta, applied_delta, result)
  values
    (v_uid, p_event_id, v_buddy.id, p_reward_type, v_delta, v_xp - v_buddy.xp, v_result);
  return v_result;
end;
$$;

revoke all on function public.award_studydex_xp(uuid, text, text, integer, integer, integer)
  from public, anon, authenticated;
grant execute on function public.award_studydex_xp(uuid, text, text, integer, integer, integer)
  to authenticated;

notify pgrst, 'reload schema';
commit;
