import { test, expect } from '@playwright/test'
import { mockLab } from './fixtures/lab'
import { studentProfile } from '../src/test/studyFixtures'
const packId = '11111111-1111-4111-8111-111111111111'
async function fixtures(page) {
  const { errors } = await mockLab(page)
  const state = { count: 3, claimed: false, opens: [], claims: [], dropOpeningResponse: false, owned: [], selections: [] }
  await page.route('https://raw.githubusercontent.com/**', route => route.abort())
  await page.route('https://pokeapi.co/**', route => route.abort())
  await page.route('https://studydex-fixture.invalid/rest/v1/rpc/**', async route => {
    const name = new URL(route.request().url()).pathname.split('/').at(-1)
    const headers = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': 'GET, POST, OPTIONS' }
    if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 204, headers })
    let data
    if (name === 'get_user_pokemon') data = { user_id: studentProfile.id, pokemon: state.owned, starter_claimed: state.claimed, pending_xp: 0 }
    if (name === 'get_reward_inventory') data = { user_id: studentProfile.id, unopened_count: state.count, packs: state.count ? [{ id: packId, earned_at: '2026-11-04T00:00:00Z' }] : [] }
    if (name === 'open_reward_pack') {
      state.opens.push(route.request().postDataJSON())
      if (state.opens.length === 1) state.count--
      if (state.dropOpeningResponse) { state.dropOpeningResponse = false; return route.abort('connectionreset') }
      data = { user_id: studentProfile.id, pack_id: packId, reward_type: 'pokemon', xp_awarded: 0, pokemon: { pokeapi_id: 4, name: 'charmander', sprite_url: null } }
    }
    if (name === 'select_user_pokemon') {
      const id = route.request().postDataJSON().p_owned_id
      state.selections.push(id)
      state.owned = state.owned.map(p => ({ ...p, is_selected: p.owned_id === id }))
      data = { user_id: studentProfile.id, pokemon: state.owned, starter_claimed: state.claimed, pending_xp: 0 }
    }
    if (name === 'get_starter_status') data = { user_id: studentProfile.id, claimed: state.claimed }
    if (name === 'claim_starter') {
      state.claims.push(route.request().postDataJSON()); state.claimed = true
      const id = route.request().postDataJSON().p_pokeapi_id
      state.owned = [{ owned_id: packId, pokemon_id: packId, pokeapi_id: id, original_pokeapi_id: id, name: { 1: 'bulbasaur', 4: 'charmander', 7: 'squirtle' }[id], xp: 0, level: 1, stage_count: 3, evolution_stage: 0, fully_trained: false, is_selected: true, is_defeated: false, sprite_url: '/selection/pokeball-purple.svg' }]
      data = { user_id: studentProfile.id, claimed: true }
    }
    await route.fulfill({ headers, status: data ? 200 : 404, json: data || {} })
  })
  return { state, errors }
}

test('earned-pack badge routes to Rewards and updates from confirmed inventory, with keyboard opening', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 900 })
  await page.emulateMedia({ reducedMotion: 'reduce' })
  const { state, errors } = await fixtures(page)
  await page.goto('/trainer')
  await page.getByRole('button', { name: 'Open navigation', exact: true }).click()
  const bag = page.getByRole('button', { name: /Bag, 3 unopened packs, open Rewards/ })
  await expect(bag).toBeVisible()
  await bag.click()
  await expect(page).toHaveURL(/\/rewards$/)
  await page.getByRole('button', { name: 'Open a pack', exact: true }).first().click()
  await page.getByRole('button', { name: 'Open', exact: true }).click()
  const reveal = page.getByRole('button', { name: 'Open this pack', exact: true })
  await expect(reveal).toBeFocused()
  await reveal.press('Enter')
  await expect(page.locator('.card-name')).toHaveText('charmander')
  expect(state.opens).toEqual([{ p_pack_id: packId }])
  await page.goto('/trainer')
  await page.getByRole('button', { name: 'Open navigation', exact: true }).click()
  await expect(page.getByRole('button', { name: /Bag, 2 unopened packs/ })).toBeVisible()
  state.count = 4
  await page.evaluate(() => window.dispatchEvent(new Event('focus')))
  await expect(page.getByRole('button', { name: /Bag, 4 unopened packs/ })).toBeVisible()
  expect(errors).toEqual([])
})

test('starter confirmation uses one server grant and re-entry does not grant again', async ({ page }) => {
  const { state, errors } = await fixtures(page)
  await page.goto('/starter')
  const starter = page.getByRole('button', { name: 'charmander' })
  await starter.focus(); await starter.press('Enter')
  await expect(starter).toHaveAttribute('aria-pressed', 'true')
  await page.getByRole('button', { name: 'I Choose You!' }).click()
  await expect(page).toHaveURL(/\/landing$/)
  expect(state.claims).toEqual([{ p_pokeapi_id: 4 }])
  await page.goto('/starter')
  await expect(page).toHaveURL(/\/landing$/)
  expect(state.claims).toHaveLength(1)
  expect(errors).toEqual([])
})


test('reload recovers an uncertain opening with the same saved pack ID and no second consumption', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  const { state, errors } = await fixtures(page)
  state.count = 1; state.dropOpeningResponse = true
  await page.goto('/rewards')
  await page.getByRole('button', { name: 'Open a pack', exact: true }).first().click()
  await page.getByRole('button', { name: 'Open', exact: true }).click()
  await page.getByRole('button', { name: 'Open this pack', exact: true }).press('Enter')
  await expect(page.getByRole('alert')).toBeVisible()
  await page.reload()
  await expect(page.locator('.total')).toHaveText('0')
  await page.getByRole('button', { name: 'Resume pack', exact: true }).first().click()
  await page.getByRole('button', { name: 'Open', exact: true }).click()
  await page.getByRole('button', { name: 'Open this pack', exact: true }).press('Enter')
  await expect(page.locator('.card-name')).toHaveText('charmander')
  expect(state.opens).toEqual([{ p_pack_id: packId }, { p_pack_id: packId }])
  expect(state.count).toBe(0)
  await page.getByRole('button', { name: 'Back to packs', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Resume pack', exact: true })).toHaveCount(0)
  expect(errors).toEqual([])
})

test('unavailable starter setup keeps studying accessible without inventing a grant', async ({ page }) => {
  const { state, errors } = await fixtures(page)
  await page.route('https://studydex-fixture.invalid/rest/v1/rpc/get_starter_status', route => route.fulfill({
    status: 404, headers: { 'access-control-allow-origin': '*' },
    json: { code: 'PGRST202', message: 'Fixture: starter backend unavailable' },
  }))
  await page.goto('/starter')
  await expect(page.getByRole('alert')).toContainText('Rewards are not connected yet')
  await expect(page.getByRole('link', { name: 'Continue studying' })).toHaveAttribute('href', '/home')
  await expect(page.getByRole('button', { name: 'I Choose You!' })).toBeDisabled()
  expect(state.claims).toEqual([])
  expect(errors).toEqual([])
})

test('legacy buddy link opens the authenticated Trainer collection', async ({ page }) => {
  const { errors } = await fixtures(page)
  await page.goto('/pokebuddy')
  await expect(page).toHaveURL(/\/trainer$/)
  await expect(page.getByRole('link', { name: 'Choose your starter', exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: '+50 XP', exact: true })).toHaveCount(0)
  expect(errors).toEqual([])
})

test('saved starter appears in Town and Trainer after reload, and buddy selection persists', async ({ page }) => {
  const { state, errors } = await fixtures(page)
  await page.goto('/starter')
  await page.getByRole('button', { name: 'charmander' }).click()
  await page.getByRole('button', { name: 'I Choose You!' }).click()
  await expect(page).toHaveURL(/\/landing$/)
  await page.goto('/home')
  await expect(page.locator('.trainer-buddy-name')).toHaveText('Charmander')
  await page.reload()
  await expect(page.locator('.trainer-buddy-name')).toHaveText('Charmander')
  state.owned.push({ ...state.owned[0], owned_id: '22222222-2222-4222-8222-222222222222', pokeapi_id: 7, original_pokeapi_id: 7, name: 'squirtle', is_selected: false })
  await page.evaluate(() => window.dispatchEvent(new Event('focus')))
  await page.getByRole('button', { name: /Trainer Hub/ }).click()
  await page.getByRole('button', { name: /Pokédex/ }).click()
  await page.getByRole('button', { name: 'Choose Squirtle as your town buddy' }).click()
  await expect(page.locator('.trainer-buddy-name')).toHaveText('Squirtle')
  await page.reload()
  await expect(page.locator('.trainer-buddy-name')).toHaveText('Squirtle')
  await page.goto('/trainer')
  await expect(page.locator('.buddy-figure h3')).toHaveText('Squirtle')
  Object.assign(state.owned[1], { pokeapi_id: 9, name: 'blastoise', xp: 175, level: 3, evolution_stage: 2 })
  await page.goto('/study-decks?subject=science&topic_id=water-topic&mode=flashcards')
  await page.getByRole('button', { name: 'Start Study Session', exact: true }).click()
  await expect(page.locator('.lab-pokemon-buddy h3')).toHaveText('Blastoise')
  expect(state.selections).toEqual(['22222222-2222-4222-8222-222222222222'])
  expect(state.claims).toHaveLength(1)
  expect(errors).toEqual([])
})
