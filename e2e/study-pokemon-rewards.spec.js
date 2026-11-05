import { test, expect } from '@playwright/test'
import { learningFixture } from './learning-fixture'

async function prepare(page, { anotherPokemon = true } = {}) {
  const fixture = await learningFixture(page)
  // Keep this test inside learning hours without depending on the host clock.
  const daytime = new Date()
  daytime.setUTCHours(2, 0, 0, 0)
  await page.clock.setFixedTime(daytime)
  await fixture.db.exec('RESET ROLE')
  const topic = (await fixture.db.query(`SELECT t.id FROM topics t JOIN levels l ON l.id=t.level_id
    WHERE l.level_number=3 AND EXISTS(SELECT 1 FROM flashcards f WHERE f.topic_id=t.id) ORDER BY t.id LIMIT 1`)).rows[0].id
  // A one-card synthetic revision keeps the browser journey focused on rewards.
  await fixture.db.query('DELETE FROM flashcards WHERE topic_id=$1 AND id<>(SELECT id FROM flashcards WHERE topic_id=$1 ORDER BY id LIMIT 1)', [topic])
  await fixture.db.query('UPDATE user_pokemon SET xp=198 WHERE user_id=$1', [fixture.session.user.id])
  let recipient
  if (anotherPokemon) {
    recipient = (await fixture.db.query(`INSERT INTO user_pokemon(user_id,pokemon_id,xp)
      SELECT $1,id,20 FROM pokemon WHERE pokeapi_id=7 RETURNING id`, [fixture.session.user.id])).rows[0].id
  }
  await fixture.db.exec('SET ROLE authenticated')
  return { ...fixture, topic, recipient }
}
async function finishRevision(page, fixture) {
  await page.goto(`/study-decks?topic=${fixture.topic}`)
  await expect(page.locator('dialog.pokemon-transition')).toBeHidden()
  await page.getByRole('button', { name: 'Reveal answer', exact: true }).click()
  await page.getByRole('button', { name: 'Easy', exact: true }).click()
  const xp = page.locator('dialog.xp-prompt[open]')
  await expect(xp).toBeVisible()
  await expect(xp.locator('.amount')).toContainText('+5')
  await xp.getByRole('button', { name: 'Continue', exact: true }).click()
  const rewards = page.getByRole('dialog', { name: 'Keep your journey growing' })
  await expect(rewards).toBeVisible()
  await expect(rewards).toContainText('3 XP')
  return rewards
}
function assertIsolated(fixture) {
  expect(fixture.errors).toEqual([])
  expect(fixture.liveRequests).toEqual([])
}

test('xpPrompt hands off to saved non-MAX Pokémon; selecting one transfers XP and survives reload', async ({ page }) => {
  const fixture = await prepare(page)
  try {
    const rewards = await finishRevision(page, fixture)
    await expect(rewards.getByRole('button', { name: /Squirtle/i })).toBeVisible()
    await expect(rewards.getByRole('button', { name: /Charizard/i })).toHaveCount(0)
    await expect(rewards.getByRole('button', { name: /Open Poképack/ })).toHaveCount(0)
    await rewards.getByRole('button', { name: /Squirtle/i }).click()
    await expect(rewards).toContainText(/Squirtle is now your active buddy/i)
    const saved = (await fixture.db.query('SELECT get_user_pokemon() AS result')).rows[0].result
    expect(saved.pending_xp).toBe(0)
    expect(saved.pokemon.find(p => p.is_selected)).toMatchObject({ owned_id: fixture.recipient, xp: 23 })
    await rewards.getByRole('button', { name: 'Continue', exact: true }).click()
    await page.reload()
    await expect(page.getByRole('button', { name: 'Reveal answer', exact: true })).toBeVisible()
    await expect(rewards).toBeHidden()
    const persisted = (await fixture.db.query('SELECT get_user_pokemon() AS result')).rows[0].result
    expect(persisted.pokemon.find(p => p.is_selected)).toMatchObject({ owned_id: fixture.recipient, xp: 23 })
    expect(fixture.requests).toContain('resolve_study_pokemon_reward')
    assertIsolated(fixture)
  } finally { await fixture.close() }
})

test('xpPrompt offers a recovery Poképack when all saved Pokémon are MAX and activates its saved reward', async ({ page }) => {
  const fixture = await prepare(page, { anotherPokemon: false })
  try {
    const rewards = await finishRevision(page, fixture)
    await rewards.getByRole('button', { name: /Open Poképack/ }).click()
    await expect(rewards).toContainText('is now your active buddy')
    const saved = (await fixture.db.query('SELECT get_user_pokemon() AS result')).rows[0].result
    expect(saved.pokemon).toHaveLength(2)
    expect(saved.pending_xp).toBe(0)
    expect(saved.pokemon.find(p => p.is_selected).xp).toBe(3)
    expect(saved.pokemon.find(p => p.is_selected).original_pokeapi_id).not.toBe(4)
    expect((await fixture.db.query('SELECT count(*)::int n FROM user_packs WHERE opened_at IS NOT NULL')).rows[0].n).toBe(1)
    await rewards.getByRole('button', { name: 'Continue', exact: true }).click()
    await page.reload()
    await expect(page.getByRole('button', { name: 'Reveal answer', exact: true })).toBeVisible()
    await expect(rewards).toBeHidden()
    assertIsolated(fixture)
  } finally { await fixture.close() }
})

test('a failed XP transfer keeps the saved balance and can be retried without doubling XP', async ({ page }) => {
  const fixture = await prepare(page)
  try {
    const rewards = await finishRevision(page, fixture)
    fixture.failures.add('resolve_study_pokemon_reward')
    await rewards.getByRole('button', { name: /Squirtle/i }).click()
    await expect(rewards.getByRole('alert')).toContainText('Synthetic connection failure')
    expect((await fixture.db.query('SELECT get_user_pokemon() AS result')).rows[0].result.pending_xp).toBe(3)
    fixture.failures.delete('resolve_study_pokemon_reward')
    await rewards.getByRole('button', { name: /Squirtle/i }).click()
    await expect(rewards).toContainText(/Squirtle is now your active buddy/i)
    const saved = (await fixture.db.query('SELECT get_user_pokemon() AS result')).rows[0].result
    expect(saved.pending_xp).toBe(0)
    expect(saved.pokemon.find(p => p.is_selected).xp).toBe(23)
    assertIsolated(fixture)
  } finally { await fixture.close() }
})
