import { afterEach, expect, it, vi } from 'vitest'
import { makeQuestions, readEncounter, writeEncounter } from '../bossEncounter'

afterEach(() => { sessionStorage.clear(); vi.useRealTimers() })

it('builds optional practice only from the supplied public flashcard text', () => {
  const cards = Array.from({ length: 8 }, (_, id) => ({ front: 'Prompt ' + id, back: 'Public answer ' + id }))
  const questions = makeQuestions(cards)
  expect(questions).toHaveLength(5)
  expect(new Set(questions.map(question => question[0])).size).toBe(5)
  for (const [prompt, options, correct, explanation] of questions) {
    expect(cards.find(card => card.front === prompt).back).toBe(explanation)
    expect(options[correct]).toBe(explanation)
    expect(new Set(options).size).toBe(options.length)
    expect(options.every(option => cards.some(card => card.back === option))).toBe(true)
  }
})

it('does not fabricate questions for image-only or identical-answer decks', () => {
  expect(makeQuestions([{ front: '', back: '' }])).toEqual([])
  expect(makeQuestions([{ front: 'One', back: 'Same' }, { front: 'Two', back: 'Same' }])).toEqual([])
})

it('keeps a return point within this tab and expires an old encounter', () => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-11-02T00:00:00Z'))
  const encounter = { id: 'practice', createdAt: Date.now(), owner: 'student' }
  expect(writeEncounter(encounter)).toBe(true)
  expect(readEncounter()).toEqual(encounter)
  vi.advanceTimersByTime(2 * 60 * 60 * 1000)
  expect(readEncounter()).toBeNull()
})
