import { mkdir, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import process from 'node:process'
import { test, expect } from '@playwright/test'
import { labUrl, mockLab, timerKey } from './fixtures/lab'

const evidenceRoot = process.env.STUDYDEX_E2E_EVIDENCE_DIR || fileURLToPath(
  new URL('../docs/images/arena-transition/after/', import.meta.url),
)
const arenaUrl = /\/quiz\?subject=science&topic_id=water-topic$/

async function recordFrames(page) {
  await page.evaluate(() => {
    const record = { startedAt: performance.now(), samples: [] }
    window.arenaTiming = record
    function sample(time) {
      const dialog = document.querySelector('.arena-transition')
      const card = document.querySelector('.arena-transition-card')
      const ball = document.querySelector('.arena-transition-ball')
      record.samples.push({
        elapsed: Math.round(time - record.startedAt),
        path: location.pathname,
        overlay: Boolean(dialog),
        phase: dialog?.dataset.phase || 'idle',
        titleOpacity: card ? Number(getComputedStyle(card).opacity) : 0,
        ballTransform: ball ? getComputedStyle(ball).transform : null,
        onTop: Boolean(
          document.elementFromPoint(innerWidth / 2, innerHeight / 2)?.closest('.arena-transition'),
        ),
        heading: document.querySelector('main h1')?.textContent,
      })
      if ((location.pathname === '/quiz' && !dialog) || time - record.startedAt > 6000) return
      requestAnimationFrame(sample)
    }
    requestAnimationFrame(sample)
  })
}

async function saveTiming(page, label, extra = {}) {
  const timing = await page.evaluate(() => ({
    reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches,
    ...window.arenaTiming,
  }))
  const shown = timing.samples.filter((frame) => frame.overlay)
  const readable = shown.filter((frame) => frame.titleOpacity > 0.99)
  const summary = {
    ...timing,
    ...extra,
    overlayMs: shown.length ? shown.at(-1).elapsed - shown[0].elapsed : 0,
    readableTitleMs: readable.length ? readable.at(-1).elapsed - readable[0].elapsed : 0,
    phases: [...new Set(shown.map((frame) => frame.phase))],
  }
  await mkdir(`${evidenceRoot}/${label}`, { recursive: true })
  await writeFile(`${evidenceRoot}/${label}/timing.json`, JSON.stringify(summary, null, 2))
  return summary
}

async function prepareEntry(page, entry) {
  if (entry === 'lesson-completion') {
    await page.locator('.study-roadmap-list button').last().click()
    await expect(page.getByRole('button', { name: 'Finish Topic', exact: true })).toBeEnabled()
    await page.getByRole('button', { name: 'Finish Topic', exact: true }).click()
    await expect(page.locator('.study-completion h2')).toBeFocused()
  } else if (entry === 'flashcard-completion') {
    await page.getByRole('button', { name: 'Flashcards', exact: true }).click()
    for (let index = 0; index < 15; index++) {
      await page.locator('.study-flip-card').click()
      await page.getByRole('button', { name: 'Easy', exact: true }).click()
    }
    await expect(page.locator('.study-completion')).toContainText('Flashcards Completed!')
  }
}

async function normalJourney(page, { label, width, height, entry = 'header' }) {
  const fixture = await mockLab(page)
  await page.setViewportSize({ width, height })
  await page.goto(labUrl)
  await expect(page.getByRole('button', { name: 'Start Learning', exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Start Study Session', exact: true }).click()
  await prepareEntry(page, entry)
  await mkdir(`${evidenceRoot}/${label}`, { recursive: true })
  await recordFrames(page)
  const container = entry === 'header' ? '.lab-navigation' : '.study-completion'
  await page
    .locator(container)
    .getByRole('button', { name: 'Go to Poké Arena', exact: true })
    .click()
  const dialog = page.locator('.arena-transition')
  await expect(dialog).toHaveAttribute('data-phase', 'anticipation')
  await expect(page.getByRole('button', { name: 'Skip Transition', exact: true })).toBeFocused()
  const paused = await page.evaluate((key) => JSON.parse(localStorage.getItem(key)), timerKey)
  expect(paused.status).toBe('paused')
  // eslint-disable-next-line playwright/no-wait-for-timeout -- Capture a specified intermediate animation frame.
  await page.waitForTimeout(120)
  await page.screenshot({ path: `${evidenceRoot}/${label}/01-anticipation.png` })
  await expect(dialog).toHaveAttribute('data-phase', 'battle')
  await expect(page.locator('.arena-transition-card')).toHaveCSS('opacity', '1')
  await expect(
    page.getByRole('heading', { name: 'A Challenge Awaits!', exact: true }),
  ).toBeVisible()
  const ball = await page.locator('.arena-transition-ball').boundingBox()
  expect(ball.width).toBeGreaterThanOrEqual(98)
  await page.screenshot({ path: `${evidenceRoot}/${label}/02-ball-and-title.png` })
  await expect(dialog).toHaveAttribute('data-phase', 'reveal')
  await expect(page).toHaveURL(arenaUrl)
  // eslint-disable-next-line playwright/no-wait-for-timeout -- Capture the Arena through the departing shutters.
  await page.waitForTimeout(30)
  await page.screenshot({ path: `${evidenceRoot}/${label}/03-reveal.png` })
  await expect(dialog).toHaveCount(0)
  await expect(page.locator('h1')).toBeFocused()
  await expect(page.locator('.quiz-content')).toBeInViewport()
  await expect(page.locator('.study-quiz > h2')).toHaveText('Topic Quiz')
  await expect(page.getByRole('button', { name: 'Start Quiz', exact: true })).toBeDisabled()
  await page.screenshot({ path: `${evidenceRoot}/${label}/04-arena.png` })
  const timing = await saveTiming(page, label)
  expect(timing.reducedMotion).toBe(false)
  expect(timing.overlayMs).toBeGreaterThanOrEqual(1800)
  expect(timing.overlayMs).toBeLessThanOrEqual(2300)
  expect(timing.readableTitleMs).toBeGreaterThanOrEqual(900)
  expect(timing.phases).toEqual(['anticipation', 'battle', 'reveal'])
  const shown = timing.samples.filter((frame) => frame.overlay)
  expect(shown.every((frame) => frame.onTop)).toBe(true)
  expect(
    new Set(shown.filter((frame) => frame.phase === 'battle').map((frame) => frame.ballTransform))
      .size,
  ).toBeGreaterThan(5)
  expect(
    shown
      .filter((frame) => frame.phase === 'reveal')
      .every((frame) => frame.path === '/quiz' && frame.heading === 'Poké Arena'),
  ).toBe(true)
  const dimensions = await page.evaluate(() => ({
    width: innerWidth,
    content: document.documentElement.scrollWidth,
  }))
  expect(dimensions.content).toBeLessThanOrEqual(dimensions.width)
  expect(
    await page.evaluate((key) => JSON.parse(localStorage.getItem(key)).remainingMs, timerKey),
  ).toBe(paused.remainingMs)
  expect(fixture.errors).toEqual([])
  expect(fixture.requests.every((request) => request.method === 'GET')).toBe(true)
  console.log(
    `${label}:`,
    JSON.stringify({
      overlayMs: timing.overlayMs,
      readableTitleMs: timing.readableTitleMs,
      phases: timing.phases,
    }),
  )
}

for (const entry of ['header', 'lesson-completion', 'flashcard-completion']) {
  test(`normal motion is visibly staged from ${entry}`, async ({ page }) => {
    await normalJourney(page, {
      label: entry === 'header' ? 'desktop' : entry,
      width: 1440,
      height: 900,
      entry,
    })
    await page.goBack()
    await expect(page.locator('h1')).toHaveText('Poké Lab')
    await expect(page.locator('.arena-transition')).toHaveCount(0)
  })
}

for (const viewport of [
  { width: 320, height: 568 },
  { width: 390, height: 844 },
]) {
  test(`battle entrance fits ${viewport.width}px mobile without obscuring Skip`, async ({
    page,
  }) => {
    await normalJourney(page, { label: `mobile-${viewport.width}`, ...viewport })
    await expect(page).toHaveURL(arenaUrl)
  })
}

async function skipAt(page, phase) {
  if (phase === 'anticipation') await page.keyboard.press('Escape')
  else await page.getByRole('button', { name: 'Skip Transition', exact: true }).press('Enter')
}

for (const phase of ['anticipation', 'battle', 'reveal']) {
  test(`Skip or Escape works during ${phase}`, async ({ page }) => {
    const fixture = await mockLab(page)
    await page.goto(labUrl)
    await page
      .locator('.lab-navigation')
      .getByRole('button', { name: 'Go to Poké Arena', exact: true })
      .click()
    await expect(page.locator('.arena-transition')).toHaveAttribute('data-phase', phase)
    const skippedAt = Date.now()
    await skipAt(page, phase)
    await expect(page).toHaveURL(arenaUrl)
    await expect(page.locator('.arena-transition')).toHaveCount(0)
    const skipToClosedMs = Date.now() - skippedAt
    expect(skipToClosedMs).toBeLessThan(700)
    await expect(page.locator('.study-quiz > h2')).toHaveText('Topic Quiz')
    expect(fixture.requests.filter((request) => request.table === 'questions')).toHaveLength(1)
    expect(fixture.errors).toEqual([])
    await mkdir(`${evidenceRoot}/skip-${phase}`, { recursive: true })
    await writeFile(
      `${evidenceRoot}/skip-${phase}/timing.json`,
      JSON.stringify({ phase, skipToClosedMs }, null, 2),
    )
  })
}

test('reduced motion bypasses every animated stage without rendering an overlay', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await mockLab(page)
  await page.goto(labUrl)
  await expect(page.getByRole('button', { name: 'Start Learning', exact: true })).toBeVisible()
  await recordFrames(page)
  const startedAt = Date.now()
  await page
    .locator('.lab-navigation')
    .getByRole('button', { name: 'Go to Poké Arena', exact: true })
    .click()
  await expect(page).toHaveURL(arenaUrl)
  await expect(page.locator('h1')).toBeFocused()
  const navigationMs = Date.now() - startedAt
  expect(navigationMs).toBeLessThan(700)
  const timing = await saveTiming(page, 'reduced-motion', { navigationMs })
  expect(timing.reducedMotion).toBe(true)
  expect(timing.samples.every((frame) => !frame.overlay)).toBe(true)
  await page.screenshot({ path: `${evidenceRoot}/reduced-motion/arena.png` })
})

test('enabling reduced motion during playback immediately bypasses the remaining sequence', async ({
  page,
}) => {
  await mockLab(page)
  await page.goto(labUrl)
  await page
    .locator('.lab-navigation')
    .getByRole('button', { name: 'Go to Poké Arena', exact: true })
    .click()
  await expect(page.locator('.arena-transition')).toHaveAttribute('data-phase', 'battle')
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await expect(page).toHaveURL(arenaUrl)
  await expect(page.locator('.arena-transition')).toHaveCount(0)
})
