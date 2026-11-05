import { test, expect } from '@playwright/test'
import { mockOnboarding } from './onboarding-fixture'

const rooms = [
  { name: 'Quiz', path: 'quiz-battle', table: 'questions', content: '#arena-question', flow: 'quiz' },
  { name: 'Learn', path: 'learn', table: 'topic_concepts', content: '.inline-whiteboard', flow: 'study' },
  { name: 'Study', path: 'study-decks', table: 'flashcards', content: '.answer-content h1', flow: 'study' },
]
async function fixture(page, room, motion = 'reduce') {
  const evidence = await mockOnboarding(page, { avatarConfirmed: true, starterClaimed: true })
  await page.emulateMedia({ reducedMotion: motion })
  let release
  const gate = new Promise(resolve => { release = resolve })
  const state = { hold: false, fail: false, pending: 0, release }
  const subjects = [{ id: 'math', name: 'Mathematics' }, { id: 'science', name: 'Science' }]
  const topics = subjects.map(subject => ({
    id: `${subject.id}-topic`, subject_id: subject.id, level_id: evidence.state.schoolLevel.id,
    name: `${subject.name} topic`, topic_order: 1,
  }))
  const questions = topics.map(topic => ({ id: `${topic.id}-q`, topic_id: topic.id,
    question_text: 'How many?', question_type: 'mcq', question_purpose: 'quiz', difficulty: 1 }))
  await page.route('https://studydex-fixture.invalid/rest/v1/**', async route => {
    const url = new URL(route.request().url())
    const table = url.pathname.split('/').at(-1)
    if (table === 'profiles' || url.pathname.includes('/rpc/')) return route.fallback()
    const headers = { 'access-control-allow-origin': '*' }
    if (state.hold && table === room.table) {
      state.pending++
      await gate
      if (state.fail) return route.fulfill({ status: 403, headers, json: { message: 'Synthetic permission denied' } })
    }
    const topicId = url.searchParams.get('topic_id')?.replace(/^eq\./, '')
    const rows = {
      subjects, topics, questions,
      question_options: questions.flatMap(question => [1, 2].map(order => ({
        id: `${question.id}-o${order}`, question_id: question.id, option_order: order, option_text: String(order),
      }))),
      flashcards: [{ id: 'card', topic_id: topicId, card_order: 1, front_text: 'How many?', back_text: 'Two' }],
      topic_concepts: [{ id: 'concept', topic_id: topicId, title: 'Count objects', explanation_text: 'Two objects', concept_order: 1 }],
      topic_learning_goals: [],
    }[table] || []
    const filtered = topicId && !topicId.startsWith('in.') ? rows.filter(row => row.topic_id === topicId) : rows
    return route.fulfill({ headers, json: filtered })
  })
  await page.goto(`/subjects?flow=${room.flow}`)
  await page.getByRole('button', { name: /Science/ }).click()
  await expect(page.locator('.sd-topic-card')).toHaveCount(1)
  if (room.flow === 'study') {
    await page.locator('.sd-topic-card').click()
    await expect(page.getByRole('heading', { name: 'How would you like to begin?' })).toBeVisible()
  }
  await expect(page.locator('dialog.pokemon-transition')).toBeHidden()
  state.hold = true
  const enter = () => room.flow === 'quiz'
    ? page.locator('.sd-topic-card').click()
    : page.locator('.sd-path').filter({ has: page.locator('strong', { hasText: new RegExp(`^${room.name}$`) }) }).click()
  return { ...evidence, content: state, enter }
}

for (const room of rooms) {
  test(`${room.name} transitions only at room entry and Skip still waits for selected content`, async ({ page }) => {
    const evidence = await fixture(page, room, 'no-preference')
    await evidence.enter()
    const dialog = page.locator('dialog.pokemon-transition')
    await expect(dialog).toBeVisible()
    await expect(dialog).toContainText(`${room.name} Room`)
    await expect(page).toHaveURL(new RegExp(`/${room.path}[?]`))
    await expect.poll(() => evidence.content.pending).toBeGreaterThan(0)
    await expect(dialog).toHaveAttribute('data-phase', 'loading')
    await expect(dialog.locator('.transition-ball')).toHaveCSS('animation-duration', '1s')
    await dialog.getByRole('button', { name: 'Skip animation' }).click()
    await expect(dialog).toBeVisible()
    evidence.content.release()
    await expect(dialog).toBeHidden()
    await expect(page.locator(room.content)).toBeVisible()
    expect(evidence.errors).toEqual([])
    expect(evidence.liveRequests).toEqual([])
  })

  test(`${room.name} reduced-motion entry reveals content errors and allows retry`, async ({ page }) => {
    const evidence = await fixture(page, room)
    evidence.content.fail = true
    await evidence.enter()
    const dialog = page.locator('dialog.pokemon-transition')
    await expect(dialog).toHaveClass(/is-static/)
    await expect.poll(() => evidence.content.pending).toBeGreaterThan(0)
    evidence.content.release()
    await expect(dialog).toBeHidden()
    await expect(page.getByRole('alert')).toBeVisible()
    evidence.content.fail = false
    await page.getByRole('button', { name: /Try again|Retry/ }).first().click()
    await expect(page.locator(room.content)).toBeVisible()
    expect(evidence.errors).toEqual([])
  })

  test(`${room.name} pending entry cancels on browser Back`, async ({ page }) => {
    const evidence = await fixture(page, room)
    await evidence.enter()
    await expect.poll(() => evidence.content.pending).toBeGreaterThan(0)
    await expect(page.locator('dialog.pokemon-transition')).toBeVisible()
    await page.goBack()
    await expect(page).toHaveURL(room.flow === 'quiz' ? /\/subjects\/science\/topics[?]/ : /\/study-mode[?]/)
    await expect(page.locator('dialog.pokemon-transition')).toBeHidden()
    evidence.content.release()
    expect(evidence.errors).toEqual([])
  })

  test(`${room.name} stalled entry times out to retry and ignores late content`, async ({ page }) => {
    const evidence = await fixture(page, room)
    await page.clock.install()
    await evidence.enter()
    await expect.poll(() => evidence.content.pending).toBeGreaterThan(0)
    await page.clock.fastForward(15001)
    await expect(page.locator('dialog.pokemon-transition')).toBeHidden()
    await expect(page.getByRole('alert')).toContainText('taking too long')
    evidence.content.release()
    await page.getByRole('button', { name: /Try again|Retry/ }).first().click()
    await expect(page.locator(room.content)).toBeVisible()
    expect(evidence.errors).toEqual([])
  })
}
