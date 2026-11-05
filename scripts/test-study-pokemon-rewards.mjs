import assert from 'node:assert/strict'
import { readFile, readdir } from 'node:fs/promises'
import { randomUUID } from 'node:crypto'
import process from 'node:process'
import { PGlite } from '@electric-sql/pglite'

// Fully isolated PostgreSQL: no live Supabase connection or student writes.
const db = new PGlite()
let checks = 0
async function check(name, callback) { await callback(); checks++; console.log(`PASS ${name}`) }
async function user(id, sql, args = []) {
  await db.query("SELECT set_config('request.jwt.claim.sub',$1,false)", [id])
  await db.exec('SET ROLE authenticated')
  try { return (await db.query(sql, args)).rows }
  finally { await db.exec('RESET ROLE') }
}
const call = async (id, sql, args) => (await user(id, sql, args))[0].result
const other = randomUUID()
try {
  await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
    CREATE SCHEMA auth; CREATE TABLE auth.users(id uuid PRIMARY KEY,email text,raw_user_meta_data jsonb);
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    GRANT USAGE ON SCHEMA auth,public TO anon,authenticated; GRANT EXECUTE ON FUNCTION auth.uid() TO anon,authenticated;`)
  const migration='20261106140000_study_pokemon_rewards.sql'
  for (const file of (await readdir('supabase/migrations')).sort().filter(file=>file!==migration)) await db.exec(await readFile(`supabase/migrations/${file}`, 'utf8'))
  await db.exec(await readFile('supabase/seed.sql', 'utf8'))
  await db.query('INSERT INTO auth.users VALUES($1,$2,$3)',[other,`${other}@example.invalid`,{display_name:'Other',school_level_number:3}])
  await call(other,'SELECT claim_starter(4) AS result')
  await db.query('UPDATE user_pokemon SET xp=240 WHERE user_id=$1',[other])
  await db.exec(await readFile(`supabase/migrations/${migration}`, 'utf8'))
  await check('upgrading to 200 preserves existing excess XP in the saved pending balance',async()=>{
    const state=await call(other,'SELECT get_user_pokemon() AS result')
    assert.equal(state.pokemon[0].xp,200)
    assert.equal(state.pokemon[0].fully_trained,true)
    assert.equal(state.pokemon[0].evolution_stage,'MAX')
    assert.equal(state.pokemon[0].is_max_evolution,true)
    assert.equal(state.pending_xp,40)
  })
  const topic = (await db.query('SELECT t.id FROM topics t JOIN levels l ON l.id=t.level_id WHERE l.level_number=3 ORDER BY t.id LIMIT 1')).rows[0].id
  await check('study overflow persists once, selects an owned recipient and never grants a pack while one is eligible', async () => {
    const student=randomUUID()
    await db.query('INSERT INTO auth.users VALUES($1,$2,$3)',[student,`${student}@example.invalid`,{display_name:'XP fixture',school_level_number:3}])
    await call(student,'SELECT claim_starter(4) AS result')
    const initial=await call(student,'SELECT get_user_pokemon() AS result')
    const first=initial.pokemon[0].owned_id
    await db.query('UPDATE user_pokemon SET xp=198 WHERE id=$1',[first])
    const second=(await db.query('INSERT INTO user_pokemon(user_id,pokemon_id) SELECT $1,id FROM pokemon WHERE pokeapi_id=7 RETURNING id',[student])).rows[0].id
    const session=randomUUID()
    await call(student,"SELECT study_session_action($1,$2,'flashcards','open',NULL) AS result",[session,topic])
    const saved=await call(student,"SELECT study_session_action($1,$2,'flashcards','complete',NULL) AS result",[session,topic])
    assert.equal(saved.xp.overflowXP,3)
    await call(student,"SELECT study_session_action($1,$2,'flashcards','complete',NULL) AS result",[session,topic])
    const state=await call(student,'SELECT get_study_pokemon_rewards() AS result')
    assert.equal(state.pending_xp,3)
    assert.equal(state.recovery_pack_id,null)
    assert.equal((await db.query('SELECT count(*)::int n FROM user_packs WHERE user_id=$1',[student])).rows[0].n,0)
    await assert.rejects(call(other,'SELECT resolve_study_pokemon_reward($1,NULL) AS result',[second]),/Choose a Pokémon/)
    const selected=await call(student,'SELECT resolve_study_pokemon_reward($1,NULL) AS result',[second])
    assert.equal(selected.pending_xp,0)
    assert.equal(selected.pokemon.find(p=>p.is_selected).owned_id,second)
    assert.equal(selected.pokemon.find(p=>p.is_selected).xp,3)
    assert.equal(selected.pokemon.filter(p=>p.is_selected).length,1)
    assert.equal((await call(student,'SELECT get_user_pokemon() AS result')).pending_xp,0)
  })
  await check('a fully trained collection receives one recovery pack; opening and retrying activates one saved new buddy', async () => {
    const student=randomUUID()
    await db.query('INSERT INTO auth.users VALUES($1,$2,$3)',[student,`${student}@example.invalid`,{display_name:'Pack fixture',school_level_number:3}])
    await call(student,'SELECT claim_starter(4) AS result')
    await db.query('UPDATE user_pokemon SET xp=198 WHERE user_id=$1',[student])
    const session=randomUUID()
    await call(student,"SELECT study_session_action($1,$2,'flashcards','open',NULL) AS result",[session,topic])
    await call(student,"SELECT study_session_action($1,$2,'flashcards','complete',NULL) AS result",[session,topic])
    const state=await call(student,'SELECT get_study_pokemon_rewards() AS result')
    assert(state.recovery_pack_id)
    assert.equal((await call(student,'SELECT get_study_pokemon_rewards() AS result')).recovery_pack_id,state.recovery_pack_id)
    await assert.rejects(call(other,'SELECT resolve_study_pokemon_reward(NULL,$1) AS result',[state.recovery_pack_id]),/existing Pokémon/)
    const opened=await call(student,'SELECT resolve_study_pokemon_reward(NULL,$1) AS result',[state.recovery_pack_id])
    assert.equal(opened.pokemon.length,2)
    assert.equal(opened.pending_xp,0)
    assert.equal(opened.pokemon.find(p=>p.is_selected).xp,3)
    assert.equal(opened.pokemon.find(p=>p.is_selected).owned_id,opened.gift.owned_id)
    const again=await call(student,'SELECT resolve_study_pokemon_reward(NULL,$1) AS result',[state.recovery_pack_id])
    assert.equal(again.pokemon.length,2)
    assert.equal(again.pokemon.find(p=>p.is_selected).xp,3)
    assert.equal((await db.query('SELECT count(*)::int n FROM user_packs WHERE user_id=$1',[student])).rows[0].n,1)
    await assert.rejects(call('','SELECT get_study_pokemon_rewards() AS result'),/log in/)
  })
  await check('reaching exactly 200 offers the next buddy even with no leftover XP',async()=>{
    const student=randomUUID()
    await db.query('INSERT INTO auth.users VALUES($1,$2,$3)',[student,`${student}@example.invalid`,{display_name:'Exact cap',school_level_number:3}])
    await call(student,'SELECT claim_starter(4) AS result')
    await db.query('UPDATE user_pokemon SET xp=195 WHERE user_id=$1',[student])
    const session=randomUUID()
    await call(student,"SELECT study_session_action($1,$2,'flashcards','open',NULL) AS result",[session,topic])
    const saved=await call(student,"SELECT study_session_action($1,$2,'flashcards','complete',NULL) AS result",[session,topic])
    assert.equal(saved.xp.xp,200)
    assert.equal(saved.xp.overflowXP,0)
    const state=await call(student,'SELECT get_study_pokemon_rewards() AS result')
    assert(state.recovery_pack_id)
    assert.equal(state.pending_xp,0)
    const second=(await db.query('INSERT INTO user_pokemon(user_id,pokemon_id) SELECT $1,id FROM pokemon WHERE pokeapi_id=7 RETURNING id',[student])).rows[0].id
    await assert.rejects(call(student,'SELECT resolve_study_pokemon_reward(NULL,$1) AS result',[state.recovery_pack_id]),/existing Pokémon/)
    const result=await call(student,'SELECT resolve_study_pokemon_reward($1,NULL) AS result',[second])
    assert.equal(result.pokemon.find(p=>p.is_selected).owned_id,second)
    assert.equal(result.pokemon.find(p=>p.is_selected).xp,0)
  })
  await check('a saved Pokémon in its final evolution remains eligible until its level is MAX',async()=>{
    const student=randomUUID()
    await db.query('INSERT INTO auth.users VALUES($1,$2,$3)',[student,`${student}@example.invalid`,{display_name:'Final form',school_level_number:3}])
    await call(student,'SELECT claim_starter(4) AS result')
    await db.query('UPDATE user_pokemon SET xp=175 WHERE user_id=$1',[student])
    await db.query('UPDATE private.studydex_reward_accounts SET pending_xp=3 WHERE user_id=$1',[student])
    const state=await call(student,'SELECT get_study_pokemon_rewards() AS result')
    const pokemon=state.pokemon[0]
    assert.equal(pokemon.name.toLowerCase(),'charizard')
    assert.notEqual(pokemon.evolution_stage,'MAX')
    assert.equal(pokemon.is_max_evolution,false)
    assert.equal(state.recovery_pack_id,null)
    const selected=await call(student,'SELECT resolve_study_pokemon_reward($1,NULL) AS result',[pokemon.owned_id])
    assert.equal(selected.pokemon.find(p=>p.is_selected).xp,178)
    assert.equal(selected.pending_xp,0)
  })
  console.log(`${checks} study Pokémon database checks passed`)
} catch (error) { console.error(error); process.exitCode=1 }
finally { await db.close() }
