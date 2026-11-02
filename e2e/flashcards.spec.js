import process from 'node:process'
import { test, expect } from '@playwright/test'

// Opt-in live checks: use a locally saved Primary 3 session, never credentials in source.
const authState = process.env.STUDYDEX_E2E_AUTH_STATE
test.use({ storageState: authState || { cookies: [], origins: [] }, trace: 'off', video: 'off' })
// eslint-disable-next-line playwright/no-skipped-test -- Live authentication must be supplied explicitly.
test.skip(!authState, 'Set STUDYDEX_E2E_AUTH_STATE to an ignored local Primary 3 storage-state file.')

const topicName = 'Diversity of Living and Non-Living Things'
const isApiResponse = (response, table) =>
  new URL(response.url()).pathname.endsWith(`/rest/v1/${table}`) && response.request().method() === 'GET'

async function apiBody(response) {
  const body = await response.json()
  expect(response.status(), JSON.stringify({ code: body?.code, message: body?.message })).toBe(200)
  return body
}

async function openLiveDeck(page) {
  const cardResponses = []
  page.on('response', (response) => {
    if (isApiResponse(response, 'flashcards')) cardResponses.push(response)
  })
  const authResponse = page.waitForResponse((response) => new URL(response.url()).pathname.endsWith('/auth/v1/user'))
  const profileResponse = page.waitForResponse((response) => isApiResponse(response, 'profiles'))
  await page.goto('/home')
  const user = await apiBody(await authResponse)
  const profile = await apiBody(await profileResponse)
  expect(profile.id).toBe(user.id)
  expect(profile.school_level.name).toBe('Primary 3')
  await page.getByRole('button', { name: 'Not Now', exact: true }).click()
  const topicsResponse = page.waitForResponse((response) => isApiResponse(response, 'topics'))
  await page.locator('.building-button').filter({ hasText: 'Poké Lab' }).click()
  const topics = await apiBody(await topicsResponse)
  const topic = topics.find((item) => item.name === topicName)
  expect(topic, 'The signed-in Primary 3 student must be able to read the test topic').toBeDefined()
  expect(topic.level_id).toBe(profile.school_level_id)
  await page.locator('.arena-picker .bubble-card').filter({ hasText: 'Science' }).click()
  await page.locator('.study-topic-list').getByRole('button', { name: new RegExp(topicName) }).click()
  await page.getByRole('button', { name: 'Flashcards', exact: true }).click()
  const matchesTopic = (response) => new URL(response.url()).searchParams.get('topic_id') === `eq.${topic.id}`
  await expect.poll(() => cardResponses.some(matchesTopic)).toBe(true)
  const response = cardResponses.find(matchesTopic)
  expect(new URL(response.url()).searchParams.get('order')).toBe('card_order.asc')
  const cards = await apiBody(response)
  expect(cards).toHaveLength(15)
  expect(cards.map((card) => card.card_order)).toEqual(Array.from({ length: 15 }, (_, index) => index + 1))
  expect(new Set(cards.map((card) => card.id)).size).toBe(15)
  expect(new Set(cards.map((card) => card.concept_id)).size).toBe(7)
  await expect(page.locator('.study-review-progress')).toContainText('0 / 15 remembered')
  return cards
}

async function checkCurrentCard(page, cards) {
  const position = await page.locator('.study-card-position').textContent()
  const number = Number(position.match(/Card (\d+) of 15/)?.[1])
  const card = cards[number - 1]
  expect(card).toBeDefined()
  await expect(page.locator('.study-card-front .study-card-text')).toHaveText(card.front_text)
  await expect(page.locator('.study-card-back')).toHaveCount(0)
  await expect(page.locator('.study-flip-card')).toHaveAttribute('aria-pressed', 'false')
}

async function rate(page, cards, rating) {
  await checkCurrentCard(page, cards)
  await page.locator('.study-flip-card').click()
  await expect(page.locator('.study-flip-card')).toHaveAttribute('aria-pressed', 'true')
  await page.getByRole('button', { name: rating, exact: true }).click()
}

test('a Primary 3 student reviews all 15 live Science cards, completes and restarts', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 })
  const writes = []
  page.on('request', (request) => {
    if (new URL(request.url()).pathname.startsWith('/rest/v1/') && request.method() !== 'GET') {
      writes.push({ method: request.method(), path: new URL(request.url()).pathname })
    }
  })
  const cards = await openLiveDeck(page)
  const dimensions = await page.evaluate(() => ({ width: innerWidth, contentWidth: document.documentElement.scrollWidth }))
  expect(dimensions.contentWidth).toBeLessThanOrEqual(dimensions.width)
  await expect(page.locator('.lab-footer')).not.toContainText('Looking for your buddy')
  const buddy = await page.locator('.lab-footer').textContent()
  await page.getByRole('button', { name: 'Start Study Session', exact: true }).click()
  const timer = page.getByRole('timer')
  await expect(timer).not.toHaveText('25:00')
  await checkCurrentCard(page, cards)
  await page.locator('.study-flip-card').focus()
  await page.keyboard.press('Enter')
  await expect(page.locator('.study-flip-card')).toHaveAttribute('aria-pressed', 'true')
  await page.keyboard.press('Space')
  await expect(page.locator('.study-flip-card')).toHaveAttribute('aria-pressed', 'false')
  await rate(page, cards, 'Again')
  await rate(page, cards, 'Again')
  await rate(page, cards, 'Easy')
  await expect(page.locator('.study-review-progress')).toContainText('1 / 15 remembered')
  await page.getByRole('button', { name: 'Learn', exact: true }).click()
  await page.getByRole('button', { name: 'Flashcards', exact: true }).click()
  await expect(page.locator('.study-review-progress')).toContainText('1 / 15 remembered')
  await expect(timer).not.toHaveText('25:00')
  for (let remembered = 1; remembered < 15; remembered++) {
    await rate(page, cards, 'Easy')
  }
  await expect(page.locator('.study-completion')).toContainText('15 unique cards remembered · 17 total review attempts')
  await expect(page.locator('.lab-footer')).toHaveText(buddy)
  expect(writes).toEqual([])
  await page.getByRole('button', { name: 'Restart Deck', exact: true }).click()
  await expect(page.locator('.study-review-progress')).toContainText('0 / 15 remembered')
  await expect(page.locator('.study-review-progress')).toContainText('15 still to review')
  await checkCurrentCard(page, cards)
  await page.reload()
  await expect(page.locator('.study-review-progress')).toContainText('0 / 15 remembered')
})

for (const width of [390, 768]) {
  test(`live Flashcards fits a ${width}px viewport`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 })
    await openLiveDeck(page)
    await expect(page.locator('.study-flip-card')).toBeVisible()
    const dimensions = await page.evaluate(() => ({ width: innerWidth, contentWidth: document.documentElement.scrollWidth }))
    expect(dimensions.contentWidth).toBeLessThanOrEqual(dimensions.width)
    await page.locator('.study-flip-card').click()
    await expect(page.getByRole('button', { name: 'Again', exact: true })).toBeEnabled()
    await expect(page.getByRole('button', { name: 'Easy', exact: true })).toBeEnabled()
  })
}
