import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { useTopicCompletion } from '../useTopicCompletion'

beforeEach(() => localStorage.clear())
afterEach(() => vi.restoreAllMocks())

it('retains two completed topics across new page instances and does not count repeats', () => {
  const lab = useTopicCompletion()
  lab.bindStudent('student', 'level-3')
  lab.markComplete('topic-1')
  lab.markComplete('topic-2')
  lab.markComplete('topic-1')
  const arena = useTopicCompletion()
  arena.bindStudent('student', 'level-3')
  expect(arena.completedTopicIds.value).toEqual(['topic-1', 'topic-2'])
  expect(arena.isComplete('topic-3')).toBe(false)
  expect(arena.savedInBrowser.value).toBe(true)
})

it('keeps progress separate by student and school level, and clears the active binding', () => {
  const progress = useTopicCompletion()
  progress.bindStudent('ash', 'level-3')
  progress.markComplete('topic-1')
  progress.bindStudent('misty', 'level-3')
  expect(progress.isComplete('topic-1')).toBe(false)
  progress.bindStudent('ash', 'level-4')
  expect(progress.isComplete('topic-1')).toBe(false)
  progress.bindStudent('ash', 'level-3')
  expect(progress.isComplete('topic-1')).toBe(true)
  progress.bindStudent(null, null)
  progress.markComplete('topic-2')
  expect(progress.completedTopicIds.value).toEqual([])
})

it('ignores corrupt browser data and repairs it when a topic is completed', () => {
  const key = 'studydex:completed-topics:student:level-3'
  localStorage.setItem(key, '{corrupt')
  const progress = useTopicCompletion()
  progress.bindStudent('student', 'level-3')
  expect(progress.completedTopicIds.value).toEqual([])
  progress.markComplete('topic-1')
  expect(JSON.parse(localStorage.getItem(key))).toEqual(['topic-1'])
})

it('merges a completion made in another browser tab', () => {
  const key = 'studydex:completed-topics:student:level-3'
  const progress = useTopicCompletion()
  progress.bindStudent('student', 'level-3')
  localStorage.setItem(key, JSON.stringify(['topic-from-other-tab']))
  progress.markComplete('topic-1')
  expect(progress.completedTopicIds.value).toEqual(['topic-from-other-tab', 'topic-1'])
})

it.each(['getItem', 'setItem'])('keeps unlocks between pages when storage %s is blocked', (method) => {
  vi.spyOn(Storage.prototype, method).mockImplementation(() => { throw new Error('Storage blocked') })
  const lab = useTopicCompletion()
  lab.bindStudent(`blocked-${method}`, 'level-3')
  lab.markComplete('topic-1')
  const arena = useTopicCompletion()
  arena.bindStudent(`blocked-${method}`, 'level-3')
  expect(arena.isComplete('topic-1')).toBe(true)
  expect(arena.savedInBrowser.value).toBe(false)
})
