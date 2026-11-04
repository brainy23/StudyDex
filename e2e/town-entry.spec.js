import { test, expect } from '@playwright/test'
import { mockOnboarding } from './onboarding-fixture'

async function fixture(
  page,
  { motion = 'reduce', fail = false, holdQuestions = false, emptyQuiz = false } = {},
) {
  const evidence = await mockOnboarding(page, { avatarConfirmed: true, starterClaimed: true })
  await page.emulateMedia({ reducedMotion: motion })
  let release
  const ready = new Promise((resolve) => {
    release = resolve
  })
  let releaseQuestions
  const questionsReady = new Promise((resolve) => {
    releaseQuestions = resolve
  })
  if (!holdQuestions) releaseQuestions()
  const state = { release, releaseQuestions, fail, requests: 0, questionRequests: 0 }
  await page.route('https://studydex-fixture.invalid/rest/v1/subjects*', async (route) => {
    state.requests++
    await ready
    const headers = { 'access-control-allow-origin': '*' }
    if (state.fail)
      return route.fulfill({
        status: 403,
        headers,
        json: { message: 'Synthetic permission denied' },
      })
    return route.fulfill({ headers, json: [{ id: 'math', name: 'Mathematics' }] })
  })
  await page.route('https://studydex-fixture.invalid/rest/v1/topics*', async (route) => {
    await ready
    return route.fulfill({
      headers: { 'access-control-allow-origin': '*' },
      json: [
        {
          id: 'numbers',
          subject_id: 'math',
          level_id: evidence.state.schoolLevel.id,
          name: 'Numbers P3',
          topic_order: 1,
        },
      ],
    })
  })
  await page.route('https://studydex-fixture.invalid/rest/v1/questions*', async (route) => {
    state.questionRequests++
    await ready
    await questionsReady
    return route.fulfill({
      headers: { 'access-control-allow-origin': '*' },
      json: emptyQuiz
        ? []
        : [
            {
              id: 'q1',
              topic_id: 'numbers',
              question_text: '2 × 2?',
              question_type: 'mcq',
              question_purpose: 'quiz',
              difficulty: 1,
            },
          ],
    })
  })
  await page.route('https://studydex-fixture.invalid/rest/v1/question_options*', (route) =>
    route.fulfill({
      headers: { 'access-control-allow-origin': '*' },
      json: [
        { id: 'o1', question_id: 'q1', option_order: 1, option_text: '4' },
        { id: 'o2', question_id: 'q1', option_order: 2, option_text: '5' },
      ],
    }),
  )
  return { ...evidence, content: state }
}

for (const [label, flow, title] of [
  ['Poké Lab', 'study', 'Ready to learn?'],
  ['Poké Arena', 'quiz', 'A Challenge Awaits!'],
]) {
  test.describe(label, () => {
    test('Town click plays the transition and reveals the loaded subject picker', async ({
      page,
    }) => {
      const evidence = await fixture(page, { motion: 'no-preference' })
      await page.goto('/home')
      await page.getByRole('button', { name: new RegExp(label) }).click()
      const dialog = page.locator('dialog.pokemon-transition')
      await expect(dialog).toBeVisible()
      await expect(dialog.getByRole('heading')).toHaveText(title)
      await expect(dialog).toHaveAttribute('data-phase', 'loading')
      await expect(dialog.locator('.transition-ball')).toHaveCSS('animation-duration', '1s')
      await expect(dialog.locator('.transition-backdrop')).toHaveCSS(
        'transition-duration',
        '0.625s',
      )
      await expect(page).toHaveURL(new RegExp(`/subjects[?]flow=${flow}$`))
      await expect.poll(() => evidence.content.requests).toBe(1)
      evidence.content.release()
      await expect(dialog).toBeHidden()
      await expect(page.getByRole('heading', { name: 'Choose your next adventure' })).toBeFocused()
      await expect(page.locator('.sd-path strong')).toHaveText(['Mathematics'])
      await page.getByRole('button', { name: /Mathematics/ }).click()
      await expect(page.locator('.sd-topic-card strong')).toHaveText(['Numbers P3'])
      await expect(dialog).toBeHidden()
      expect(evidence.errors).toEqual([])
      expect(evidence.liveRequests).toEqual([])
    })

    test('Skip waits for subject loading; reduced motion stays static', async ({ page }) => {
      const evidence = await fixture(page)
      await page.goto('/home')
      await page.getByRole('button', { name: new RegExp(label) }).click()
      const dialog = page.locator('dialog.pokemon-transition')
      await expect(dialog).toBeVisible()
      await expect(dialog).toHaveClass(/is-static/)
      await expect.poll(() => evidence.content.requests).toBe(1)
      await page.keyboard.press('Escape')
      await expect(dialog).toBeVisible()
      await expect(page.locator('.sd-page-state')).toHaveText('Loading your subjects…')
      evidence.content.release()
      await expect(dialog).toBeHidden()
      await expect(page.locator('.sd-path strong')).toHaveText(['Mathematics'])
      expect(evidence.errors).toEqual([])
    })

    test('a content failure reveals the existing error and retry flow', async ({ page }) => {
      const evidence = await fixture(page, { fail: true })
      await page.goto('/home')
      await page.getByRole('button', { name: new RegExp(label) }).click()
      await expect(page.locator('dialog.pokemon-transition')).toBeVisible()
      await expect.poll(() => evidence.content.requests).toBe(1)
      evidence.content.release()
      await expect(page.locator('dialog.pokemon-transition')).toBeHidden()
      await expect(page.getByRole('alert')).toContainText('Your subjects could not be loaded')
      evidence.content.fail = false
      await page.getByRole('button', { name: 'Try again' }).click()
      await expect(page.locator('.sd-path strong')).toHaveText(['Mathematics'])
      await expect(page.locator('dialog.pokemon-transition')).toBeHidden()
      expect(evidence.errors).toEqual([])
    })

    test('browser Back cancels the pending entry without leaving a modal over Town', async ({
      page,
    }) => {
      const evidence = await fixture(page)
      await page.goto('/home')
      await page.getByRole('button', { name: new RegExp(label) }).click()
      await expect(page).toHaveURL(new RegExp(`/subjects[?]flow=${flow}$`))
      await expect(page.locator('dialog.pokemon-transition')).toBeVisible()
      await page.goBack()
      await expect(page).toHaveURL(/\/home$/)
      await expect(page.locator('dialog.pokemon-transition')).toBeHidden()
      evidence.content.release()
      await expect(page.getByRole('button', { name: new RegExp(label) })).toBeEnabled()
      expect(evidence.errors).toEqual([])
    })

    test('a stalled content load times out to a retry state and ignores the late response', async ({
      page,
    }) => {
      const evidence = await fixture(page)
      await page.goto('/home')
      await page.clock.install()
      await page.getByRole('button', { name: new RegExp(label) }).click()
      await expect.poll(() => evidence.content.requests).toBe(1)
      await page.clock.fastForward(15001)
      await expect(page.locator('dialog.pokemon-transition')).toBeHidden()
      await expect(page.getByRole('alert')).toContainText('taking too long')
      evidence.content.release()
      await expect(page.getByRole('button', { name: 'Try again' })).toBeVisible()
      await page.getByRole('button', { name: 'Try again' }).click()
      await expect(page.locator('.sd-path strong')).toHaveText(['Mathematics'])
      expect(evidence.errors).toEqual([])
    })

    test('direct subject visits do not trigger the entry transition', async ({ page }) => {
      const evidence = await fixture(page)
      evidence.content.release()
      await page.goto(`/subjects?flow=${flow}`)
      await expect(page.locator('.sd-path strong')).toHaveText(['Mathematics'])
      await expect(page.locator('dialog.pokemon-transition')).toBeHidden()
      expect(evidence.errors).toEqual([])
      expect(evidence.liveRequests).toEqual([])
    })
  })
}

test('Arena waits for quiz availability after subjects load, even when animation is skipped', async ({
  page,
}) => {
  const evidence = await fixture(page, { motion: 'no-preference', holdQuestions: true })
  evidence.content.release()
  await page.goto('/home')
  await page.getByRole('button', { name: /Poké Arena/ }).click()
  const dialog = page.locator('dialog.pokemon-transition')
  await expect(dialog).toBeVisible()
  await expect.poll(() => evidence.content.questionRequests).toBe(1)
  await dialog.getByRole('button', { name: 'Skip animation' }).click()
  await expect(dialog.getByRole('button', { name: 'Loading…', exact: true })).toBeDisabled()
  await expect(dialog).toBeVisible()
  await expect(page.locator('.sd-page-state')).toHaveText('Loading your subjects…')
  evidence.content.releaseQuestions()
  await expect(dialog).toBeHidden()
  await expect(page.locator('.sd-path strong')).toHaveText(['Mathematics'])
  expect(evidence.errors).toEqual([])
  expect(evidence.liveRequests).toEqual([])
})

test('Arena with no usable quizzes reveals the empty state', async ({ page }) => {
  const evidence = await fixture(page, { emptyQuiz: true })
  await page.goto('/home')
  await page.getByRole('button', { name: /Poké Arena/ }).click()
  await expect(page.locator('dialog.pokemon-transition')).toBeVisible()
  await expect.poll(() => evidence.content.requests).toBe(1)
  evidence.content.release()
  await expect(page.locator('dialog.pokemon-transition')).toBeHidden()
  await expect(page.locator('.sd-empty')).toHaveText(
    'No subjects are available for your school level yet.',
  )
  expect(evidence.errors).toEqual([])
  expect(evidence.liveRequests).toEqual([])
})
