import { PGlite } from '@electric-sql/pglite'
import { readFile, readdir } from 'node:fs/promises'
import { mockOnboarding } from './onboarding-fixture'

// Browser -> real supabase-js -> mocked HTTP transport -> isolated PostgreSQL.
// All RLS, RPC grading, constraints and transactions run from the migrations.
export async function learningFixture(page) {
  const evidence = await mockOnboarding(page, { avatarConfirmed: true, starterClaimed: true })
  const db = new PGlite()
  await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
    CREATE SCHEMA auth; CREATE TABLE auth.users(id uuid PRIMARY KEY,email text,raw_user_meta_data jsonb);
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    GRANT USAGE ON SCHEMA auth,public TO anon,authenticated; GRANT EXECUTE ON FUNCTION auth.uid() TO anon,authenticated;`)
  for (const file of (await readdir('supabase/migrations')).sort()) await db.exec(await readFile(`supabase/migrations/${file}`, 'utf8'))
  await db.exec(await readFile('supabase/seed.sql', 'utf8'))
  const uid = evidence.session.user.id
  const level = (await db.query('SELECT * FROM levels WHERE level_number=3')).rows[0]
  evidence.state.schoolLevel = level
  await db.query('INSERT INTO auth.users VALUES($1,$2,$3)', [uid, 'browser@example.invalid', { display_name: 'Fixture Trainer', school_level_number: 3 }])
  // Most journeys represent a returning student; dedicated coverage exercises null.
  await db.query('UPDATE profiles SET device_loc=false WHERE id=$1', [uid])
  await db.query("SELECT set_config('request.jwt.claim.sub',$1,false)", [uid])
  await db.exec('SET ROLE authenticated')
  await db.query('SELECT claim_starter(4)')
  const species = (await db.query('SELECT name FROM pokemon WHERE pokeapi_id BETWEEN 1 AND 151 ORDER BY pokeapi_id')).rows
  await page.route('https://pokeapi.co/api/v2/pokemon?limit=151', route => route.fulfill({
    json: { results: species.map(row => ({ name:row.name.toLowerCase() })) },
  }))
  const tables = new Set(['subjects','topics','topic_learning_goals','topic_concepts','questions','question_options','flashcards','user_pokemon','studydex_xp_events','study_sessions','pomodoro_blocks','quiz_attempts','quiz_attempt_answers','topic_completions','todos'])
  const rpcs = new Set(['start_learning_quiz','submit_learning_quiz','prepare_learning_quiz_progression','submit_learning_quiz_progression','study_session_action','get_daily_learning_progress','save_learning_todo','select_user_pokemon','get_device_location_preference','set_device_location_preference','get_reward_inventory'])
  const failures = new Set(), requests = []
  await page.route('https://studydex-fixture.invalid/rest/v1/**', async route => {
    const request = route.request(), url = new URL(request.url()), name = url.pathname.split('/').at(-1)
    if (name === 'profiles' || name === 'levels' || url.pathname.includes('/rpc/') && !rpcs.has(name)) return route.fallback()
    const headers = { 'access-control-allow-origin': '*', 'access-control-allow-headers':'*', 'access-control-allow-methods':'GET,HEAD,POST,OPTIONS', 'access-control-expose-headers':'content-range' }
    if (request.method() === 'OPTIONS') return route.fulfill({ status:204, headers })
    requests.push(name)
    try {
      if (failures.has(name)) throw new Error('Synthetic connection failure')
      if (url.pathname.includes('/rpc/')) {
        const args = request.postDataJSON() || {}
        const keys = Object.keys(args)
        const params = keys.map((key,index) => `"${key}" => $${index+1}`).join(',')
        const result = await db.query(`SELECT public.${name}(${params}) AS result`, Object.values(args))
        return route.fulfill({ headers, json: result.rows[0].result })
      }
      if (!tables.has(name)) throw new Error('Unexpected table request')
      const params = [], clauses = []
      const cols = new Set((await db.query('SELECT column_name FROM information_schema.columns WHERE table_schema=$1 AND table_name=$2', ['public',name])).rows.map(row => row.column_name))
      for (const [key,value] of url.searchParams) {
        if (!cols.has(key)) continue
        if (value.startsWith('eq.')) { params.push(value.slice(3)); clauses.push(`t."${key}"::text=$${params.length}`) }
        for (const [prefix, op] of [['gte.', '>='], ['lt.', '<']]) {
          if (value.startsWith(prefix)) { params.push(value.slice(prefix.length)); clauses.push(`t."${key}"${op}$${params.length}`) }
        }
        if (value.startsWith('in.(')) { params.push(value.slice(4,-1).split(',').map(id => id.replaceAll('"',''))); clauses.push(`t."${key}"::text=ANY($${params.length}::text[])`) }
      }
      let sql = name === 'user_pokemon'
        ? 'SELECT t.*,to_jsonb(p) AS pokemon FROM public.user_pokemon t JOIN public.pokemon p ON p.id=t.pokemon_id'
        : `SELECT t.* FROM public.${name} t`
      if (clauses.length) sql += ` WHERE ${clauses.join(' AND ')}`
      const result = await db.query(sql, params)
      headers['content-range'] = `0-${Math.max(0,result.rows.length-1)}/${result.rows.length}`
      if (request.method() === 'HEAD') return route.fulfill({ headers, status:200 })
      const offset = Number(url.searchParams.get('offset') || 0), limit = Number(url.searchParams.get('limit') || result.rows.length)
      return route.fulfill({ headers, json: result.rows.slice(offset, offset+limit) })
    } catch (error) { return route.fulfill({ status:400, headers, json:{ code:error.code || 'TEST_ERROR', message:error.message } }) }
  })
  return { ...evidence, db, failures, requests, close: () => db.close() }
}
