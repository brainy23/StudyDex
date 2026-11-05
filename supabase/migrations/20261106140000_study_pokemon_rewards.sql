-- Saved Pokémon use a 200 total-XP cap across study rewards, packs and transfers.
CREATE OR REPLACE FUNCTION private.studydex_ensure_recovery(uid uuid)
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare existing_pack uuid; new_pack uuid;
begin
  if not exists (select 1 from public.user_pokemon where user_id = uid)
    or exists (select 1 from public.user_pokemon where user_id = uid and NOT private.studydex_pokemon_is_max(id,uid))
    or not exists (select 1 from public.pokemon p where p.evolves_from_id is null
      and not exists (select 1 from public.user_pokemon u where u.user_id = uid and u.pokemon_id = p.id)) then return; end if;
  select a.recovery_pack_id into existing_pack from private.studydex_reward_accounts a
    join public.user_packs p on p.id = a.recovery_pack_id and p.user_id = uid and p.opened_at is null where a.user_id = uid;
  if existing_pack is not null then return; end if;
  insert into public.user_packs(user_id) values (uid) returning id into new_pack;
  update private.studydex_reward_accounts set recovery_pack_id = new_pack where user_id = uid;
end;
$function$
;

CREATE OR REPLACE FUNCTION private.studydex_owned_pokemon(owned_id uuid, student_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SET search_path TO ''
AS $function$
declare owned public.user_pokemon%rowtype; base public.pokemon%rowtype;
  current_form public.pokemon%rowtype; stage_count integer; stage integer; is_max boolean;
begin
  select * into strict owned from public.user_pokemon where id = owned_id and user_id = student_id;
  select * into strict base from public.pokemon where id = owned.pokemon_id;
  with recursive forms as (
    select p.id, 0 as depth from public.pokemon p where p.id = base.id
    union all
    select p.id, f.depth + 1 from forms f join public.pokemon p on p.evolves_from_id = f.id where f.depth < 2
  ) select max(depth) + 1 into stage_count from forms;
  stage := case when stage_count = 3 and owned.xp >= 175 then 2
    when stage_count = 3 and owned.xp >= 75 then 1
    when stage_count = 2 and owned.xp >= 125 then 1 else 0 end;
  with recursive forms as (
    select p.*, 0 as depth from public.pokemon p where p.id = base.id
    union all
    select p.*, f.depth + 1 from forms f join public.pokemon p on p.evolves_from_id = f.id where f.depth < 2
  ) select id, pokeapi_id, name, sprite_url, evolves_from_id, created_at into current_form
    from forms where depth = stage order by pokeapi_id limit 1;
  -- MAX means the final form has completed its XP bar, matching PokeSprite.
  is_max := owned.xp >= 200 AND NOT EXISTS (
    SELECT 1 FROM public.pokemon WHERE evolves_from_id = current_form.id
  );
  return jsonb_build_object(
    'owned_id', owned.id, 'pokemon_id', base.id, 'pokeapi_id', current_form.pokeapi_id,
    'original_pokeapi_id', base.pokeapi_id, 'name', current_form.name,
    'sprite_url', current_form.sprite_url, 'xp', owned.xp, 'level', stage + 1,
    'stage_count', stage_count,
    'evolution_stage', CASE WHEN is_max THEN to_jsonb('MAX'::text) ELSE to_jsonb(stage) END,
    'is_max_evolution', is_max, 'fully_trained', is_max,
    'is_selected', owned.is_selected, 'is_defeated', owned.is_defeated,
    'obtained_at', owned.obtained_at
  );
end;
$function$
;

-- Use the saved Pokédex's MAX state everywhere recipients are checked.
CREATE FUNCTION private.studydex_pokemon_is_max(owned_id uuid, student_id uuid)
RETURNS boolean LANGUAGE sql STABLE SET search_path='' AS $$
  SELECT private.studydex_owned_pokemon(owned_id,student_id)->>'evolution_stage' = 'MAX';
$$;
REVOKE ALL ON FUNCTION private.studydex_pokemon_is_max(uuid,uuid) FROM PUBLIC,anon,authenticated;

CREATE OR REPLACE FUNCTION private.studydex_open_reward_pack(p_pack_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare uid uuid := private.studydex_reward_uid(); pack public.user_packs%rowtype;
  drawn public.pokemon%rowtype; buddy public.user_pokemon%rowtype; existing uuid; acquired uuid;
  recovery uuid; must_be_new boolean; applied integer := 0; pending integer := 0; result jsonb;
begin
  perform 1 from public.profiles where id = uid for update;
  select * into pack from public.user_packs where id = p_pack_id and user_id = uid for update;
  if not found then raise exception 'choose one of your saved packs' using errcode = '42001'; end if;
  if pack.opened_at is not null then
    select r.result into result from private.studydex_pack_receipts r where r.pack_id = pack.id and r.user_id = uid;
    if result is null then raise exception 'saved pack result unavailable; please contact the team'; end if;
    return result;
  end if;
  if not exists (select 1 from public.user_pokemon where user_id = uid) then raise exception 'choose your starter first'; end if;
  insert into private.studydex_reward_accounts(user_id) values (uid) on conflict (user_id) do nothing;
  select recovery_pack_id into recovery from private.studydex_reward_accounts where user_id = uid for update;
  must_be_new := coalesce(recovery = pack.id, false)
    or not exists (select 1 from public.user_pokemon where user_id = uid and NOT private.studydex_pokemon_is_max(id,uid));
  select p.* into drawn from public.pokemon p where p.evolves_from_id is null
    and (not must_be_new or not exists (select 1 from public.user_pokemon u where u.user_id = uid and u.pokemon_id = p.id))
    order by random() limit 1;
  if drawn.id is null then raise exception 'your collection is fully trained; this pack has not been used'; end if;
  select id into existing from public.user_pokemon where user_id = uid and pokemon_id = drawn.id;
  if existing is null then
    insert into public.user_pokemon(user_id, pokemon_id, xp, level, is_selected, is_defeated)
      values (uid, drawn.id, 0, 1, false, false) returning id into acquired;
    update public.user_packs set opened_at = greatest(now(), earned_at), reward_type = 'pokemon',
      reward_pokemon_id = drawn.id where id = pack.id;
    result := jsonb_build_object('user_id', uid, 'pack_id', pack.id, 'reward_type', 'pokemon',
      'xp_awarded', 0, 'xp_applied', 0, 'xp_pending', 0, 'owned_id', acquired);
  else
    select * into buddy from public.user_pokemon where user_id = uid and is_selected for update;
    if not found then raise exception 'select your buddy before opening this pack'; end if;
    applied := least(25, greatest(0, 200 - buddy.xp)); pending := 25 - applied;
    update public.user_pokemon set xp = xp + applied where id = buddy.id;
    update public.user_pokemon set level = (private.studydex_owned_pokemon(buddy.id, uid)->>'level')::integer where id = buddy.id;
    update private.studydex_reward_accounts set pending_xp = pending_xp + pending where user_id = uid;
    update public.user_packs set opened_at = greatest(now(), earned_at), reward_type = 'xp',
      xp_awarded = 25, xp_recipient_id = buddy.id where id = pack.id;
    result := jsonb_build_object('user_id', uid, 'pack_id', pack.id, 'reward_type', 'xp',
      'xp_awarded', 25, 'xp_applied', applied, 'xp_pending', pending, 'xp_recipient_id', buddy.id);
  end if;
  result := result || jsonb_build_object('pokemon', jsonb_build_object('id', drawn.id,
    'pokeapi_id', drawn.pokeapi_id, 'name', drawn.name, 'sprite_url', drawn.sprite_url));
  insert into private.studydex_pack_receipts(pack_id, user_id, result) values (pack.id, uid, result);
  perform private.studydex_ensure_recovery(uid);
  return result;
end;
$function$
;

CREATE OR REPLACE FUNCTION private.studydex_select_user_pokemon(p_owned_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare uid uuid := private.studydex_reward_uid(); target public.user_pokemon%rowtype;
  pending integer; applied integer;
begin
  perform 1 from public.profiles where id = uid for update;
  select * into target from public.user_pokemon where id = p_owned_id and user_id = uid for update;
  if not found then raise exception 'choose a pokemon from your own collection' using errcode = '42001'; end if;
  update public.user_pokemon set is_selected = false where user_id = uid and is_selected;
  update public.user_pokemon set is_selected = true where id = target.id;
  select pending_xp into pending from private.studydex_reward_accounts where user_id = uid for update;
  applied := least(coalesce(pending, 0), greatest(0, 200 - target.xp));
  if applied > 0 then
    update public.user_pokemon set xp = xp + applied, is_defeated = false where id = target.id;
    update private.studydex_reward_accounts set pending_xp = pending_xp - applied where user_id = uid;
    update public.user_pokemon set level = (private.studydex_owned_pokemon(target.id, uid)->>'level')::integer where id = target.id;
  end if;
  perform private.studydex_ensure_recovery(uid);
  return private.studydex_get_user_pokemon();
end;
$function$
;

-- Keep study XP that exceeds a buddy's limit, then reuse the saved Pokédex,
-- pending-XP selection and recovery-pack machinery for the reward dialog.
CREATE OR REPLACE FUNCTION private.learning_apply_xp(p_uid uuid,p_id uuid,p_buddy uuid,p_type text,p_delta integer,p_input jsonb DEFAULT '{}'::jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE b public.user_pokemon%rowtype; previous public.studydex_xp_events%rowtype;
  x integer; overflow integer; result jsonb; form jsonb;
BEGIN
  IF auth.uid() IS DISTINCT FROM p_uid THEN RAISE EXCEPTION 'Account changed'; END IF;
  PERFORM 1 FROM public.profiles WHERE id=p_uid FOR UPDATE;
  SELECT * INTO previous FROM public.studydex_xp_events WHERE user_id=p_uid AND event_id=p_id;
  IF FOUND THEN
    IF previous.reward_type<>p_type OR previous.pokemon_record_id<>p_buddy THEN RAISE EXCEPTION 'Activity already used'; END IF;
    RETURN previous.result||jsonb_build_object('duplicate',true);
  END IF;
  SELECT * INTO STRICT b FROM public.user_pokemon WHERE id=p_buddy AND user_id=p_uid FOR UPDATE;
  x:=greatest(0,least(200,b.xp+p_delta));
  overflow:=greatest(0,p_delta-(x-b.xp));
  UPDATE public.user_pokemon SET xp=x,is_defeated=(p_delta<0 AND x=0) WHERE id=b.id;
  INSERT INTO private.studydex_reward_accounts(user_id,pending_xp) VALUES(p_uid,overflow)
    ON CONFLICT(user_id) DO UPDATE SET pending_xp=private.studydex_reward_accounts.pending_xp+excluded.pending_xp;
  form:=private.studydex_owned_pokemon(b.id,p_uid);
  UPDATE public.user_pokemon SET level=(form->>'level')::integer WHERE id=b.id;
  PERFORM private.studydex_ensure_recovery(p_uid);
  result:=jsonb_build_object('eventId',p_id,'rewardType',p_type,'pokemonRecordId',b.id,
    'pokemonName',form->>'name','delta',p_delta,'appliedDelta',x-b.xp,'xp',x,'level',(form->>'level')::integer,
    'overflowXP',overflow,'fullyTrained',(form->>'is_max_evolution')::boolean,'duplicate',false);
  INSERT INTO public.studydex_xp_events(user_id,event_id,pokemon_record_id,reward_type,requested_delta,applied_delta,result,input_payload)
    VALUES(p_uid,p_id,b.id,p_type,p_delta,x-b.xp,result,p_input);
  RETURN result;
END $$;

CREATE FUNCTION public.get_study_pokemon_rewards() RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE uid uuid:=private.studydex_reward_uid(); pack uuid;
BEGIN
  PERFORM 1 FROM public.profiles WHERE id=uid FOR UPDATE;
  INSERT INTO private.studydex_reward_accounts(user_id) VALUES(uid) ON CONFLICT(user_id) DO NOTHING;
  PERFORM private.studydex_ensure_recovery(uid);
  SELECT p.id INTO pack FROM private.studydex_reward_accounts a
    JOIN public.user_packs p ON p.id=a.recovery_pack_id AND p.user_id=uid AND p.opened_at IS NULL
    WHERE a.user_id=uid;
  RETURN private.studydex_get_user_pokemon()||jsonb_build_object('recovery_pack_id',pack);
END $$;

-- Opening the pack, activating its recipient and consuming pending XP are one
-- transaction. Retrying the same pack uses its receipt and never draws twice.
CREATE FUNCTION public.resolve_study_pokemon_reward(p_owned_id uuid DEFAULT NULL,p_pack_id uuid DEFAULT NULL) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE uid uuid:=private.studydex_reward_uid(); receipt jsonb; target uuid;
BEGIN
  PERFORM 1 FROM public.profiles WHERE id=uid FOR UPDATE;
  IF (p_owned_id IS NULL)=(p_pack_id IS NULL) THEN RAISE EXCEPTION 'Choose a Pokémon or a recovery pack'; END IF;
  IF p_pack_id IS NOT NULL THEN
    -- A completed receipt is safe to replay even after its recipient was added.
    SELECT r.result INTO receipt FROM private.studydex_pack_receipts r WHERE r.pack_id=p_pack_id AND r.user_id=uid;
    IF receipt IS NULL THEN
      IF NOT EXISTS(SELECT 1 FROM private.studydex_reward_accounts WHERE user_id=uid AND recovery_pack_id=p_pack_id)
        OR EXISTS(SELECT 1 FROM public.user_pokemon WHERE user_id=uid AND NOT private.studydex_pokemon_is_max(id,uid)) THEN
        RAISE EXCEPTION 'Choose an existing Pokémon before opening a recovery pack';
      END IF;
      receipt:=private.studydex_open_reward_pack(p_pack_id);
    END IF;
    target:=(receipt->>'owned_id')::uuid;
    IF target IS NULL THEN RAISE EXCEPTION 'This pack is not a Pokémon recovery reward'; END IF;
  ELSE
    target:=p_owned_id;
    IF NOT EXISTS(SELECT 1 FROM public.user_pokemon WHERE id=target AND user_id=uid AND NOT private.studydex_pokemon_is_max(id,uid)) THEN
      RAISE EXCEPTION 'Choose a Pokémon that can still receive XP';
    END IF;
  END IF;
  PERFORM private.studydex_select_user_pokemon(target);
  -- Positive pending XP can revive a defeated recipient.
  UPDATE public.user_pokemon SET is_defeated=false WHERE id=target AND user_id=uid AND xp>0;
  RETURN public.get_study_pokemon_rewards()||jsonb_build_object('gift',receipt);
END $$;
REVOKE ALL ON FUNCTION public.get_study_pokemon_rewards(),public.resolve_study_pokemon_reward(uuid,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.get_study_pokemon_rewards(),public.resolve_study_pokemon_reward(uuid,uuid) TO authenticated,service_role;

-- Preserve XP above the new cap as transferable XP instead of discarding it.
INSERT INTO private.studydex_reward_accounts(user_id,pending_xp)
SELECT user_id,sum(xp-200)::integer FROM public.user_pokemon WHERE xp>200 GROUP BY user_id
ON CONFLICT(user_id) DO UPDATE SET pending_xp=private.studydex_reward_accounts.pending_xp+excluded.pending_xp;
UPDATE public.user_pokemon SET xp=200 WHERE xp>200;
UPDATE public.user_pokemon SET level=(private.studydex_owned_pokemon(id,user_id)->>'level')::integer;
