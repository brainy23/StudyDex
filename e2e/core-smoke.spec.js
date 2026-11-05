import { test, expect } from '@playwright/test'
import { learningFixture } from './learning-fixture'

// Basic smoke coverage for core features that had no end-to-end test:
// logout, Rewards and the admin pages. Uses the same mocked backend as the
// other specs, so nothing reaches the shared Supabase project.

test('a signed-in student can log out from the Town profile menu', async ({ page }) => {
  const fixture = await learningFixture(page)
  try {
    await page.goto('/home')
    await page.locator('.trainer-profile-trigger').click()
    await page.locator('#trainer-profile-actions .trainer-logout').click()
    await expect(page).toHaveURL(/\/login$/)
    expect(await page.evaluate(() => localStorage.getItem('sb-studydex-fixture-auth-token'))).toBeNull()
    expect(fixture.liveRequests).toEqual([])
  } finally {
    await fixture.close()
  }
})

test('Rewards shows the unopened packs saved in the account', async ({ page }) => {
  const fixture = await learningFixture(page)
  try {
    const uid = fixture.session.user.id
    await fixture.db.exec('RESET ROLE')
    await fixture.db.query('INSERT INTO public.user_packs(user_id) VALUES ($1), ($1)', [uid])
    await fixture.db.exec('SET ROLE authenticated')
    // Serve the two tables Rewards reads from the fixture database.
    const headers = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-expose-headers': 'content-range' }
    await page.route(/studydex-fixture\.invalid\/rest\/v1\/(user_packs|pokemon)\?/, async (route) => {
      const request = route.request()
      if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers })
      const table = new URL(request.url()).pathname.split('/').at(-1)
      const rows = table === 'user_packs'
        ? (await fixture.db.query('SELECT id FROM public.user_packs WHERE user_id = $1 AND opened_at IS NULL', [uid])).rows
        : (await fixture.db.query('SELECT id, pokeapi_id FROM public.pokemon')).rows
      const range = { 'content-range': `0-${Math.max(0, rows.length - 1)}/${rows.length}` }
      if (request.method() === 'HEAD') return route.fulfill({ status: 200, headers: { ...headers, ...range } })
      return route.fulfill({ headers: { ...headers, ...range }, json: rows })
    })
    await page.goto('/rewards')
    await expect(page.locator('.shelf-title .total')).toHaveText('2')
    expect(fixture.errors).toEqual([])
    expect(fixture.liveRequests).toEqual([])
  } finally {
    await fixture.close()
  }
})

const adminPages = [
  ['/admin-home', 'Hello Admin!'],
  ['/admin-users', 'User Overview'],
  ['/admin-education', 'StudyDeck Overview'],
  ['/admin-quiz', 'Quiz Management'],
  ['/admin-addquiz', 'Create Quiz'],
  ['/admin-adddeck', 'New Deck'],
]

test('admin pages open for a signed-in account', async ({ page }) => {
  const fixture = await learningFixture(page)
  try {
    for (const [path, heading] of adminPages) {
      await page.goto(path)
      await expect(page.getByRole('heading', { level: 1 })).toContainText(heading)
    }
    expect(fixture.errors).toEqual([])
  } finally {
    await fixture.close()
  }
})

test('admin Add Deck rejects an empty form with a clear message', async ({ page }) => {
  const fixture = await learningFixture(page)
  try {
    await page.goto('/admin-adddeck')
    await page.getByRole('button', { name: 'Publish' }).click()
    await expect(page.locator('.error')).toHaveText('Please fill in all fields.')
    await expect(page).toHaveURL(/\/admin-adddeck$/)
  } finally {
    await fixture.close()
  }
})
