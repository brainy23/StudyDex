import { test, expect } from '@playwright/test'
import { mockLab, topic, timerKey } from './fixtures/lab'

const questionBank = ['quiz', 'boss_battle'].map(purpose => ({
  id: `${purpose}-preview`, topic_id: topic.id, question_purpose: purpose,
  question_text: `Fixture ${purpose} question`, question_type: 'mcq', difficulty: 1,
  options: ['Plants', 'Animals', 'Fungi', 'Bacteria'].map((option_text, index) => ({
    id: `${purpose}-option-${index}`, question_id: `${purpose}-preview`, option_text, option_order: index + 1,
  })),
}))

for (const width of [320, 1440]) {
  test(`reference layouts preserve topic selection, revision and question choices at ${width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 900 })
    const { requests, errors } = await mockLab(page, { questionBank })
    await page.route('https://pokeapi.co/**', route => route.fulfill({ json: {
      id: 25, name: 'pikachu', sprites: { front_default: '/assets/quiz_buddy.png', back_default: '/assets/quiz_buddy.png' },
    } }))
    await page.route('https://raw.githubusercontent.com/**', route => route.fulfill({ contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96"><circle cx="48" cy="48" r="30" fill="#ffd841"/></svg>' }))
    await page.goto('/study-decks')
    const picker = page.locator('.arena-picker')
    await picker.locator('.bubble-card').filter({ hasText: 'Science' }).click()
    await picker.locator('.topic-grid .bubble-card').filter({ hasText: topic.name }).click()
    await expect(picker).toHaveCount(0)
    await expect(page.locator('.lab-stage:not(.selection-blur)')).toBeVisible()
    await expect(page.locator('.lab-navigation')).toBeVisible()
    await expect(page.locator('.lab-stage img[src$="poke-lab-interior.png"]')).toHaveCount(1)
    await expect(page.locator('.study-layout, .study-panel')).toHaveCount(0)
    await page.getByRole('button', { name: 'Flashcards', exact: true }).click()
    await page.getByRole('button', { name: 'Reveal answer', exact: true }).click()
    await page.getByRole('button', { name: 'Easy', exact: true }).click()
    await expect(page.locator('.study-review-progress')).toContainText('1 / 15 remembered')
    await page.getByRole('button', { name: 'Learn', exact: true }).click()
    await expect(page.locator('.study-overview')).toBeVisible()
    await page.getByRole('button', { name: 'Flashcards', exact: true }).click()
    await page.getByRole('button', { name: 'Start Study Session', exact: true }).click()
    const deadline = await page.evaluate(key => JSON.parse(localStorage.getItem(key)).deadlineAt, timerKey)
    await page.getByRole('button', { name: 'Topics', exact: true }).click()
    await expect(picker).toBeVisible()
    const duringSelection = await page.evaluate(key => JSON.parse(localStorage.getItem(key)), timerKey)
    expect(duringSelection.status).toBe('running')
    expect(duringSelection.deadlineAt).toBe(deadline)
    await picker.locator('.topic-grid .bubble-card').filter({ hasText: topic.name }).click()
    await expect(picker).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Pause', exact: true })).toBeVisible()
    await expect(page.locator('.study-review-progress')).toContainText('1 / 15 remembered')
    await page.screenshot({ path: testInfo.outputPath(`lab-${width}.png`), fullPage: true })
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.getByRole('button', { name: 'Go to Poké Arena', exact: true }).click()
    await page.getByRole('button', { name: 'Preview Questions', exact: true }).click()
    await expect(page.locator('.arena-scene:not(.selection-blur)')).toBeVisible()
    await expect(page.locator('.arena-scene img[src$="poke-arena4.png"]')).toHaveCount(1)
    await expect(page.locator('.battle-dock .battle-option')).toHaveCount(4)
    const plant = page.getByRole('radio', { name: 'A Plants', exact: true })
    await plant.focus()
    await page.keyboard.press('Space')
    await expect(plant).toBeChecked()
    await expect(page.locator('.battle-dialogue')).toContainText('has not been graded')
    await page.getByRole('button', { name: 'Boss Battle', exact: true }).click()
    await page.getByRole('button', { name: 'Preview Questions', exact: true }).click()
    await expect(page.getByRole('radio').first()).not.toBeChecked()
    await page.getByRole('button', { name: 'Topic Quiz', exact: true }).click()
    await expect(plant).toBeChecked()
    await page.screenshot({ path: testInfo.outputPath(`arena-${width}.png`), fullPage: true })
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    expect(requests.some(request => request.table === 'question_options')).toBe(true)
    expect(requests.some(request => request.table === 'question_answers')).toBe(false)
    expect(requests.every(request => request.method === 'GET')).toBe(true)
    expect(errors).toEqual([])
  })
}
