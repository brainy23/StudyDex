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

for (const [label, flow] of [['Poké Lab', 'study'], ['Poké Arena', 'quiz']]) {
  test(`${label} opens subjects and topics without a transition`, async ({ page }) => {
    const evidence = await fixture(page, { motion: 'no-preference' })
    await page.goto('/home')
    await page.getByRole('button', { name: new RegExp(label) }).click()
    await expect(page).toHaveURL(new RegExp(`/subjects[?]flow=${flow}$`))
    await expect.poll(() => evidence.content.requests).toBe(1)
    await expect(page.locator('dialog.pokemon-transition')).toBeHidden()
    await expect(page.getByRole('status', { name: 'Loading', exact: true })).toHaveText('Loading your subjects…')
    evidence.content.release()
    await expect(page.locator('.sd-path strong')).toHaveText(['Mathematics'])
    await page.getByRole('button', { name: /Mathematics/ }).click()
    await expect(page.locator('.sd-topic-card strong')).toHaveText(['Numbers P3'])
    await expect(page.locator('dialog.pokemon-transition')).toBeHidden()
    expect(evidence.errors).toEqual([])
    expect(evidence.liveRequests).toEqual([])
  })

  test(`${label} keeps subject error/retry available without a transition`, async ({ page }) => {
    const evidence = await fixture(page, { fail: true })
    await page.goto('/home')
    await page.getByRole('button', { name: new RegExp(label) }).click()
    await expect.poll(() => evidence.content.requests).toBe(1)
    evidence.content.release()
    await expect(page.getByRole('alert')).toContainText('Your subjects could not be loaded')
    await expect(page.locator('dialog.pokemon-transition')).toBeHidden()
    evidence.content.fail = false
    await page.getByRole('button', { name: 'Try again' }).click()
    await expect(page.locator('.sd-path strong')).toHaveText(['Mathematics'])
    expect(evidence.errors).toEqual([])
  })

  test(`${label} allows Back while subjects load`, async ({ page }) => {
    const evidence = await fixture(page)
    await page.goto('/home')
    await page.getByRole('button', { name: new RegExp(label) }).click()
    await expect(page).toHaveURL(new RegExp(`/subjects[?]flow=${flow}$`))
    await page.goBack()
    evidence.content.release()
    await expect(page).toHaveURL(/\/home$/)
    await expect(page.locator('dialog.pokemon-transition')).toBeHidden()
    expect(evidence.errors).toEqual([])
  })
}

test('Arena waits for quiz availability on the picker without a transition', async ({ page }) => {
  const evidence = await fixture(page, { holdQuestions: true })
  evidence.content.release()
  await page.goto('/home')
  await page.getByRole('button', { name: /Poké Arena/ }).click()
  await expect.poll(() => evidence.content.questionRequests).toBe(1)
  await expect(page.getByRole('status', { name: 'Loading', exact: true })).toHaveText('Loading your subjects…')
  await expect(page.locator('dialog.pokemon-transition')).toBeHidden()
  evidence.content.releaseQuestions()
  await expect(page.locator('.sd-path strong')).toHaveText(['Mathematics'])
  expect(evidence.errors).toEqual([])
})

test('Arena with no usable quizzes reveals the empty picker without a transition', async ({ page }) => {
  const evidence = await fixture(page, { emptyQuiz: true })
  evidence.content.release()
  await page.goto('/home')
  await page.getByRole('button', { name: /Poké Arena/ }).click()
  await expect(page.locator('.sd-empty')).toHaveText('No subjects are available for your school level yet.')
  await expect(page.locator('dialog.pokemon-transition')).toBeHidden()
  expect(evidence.errors).toEqual([])
})
