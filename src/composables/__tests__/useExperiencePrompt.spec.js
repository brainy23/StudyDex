import { expect, it, vi } from 'vitest'
import { useExperiencePrompt } from '../useExperiencePrompt'
import { awardExperience } from '../../services/experienceService'

vi.mock('../../services/experienceService', () => ({ awardExperience: vi.fn() }))

it('shows a committed study reward once without awarding XP again', async () => {
  const refresh = vi.fn()
  const experience = useExperiencePrompt(null, refresh)
  const saved = { eventId: 'saved-focus', delta: 10, xp: 20, rewardType: 'timer' }
  const prompt = await experience.showSaved(saved, 'Focus session complete!')
  expect(experience.prompt.value).toMatchObject({ id: 'saved-focus', title: 'Focus session complete!', delta: 10, saving: false })
  expect(await experience.showSaved(saved)).toBe(prompt)
  expect(refresh).toHaveBeenCalledTimes(1)
  expect(awardExperience).not.toHaveBeenCalled()
  experience.dismiss()
  expect(experience.prompt.value).toBeNull()
  await experience.showSaved(saved)
  expect(experience.prompt.value).toBeNull()
})

it('keeps an already committed reward visible when refreshing the buddy fails', async () => {
  const experience = useExperiencePrompt(null, vi.fn().mockRejectedValue(new Error('Offline refresh')))
  await experience.showSaved({ eventId: 'saved-deck', delta: 5 })
  expect(experience.prompt.value).toMatchObject({ error: '', saving: false, progressionError: 'Offline refresh' })
  expect(awardExperience).not.toHaveBeenCalled()
})
