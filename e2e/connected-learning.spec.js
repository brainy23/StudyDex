import { test, expect } from '@playwright/test'
import { learningFixture } from './learning-fixture'

test('server-only database files are unavailable over the development server', async ({ request }) => {
  for (const path of ['/supabase/seed.sql', '/database/verify-connected-learning.sql']) {
    expect((await request.get(path)).status()).toBe(403)
  }
})

test('to-dos persist in the signed-in account after a reload', async ({ page }) => {
  const fixture = await learningFixture(page)
  try {
    await page.goto('/home')
    await page.getByRole('button', { name:'To-Do List', exact:true }).click()
    await page.locator('#new-todo-title').fill('Revise fractions')
    await page.locator('#todoModal').getByRole('button', { name:'+ Add', exact:true }).click()
    await expect(page.locator('.todo-notepad-row')).toContainText('Revise fractions')
    await page.reload()
    await page.getByRole('button', { name:'To-Do List', exact:true }).click()
    await expect(page.locator('.todo-notepad-row')).toContainText('Revise fractions')
    expect((await fixture.db.query('SELECT count(*)::int n FROM public.todos')).rows[0].n).toBe(1)
    expect(fixture.errors).toEqual([])
    expect(fixture.liveRequests).toEqual([])
  } finally { await fixture.close() }
})

test('graded quiz saves a real result and history without exposing answer keys', async ({ page }) => {
  const fixture = await learningFixture(page)
  try {
    await page.goto('/subjects?flow=quiz')
    await page.locator('.sd-path').filter({ hasText:/Mathematics/i }).click()
    await page.locator('.sd-topic-card').first().click()
    await expect(page.locator('dialog.pokemon-transition')).toBeHidden()
    await expect(page.getByRole('region', { name:'Graded quiz' })).toBeVisible()
    for (let n=0;n<5;n++) {
      await page.locator('.demo-answers button').first().click()
      await page.getByRole('button', { name:n===4 ? /Submit quiz/ : /Next question/ }).click()
    }
    await expect(page.locator('dialog').filter({ hasText:'Quiz complete!' })).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(page.locator('.demo-board')).toContainText('XP saved')
    expect(fixture.requests).not.toContain('question_answers')
    await page.goto('/dashboard')
    await expect(page.locator('.history-table-wrap')).toContainText('Quiz')
    expect((await fixture.db.query('SELECT count(*)::int n FROM public.quiz_attempts')).rows[0].n).toBe(1)
    expect((await fixture.db.query('SELECT count(*)::int n FROM public.user_packs')).rows[0].n).toBe(0)
    await page.goto('/subjects?flow=quiz')
    await page.locator('.sd-path').filter({ hasText:/Mathematics/i }).click()
    await expect(page.locator('.sd-topic-card').first().locator('.sd-done-badge')).toContainText('Done')
    await page.goto('/subjects?flow=study')
    await page.locator('.sd-path').filter({ hasText:/Mathematics/i }).click()
    await expect(page.locator('.sd-done-badge')).toHaveCount(0)
    expect(fixture.errors).toEqual([])
    expect(fixture.liveRequests).toEqual([])
  } finally { await fixture.close() }
})

test('merged collection displays saved XP and persists an owned buddy selection', async ({ page }) => {
  const fixture = await learningFixture(page)
  try {
    await fixture.db.exec('RESET ROLE')
    await fixture.db.query(`INSERT INTO user_pokemon(user_id,pokemon_id,xp,level,is_selected,is_defeated)
      SELECT $1,id,0,1,false,false FROM pokemon WHERE pokeapi_id=7`, [fixture.session.user.id])
    await fixture.db.exec('SET ROLE authenticated')
    await page.goto('/collection')
    await expect(page.locator('.tile')).toHaveCount(2)
    await expect(page.locator('.plate')).toContainText('Lv 1 · 0 XP')
    await page.locator('.tile').last().click()
    await page.getByRole('button', { name:'Make active Pokémon', exact:true }).click()
    await expect(page.getByRole('button', { name:'✓ Active Pokémon', exact:true })).toBeDisabled()
    await page.reload()
    await expect(page.locator('.tile').last()).toHaveClass(/active/)
    expect(fixture.errors).toEqual([])
    expect(fixture.liveRequests).toEqual([])
  } finally { await fixture.close() }
})

test('lesson completion is saved and survives a visit to Study History', async ({ page }) => {
  const fixture = await learningFixture(page)
  try {
    await page.goto('/subjects?flow=study')
    await page.locator('.sd-path').filter({ hasText:/Mathematics/i }).click()
    await page.locator('.sd-topic-card').first().click()
    await page.locator('.sd-path').filter({ hasText:/Learn/ }).click()
    await page.getByRole('button', { name:'Finish lesson', exact:true }).click()
    await expect(page.getByRole('button', { name:'Lesson completion saved' })).toBeDisabled()
    await page.goto('/dashboard')
    await expect(page.locator('.history-table-wrap')).toContainText('Learn')
    expect((await fixture.db.query('SELECT count(*)::int n FROM public.topic_completions')).rows[0].n).toBe(1)
    expect(fixture.errors).toEqual([])
  } finally { await fixture.close() }
})

test('a saved focus block drives daily progress and Study History', async ({ page }) => {
  const fixture = await learningFixture(page)
  try {
    await page.goto('/subjects?flow=study')
    await page.locator('.sd-path').filter({ hasText:/Mathematics/i }).click()
    await page.locator('.sd-topic-card').first().click()
    await page.locator('.sd-path').filter({ has: page.locator('strong', { hasText: /^Study$/ }) }).click()
    await expect.poll(async () => (await fixture.db.query('SELECT count(*)::int n FROM study_sessions')).rows[0].n).toBe(1)
    await page.clock.install()
    await page.getByRole('button', { name:'Start', exact:true }).click()
    await expect.poll(async () => (await fixture.db.query('SELECT count(*)::int n FROM pomodoro_blocks')).rows[0].n).toBe(1)
    // Only the isolated test engine fast-forwards verified elapsed time.
    await fixture.db.exec("RESET ROLE; UPDATE pomodoro_blocks SET active_ms=1500000,focus_seconds=1500,running_since=now(); SET ROLE authenticated;")
    await page.clock.fastForward(1500001)
    await expect(page.locator('dialog').filter({ hasText:'Focus session complete!' })).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(page.locator('.focus-session-count')).toHaveText('1 / 4 sessions')
    await page.goto('/dashboard')
    await expect(page.locator('.history-table-wrap')).toContainText('Study')
    await expect(page.locator('.history-table-wrap')).toContainText('+10')
    expect(fixture.errors).toEqual([])
  } finally { await fixture.close() }
})

test('quiz submission failures preserve answers and retry without a second attempt', async ({ page }) => {
  const fixture = await learningFixture(page)
  try {
    await page.goto('/subjects?flow=quiz')
    await page.locator('.sd-path').filter({ hasText:/Mathematics/i }).click()
    await page.locator('.sd-topic-card').first().click()
    fixture.failures.add('submit_learning_quiz')
    for (let n=0;n<5;n++) {
      await page.locator('.demo-answers button').first().click()
      await page.getByRole('button', { name:n===4 ? /Submit quiz/ : /Next question/ }).click()
    }
    await expect(page.getByRole('alert')).toContainText('Synthetic connection failure')
    fixture.failures.delete('submit_learning_quiz')
    await page.getByRole('button', { name:/Submit quiz/ }).click()
    await expect(page.locator('.demo-board')).toContainText('XP saved')
    expect((await fixture.db.query('SELECT count(*)::int n FROM public.quiz_attempts')).rows[0].n).toBe(1)
    expect(fixture.errors).toEqual([])
  } finally { await fixture.close() }
})
