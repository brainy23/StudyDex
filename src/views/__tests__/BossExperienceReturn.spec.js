import { defineComponent } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import BossView from '../SurpriseBossView.vue'
import { readEncounter, writeEncounter } from '../../composables/bossEncounter'
import { getCurrentProfile } from '../../services/profileService'
import { getSelectedStudyBuddy } from '../../services/studyService'
import { awardExperience } from '../../services/experienceService'
vi.mock('../../services/profileService', () => ({ getCurrentProfile: vi.fn() }))
vi.mock('../../services/studyService', async original => ({ ...await original(), getSelectedStudyBuddy: vi.fn() }))
vi.mock('../../services/experienceService', () => ({ awardExperience: vi.fn(), newExperienceId: () => 'reward-id' }))
vi.mock('../../composables/usePokemonTransition', () => ({ usePokemonTransition: () => ({
  state: { active: false, sequence: 0, outcome: null }, pageReady: vi.fn(), pageLeft: vi.fn(),
}) }))
let wrapper
const returnQuery = { subject: 'maths', topic: 'topic-1', mode: 'flashcards' }
beforeEach(() => {
  vi.resetAllMocks()
  sessionStorage.clear()
  getCurrentProfile.mockResolvedValue({ id: 'ash', school_level_id: 'level-3' })
  getSelectedStudyBuddy.mockResolvedValue({ id: 'owned', xp: 100, level: 1, pokemon: { name: 'Charmander' } })
  awardExperience.mockResolvedValue({ pokemonName: 'Charmander', delta: 50, appliedDelta: 50, xp: 150, level: 1, rewardType: 'boss' })
  vi.stubGlobal('Audio', class { play() { return Promise.resolve() } pause() {} })
  vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => ({ name: 'mewtwo', sprites: { front_default: '/boss.png' } }) })))
})
afterEach(() => { wrapper?.unmount(); vi.unstubAllGlobals() })
async function open(score = 5) {
  writeEncounter({ id: 'encounter-1', owner: 'ash', status: 'pending', createdAt: Date.now(),
    questions: [['Question', ['A', 'B'], 0, 'Explanation']], index: 0, choice: 0,
    score, finished: true, returnQuery, studySessionId: 'saved-session',
    snapshot: { cardIndex: 3, remainingMs: 123000 },
  })
  const router = createRouter({ history: createMemoryHistory(), routes: [
    { path: '/boss', name: 'surprise-boss', component: BossView },
    { path: '/study', name: 'study-decks', component: defineComponent({ template: '<div>Flashcards</div>' }) },
    { path: '/home', name: 'home', component: defineComponent({ template: '<div />' }) },
  ] })
  await router.push('/boss?encounter=encounter-1')
  wrapper = mount({ template: '<RouterView />' }, { global: { plugins: [router],
    stubs: { teleport: true, PokeSprite: true, ClockWeather: true, StudydexBubbleNav: true },
  } })
  await flushPromises()
  return router
}
it.each([[5, 'won'], [0, 'lost']])('Continue returns the completed boss score %s to its saved flashcard session', async (score, outcome) => {
  const router = await open(score)
  await wrapper.get('.xp-prompt .action-button').trigger('click')
  await flushPromises()
  expect(router.currentRoute.value.name).toBe('study-decks')
  expect(router.currentRoute.value.query).toEqual({ ...returnQuery, bossReturn: 'encounter-1' })
  expect(readEncounter()).toMatchObject({ status: 'complete', outcome, studySessionId: 'saved-session',
    snapshot: { cardIndex: 3, remainingMs: 123000 } })
  expect(awardExperience).toHaveBeenCalledTimes(1)
})
it('does not leave the boss page when the popup is dismissed with its close button', async () => {
  const router = await open()
  await wrapper.get('.xp-close').trigger('click')
  await flushPromises()
  expect(router.currentRoute.value.name).toBe('surprise-boss')
  expect(readEncounter().status).toBe('pending')
})
