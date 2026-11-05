import assert from 'node:assert/strict'
import { readFile, readdir } from 'node:fs/promises'
import { randomUUID } from 'node:crypto'
import process from 'node:process'
import { PGlite } from '@electric-sql/pglite'
import { calculateQuizReward } from '../src/utils/quizRewards.js'

// PostgreSQL in an isolated WASM process. Never connects to the live project.
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
const uid = randomUUID(), other = randomUUID()
try {
  await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
    CREATE SCHEMA auth; CREATE TABLE auth.users(id uuid PRIMARY KEY,email text,raw_user_meta_data jsonb);
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    GRANT USAGE ON SCHEMA auth,public TO anon,authenticated; GRANT EXECUTE ON FUNCTION auth.uid() TO anon,authenticated;`)
  for (const file of (await readdir('supabase/migrations')).sort()) await db.exec(await readFile(`supabase/migrations/${file}`, 'utf8'))
  await db.exec(await readFile('supabase/seed.sql', 'utf8'))
  await check('fresh migrations and full curriculum seed', async () => assert.equal((await db.query('SELECT count(*)::int AS n FROM questions')).rows[0].n, 1015))
  for (const id of [uid, other]) {
    await db.query('INSERT INTO auth.users VALUES($1,$2,$3)', [id, `${id}@example.invalid`, { display_name: 'Database fixture', school_level_number: 3 }])
    await call(id, 'SELECT public.claim_starter(4) AS result')
  }
  const topic = (await db.query("SELECT t.id FROM topics t JOIN levels l ON l.id=t.level_id JOIN subjects s ON s.id=t.subject_id WHERE l.level_number=3 AND lower(s.name)='mathematics' ORDER BY t.id LIMIT 1")).rows[0].id
  const buddy = (await db.query('SELECT id FROM user_pokemon WHERE user_id=$1', [uid])).rows[0].id
  await check('students cannot write XP/ownership directly', async () => {
    await assert.rejects(user(uid, 'UPDATE user_pokemon SET xp=900 WHERE user_id=$1', [uid]), /permission denied/)
    await assert.rejects(user(uid, 'INSERT INTO user_pokemon(user_id,pokemon_id) SELECT $1,id FROM pokemon LIMIT 1', [uid]), /permission denied/)
    await assert.rejects(user(uid, 'SELECT * FROM question_answers'), /permission denied/)
  })
  const runId = randomUUID()
  const run = await call(uid, 'SELECT start_learning_quiz($1,$2) AS result', [topic, runId])
  const answers = {}
  for (const q of run.questions) answers[q.id] = (await db.query('SELECT correct_option_id FROM question_answers WHERE question_id=$1', [q.id])).rows[0].correct_option_id
  await check('server start hides answer keys and reuses a pending attempt', async () => {
    assert.equal(run.questions.length, 5)
    assert(!JSON.stringify(run).includes('correct_option_id'))
    const again = await call(uid, 'SELECT start_learning_quiz($1,$2) AS result', [topic, randomUUID()])
    assert.equal(again.run_id, run.run_id)
  })
  await check('foreign runs and malformed submissions are refused', async () => {
    await assert.rejects(call(other, 'SELECT submit_learning_quiz($1,$2) AS result', [run.run_id, answers]))
    await assert.rejects(call(uid, 'SELECT submit_learning_quiz($1,$2) AS result', [run.run_id, {}]), /Answer every question/)
    await assert.rejects(call(uid, 'SELECT submit_learning_quiz($1,$2) AS result', [run.run_id, Object.fromEntries(run.questions.map(q => [q.id, randomUUID()]))]), /Choose an option/)
  })
  await check('grading saves attempts/answers/XP atomically and retries once', async () => {
    const result = await call(uid, 'SELECT submit_learning_quiz($1,$2) AS result', [run.run_id, answers])
    assert.equal(result.correct, 5); assert.equal(result.delta, 50)
    assert.equal((await call(uid, 'SELECT submit_learning_quiz($1,$2) AS result', [run.run_id, answers])).duplicate, true)
    assert.equal((await db.query('SELECT count(*)::int n FROM quiz_attempt_answers')).rows[0].n, 5)
    assert.equal((await db.query('SELECT count(*)::int n FROM user_packs')).rows[0].n, 0)
    const changed = { ...answers, [run.questions[0].id]: run.questions[0].options.find(o => o.id !== answers[run.questions[0].id]).id }
    await assert.rejects(call(uid, 'SELECT submit_learning_quiz($1,$2) AS result', [run.run_id, changed]), /different answers/)
  })
  await check('three attempts per topic per Singapore day', async () => {
    for (let n = 0; n < 2; n++) {
      const next = await call(uid, 'SELECT start_learning_quiz($1,$2) AS result', [topic, randomUUID()])
      await call(uid, 'SELECT submit_learning_quiz($1,$2) AS result', [next.run_id, Object.fromEntries(next.questions.map(q => [q.id, q.options[0].id]))])
    }
    await assert.rejects(call(uid, 'SELECT start_learning_quiz($1,$2) AS result', [topic, randomUUID()]), /Three attempts used/)
    await db.query('UPDATE private.learning_quiz_runs SET quiz_day=quiz_day-1 WHERE user_id=$1', [uid])
    const tomorrow = await call(uid, 'SELECT start_learning_quiz($1,$2) AS result', [topic, randomUUID()])
    assert.equal(tomorrow.attempt_number, 1)
  })
  const session = randomUUID(), block = randomUUID()
  const study = (action, blockId = null, who = uid) => call(who, "SELECT study_session_action($1,$2,'flashcards',$3,$4) AS result", [session, topic, action, blockId])
  await study('open')
  await check('focus time requires server-observed elapsed time', async () => {
    await study('start', block)
    const early = await study('complete_block')
    assert.equal(early.block.focus_completed_at, null); assert.equal(early.xp, null)
    await db.query("UPDATE pomodoro_blocks SET running_since=now()-interval '5 minutes' WHERE id=$1", [block])
    const stale = await study('heartbeat')
    assert(stale.block.active_ms <= 31000); assert.equal(stale.block.running_since, null)
    await assert.rejects(study('complete', null, other), /another activity/)
  })
  await check('completed focus blocks persist once and daily totals reset in SGT', async () => {
    for (let n = 0; n < 4; n++) {
      if (n) await study('start', randomUUID())
      await db.query("UPDATE pomodoro_blocks SET active_ms=1490000,running_since=now()-interval '11 seconds' WHERE session_id=$1 AND focus_completed_at IS NULL", [session])
      const completed = await study('complete_block')
      assert.equal(completed.xp.delta, 10)
      assert.equal((await study('complete_block')).xp.eventId, completed.xp.eventId)
    }
    assert.equal((await call(uid, 'SELECT get_daily_learning_progress() AS result')).timer_rewards, 4)
    await db.query("UPDATE studydex_xp_events SET created_at=((now() AT TIME ZONE 'Asia/Singapore')::date-1)::timestamp AT TIME ZONE 'Asia/Singapore' WHERE user_id=$1 AND reward_type='timer'", [uid])
    assert.equal((await call(uid, 'SELECT get_daily_learning_progress() AS result')).timer_rewards, 0)
  })
  await check('deck completion and own history are durable and isolated', async () => {
    await study('complete')
    assert.equal((await user(uid, 'SELECT * FROM study_sessions')).length, 1)
    assert.equal((await user(other, 'SELECT * FROM study_sessions')).length, 0)
    assert.equal((await user(uid, 'SELECT * FROM topic_completions')).length, 1)
    assert.equal((await user(uid, 'SELECT * FROM pomodoro_blocks')).length, 4)
    assert.equal((await user(other, 'SELECT * FROM quiz_attempts')).length, 0)
    await assert.rejects(call(uid, "SELECT award_studydex_xp($1,$2,'quiz',5,5,NULL) AS result", [randomUUID(), buddy]), /saved activity/)
  })
  await check('tasks and buddy selection use owned records', async () => {
    const task = randomUUID()
    await call(uid, 'SELECT save_learning_todo($1,$2,false) AS result', [task, 'My task'])
    assert.equal((await user(other, 'SELECT * FROM todos')).length, 0)
    await assert.rejects(call(other, 'SELECT save_learning_todo($1,$2,false) AS result', [task, 'Overwrite']), /another account/)
    assert.equal((await user(uid, 'SELECT title FROM todos'))[0].title, 'My task')
    await assert.rejects(call(other, 'SELECT select_user_pokemon($1) AS result', [buddy]), /own collection/)
  })
  await check('Boss Battle results join the same owned history without duplicate XP', async () => {
    const event = randomUUID()
    await call(uid, 'SELECT record_learning_boss($1,$2,0) AS result', [session,event])
    assert.equal((await call(uid, 'SELECT record_learning_boss($1,$2,0) AS result', [session,event])).duplicate, true)
    assert.equal((await user(uid, "SELECT * FROM quiz_attempts WHERE attempt_type='boss_battle'")).length, 1)
    await assert.rejects(call(other, 'SELECT record_learning_boss($1,$2,0) AS result', [session,randomUUID()]))
  })
  await check('the fifth verified focus block is saved without exceeding daily XP', async () => {
    await db.query("UPDATE studydex_xp_events SET created_at=now() WHERE user_id=$1 AND reward_type='timer'", [uid])
    const s = randomUUID(), b = randomUUID()
    await call(uid, "SELECT study_session_action($1,$2,'flashcards','open',NULL) AS result", [s,topic])
    await call(uid, "SELECT study_session_action($1,$2,'flashcards','start',$3) AS result", [s,topic,b])
    await db.query('UPDATE pomodoro_blocks SET active_ms=1500000 WHERE id=$1',[b])
    const result = await call(uid, "SELECT study_session_action($1,$2,'flashcards','complete_block',NULL) AS result", [s,topic])
    assert.equal(result.xp.delta,0)
    assert.equal((await call(uid, 'SELECT get_daily_learning_progress() AS result')).timer_rewards,4)
  })
  await check('account deletion cascades all new private/public activity', async () => {
    await db.query('DELETE FROM auth.users WHERE id=$1', [uid])
    for (const table of ['todos', 'topic_completions', 'study_sessions', 'quiz_attempts', 'studydex_xp_events', 'private.learning_quiz_runs']) {
      assert.equal((await db.query(`SELECT count(*)::int n FROM ${table} WHERE user_id=$1`, [uid])).rows[0].n, 0, table)
    }
    assert.equal((await db.query('SELECT count(*)::int n FROM pomodoro_blocks')).rows[0].n, 0)
    assert.equal((await db.query('SELECT count(*)::int n FROM quiz_attempt_answers')).rows[0].n, 0)
  })
  await check('quiz XP matches all score bands, rounds percentages, and applies each attempt once', async () => {
    const student = randomUUID()
    await db.query('INSERT INTO auth.users VALUES($1,$2,$3)', [student, `${student}@example.invalid`, { display_name: 'Quiz rewards fixture', school_level_number: 3 }])
    await call(student, 'SELECT public.claim_starter(4) AS result')
    const recipient = (await db.query('SELECT id FROM user_pokemon WHERE user_id=$1', [student])).rows[0].id
    const bank = (await db.query(`SELECT q.id,a.correct_option_id,
      (SELECT o.id FROM question_options o WHERE o.question_id=q.id AND o.id<>a.correct_option_id ORDER BY o.id LIMIT 1) AS wrong_option_id
      FROM questions q JOIN question_answers a ON a.question_id=q.id
      WHERE q.question_purpose='quiz' ORDER BY q.id LIMIT 200`)).rows
    assert.equal(bank.length, 200)
    const scores = [...Array.from({ length: 101 }, (_, n) => [n,100]), [1,200], [199,200], [1,3], [2,3]]
    for (const [index, [correctCount, totalCount]] of scores.entries()) {
      const items = bank.slice(0,totalCount)
      const id = randomUUID()
      const questions = items.map(q => ({ id:q.id, options:[{ id:q.correct_option_id },{ id:q.wrong_option_id }] }))
      const keys = Object.fromEntries(items.map(q => [q.id,{ correct_option_id:q.correct_option_id }]))
      const choices = Object.fromEntries(items.map((q,i) => [q.id,i<correctCount ? q.correct_option_id : q.wrong_option_id]))
      // Trusted question snapshots normally come from start_learning_quiz.
      // Construct longer fixture attempts to exercise percentage rounding and
      // interior band values beyond the production five-question sample.
      await db.query(`INSERT INTO private.learning_quiz_runs(id,user_id,topic_id,buddy_id,quiz_day,attempt_number,questions,answer_key)
        VALUES($1,$2,$3,$4,date '2000-01-01'+$5::integer,1,$6,$7)`, [id,student,topic,recipient,index,questions,keys])
      const result = await call(student,'SELECT submit_learning_quiz($1,$2) AS result',[id,choices])
      const expected = calculateQuizReward(correctCount,totalCount)
      assert.equal(result.scorePercent,expected.scorePercent,`${correctCount}/${totalCount} percentage`)
      assert.equal(result.delta,expected.xp,`${correctCount}/${totalCount} reward`)
      const repeated = await call(student,'SELECT submit_learning_quiz($1,$2) AS result',[id,choices])
      assert.equal(repeated.duplicate,true)
      assert.equal(repeated.xp,result.xp)
    }
    const events = (await db.query('SELECT count(*)::int n FROM studydex_xp_events WHERE user_id=$1 AND reward_type=\'quiz\'',[student])).rows[0].n
    assert.equal(events,scores.length)
    const attempts = (await db.query('SELECT count(*)::int n FROM quiz_attempts WHERE user_id=$1',[student])).rows[0].n
    assert.equal(attempts,scores.length)
  })
  console.log(`${checks} database integration checks passed`)
} catch (error) { console.error('FAIL', error.message); process.exitCode = 1 }
finally { await db.close() }
