import { beforeEach, expect, it, vi } from 'vitest'
import { submitQuiz } from '../quizService'
import { checkedRpc, activityChanged } from '../backendClient'
import { planPokemonXp } from '../pokemonProgression'

vi.mock('../backendClient', () => ({ checkedRpc: vi.fn(), activityChanged: vi.fn() }))
vi.mock('../pokemonProgression', () => ({ planPokemonXp: vi.fn() }))
const originalPokemon = { ownedId: 'owned-uuid', name: 'Charmander', xp: 190, level: 1 }
const graded = { run_id: 'run', correct: 5, total: 5, scorePercent: 100, delta: 50,
  duplicate: false, originalPokemon, expected: { pokemon_id: 'catalogue-uuid', xp: 190, level: 1 } }
const plan = { result: { name: 'Charmeleon', xp: 40, level: 2, is_defeated: false },
  appliedDelta: 50, evolutions: [{ from: 'charmander', to: 'charmeleon', direction: 'evolve' }], evolved: true }
const saved = { ...graded, pokemon: plan.result, pokemonName: 'Charmeleon', xp: 40, level: 2,
  evolutions: plan.evolutions, evolved: true }
beforeEach(() => {
  vi.resetAllMocks()
  checkedRpc.mockResolvedValueOnce(graded).mockResolvedValueOnce(saved)
  planPokemonXp.mockResolvedValue(plan)
})
it('uses the Vue planner before updating the current user’s owned Pokémon', async () => {
  expect(await submitQuiz('run', { q: 'a' }, 'current-profile')).toEqual(saved)
  expect(checkedRpc.mock.calls[0]).toEqual(['prepare_learning_quiz_progression', { p_run_id: 'run', p_answers: { q: 'a' } }, 'current-profile'])
  expect(planPokemonXp).toHaveBeenCalledExactlyOnceWith(originalPokemon, { delta: 50 })
  expect(checkedRpc.mock.calls[1]).toEqual(['submit_learning_quiz_progression', {
    p_run_id: 'run', p_answers: { q: 'a' }, p_expected: graded.expected,
    p_progression: expect.objectContaining({ pokemonRecordId: 'owned-uuid', pokemonName: 'Charmeleon',
      xp: 40, level: 2, delta: 50, originalPokemon, pokemon: plan.result, evolutions: plan.evolutions }),
  }, 'current-profile'])
  expect(checkedRpc.mock.invocationCallOrder[0]).toBeLessThan(planPokemonXp.mock.invocationCallOrder[0])
  expect(planPokemonXp.mock.invocationCallOrder[0]).toBeLessThan(checkedRpc.mock.invocationCallOrder[1])
  expect(activityChanged).toHaveBeenCalledExactlyOnceWith(saved)
})
it('returns a committed attempt without planning or applying XP again', async () => {
  checkedRpc.mockReset().mockResolvedValueOnce({ ...saved, duplicate: true })
  expect(await submitQuiz('run', { q: 'a' }, 'current-profile')).toMatchObject({ duplicate: true })
  expect(planPokemonXp).not.toHaveBeenCalled()
  expect(checkedRpc).toHaveBeenCalledTimes(1)
})
it('does not commit if the evolution helper cannot load the next form', async () => {
  planPokemonXp.mockRejectedValue(Error('PokéAPI unavailable'))
  await expect(submitQuiz('run', { q: 'a' }, 'current-profile')).rejects.toThrow('PokéAPI unavailable')
  expect(checkedRpc).toHaveBeenCalledTimes(1)
  expect(activityChanged).not.toHaveBeenCalled()
})
it('does not announce a save when ownership or stale-state checks reject the commit', async () => {
  checkedRpc.mockReset().mockResolvedValueOnce(graded).mockRejectedValueOnce(Error('Account changed'))
  await expect(submitQuiz('run', { q: 'a' }, 'current-profile')).rejects.toThrow('Account changed')
  expect(activityChanged).not.toHaveBeenCalled()
})
