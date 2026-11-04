import { test, expect } from '@playwright/test'
import { mockOnboarding } from './onboarding-fixture'

// Synthetic public content only. No answer keys or student credentials.
async function contentFixture(page, level) {
  const fixture = await mockOnboarding(page, { avatarConfirmed: true, starterClaimed: true })
  const levelId = (number) => `00000000-0000-4000-8000-${String(number).padStart(12, '0')}`
  fixture.state.schoolLevel = { id: levelId(level), level_number: level, name: `Primary ${level}` }
  const subjects = [
    { id: 'math', name: 'Mathematics' },
    { id: 'science', name: 'Science' },
  ]
  // Return all levels deliberately; the client must also reject stray rows/URLs.
  const topics = [1, 2, 3, 4, 5, 6].flatMap((number) =>
    subjects
      .filter((subject) => subject.id !== 'science' || number >= 3)
      .map((subject) => ({
        id: `${subject.id}-${number}`,
        level_id: levelId(number),
        subject_id: subject.id,
        name: `${subject.id === 'math' ? 'Numbers' : 'Plants'} P${number}`,
        description: 'Synthetic demo content',
        topic_order: 1,
      })),
  )
  const questions = topics.flatMap((topic) =>
    [1, 2, 3].map((index) => ({
      id: `${topic.id}-q${index}`,
      topic_id: topic.id,
      question_type: 'mcq',
      question_purpose: 'quiz',
      difficulty: 1,
      question_text: `2 × ${index} − 1\n● ●`,
    })),
  )
  const options = questions.flatMap((question) =>
    [1, 2, 3, 4].map((order) => ({
      id: `${question.id}-o${order}`,
      question_id: question.id,
      option_order: order,
      option_text: `Option ${order}`,
    })),
  )
  const requests = []
  const writes = []
  let failQuestions = false
  await page.route('https://studydex-fixture.invalid/rest/v1/**', async (route) => {
    const request = route.request()
    const url = new URL(request.url())
    const table = url.pathname.split('/').at(-1)
    requests.push({ table, method: request.method(), params: Object.fromEntries(url.searchParams) })
    if (request.method() !== 'GET') writes.push(table)
    if (url.pathname.includes('/rpc/') || table === 'profiles') return route.fallback()
    const headers = { 'access-control-allow-origin': '*' }
    if (table === 'question_answers') {
      return route.fulfill({ status: 403, headers, json: { message: 'Private answers forbidden' } })
    }
    if (table === 'questions' && failQuestions) {
      return route.fulfill({
        status: 403,
        headers,
        json: { code: '42501', message: 'Synthetic denied read' },
      })
    }
    const topicId = url.searchParams.get('topic_id')?.replace(/^eq\./, '') || `math-${level}`
    let rows =
      {
        subjects,
        topics,
        questions,
        question_options: options,
        user_pokemon: [],
        topic_learning_goals: [
          { id: 'goal', topic_id: topicId, goal_order: 1, goal_text: 'Count groups' },
        ],
        topic_concepts: [
          {
            id: 'concept',
            topic_id: topicId,
            concept_order: 1,
            title: 'Count groups',
            explanation_text: '● ●\n● ●',
            example_text: '2 × 2 = 4\n4 − 1 = 3',
          },
        ],
        flashcards: [
          {
            id: 'card',
            topic_id: topicId,
            card_order: 1,
            front_text: '2 × 2',
            back_text: '4\n● ● ● ●',
            front_image_path: null,
            back_image_path: null,
          },
        ],
      }[table] || []
    for (const column of ['topic_id', 'question_id', 'question_purpose']) {
      const filter = url.searchParams.get(column)
      if (filter?.startsWith('eq.'))
        rows = rows.filter((row) => String(row[column]) === filter.slice(3))
      if (filter?.startsWith('in.(')) {
        const ids = filter
          .slice(4, -1)
          .split(',')
          .map((value) => value.replaceAll('"', ''))
        rows = rows.filter((row) => ids.includes(row[column]))
      }
    }
    const offset = Number(url.searchParams.get('offset') || 0)
    const limit = Number(url.searchParams.get('limit') || rows.length)
    return route.fulfill({ headers, json: rows.slice(offset, offset + limit) })
  })
  return {
    ...fixture,
    requests,
    writes,
    denyQuestions(value) {
      failQuestions = value
    },
  }
}

for (const level of [1, 2, 3, 4, 5, 6]) {
  test(`P${level} sees only relevant Lab and Arena subjects/topics`, async ({ page }) => {
    const fixture = await contentFixture(page, level)
    for (const flow of ['study', 'quiz']) {
      await page.goto(`/subjects?flow=${flow}`)
      await expect(page.locator('.sd-path strong')).toHaveText(
        level < 3 ? ['Mathematics'] : ['Mathematics', 'Science'],
      )
      await page.getByRole('button', { name: /Mathematics/ }).click()
      await expect(page.locator('.sd-topic-card strong')).toHaveText([`Numbers P${level}`])
      expect(
        fixture.requests
          .filter((request) => request.table === 'topics')
          .every((request) => request.params.level_id === `eq.${fixture.state.schoolLevel.id}`),
      ).toBe(true)
    }
    expect(fixture.requests.some((request) => request.table === 'question_answers')).toBe(false)
    expect(fixture.writes).toEqual([])
    expect(fixture.liveRequests).toEqual([])
    expect(fixture.errors).toEqual([])
  })
}

test('P1 Mathematics Learn, Flashcards and Arena display real-shaped content without grading/writes', async ({
  page,
}) => {
  const fixture = await contentFixture(page, 1)
  await page.goto('/subjects?flow=study')
  await page.getByRole('button', { name: /Mathematics/ }).click()
  await page.getByRole('button', { name: /Numbers P1/ }).click()
  await page.getByRole('button', { name: /Learn Explore/ }).click()
  await expect(page.locator('.inline-whiteboard')).toContainText('2 × 2 = 4\n4 − 1 = 3', {
    useInnerText: false,
  })
  const textStyle = await page
    .locator('.inline-example .learn-copy')
    .evaluate((element) => getComputedStyle(element).whiteSpace)
  expect(textStyle).toBe('pre-wrap')
  await page.getByRole('button', { name: '‹ Back to flashcards' }).click()
  await expect(page.locator('.answer-copy')).toHaveText('2 × 2')
  await page.getByRole('button', { name: 'Reveal answer' }).click()
  await expect(page.locator('.answer-copy')).toHaveText('4\n● ● ● ●')
  await expect(page.locator('.answer-content img')).toHaveCount(0)
  await page.goto('/quiz-battle?subject=math&topic=math-1')
  await expect(page.locator('#arena-question')).toHaveText('2 × 1 − 1\n● ●')
  await expect(page.locator('.demo-caption')).toContainText('1 / 3')
  expect(
    await page
      .locator('#arena-question')
      .evaluate((element) => getComputedStyle(element).whiteSpace),
  ).toBe('pre-wrap')
  for (let index = 0; index < 3; index++) {
    await expect(page.locator('.demo-answers .choice-text')).toHaveText([
      'Option 1',
      'Option 2',
      'Option 3',
      'Option 4',
    ])
    await page.getByRole('button', { name: 'A Option 1', exact: true }).click()
    await expect(page.locator('.demo-answers .correct,.demo-answers .wrong')).toHaveCount(0)
    await page
      .getByRole('button', { name: index === 2 ? /Finish preview/ : /Next question/ })
      .click()
  }
  await expect(
    page.getByText('You explored 3 questions. This preview is not graded.'),
  ).toBeVisible()
  expect(fixture.requests.some((request) => request.table === 'question_answers')).toBe(false)
  expect(fixture.writes).toEqual([])
  expect(fixture.errors).toEqual([])
})

test('rejects wrong-level direct links and retries a denied content read', async ({ page }) => {
  const fixture = await contentFixture(page, 1)
  for (const path of ['/learn', '/study-decks', '/study-mode', '/quiz-battle']) {
    await page.goto(`${path}?subject=math&topic=math-6`)
    await expect(page.getByText(/school level/).last()).toBeVisible()
  }
  expect(
    fixture.requests.some((request) =>
      ['flashcards', 'topic_concepts', 'questions'].includes(request.table),
    ),
  ).toBe(false)
  fixture.denyQuestions(true)
  await page.goto('/subjects?flow=quiz')
  await expect(page.getByRole('alert')).toContainText('permission')
  fixture.denyQuestions(false)
  await page.getByRole('button', { name: 'Try again' }).click()
  await expect(page.locator('.sd-path strong')).toHaveText(['Mathematics'])
  expect(fixture.errors).toEqual([])
  expect(fixture.liveRequests).toEqual([])
})
