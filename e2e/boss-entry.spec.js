import { test, expect } from '@playwright/test'
import { mockOnboarding } from './onboarding-fixture'

const encounterKey = 'studydex-boss-encounter-v1'
async function fixture(page, { motion = 'reduce', failProfile = false } = {}) {
  const evidence = await mockOnboarding(page, { avatarConfirmed: true, starterClaimed: true })
  await page.emulateMedia({ reducedMotion: motion })
  let release
  const ready = new Promise((resolve) => {
    release = resolve
  })
  const state = { release, gateBoss: false, failProfile, profileRequests: 0 }
  const headers = { 'access-control-allow-origin': '*' }
  const topics = [
    {
      id: 'numbers',
      subject_id: 'math',
      level_id: evidence.state.schoolLevel.id,
      name: 'Numbers P3',
      topic_order: 1,
    },
  ]
  const cards = [1, 2, 3].map((index) => ({
    id: `card-${index}`,
    topic_id: 'numbers',
    card_order: index,
    front_text: `${index} + ${index}`,
    back_text: String(index * 2),
    front_image_path: null,
    back_image_path: null,
  }))
  await page.route('https://studydex-fixture.invalid/rest/v1/subjects*', (route) =>
    route.fulfill({ headers, json: [{ id: 'math', name: 'Mathematics' }] }),
  )
  await page.route('https://studydex-fixture.invalid/rest/v1/topics*', (route) =>
    route.fulfill({ headers, json: topics }),
  )
  await page.route('https://studydex-fixture.invalid/rest/v1/flashcards*', (route) =>
    route.fulfill({ headers, json: cards }),
  )
  await page.route('https://studydex-fixture.invalid/rest/v1/profiles*', async (route) => {
    if (!state.gateBoss) return route.fallback()
    state.profileRequests++
    await ready
    if (state.failProfile)
      return route.fulfill({ status: 403, headers, json: { message: 'Synthetic profile failure' } })
    return route.fallback()
  })
  const writes = []
  const privateReads = []
  page.on('request', (request) => {
    const url = new URL(request.url())
    if (!url.hostname.endsWith('fixture.invalid')) return
    if (
      url.pathname.includes('/rest/v1/') &&
      !url.pathname.includes('/rpc/') &&
      request.method() !== 'GET'
    )
      writes.push(url.pathname)
    if (url.pathname.includes('question_answers')) privateReads.push(url.pathname)
  })
  await page.goto('/study-decks?subject=math&topic=numbers')
  await expect(page.locator('.answer-content h1')).toHaveText('1 + 1')
  return { ...evidence, state, writes, privateReads }
}
async function rate(page, name = 'Again') {
  await page.getByRole('button', { name: 'Reveal answer', exact: true }).click()
  await page.getByRole('button', { name, exact: true }).click()
}
async function trigger(page, evidence) {
  await rate(page, 'Easy')
  await rate(page, 'Easy')
  evidence.state.gateBoss = true
  await rate(page)
  await expect(page.locator('dialog.pokemon-transition')).toBeVisible()
  await expect.poll(() => evidence.state.profileRequests).toBe(1)
}
async function savedEncounter(page) {
  return page.evaluate((key) => JSON.parse(sessionStorage.getItem(key)), encounterKey)
}

test('three fast ratings trigger the 2.5-second boss transition after the encounter is saved', async ({
  page,
}) => {
  const evidence = await fixture(page, { motion: 'no-preference' })
  // Flipping without rating does not count towards the trigger.
  for (let index = 0; index < 3; index++) {
    await page.getByRole('button', { name: 'Reveal answer', exact: true }).click()
    await page.getByRole('button', { name: 'Show question', exact: true }).click()
  }
  await expect(page.locator('dialog.pokemon-transition')).toBeHidden()
  await rate(page, 'Easy')
  await rate(page, 'Easy')
  await expect(page).toHaveURL(/\/study-decks[?]/)
  await expect(page.locator('dialog.pokemon-transition')).toBeHidden()
  evidence.state.gateBoss = true
  await rate(page)
  const dialog = page.locator('dialog.pokemon-transition')
  await expect(dialog.getByRole('heading')).toHaveText('A Boss Appears!')
  await expect(page).toHaveURL(/\/surprise-boss[?]encounter=/)
  const encounter = await savedEncounter(page)
  expect(encounter.status).toBe('pending')
  expect(encounter.snapshot.completed).toBe(2)
  expect(encounter.snapshot.queue).toEqual([2])
  expect(encounter.questions).toHaveLength(3)
  await expect(dialog).toHaveAttribute('data-phase', 'loading')
  await expect(dialog.locator('.transition-ball')).toHaveCSS('animation-duration', '1s')
  await expect.poll(() => evidence.state.profileRequests).toBe(1)
  await dialog.getByRole('button', { name: 'Skip animation' }).click()
  await expect(dialog).toBeVisible()
  evidence.state.release()
  await expect(dialog).toBeHidden()
  await expect(page.locator('#arena-question')).toBeFocused()
  await expect(page.getByRole('group', { name: /\d \+ \d/ })).toBeVisible()
  expect(evidence.errors).toEqual([])
  expect(evidence.liveRequests).toEqual([])
  expect(evidence.writes).toEqual([])
  expect(evidence.privateReads).toEqual([])
})

test('a slow rating breaks the streak; reduced motion still waits for battle preparation', async ({
  page,
}) => {
  const evidence = await fixture(page)
  await page.clock.install()
  await rate(page)
  await rate(page)
  await page.clock.fastForward(5001)
  await rate(page)
  await rate(page)
  await rate(page)
  await expect(page).toHaveURL(/\/study-decks[?]/)
  await expect(page.locator('dialog.pokemon-transition')).toBeHidden()
  evidence.state.gateBoss = true
  await rate(page)
  const dialog = page.locator('dialog.pokemon-transition')
  await expect(dialog).toHaveClass(/is-static/)
  await expect.poll(() => evidence.state.profileRequests).toBe(1)
  await page.keyboard.press('Escape')
  await expect(dialog).toBeVisible()
  evidence.state.release()
  await expect(dialog).toBeHidden()
  await expect(page.locator('#arena-question')).toBeVisible()
  expect(evidence.errors).toEqual([])
})

test('profile failures reveal retry without cancelling the saved encounter', async ({ page }) => {
  const evidence = await fixture(page, { failProfile: true })
  await trigger(page, evidence)
  evidence.state.release()
  await expect(page.locator('dialog.pokemon-transition')).toBeHidden()
  await expect(page.locator('.picker-shell')).toContainText('Could not load your profile')
  expect((await savedEncounter(page)).status).toBe('pending')
  evidence.state.failProfile = false
  await page.locator('.picker-shell').getByRole('button', { name: 'Retry', exact: true }).click()
  await expect(page.locator('#arena-question')).toBeVisible()
  await expect(page.locator('.encounter-error')).toBeHidden()
  expect((await savedEncounter(page)).status).toBe('pending')
  expect(evidence.errors).toEqual([])
})

for (const { outcome, choose, seconds, progress } of [
  {
    outcome: 'won',
    choose: (question) => question[2],
    seconds: (encounter) => encounter.snapshot.focusSeconds,
    progress: '2 / 3 finished',
  },
  {
    outcome: 'lost',
    choose: (question) => (question[2] + 1) % question[1].length,
    seconds: () => 1500,
    progress: '0 / 3 finished',
  },
]) {
  test(`the existing ${outcome} return still restores or resets the flashcards and timer`, async ({
    page,
  }) => {
    const evidence = await fixture(page)
    await page.clock.install()
    await page.getByRole('button', { name: 'Start', exact: true }).click()
    await page.clock.fastForward(2000)
    await trigger(page, evidence)
    const encounter = await savedEncounter(page)
    expect(encounter.snapshot.focusSeconds).toBeLessThan(1500)
    evidence.state.release()
    await expect(page.locator('dialog.pokemon-transition')).toBeHidden()
    for (const question of encounter.questions) {
      await page.locator('.demo-answers button').nth(choose(question)).click()
      await page.getByRole('button', { name: /Next question|See results/ }).click()
    }
    await page.getByRole('button', { name: /Continue flashcards|Restart flashcards/ }).click()
    await expect(page).toHaveURL(/bossReturn=/)
    await expect(page.locator('dialog.pokemon-transition')).toBeHidden()
    const expectedSeconds = seconds(encounter)
    const expectedTime = `${String(Math.floor(expectedSeconds / 60)).padStart(2, '0')}:${String(expectedSeconds % 60).padStart(2, '0')}`
    await expect(page.getByRole('timer', { name: 'Time remaining' })).toHaveText(expectedTime)
    await expect(page.locator('.console-status').filter({ hasText: /finished/ })).toHaveText(
      progress,
    )
    expect((await savedEncounter(page)).outcome).toBe(outcome)
    expect(evidence.errors).toEqual([])
    expect(evidence.writes).toEqual([])
  })
}

test('a blocked encounter save does not open the transition or battle', async ({ page }) => {
  const evidence = await fixture(page)
  await page.evaluate((key) => {
    const original = Storage.prototype.setItem
    Storage.prototype.setItem = function (name, value) {
      if (name === key) throw new Error('Synthetic storage failure')
      return original.call(this, name, value)
    }
  }, encounterKey)
  await rate(page)
  await rate(page)
  await rate(page)
  await expect(page).toHaveURL(/\/study-decks[?]/)
  await expect(page.locator('.lab-footer')).toContainText('session storage is unavailable')
  await expect(page.locator('dialog.pokemon-transition')).toBeHidden()
  expect(evidence.errors).toEqual([])
})

test('leaving a loading boss releases the transition', async ({ page }) => {
  const evidence = await fixture(page)
  await trigger(page, evidence)
  await page.goBack()
  await expect(page).toHaveURL(/\/study-decks[?]/)
  await expect(page.locator('dialog.pokemon-transition')).toBeHidden()
  evidence.state.release()
  await expect(page.getByRole('button', { name: 'Reveal answer', exact: true })).toBeEnabled()
  expect(evidence.errors).toEqual([])
})

test('a timed-out boss profile read offers retry and ignores its late response', async ({
  page,
}) => {
  const evidence = await fixture(page)
  await page.clock.install()
  await trigger(page, evidence)
  await page.clock.fastForward(15001)
  await expect(page.locator('dialog.pokemon-transition')).toBeHidden()
  await expect(page.locator('.picker-shell')).toContainText('Could not load your profile')
  evidence.state.release()
  await page.locator('.picker-shell').getByRole('button', { name: 'Retry', exact: true }).click()
  await expect(page.locator('#arena-question')).toBeVisible()
  expect((await savedEncounter(page)).status).toBe('pending')
  expect(evidence.errors).toEqual([])
})
