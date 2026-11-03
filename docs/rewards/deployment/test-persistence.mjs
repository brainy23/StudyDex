const { PGlite } = await import(process.env.STUDYDEX_PGLITE_MODULE || '/private/tmp/studydex-postgres-tests-20261104/node_modules/@electric-sql/pglite/dist/index.js')
import { readFile, writeFile } from 'node:fs/promises'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import assert from 'node:assert/strict'
process.on('uncaughtException', error => { console.error(JSON.stringify({ message: error.message, detail: error.detail, where: error.where })); process.exit(1) })
const root = fileURLToPath(new URL('../../../', import.meta.url))
const sql = await readFile(root + '/docs/rewards/deployment/01_pokemon_persistence.proposed.sql', 'utf8')
assert.equal(sql, sql.toLowerCase(), 'Approval SQL must be lowercase')
const db = new PGlite()
await db.exec(`
create role anon; create role authenticated; create role service_role;
create schema auth; create schema private;
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
grant usage on schema public, auth to anon, authenticated;
grant execute on function auth.uid() to anon, authenticated;
create table public.profiles(id uuid primary key, display_name text);
create table public.pokemon(id uuid primary key default gen_random_uuid(), pokeapi_id integer not null unique check(pokeapi_id > 0), name text not null unique, sprite_url text, evolves_from_id uuid references public.pokemon(id) on delete restrict, created_at timestamptz not null default now(), check(evolves_from_id is distinct from id));
create table public.user_pokemon(id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(id) on delete cascade, pokemon_id uuid not null references public.pokemon(id) on delete restrict, xp integer not null default 0 check(xp >= 0), level integer not null default 1 check(level >= 1), is_selected boolean not null default false, is_defeated boolean not null default false, obtained_at timestamptz not null default now(), unique(user_id,pokemon_id));
create unique index one_selected_pokemon_per_user_idx on public.user_pokemon(user_id) where is_selected;
create table public.user_packs(id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(id) on delete cascade, earned_at timestamptz not null default now(), opened_at timestamptz, reward_type text check(reward_type in ('pokemon','xp')), reward_pokemon_id uuid references public.pokemon(id) on delete restrict, xp_awarded integer not null default 0 check(xp_awarded>=0), xp_recipient_id uuid references public.user_pokemon(id) on delete restrict, check(opened_at is null or opened_at>=earned_at), check((opened_at is null and reward_type is null and reward_pokemon_id is null and xp_awarded=0 and xp_recipient_id is null) or (opened_at is not null and reward_type='pokemon' and reward_pokemon_id is not null and xp_awarded=0 and xp_recipient_id is null) or(opened_at is not null and reward_type='xp' and reward_pokemon_id is null and xp_awarded>0 and xp_recipient_id is not null)));
create table public.topics(id integer); create table public.topic_learning_goals(id integer); create table public.topic_concepts(id integer); create table public.flashcards(id integer); create table public.questions(id integer); create table public.question_options(id integer);
create table public.educational_sentinel(id integer primary key, payload text);
insert into public.educational_sentinel values(1,'preserve science mathematics and private grading');
grant all on all tables in schema public to anon, authenticated;
alter table public.profiles enable row level security;
alter table public.pokemon enable row level security;
alter table public.user_pokemon enable row level security;
alter table public.user_packs enable row level security;
create policy studydeck_read_pokemon_catalogue on public.pokemon for select to authenticated using(true);
create policy studydeck_read_own_buddy on public.user_pokemon for select to authenticated using(user_id=(select auth.uid()));
insert into public.profiles values ('11111111-1111-4111-8111-111111111111','first'),('22222222-2222-4222-8222-222222222222','second');
`)
const baseline = (await db.query('select * from public.educational_sentinel')).rows
const checks = []
async function check(name, fn) { await fn(); checks.push({ name, status: 'pass' }); console.log('PASS', name) }
const first = '11111111-1111-4111-8111-111111111111', second = '22222222-2222-4222-8222-222222222222'
async function asUser(uid, query, params = []) {
  await db.exec('begin; set local role authenticated;')
  try { await db.query("select set_config('request.jwt.claim.sub',$1,true)", [uid]); const out = await db.query(query,params); await db.exec('commit'); return out.rows }
  catch (e) { await db.exec('rollback'); throw e }
}
const rpc = async (uid, name, args = []) => (await asUser(uid, `select public.${name}(${args.map((_, i) => '$'+(i+1)).join(',')}) as result`,args))[0].result
await check('transaction rolls back all seed/DDL if any later statement fails', async () => {
  const failed = sql.replace(/commit;\s*$/, "select 1/0; commit;")
  await assert.rejects(db.exec(failed)); await db.exec('rollback')
  assert.equal((await db.query('select count(*)::int n from public.pokemon')).rows[0].n,0)
  assert.equal((await db.query("select to_regclass('private.studydex_reward_accounts') n")).rows[0].n,null)
})
await check('fresh deployment succeeds atomically', async () => {
  await db.exec(sql)
  assert.equal((await db.query('select count(*)::int n from public.pokemon')).rows[0].n,9)
})
await check('no existing profile or educational row changes and no free pack', async () => {
  assert.deepEqual((await db.query('select * from public.educational_sentinel')).rows, baseline)
  assert.equal((await db.query('select count(*)::int n from public.profiles')).rows[0].n,2)
  assert.equal((await db.query('select count(*)::int n from public.user_packs')).rows[0].n,0)
})
await check('anonymous users cannot execute public/private reward functions', async () => {
  await db.exec('begin; set local role anon;')
  await assert.rejects(db.query('select public.get_user_pokemon()')); await db.exec('rollback')
  await db.exec('begin; set local role anon;')
  await assert.rejects(db.query('select private.studydex_claim_starter(4)')); await db.exec('rollback')
})
await check('authenticated users cannot write inventory or truncate any public table', async () => {
  for (const table of ['pokemon','user_pokemon','user_packs','educational_sentinel']) {
    assert.equal((await db.query("select has_table_privilege('authenticated',$1,'truncate') n",['public.'+table])).rows[0].n,false)
  }
  await assert.rejects(asUser(first,"insert into public.user_pokemon(user_id,pokemon_id) select $1::uuid,id from public.pokemon limit 1",[first]))
})
await check('private tables and unexposed helpers remain inaccessible to authenticated clients', async () => {
  await assert.rejects(asUser(first,'select * from private.studydex_reward_accounts'))
  await assert.rejects(asUser(first,'select private.studydex_ensure_recovery($1::uuid)',[second]))
})
await check('new student has empty real inventory and unclaimed starter', async () => {
  assert.deepEqual(await rpc(first,'get_starter_status'),{user_id:first,claimed:false})
  assert.deepEqual((await rpc(first,'get_user_pokemon')).pokemon,[])
})
await check('starter is persisted, selected and idempotent even if a different starter is retried', async () => {
  const result = await rpc(first,'claim_starter',[4]); assert.equal(result.claimed,true)
  assert.equal(result.pokemon.pokeapi_id,4); assert.equal(result.pokemon.is_selected,true)
  assert.equal((await rpc(first,'claim_starter',[7])).already_claimed,true)
  assert.equal((await rpc(first,'get_user_pokemon')).pokemon.length,1)
  assert.equal((await rpc(first,'get_reward_inventory')).unopened_count,0)
})
await check('invalid starter is refused without a partial claim', async () => {
  await assert.rejects(rpc(second,'claim_starter',[150]))
  assert.equal((await rpc(second,'get_starter_status')).claimed,false)
  await rpc(second,'claim_starter',[1])
})
const ownedFirst = (await rpc(first,'get_user_pokemon')).pokemon[0].owned_id
const ownedSecond = (await rpc(second,'get_user_pokemon')).pokemon[0].owned_id
await check('collection and direct reads are isolated by account', async () => {
  assert.equal((await rpc(second,'get_user_pokemon')).pokemon[0].original_pokeapi_id,1)
  const rows = await asUser(second,'select id from public.user_pokemon')
  assert.deepEqual(rows.map(r=>r.id),[ownedSecond])
  await assert.rejects(rpc(second,'select_user_pokemon',[ownedFirst]))
  assert.equal((await rpc(second,'get_user_pokemon')).pokemon[0].is_selected,true)
})
await check('derived evolution follows 75/175/250 cumulative XP without changing the owned base', async () => {
  for (const [xp,id] of [[74,4],[75,5],[174,5],[175,6],[250,6]]) {
    await db.query('update public.user_pokemon set xp=$1 where id=$2',[xp,ownedFirst])
    const view = (await rpc(first,'get_user_pokemon')).pokemon[0]
    assert.equal(view.pokeapi_id,id); assert.equal(view.original_pokeapi_id,4); assert.equal(view.xp,xp)
    assert.equal(view.fully_trained,xp===250)
  }
  await db.query('update public.user_pokemon set xp=0 where id=$1',[ownedFirst])
})
let packId
await check('earned packs appear only for their owner', async () => {
  packId = (await db.query('insert into public.user_packs(user_id) values($1) returning id',[first])).rows[0].id
  assert.equal((await rpc(first,'get_reward_inventory')).unopened_count,1)
  assert.equal((await rpc(second,'get_reward_inventory')).unopened_count,0)
  await assert.rejects(rpc(second,'open_reward_pack',[packId]))
})
await check('pack opening stores one durable result; repeated requests cannot consume twice', async () => {
  const original = await rpc(first,'open_reward_pack',[packId])
  assert.deepEqual(await rpc(first,'open_reward_pack',[packId]),original)
  assert.equal((await rpc(first,'get_reward_inventory')).unopened_count,0)
  assert.equal((await db.query('select count(*)::int n from private.studydex_pack_receipts where pack_id=$1',[packId])).rows[0].n,1)
})
await check('duplicate reward targets the selected buddy, caps XP and preserves overflow', async () => {
  // Test-only fixture grants all three base forms so every draw is a duplicate.
  await db.query("insert into public.user_pokemon(user_id,pokemon_id) select $1,id from public.pokemon p where evolves_from_id is null and not exists(select 1 from public.user_pokemon u where u.user_id=$1 and u.pokemon_id=p.id)",[first])
  await db.query('update public.user_pokemon set xp=240 where id=$1',[ownedFirst])
  const p = (await db.query('insert into public.user_packs(user_id) values($1) returning id',[first])).rows[0].id
  const out = await rpc(first,'open_reward_pack',[p])
  assert.equal(out.reward_type,'xp'); assert.equal(out.xp_awarded,25); assert.equal(out.xp_applied,10); assert.equal(out.xp_pending,15); assert.equal(out.xp_recipient_id,ownedFirst)
  const collection = await rpc(first,'get_user_pokemon'); assert.equal(collection.pending_xp,15)
  const target = collection.pokemon.find(p=>!p.is_selected)
  const switched = await rpc(first,'select_user_pokemon',[target.owned_id])
  assert.equal(switched.pending_xp,0); assert.equal(switched.pokemon.find(p=>p.owned_id===target.owned_id).xp,15)
  assert.equal(switched.pokemon.filter(p=>p.is_selected).length,1)
})
await check('exactly capped collection creates only one unowned recovery pack', async () => {
  await db.query('update public.user_pokemon set xp=250 where id=$1',[ownedSecond])
  await rpc(second,'select_user_pokemon',[ownedSecond]); await rpc(second,'select_user_pokemon',[ownedSecond])
  const inv = await rpc(second,'get_reward_inventory'); assert.equal(inv.unopened_count,1)
  const out = await rpc(second,'open_reward_pack',[inv.packs[0].id]); assert.equal(out.reward_type,'pokemon'); assert.notEqual(out.pokemon.pokeapi_id,1)
  assert.equal((await rpc(second,'get_user_pokemon')).pokemon.length,2)
})
await check('deployment rerun is refused without altering existing rewards', async () => {
  const before = (await db.query('select count(*)::int n from public.user_pokemon')).rows[0].n
  await assert.rejects(db.exec(sql)); await db.exec('rollback')
  assert.equal((await db.query('select count(*)::int n from public.user_pokemon')).rows[0].n,before)
})
await check('the exact read-only post-deployment verification succeeds', async () => {
  const verificationSql = await readFile(root + '/docs/rewards/deployment/02_verify_pokemon_persistence.sql', 'utf8')
  const results = await db.exec(verificationSql)
  const result = results.find(r => r.rows?.[0]?.pokemon_persistence_verification)?.rows[0].pokemon_persistence_verification
  assert.equal(result.read_only,'on'); assert.equal(result.counts.pokemon,9)
  assert.equal(result.remaining_api_truncate_grants,0)
  assert.equal(result.integrity.cross_user_xp_recipients,0)
  assert.equal(result.functions.length,15)
})
await writeFile(root+'/docs/rewards/deployment/isolated-sql-results.json',JSON.stringify({engine:'pglite 0.5.15 (embedded postgres, disposable synthetic schema)',live_supabase:false,checks,concurrency:'profile and pack row locks reviewed; overlapping real PostgreSQL connections not yet tested'},null,2)+'\n')
await db.close()
