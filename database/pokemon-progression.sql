-- Apply once in the project's Supabase SQL Editor after activity-xp.sql.
-- Vue calculates rewards, levels and evolution. This function only persists the
-- supplied final state and event together, with ownership, retry and stale-write checks.
begin;

create or replace function public.save_studydex_progression(
  p_event_id uuid, p_pokemon_record_id uuid, p_reward_type text,
  p_expected jsonb, p_result jsonb
) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_buddy public.user_pokemon%rowtype;
  v_previous public.studydex_xp_events%rowtype;
  v_species uuid;
begin
  if v_uid is null then raise exception 'Sign in before saving Pokémon progress.'; end if;
  if p_event_id is null or p_reward_type not in ('timer', 'flashcards', 'boss') then
    raise exception 'Invalid activity.';
  end if;
  perform 1 from public.profiles where id = v_uid for update;
  if not found then raise exception 'Your profile was not found.'; end if;

  select * into v_previous from public.studydex_xp_events
    where user_id = v_uid and event_id = p_event_id;
  if found then
    if v_previous.pokemon_record_id <> p_pokemon_record_id
       or v_previous.reward_type <> p_reward_type then
      raise exception 'This activity was already used for another reward.';
    end if;
    return v_previous.result || jsonb_build_object('duplicate', true);
  end if;

  select * into v_buddy from public.user_pokemon
    where id = p_pokemon_record_id and user_id = v_uid for update;
  if not found then raise exception 'This Pokémon does not belong to you.'; end if;
  if not v_buddy.is_selected then raise exception 'Select this Pokémon as your buddy first.'; end if;
  if v_buddy.pokemon_id is distinct from (p_expected->>'pokemon_id')::uuid
     or v_buddy.xp is distinct from (p_expected->>'xp')::integer
     or v_buddy.level is distinct from (p_expected->>'level')::integer then
    raise exception 'Your Pokémon changed in another activity. Retry to refresh its progress.';
  end if;
  if (p_result->>'pokemonRecordId')::uuid is distinct from p_pokemon_record_id
     or p_result->>'rewardType' is distinct from p_reward_type
     or (p_result->>'xp')::integer is null or (p_result->>'xp')::integer < 0
     or (p_result->>'level')::integer is null or (p_result->>'level')::integer < 1
     or (p_result->>'delta')::integer is null
     or (p_result->>'appliedDelta')::integer is null then
    raise exception 'Invalid Pokémon progress.';
  end if;

  -- PokéAPI numeric IDs are NOT the UUIDs used by the Pokémon catalogue.
  select id into strict v_species from public.pokemon
    where regexp_replace(lower(replace(replace(name, '♀', 'f'), '♂', 'm')), '[^a-z0-9]', '', 'g')
      = regexp_replace(lower(p_result->>'pokemonName'), '[^a-z0-9]', '', 'g');

  update public.user_pokemon set
    pokemon_id = v_species,
    xp = (p_result->>'xp')::integer,
    level = (p_result->>'level')::integer,
    is_defeated = coalesce((p_result->'pokemon'->>'is_defeated')::boolean, false)
    where id = v_buddy.id;

  insert into public.studydex_xp_events
    (user_id, event_id, pokemon_record_id, reward_type, requested_delta, applied_delta, result)
  values (v_uid, p_event_id, v_buddy.id, p_reward_type,
    (p_result->>'delta')::integer, (p_result->>'appliedDelta')::integer, p_result);
  return p_result;
end;
$$;

revoke all on function public.save_studydex_progression(uuid, uuid, text, jsonb, jsonb)
  from public, anon, authenticated;
grant execute on function public.save_studydex_progression(uuid, uuid, text, jsonb, jsonb)
  to authenticated;
-- Retire the XP-only write path so old clients cannot silently skip progression.
revoke execute on function public.award_studydex_xp(uuid, text, text, integer, integer, integer)
  from authenticated;
notify pgrst, 'reload schema';
commit;
