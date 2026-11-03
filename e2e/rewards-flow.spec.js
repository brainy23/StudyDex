import { test, expect } from '@playwright/test'
import { mockLab } from './fixtures/lab'
import { studentProfile } from '../src/test/studyFixtures'
const packId = '11111111-1111-4111-8111-111111111111'
async function fixtures(page) {
  const { errors } = await mockLab(page)
  const state = { count: 3, claimed: false, opens: [], claims: [] }
  await page.route('https://raw.githubusercontent.com/**', route => route.abort())
  await page.route('https://pokeapi.co/**', route => route.abort())
  await page.route('https://studydex-fixture.invalid/rest/v1/rpc/**', async route => {
    const name = new URL(route.request().url()).pathname.split('/').at(-1)
    const headers = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': 'GET, POST, OPTIONS' }
    if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 204, headers })
    let data
    if (name === 'get_reward_inventory') data = { user_id: studentProfile.id, unopened_count: state.count, packs: state.count ? [{ id: packId, earned_at: '2026-11-04T00:00:00Z' }] : [] }
    if (name === 'open_reward_pack') {
      state.opens.push(route.request().postDataJSON())
      if (state.opens.length === 1) state.count--
      data = { user_id: studentProfile.id, pack_id: packId, reward_type: 'pokemon', xp_awarded: 0, pokemon: { pokeapi_id: 4, name: 'charmander', sprite_url: null } }
    }
    if (name === 'get_starter_status') data = { user_id: studentProfile.id, claimed: state.claimed }
    if (name === 'claim_starter') {
      state.claims.push(route.request().postDataJSON()); state.claimed = true
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
