-- studydex pokemon persistence v1; proposed, not approved for execution.
-- project: sbrteylcizwkzetcqdro. starter only; no welcome pack.
-- no educational content or existing profile rows are changed.
begin;
set local lock_timeout = '5s';
set local statement_timeout = '30s';
select pg_catalog.pg_advisory_xact_lock(741216, 110426);
lock table public.pokemon, public.user_pokemon, public.user_packs in share row exclusive mode;
do $$
begin
  if exists (select 1 from pg_catalog.pg_class c join pg_catalog.pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relname in ('pokemon', 'user_pokemon', 'user_packs') and not c.relrowsecurity) then
    raise exception 'review baseline changed: reward tables must have rls enabled';
  end if;
  if exists (select 1 from public.pokemon) or exists (select 1 from public.user_pokemon)
    or exists (select 1 from public.user_packs) then
    raise exception 'review baseline changed: pokemon, ownership and packs must still be empty';
  end if;
  if pg_catalog.to_regclass('private.studydex_reward_accounts') is not null
    or pg_catalog.to_regclass('private.studydex_pack_receipts') is not null then
    raise exception 'reward installation already exists; refusing rerun';
  end if;
end;
$$;

insert into public.pokemon (id, pokeapi_id, name, sprite_url, evolves_from_id) values
('00000000-0000-4000-9000-000000000001', 1, 'bulbasaur', 'https://raw.githubusercontent.com/pokeapi/sprites/master/sprites/pokemon/1.png', null),
('00000000-0000-4000-9000-000000000004', 4, 'charmander', 'https://raw.githubusercontent.com/pokeapi/sprites/master/sprites/pokemon/4.png', null),
('00000000-0000-4000-9000-000000000007', 7, 'squirtle', 'https://raw.githubusercontent.com/pokeapi/sprites/master/sprites/pokemon/7.png', null);
insert into public.pokemon (id, pokeapi_id, name, sprite_url, evolves_from_id) values
('00000000-0000-4000-9000-000000000002', 2, 'ivysaur', 'https://raw.githubusercontent.com/pokeapi/sprites/master/sprites/pokemon/2.png', '00000000-0000-4000-9000-000000000001'),
('00000000-0000-4000-9000-000000000005', 5, 'charmeleon', 'https://raw.githubusercontent.com/pokeapi/sprites/master/sprites/pokemon/5.png', '00000000-0000-4000-9000-000000000004'),
('00000000-0000-4000-9000-000000000008', 8, 'wartortle', 'https://raw.githubusercontent.com/pokeapi/sprites/master/sprites/pokemon/8.png', '00000000-0000-4000-9000-000000000007');
insert into public.pokemon (id, pokeapi_id, name, sprite_url, evolves_from_id) values
('00000000-0000-4000-9000-000000000003', 3, 'venusaur', 'https://raw.githubusercontent.com/pokeapi/sprites/master/sprites/pokemon/3.png', '00000000-0000-4000-9000-000000000002'),
('00000000-0000-4000-9000-000000000006', 6, 'charizard', 'https://raw.githubusercontent.com/pokeapi/sprites/master/sprites/pokemon/6.png', '00000000-0000-4000-9000-000000000005'),
('00000000-0000-4000-9000-000000000009', 9, 'blastoise', 'https://raw.githubusercontent.com/pokeapi/sprites/master/sprites/pokemon/9.png', '00000000-0000-4000-9000-000000000008');

create table private.studydex_reward_accounts (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  starter_pokemon_id uuid references public.pokemon(id) on delete restrict,
  starter_owned_id uuid references public.user_pokemon(id) on delete set null,
  starter_claimed_at timestamptz,
  pending_xp integer not null default 0 check (pending_xp >= 0),
  recovery_pack_id uuid references public.user_packs(id) on delete set null,
  constraint starter_claim_consistent check (
    (starter_pokemon_id is null and starter_owned_id is null and starter_claimed_at is null)
    or (starter_pokemon_id is not null and starter_claimed_at is not null)
  )
);
create index studydex_reward_accounts_starter_idx on private.studydex_reward_accounts(starter_pokemon_id);
create index studydex_reward_accounts_owned_idx on private.studydex_reward_accounts(starter_owned_id);
create index studydex_reward_accounts_recovery_idx on private.studydex_reward_accounts(recovery_pack_id);
create table private.studydex_pack_receipts (
  pack_id uuid primary key references public.user_packs(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  result jsonb not null,
  created_at timestamptz not null default now(),
  constraint receipt_identity_consistent check (
    result->>'pack_id' = pack_id::text and result->>'user_id' = user_id::text
  )
);
create index studydex_pack_receipts_user_idx on private.studydex_pack_receipts(user_id, created_at desc);
alter table private.studydex_reward_accounts enable row level security;
alter table private.studydex_pack_receipts enable row level security;
revoke all on private.studydex_reward_accounts, private.studydex_pack_receipts from public, anon, authenticated;
revoke create on schema private from public, anon, authenticated;
grant usage on schema private to authenticated;

-- browser roles can read the catalogue/their own inventory, never award it.
revoke all on public.pokemon, public.user_pokemon, public.user_packs from public;
revoke all on public.pokemon, public.user_pokemon, public.user_packs from anon;
revoke insert, update, delete, truncate, references, trigger
  on public.pokemon, public.user_pokemon, public.user_packs from authenticated;
grant select on public.pokemon, public.user_pokemon, public.user_packs to authenticated;
-- remove the existing whole-table destruction privilege; normal app operations do not use it.
revoke truncate on all tables in schema public from public, anon, authenticated;
create policy studydex_read_own_packs on public.user_packs for select to authenticated
  using ((select auth.uid()) = user_id);

create function private.studydex_reward_uid() returns uuid
language plpgsql stable security invoker set search_path = '' as $$
declare uid uuid := auth.uid();
begin
  if uid is null then raise exception 'please log in' using errcode = '28000'; end if;
  if not exists (select 1 from public.profiles where id = uid) then
    raise exception 'your student profile is not ready';
  end if;
  return uid;
end;
$$;

create function private.studydex_owned_pokemon(owned_id uuid, student_id uuid) returns jsonb
language plpgsql stable security invoker set search_path = '' as $$
declare owned public.user_pokemon%rowtype; base public.pokemon%rowtype;
  current_form public.pokemon%rowtype; stage_count integer; stage integer;
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
  return jsonb_build_object(
    'owned_id', owned.id, 'pokemon_id', base.id, 'pokeapi_id', current_form.pokeapi_id,
    'original_pokeapi_id', base.pokeapi_id, 'name', current_form.name,
    'sprite_url', current_form.sprite_url, 'xp', owned.xp, 'level', stage + 1,
    'stage_count', stage_count, 'evolution_stage', stage, 'fully_trained', owned.xp >= 250,
    'is_selected', owned.is_selected, 'is_defeated', owned.is_defeated,
    'obtained_at', owned.obtained_at
  );
end;
$$;

create function private.studydex_get_user_pokemon() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare uid uuid := private.studydex_reward_uid(); result jsonb;
begin
  select coalesce(jsonb_agg(private.studydex_owned_pokemon(p.id, uid)
    order by p.is_selected desc, p.obtained_at, p.id), '[]'::jsonb)
    into result from public.user_pokemon p where p.user_id = uid;
  return jsonb_build_object('user_id', uid, 'pokemon', result,
    'starter_claimed', exists (select 1 from private.studydex_reward_accounts where user_id = uid and starter_claimed_at is not null)
      or exists (select 1 from public.user_pokemon where user_id = uid),
    'pending_xp', coalesce((select pending_xp from private.studydex_reward_accounts where user_id = uid), 0));
end;
$$;

create function private.studydex_get_starter_status() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare uid uuid := private.studydex_reward_uid();
begin
  return jsonb_build_object('user_id', uid, 'claimed',
    exists (select 1 from private.studydex_reward_accounts where user_id = uid and starter_claimed_at is not null)
    or exists (select 1 from public.user_pokemon where user_id = uid));
end;
$$;

create function private.studydex_claim_starter(p_pokeapi_id integer) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare uid uuid := private.studydex_reward_uid(); species uuid; owned uuid;
  account private.studydex_reward_accounts%rowtype;
begin
  if p_pokeapi_id is null or p_pokeapi_id not in (1, 4, 7) then raise exception 'choose one of the three starters'; end if;
  perform 1 from public.profiles where id = uid for update;
  insert into private.studydex_reward_accounts(user_id) values (uid) on conflict (user_id) do nothing;
  select * into strict account from private.studydex_reward_accounts where user_id = uid for update;
  if account.starter_claimed_at is not null or exists (select 1 from public.user_pokemon where user_id = uid) then
    return jsonb_build_object('user_id', uid, 'claimed', true, 'already_claimed', true);
  end if;
  select id into species from public.pokemon where pokeapi_id = p_pokeapi_id and evolves_from_id is null;
  if species is null then raise exception 'starter catalogue is not ready'; end if;
  insert into public.user_pokemon(user_id, pokemon_id, xp, level, is_selected, is_defeated)
    values (uid, species, 0, 1, true, false) returning id into owned;
  update private.studydex_reward_accounts set starter_pokemon_id = species, starter_owned_id = owned,
    starter_claimed_at = now() where user_id = uid;
  return jsonb_build_object('user_id', uid, 'claimed', true, 'already_claimed', false,
    'pokemon', private.studydex_owned_pokemon(owned, uid));
end;
$$;

create function private.studydex_ensure_recovery(uid uuid) returns void
language plpgsql security invoker set search_path = '' as $$
declare existing_pack uuid; new_pack uuid;
begin
  if not exists (select 1 from public.user_pokemon where user_id = uid)
    or exists (select 1 from public.user_pokemon where user_id = uid and xp < 250)
    or not exists (select 1 from public.pokemon p where p.evolves_from_id is null
      and not exists (select 1 from public.user_pokemon u where u.user_id = uid and u.pokemon_id = p.id)) then return; end if;
  select a.recovery_pack_id into existing_pack from private.studydex_reward_accounts a
    join public.user_packs p on p.id = a.recovery_pack_id and p.user_id = uid and p.opened_at is null where a.user_id = uid;
  if existing_pack is not null then return; end if;
  insert into public.user_packs(user_id) values (uid) returning id into new_pack;
  update private.studydex_reward_accounts set recovery_pack_id = new_pack where user_id = uid;
end;
$$;

create function private.studydex_select_user_pokemon(p_owned_id uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare uid uuid := private.studydex_reward_uid(); target public.user_pokemon%rowtype;
  pending integer; applied integer;
begin
  perform 1 from public.profiles where id = uid for update;
  select * into target from public.user_pokemon where id = p_owned_id and user_id = uid for update;
  if not found then raise exception 'choose a pokemon from your own collection' using errcode = '42501'; end if;
  update public.user_pokemon set is_selected = false where user_id = uid and is_selected;
  update public.user_pokemon set is_selected = true where id = target.id;
  select pending_xp into pending from private.studydex_reward_accounts where user_id = uid for update;
  applied := least(coalesce(pending, 0), greatest(0, 250 - target.xp));
  if applied > 0 then
    update public.user_pokemon set xp = xp + applied where id = target.id;
    update private.studydex_reward_accounts set pending_xp = pending_xp - applied where user_id = uid;
    update public.user_pokemon set level = (private.studydex_owned_pokemon(target.id, uid)->>'level')::integer where id = target.id;
  end if;
  perform private.studydex_ensure_recovery(uid);
  return private.studydex_get_user_pokemon();
end;
$$;

create function private.studydex_get_reward_inventory() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare uid uuid := private.studydex_reward_uid(); result jsonb;
begin
  with unopened as materialized (
    select id, earned_at from public.user_packs where user_id = uid and opened_at is null
  ), first_packs as (select * from unopened order by earned_at, id limit 20)
  select jsonb_build_object('user_id', uid, 'unopened_count', (select count(*) from unopened),
    'packs', coalesce((select jsonb_agg(to_jsonb(p) order by p.earned_at, p.id) from first_packs p), '[]'::jsonb),
    'recent_results', coalesce((select jsonb_agg(r.result order by r.created_at desc)
      from (select receipt.result, receipt.created_at from private.studydex_pack_receipts receipt where receipt.user_id = uid order by receipt.created_at desc limit 5) r), '[]'::jsonb)) into result;
  return result;
end;
$$;

create function private.studydex_open_reward_pack(p_pack_id uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare uid uuid := private.studydex_reward_uid(); pack public.user_packs%rowtype;
  drawn public.pokemon%rowtype; buddy public.user_pokemon%rowtype; existing uuid; acquired uuid;
  recovery uuid; must_be_new boolean; applied integer := 0; pending integer := 0; result jsonb;
begin
  perform 1 from public.profiles where id = uid for update;
  select * into pack from public.user_packs where id = p_pack_id and user_id = uid for update;
  if not found then raise exception 'choose one of your saved packs' using errcode = '42501'; end if;
  if pack.opened_at is not null then
    select r.result into result from private.studydex_pack_receipts r where r.pack_id = pack.id and r.user_id = uid;
    if result is null then raise exception 'saved pack result unavailable; please contact the team'; end if;
    return result;
  end if;
  if not exists (select 1 from public.user_pokemon where user_id = uid) then raise exception 'choose your starter first'; end if;
  insert into private.studydex_reward_accounts(user_id) values (uid) on conflict (user_id) do nothing;
  select recovery_pack_id into recovery from private.studydex_reward_accounts where user_id = uid for update;
  must_be_new := coalesce(recovery = pack.id, false)
    or not exists (select 1 from public.user_pokemon where user_id = uid and xp < 250);
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
    applied := least(25, greatest(0, 250 - buddy.xp)); pending := 25 - applied;
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
$$;

-- public endpoints are invokers; only the named private implementations can author rewards.
create function public.get_user_pokemon() returns jsonb language sql stable security invoker set search_path = ''
  as $$ select private.studydex_get_user_pokemon(); $$;
create function public.select_user_pokemon(p_owned_id uuid) returns jsonb language sql security invoker set search_path = ''
  as $$ select private.studydex_select_user_pokemon(p_owned_id); $$;
create function public.get_starter_status() returns jsonb language sql stable security invoker set search_path = ''
  as $$ select private.studydex_get_starter_status(); $$;
create function public.claim_starter(p_pokeapi_id integer) returns jsonb language sql security invoker set search_path = ''
  as $$ select private.studydex_claim_starter(p_pokeapi_id); $$;
create function public.get_reward_inventory() returns jsonb language sql stable security invoker set search_path = ''
  as $$ select private.studydex_get_reward_inventory(); $$;
create function public.open_reward_pack(p_pack_id uuid) returns jsonb language sql security invoker set search_path = ''
  as $$ select private.studydex_open_reward_pack(p_pack_id); $$;

revoke all on function private.studydex_reward_uid(), private.studydex_owned_pokemon(uuid, uuid),
  private.studydex_ensure_recovery(uuid), private.studydex_get_user_pokemon(), private.studydex_select_user_pokemon(uuid),
  private.studydex_get_starter_status(), private.studydex_claim_starter(integer),
  private.studydex_get_reward_inventory(), private.studydex_open_reward_pack(uuid) from public, anon, authenticated;
grant execute on function private.studydex_get_user_pokemon(), private.studydex_select_user_pokemon(uuid),
  private.studydex_get_starter_status(), private.studydex_claim_starter(integer),
  private.studydex_get_reward_inventory(), private.studydex_open_reward_pack(uuid) to authenticated;
revoke all on function public.get_user_pokemon(), public.select_user_pokemon(uuid), public.get_starter_status(),
  public.claim_starter(integer), public.get_reward_inventory(), public.open_reward_pack(uuid) from public, anon;
grant execute on function public.get_user_pokemon(), public.select_user_pokemon(uuid), public.get_starter_status(),
  public.claim_starter(integer), public.get_reward_inventory(), public.open_reward_pack(uuid) to authenticated;
commit;
