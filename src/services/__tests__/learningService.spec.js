import { beforeEach, expect, it, vi } from 'vitest'
import { studyAction } from '../learningService'
import { activityChanged, checkedRpc } from '../backendClient'

vi.mock('../backendClient', () => ({ activityChanged: vi.fn(), checkedRpc: vi.fn() }))
beforeEach(() => vi.resetAllMocks())
it('announces a confirmed completed block even without an XP receipt so dashboard statistics refresh', async () => {
  const saved = { block: { id: 'block', focus_completed_at: '2026-11-06T04:00:00Z', focus_seconds: 1500 }, xp: null }
  checkedRpc.mockResolvedValue(saved)
  expect(await studyAction({ sessionId: 'session', topicId: 'topic', mode: 'flashcards', action: 'complete_block', userId: 'student' })).toEqual(saved)
  expect(activityChanged).toHaveBeenCalledExactlyOnceWith(saved)
})
it('does not announce an unconfirmed countdown as a completed block', async () => {
  checkedRpc.mockResolvedValue({ block: { focus_completed_at: null, active_ms: 1400000 }, xp: null })
  await studyAction({ sessionId: 'session', topicId: 'topic', mode: 'flashcards', action: 'complete_block', userId: 'student' })
  expect(activityChanged).not.toHaveBeenCalled()
})
