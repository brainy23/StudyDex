import { test, expect } from '@playwright/test'
import { concepts, labUrl, mockLab, timerKey } from './fixtures/lab'

async function openLesson(page) {
  await page.goto(labUrl)
  await page.getByRole('button', { name: 'Start Learning', exact: true }).click()
  await expect(page.locator('.study-concept h2')).toBeFocused()
  await expect(page.getByRole('button', { name: 'Next Concept', exact: true })).toBeEnabled()
}

async function noOverflow(page) {
  const dimensions = await page.evaluate(() => ({
    viewport: innerWidth,
    content: document.documentElement.scrollWidth,
  }))
  expect(dimensions.content).toBeLessThanOrEqual(dimensions.viewport)
}

test('roadmaps, lesson hierarchy, keyboard navigation and water comparison work together', async ({
  page,
}, testInfo) => {
  const fixture = await mockLab(page)
  await page.setViewportSize({ width: 1440, height: 1100 })
  await page.goto(labUrl)
  await expect(page.locator('.study-overview .study-roadmap-list button')).toHaveCount(7)
  await expect(page.locator('.study-header progress')).toHaveCount(0)
  const roadmap = await page.locator('.study-overview .study-roadmap').boundingBox()
  const goals = await page.locator('.study-goals').boundingBox()
  const start = await page
    .getByRole('button', { name: 'Start Learning', exact: true })
    .boundingBox()
  expect(roadmap.y).toBeGreaterThan(goals.y + goals.height)
  expect(start.y).toBeGreaterThan(roadmap.y + roadmap.height)
  await page.screenshot({ path: testInfo.outputPath('overview-desktop.png'), fullPage: true })
  await page.getByRole('button', { name: 'Start Learning', exact: true }).click()
  await expect(page.locator('.study-concept h2')).toBeFocused()
  await expect(page.locator('.study-topic-progress')).toContainText('0 of 7 concepts read')
  const compact = await page.locator('.study-roadmap-compact').boundingBox()
  const explanation = await page.locator('.study-explanation').boundingBox()
  expect(compact.y + compact.height).toBeLessThan(explanation.y)
  await expect(page.locator('.study-concept progress, .study-concept .study-roadmap')).toHaveCount(
    0,
  )
  const disclosure = page.getByRole('button', { name: 'Show concept names' })
  await disclosure.focus()
  await page.keyboard.press('Enter')
  await expect(page.getByRole('button', { name: 'Hide concept names' })).toHaveAttribute(
    'aria-expanded',
    'true',
  )
  await expect(page.locator('.study-roadmap-list button')).toHaveCount(7)
  await page.locator('.study-roadmap-list button').nth(3).click()
  await expect(page.locator('.study-concept h2')).toHaveText('Groups of Plants')
  await expect(page.locator('.study-concept h2')).toBeFocused()
  await expect(page.locator('.study-topic-progress')).toContainText('0 of 7 concepts read')
  await expect(page.locator('.study-interactive')).toHaveCount(0)
  await page.getByRole('button', { name: 'Hide concept names' }).click()
  await page.getByRole('button', { name: 'Next Concept', exact: true }).focus()
  await page.keyboard.press('Enter')
  await expect(page.locator('.study-concept h2')).toHaveText('Groups of Animals')
  await expect(page.getByRole('button', { name: 'Previous Concept', exact: true })).toBeEnabled()
  await expect(page.locator('.study-topic-progress')).toContainText('1 of 7 concepts read')
  await page.getByRole('button', { name: 'Previous Concept', exact: true }).click()
  await expect(page.locator('.study-concept h2')).toHaveText('Groups of Plants')
  await expect(page.locator('.study-topic-progress')).toContainText('1 of 7 concepts read')
  await page.getByRole('button', { name: /^Concept 1:/ }).click()
  await expect(page.locator('.study-concept h2')).toHaveText('What Living Things Need')
  await expect(page.locator('.study-example')).toHaveCSS('opacity', '1')
  await expect(page.locator('.study-explanation')).toHaveJSProperty(
    'textContent',
    concepts[0].explanation_text,
  )
  await expect(page.locator('.study-example .study-copy')).toHaveJSProperty(
    'textContent',
    concepts[0].example_text,
  )
  const dry = page.getByRole('button', { name: 'Not Enough Water', exact: true })
  await page.getByRole('button', { name: 'Enough Water', exact: true }).focus()
  await page.keyboard.press('ArrowRight')
  await expect(dry).toBeFocused()
  await page.keyboard.press('Space')
  await expect(dry).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByRole('button', { name: 'Enough Water', exact: true })).toHaveAttribute(
    'aria-pressed',
    'false',
  )
  await expect(page.locator('.study-interactive [role="status"]')).toContainText('over time')
  await expect
    .poll(() =>
      page.locator('.study-plant-stem').evaluate((plant) => {
        const matrix = new DOMMatrix(getComputedStyle(plant).transform)
        return (Math.atan2(matrix.b, matrix.a) * 180) / Math.PI
      }),
    )
    .toBeGreaterThan(12)
  const gauge = await page.locator('.study-water-gauge').boundingBox()
  const waterLevel = await page.locator('.study-water-level').boundingBox()
  expect(waterLevel.y).toBeGreaterThanOrEqual(gauge.y)
  expect(waterLevel.y + waterLevel.height).toBeLessThanOrEqual(gauge.y + gauge.height)
  await page.screenshot({ path: testInfo.outputPath('lesson-water-desktop.png'), fullPage: true })
  await page.getByRole('button', { name: 'Enough Water', exact: true }).click()
  await expect(page.locator('.study-plant-stem')).toHaveCSS('transform', 'none')
  await expect(page.locator('.study-topic-progress')).toContainText('1 of 7 concepts read')
  await page.getByRole('button', { name: /^Concept 7:/ }).click()
  await expect(page.getByRole('button', { name: 'Finish Topic', exact: true })).toBeEnabled()
  await page.getByRole('button', { name: 'Finish Topic', exact: true }).click()
  await expect(page.locator('.study-completion')).toContainText('2 of 7 concepts read')
  await expect(page.locator('.study-roadmap')).toHaveCount(0)
  await page.getByRole('button', { name: 'Revisit Concepts', exact: true }).click()
  await expect(page.locator('.study-overview .study-roadmap-list button.is-read')).toHaveCount(2)
  expect(fixture.requests.every((request) => request.method === 'GET')).toBe(true)
  expect(fixture.requests.some((request) => request.table === 'questions')).toBe(false)
  expect(fixture.errors).toEqual([])
  await noOverflow(page)
})

const arenaEntries = [
  {
    name: 'header',
    container: '.study-header',
    minimumMs: 1800,
    prepare: async () => {},
    skip: async () => {},
  },
  {
    name: 'lesson completion',
    container: '.study-completion',
    minimumMs: 0,
    prepare: async (page) => {
      await page.locator('.study-roadmap-list button').last().click()
      await expect(page.getByRole('button', { name: 'Finish Topic', exact: true })).toBeEnabled()
      await page.getByRole('button', { name: 'Finish Topic', exact: true }).click()
      await expect(page.locator('.study-completion')).toContainText('1 of 7 concepts read')
    },
    skip: async (page) => {
      await page.keyboard.press('Escape')
    },
  },
  {
    name: 'flashcard completion',
    container: '.study-completion',
    minimumMs: 0,
    prepare: async (page) => {
      await page.getByRole('button', { name: 'Flashcards', exact: true }).click()
      await page.locator('.study-flip-card').click()
      await page.getByRole('button', { name: 'Practise Again', exact: true }).click()
      for (let index = 0; index < 15; index++) {
        await page.locator('.study-flip-card').click()
        await page.getByRole('button', { name: 'I Remembered', exact: true }).click()
      }
      await expect(page.locator('.study-completion')).toContainText(
        '15 unique cards remembered · 16 total review attempts',
      )
      await page.getByRole('button', { name: 'Restart Deck', exact: true }).click()
      await expect(page.locator('.study-review-progress')).toContainText('0 / 15 remembered')
      for (let index = 0; index < 15; index++) {
        await page.locator('.study-flip-card').click()
        await page.getByRole('button', { name: 'I Remembered', exact: true }).click()
      }
    },
    skip: async (page, testInfo) => {
      await expect(page.getByRole('button', { name: 'Skip Transition', exact: true })).toBeFocused()
      await expect(page.locator('.arena-transition-card')).toHaveCSS('opacity', '1')
      await page.screenshot({ path: testInfo.outputPath('arena-transition.png') })
      await page.getByRole('button', { name: 'Skip Transition', exact: true }).click()
    },
  },
]

for (const entry of arenaEntries) {
  test(`Arena entrance from ${entry.name} pauses focus time, preserves topic and supports Back`, async ({
    page,
  }, testInfo) => {
    const fixture = await mockLab(page, { buddyFailure: true })
    await page.goto(labUrl)
    await page.getByRole('button', { name: 'Start Study Session', exact: true }).click()
    await entry.prepare(page)
    const arenaButton = page
      .locator(entry.container)
      .getByRole('button', { name: 'Go to Poké Arena', exact: true, includeHidden: true })
    const startedAt = Date.now()
    await arenaButton.click()
    await expect(page.getByRole('dialog', { name: 'A Challenge Awaits!' })).toBeVisible()
    const paused = await page.evaluate((key) => JSON.parse(localStorage.getItem(key)), timerKey)
    expect(paused.status).toBe('paused')
    expect(paused.deadlineAt).toBeNull()
    expect(paused.completions).toEqual([])
    await expect(arenaButton).toBeDisabled()
    await entry.skip(page, testInfo)
    await expect(page).toHaveURL(/\/quiz\?subject=science&topic_id=water-topic$/)
    expect(Date.now() - startedAt).toBeGreaterThanOrEqual(entry.minimumMs)
    await expect(page.getByRole('dialog')).toHaveCount(0)
    await expect(page.locator('h1')).toHaveText('Poké Arena')
    await expect(page.locator('h1')).toBeFocused()
    await page.screenshot({ path: testInfo.outputPath('arena-arrival.png') })
    await expect(page.locator('h1')).toBeInViewport()
    await expect(page.locator('.study-quiz h2')).toHaveText('Topic Quiz')
    await expect(page.getByRole('button', { name: 'Start Quiz', exact: true })).toBeDisabled()
    await expect(page.locator('.study-question')).toHaveCount(0)
    expect(
      await page.evaluate((key) => JSON.parse(localStorage.getItem(key)).remainingMs, timerKey),
    ).toBe(paused.remainingMs)
    await page.goBack()
    await expect(page.locator('h1')).toHaveText('Poké Lab')
    await expect(page.getByRole('dialog')).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Resume', exact: true })).toBeVisible()
    expect(
      fixture.requests
        .filter((request) => request.table === 'questions')
        .map((request) => request.query.question_purpose),
    ).toEqual(['eq.quiz'])
    expect(fixture.requests.every((request) => request.method === 'GET')).toBe(true)
    expect(fixture.errors).toEqual([])
  })
}

for (const width of [320, 390, 576, 768, 848, 1200]) {
  test(`Learn and its disclosure fit a ${width}px viewport with usable touch targets`, async ({
    page,
  }, testInfo) => {
    const fixture = await mockLab(page)
    await page.setViewportSize({ width, height: 950 })
    await openLesson(page)
    await noOverflow(page)
    for (const step of await page.locator('.study-roadmap-steps button').all()) {
      const bounds = await step.boundingBox()
      expect(bounds.width).toBeGreaterThanOrEqual(44)
      expect(bounds.height).toBeGreaterThanOrEqual(44)
    }
    await page.getByRole('button', { name: 'Show concept names' }).click()
    await expect(page.locator('.study-roadmap-list button')).toHaveCount(7)
    await noOverflow(page)
    await page.getByRole('button', { name: 'Hide concept names' }).click()
    await page.getByRole('button', { name: 'Not Enough Water', exact: true }).click()
    await expect(page.locator('.study-interactive [role="status"]')).toContainText('may wilt')
    await expect(page.locator('.study-interactive [role="status"] p')).toHaveCSS('opacity', '1')
    await expect
      .poll(() =>
        page
          .locator('.study-water-level')
          .evaluate((water) => water.getBoundingClientRect().height),
      )
      .toBeLessThan(20)
    await noOverflow(page)
    await page.screenshot({ path: testInfo.outputPath(`lesson-${width}px.png`), fullPage: true })
    await page.getByRole('button', { name: 'Next Concept', exact: true }).click()
    await expect(page.locator('.study-concept h2')).toBeFocused()
    await expect(page.locator('.study-concept h2')).toBeInViewport()
    await expect(page.locator('.study-roadmap-compact')).toBeInViewport()
    expect(fixture.errors).toEqual([])
  })
}

test('reduced motion keeps controls functional and makes the Arena handoff immediate', async ({
  page,
}) => {
  await mockLab(page)
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await openLesson(page)
  await page.getByRole('button', { name: 'Not Enough Water', exact: true }).click()
  const transitionSeconds = await page
    .locator('.study-plant-stem')
    .evaluate((element) => parseFloat(getComputedStyle(element).transitionDuration))
  expect(transitionSeconds).toBeLessThan(0.001)
  await page.getByRole('button', { name: 'Next Concept', exact: true }).click()
  await expect(page.locator('.study-concept h2')).toBeFocused()
  const startedAt = Date.now()
  await page
    .locator('.study-header')
    .getByRole('button', { name: 'Go to Poké Arena', exact: true })
    .click()
  await expect(page).toHaveURL(/\/quiz\?/)
  expect(Date.now() - startedAt).toBeLessThan(800)
  await expect(page.getByRole('dialog')).toHaveCount(0)
})

test('loading remains visible and a failed Buddy never blocks the lesson', async ({ page }) => {
  const fixture = await mockLab(page, { deferConcepts: true, buddyFailure: true })
  await page.goto(labUrl)
  await expect(page.locator('.study-learn [role="status"]')).toHaveText('Loading your lesson…')
  await expect(page.locator('.study-buddy [role="alert"]')).toContainText(
    'Buddy temporarily unavailable',
  )
  fixture.releaseConcepts()
  await expect(page.getByRole('button', { name: 'Start Learning', exact: true })).toBeVisible()
  expect(fixture.errors).toEqual([])
})

test('direct Arena entry and refresh do not play the battle transition', async ({ page }) => {
  await mockLab(page)
  await page.goto('/quiz?subject=science&topic_id=water-topic')
  await expect(page.locator('h1')).toHaveText('Poké Arena')
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await page.reload()
  await expect(page.locator('.study-quiz h2')).toHaveText('Topic Quiz')
  await expect(page.getByRole('dialog')).toHaveCount(0)
})
