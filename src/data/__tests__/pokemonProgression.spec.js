import { expect, it } from 'vitest'
import { TRAINING_XP_CAP, EVOLUTION_XP, trainingProgress, planTrainingXp } from '../pokemonProgression'

it('halves progression milestones while keeping cumulative XP', () => {
  expect(TRAINING_XP_CAP).toBe(250)
  expect(EVOLUTION_XP).toEqual({ 1: [], 2: [125], 3: [75, 175] })
})
it.each([[74, 0, 75], [75, 1, 175], [174, 1, 175], [175, 2, 250], [249, 2, 250], [250, 2, 250]])(
  'three-stage line at %i XP has stage %i and target %i', (xp, stage, target) => {
    expect(trainingProgress(xp, 3)).toMatchObject({ xp, stage, nextTargetXp: target, complete: xp === 250 })
  },
)
it('two-stage and non-evolving Pokemon share the 250-XP training cap', () => {
  expect(trainingProgress(124, 2).stage).toBe(0)
  expect(trainingProgress(125, 2)).toMatchObject({ stage: 1, complete: false })
  expect(trainingProgress(175, 1)).toMatchObject({ stage: 0, complete: false, nextEvolutionXp: null })
  expect(trainingProgress(250, 1).complete).toBe(true)
})
it('preserves overflow for a new buddy instead of resetting XP after evolution', () => {
  expect(planTrainingXp(170, 15)).toEqual({ xp: 185, overflow: 0, defeated: false })
  expect(planTrainingXp(240, 25)).toEqual({ xp: 250, overflow: 15, defeated: false })
  expect(planTrainingXp(250, 25)).toEqual({ xp: 250, overflow: 25, defeated: false })
})
it('supports existing preview penalties without negative saved XP', () => {
  expect(planTrainingXp(175, -1)).toEqual({ xp: 174, overflow: 0, defeated: false })
  expect(planTrainingXp(5, -10)).toEqual({ xp: 0, overflow: 0, defeated: true })
})
it.each([-1, NaN, 0.5])('rejects invalid cumulative XP %s', xp => {
  expect(() => trainingProgress(xp, 3)).toThrow('nonnegative integer')
})
it('rejects invalid progression state and unsafe arithmetic', () => {
  expect(() => trainingProgress(10, 4)).toThrow('1–3 stages')
  expect(() => planTrainingXp(251, 1)).toThrow('Invalid XP')
  expect(() => planTrainingXp(1, Number.MAX_SAFE_INTEGER)).toThrow('Invalid XP')
})
