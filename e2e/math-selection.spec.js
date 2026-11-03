import { test, expect } from '@playwright/test'
import { mockLab, timerKey } from './fixtures/lab'
import { studentProfile } from '../src/test/studyFixtures'

for (const [level, width] of [
  [1, 390],
  [6, 1440],
]) {
  test(`Primary ${level} Mathematics opens Learn, flashcards and safe quiz previews`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width, height: 900 })
    const topic = {
      id: 'math-topic',
      subject_id: 'maths',
      level_id: `level-${level}`,
      name: 'Number Adventure',
      topic_order: 1,
    }
    const question = {
      id: 'math-question',
      topic_id: topic.id,
      question_type: 'mcq',
      difficulty: 1,
      question_purpose: 'quiz',
      question_text: 'Fixture question: choose a number.',
      options: ['One', 'Two', 'Three', 'Four'].map((option_text, i) => ({
        id: `math-option-${i}`,
        question_id: 'math-question',
        option_text,
        option_order: i + 1,
      })),
    }
    const { requests, errors } = await mockLab(page, {
      profile: {
        ...studentProfile,
        school_level_id: topic.level_id,
        school_level: { id: topic.level_id, name: `Primary ${level}` },
      },
      catalogueSubjects: [
        { id: 'science', name: 'science' },
        { id: 'maths', name: 'mathematics' },
      ],
      catalogueTopics: [topic],
      lessonGoals: [
        { id: 'math-goal', topic_id: topic.id, goal_order: 1, goal_text: 'Explore numbers.' },
      ],
      lessonConcepts: [
        {
          id: 'math-concept',
          topic_id: topic.id,
          concept_order: 1,
          title: 'Counting numbers',
          explanation_text: 'Count each item once.',
          example_text: 'One item, then two items.',
        },
      ],
      cards: [
        {
          id: 'math-card',
          topic_id: topic.id,
          card_order: 1,
          front_text: 'Fixture card prompt',
          back_text: 'Fixture card answer',
          front_image_path: null,
          back_image_path: null,
        },
      ],
      questionBank: [question],
    })
    await page.route('https://pokeapi.co/**', (route) =>
      route.fulfill({
        json: {
          id: 143,
          name: 'snorlax',
          sprites: {
            front_default: '/assets/quiz_buddy.png',
            back_default: '/assets/quiz_buddy.png',
          },
        },
      }),
    )
    await page.route('https://raw.githubusercontent.com/**', (route) =>
      route.fulfill({
        contentType: 'image/svg+xml',
        body: '<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96"><circle cx="48" cy="48" r="30" fill="#ffd841"/></svg>',
      }),
    )
    await page.goto('/study-decks')
    await page.getByRole('button', { name: /Mathematics.*Explore topics/ }).click()
    await expect(page.getByRole('heading', { name: 'Your Mathematics adventure' })).toBeVisible()
    await page.getByRole('button', { name: /Number Adventure/ }).click()
    await page.getByRole('button', { name: /Learn.*Explore the lesson/ }).click()
    await expect(page.locator('.inline-classroom')).toBeVisible()
    await expect(page.locator('.study-overview')).toContainText('Explore numbers.')
    await page.screenshot({ path: testInfo.outputPath(`math-learn-p${level}.png`), fullPage: true })
    await page.getByRole('button', { name: 'Start Study Session', exact: true }).click()
    const deadline = await page.evaluate(
      (key) => JSON.parse(localStorage.getItem(key)).deadlineAt,
      timerKey,
    )
    await page.getByRole('button', { name: 'Flashcards', exact: true }).click()
    await expect(page.getByRole('heading', { name: 'Fixture card prompt' })).toBeVisible()
    await page.getByRole('button', { name: 'Reveal answer', exact: true }).click()
    await expect(page.locator('.study-card-back')).toContainText('Fixture card answer')
    await page.getByRole('button', { name: 'Learn', exact: true }).click()
    await expect(page.locator('.inline-classroom')).toBeVisible()
    await page.getByRole('button', { name: 'Flashcards', exact: true }).click()
    await expect(page.locator('.study-card-back')).toContainText('Fixture card answer')
    expect(
      await page.evaluate((key) => JSON.parse(localStorage.getItem(key)).deadlineAt, timerKey),
    ).toBe(deadline)
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.getByRole('button', { name: 'Go to Poké Arena', exact: true }).click()
    await page.getByRole('button', { name: 'Preview Questions', exact: true }).click()
    await expect(page.getByRole('heading', { name: question.question_text })).toBeVisible()
    await page.getByRole('radio').first().focus()
      await page.keyboard.press('Space')
    await expect(page.locator('.battle-dialogue')).toContainText('has not been graded')
    expect(requests.some((request) => request.table === 'question_answers')).toBe(false)
    expect(requests.every((request) => request.method === 'GET')).toBe(true)
    expect(errors).toEqual([])
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  })
}
