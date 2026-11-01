import { test, expect } from '@playwright/test'
import { labUrl, mockLab, timerKey } from './fixtures/lab'

async function mockExternal(page) {
  await page.route('https://pokeapi.co/**', route => route.fulfill({ json: {
    id: 25, name: 'pikachu', sprites: { front_default: '/assets/quiz_buddy.png', back_default: '/assets/quiz_buddy.png', other: { 'official-artwork': { front_default: '/assets/quiz_buddy.png' } } },
  } }))
  await page.route('https://api.open-meteo.com/**', route => route.fulfill({ json: { current: { temperature_2m: 29, cloud_cover: 10, is_day: 1, weather_code: 0 } } }))
  await page.route('https://api-open.data.gov.sg/**', route => route.fulfill({ json: { data: { stations: [], readings: [] } } }))
  await page.route('https://raw.githubusercontent.com/**', route => route.fulfill({ contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96"><circle cx="48" cy="48" r="30" fill="#ffd841"/></svg>' }))
}

async function returnFromPractice(page, finish) {
  if (finish) {
    for (let index = 0; index < 5; index++) {
      await page.locator('.demo-answers button').first().click()
      await page.locator('.battle-next').click()
    }
    await page.locator('.battle-end-actions button').click()
  } else {
    await page.locator('.arena-hud > button.home-link').click()
  }
}

for (const finish of [false, true]) {
  test(`optional boss practice preserves the deck and timer after ${finish ? 'a completed round' : 'leaving early'}`, async ({ page }) => {
    const { requests, errors } = await mockLab(page)
    await mockExternal(page)
    await page.goto(labUrl + '&mode=flashcards')
    await expect(page.locator('.study-flip-card')).toBeVisible()
    await page.getByRole('button', { name: 'Start Study Session', exact: true }).click()
    await expect(page.getByRole('timer')).not.toHaveText('25:00')
    for (let index = 0; index < 3; index++) {
      await page.locator('.study-flip-card').click()
      await page.getByRole('button', { name: 'I Remembered', exact: true }).click()
    }
    await expect(page).toHaveURL(/\/study-decks\?/)
    const position = await page.locator('.study-card-position').innerText()
    const progress = await page.locator('.study-review-progress').innerText()
    const prompt = await page.locator('.study-card-front .study-card-text').innerText()
    await page.getByRole('button', { name: 'Optional Boss Practice', exact: true }).click()
    await expect(page).toHaveURL(/\/surprise-boss\?encounter=/)
    const paused = await page.evaluate(key => JSON.parse(localStorage.getItem(key)), timerKey)
    expect(paused.status).toBe('paused')
    await page.getByRole('button', { name: 'Not Now', exact: true }).click()
    await returnFromPractice(page, finish)
    await expect(page.locator('.study-flip-card')).toBeVisible()
    await expect(page.locator('.study-card-position')).toHaveText(position)
    await expect(page.locator('.study-review-progress')).toHaveText(progress)
    await expect(page.locator('.study-card-front .study-card-text')).toHaveText(prompt)
    const returned = await page.evaluate(key => JSON.parse(localStorage.getItem(key)), timerKey)
    expect(returned.status).toBe('paused')
    expect(returned.remainingMs).toBe(paused.remainingMs)
    expect(requests.every(request => request.method === 'GET')).toBe(true)
    expect(requests.some(request => request.table === 'question_answers')).toBe(false)
    expect(errors).toEqual([])
  })
}

test('tutorial waits for location choice, supports keyboard dismissal, and can be replayed', async ({ page }) => {
  const { errors } = await mockLab(page)
  await mockExternal(page)
  await page.goto('/tutorial')
  await expect(page.getByRole('dialog', { name: 'Choose weather location' })).toBeVisible()
  await expect(page.getByRole('dialog', { name: 'StudyDex Town Tutorial' })).toHaveCount(0)
  await page.getByRole('button', { name: 'Not Now', exact: true }).click()
  const guide = page.getByRole('dialog', { name: 'StudyDex Town Tutorial' })
  await expect(guide).toBeVisible()
  await guide.getByRole('button', { name: 'Next', exact: true }).click()
  await expect(guide).toContainText('2 / 10')
  await page.keyboard.press('Escape')
  await expect(page).toHaveURL(/\/home$/)
  await expect(guide).toHaveCount(0)
  await page.locator('.trainer-profile-trigger').click()
  await page.getByRole('button', { name: 'Replay Tutorial', exact: false }).click()
  await expect(guide).toBeVisible()
  await guide.getByRole('button', { name: 'Skip', exact: true }).click()
  await expect(guide).toHaveCount(0)
  expect(errors).toEqual([])
})

for (const width of [320, 1440]) {
  test(`merged room and database Arena remain usable at ${width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 900 })
    const { requests, errors } = await mockLab(page)
    await mockExternal(page)
    await page.goto(labUrl + '&mode=flashcards')
    await expect(page.locator('.study-flip-card')).toBeVisible()
    await page.locator('.study-flip-card').click()
    await page.getByRole('button', { name: 'Hard', exact: true }).click()
    await expect(page.locator('.study-review-progress')).toContainText('0 / 15 remembered')
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await page.screenshot({ path: testInfo.outputPath('flashcard-room.png'), fullPage: true })
    await page.getByRole('button', { name: 'Go to Poké Arena', exact: true }).click()
    await expect(page).toHaveURL(/\/quiz\?subject=science&topic_id=water-topic$/)
    await expect(page.locator('.arena-transition')).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Start Quiz', exact: true })).toBeDisabled()
    await expect(page.locator('.arena-battle-scene')).toBeVisible()
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await page.screenshot({ path: testInfo.outputPath('arena.png'), fullPage: true })
    expect(requests.some(request => request.table === 'questions' && request.query.question_purpose === 'eq.quiz')).toBe(true)
    expect(requests.some(request => request.table === 'question_answers')).toBe(false)
    expect(requests.every(request => request.method === 'GET')).toBe(true)
    expect(errors).toEqual([])
  })
}
