import { beforeEach, expect, it, vi } from 'vitest'
import { useTopicCompletion } from '../useTopicCompletion'
import { getTopicCompletions } from '../../services/learningService'
vi.mock('../../services/learningService', () => ({ getTopicCompletions: vi.fn() }))
beforeEach(() => { vi.resetAllMocks(); getTopicCompletions.mockResolvedValue([]) })
it('loads persisted topic completions for each page instance', async () => {
  getTopicCompletions.mockResolvedValue([{ topic_id: 'topic-1' }, { topic_id: 'topic-2' }])
  for (let n = 0; n < 2; n++) {
    const progress = useTopicCompletion()
    await progress.bindStudent('student')
    expect(progress.completedTopicIds.value).toEqual(['topic-1', 'topic-2'])
    expect(progress.savedInBrowser.value).toBe(true)
  }
})
it('clears old account progress and ignores late reads from that account', async () => {
  let resolve
  getTopicCompletions.mockReturnValueOnce(new Promise(done => { resolve = done }))
  const progress = useTopicCompletion()
  const old = progress.bindStudent('ash')
  await progress.bindStudent('misty')
  resolve([{ topic_id: 'ash-private-progress' }]); await old
  expect(progress.completedTopicIds.value).toEqual([])
  await progress.bindStudent(null)
  expect(progress.isComplete('ash-private-progress')).toBe(false)
})
it('reports unavailable persistence instead of trusting browser data and supports retry', async () => {
  getTopicCompletions.mockRejectedValueOnce(new Error('offline'))
  const progress = useTopicCompletion()
  await progress.bindStudent('student')
  expect(progress.savedInBrowser.value).toBe(false)
  getTopicCompletions.mockResolvedValue([{ topic_id: 'saved-after-retry' }])
  await progress.refresh()
  expect(progress.isComplete('saved-after-retry')).toBe(true)
})
