import { expect, it } from 'vitest'
import { calculateQuizReward, quizExperienceResult } from '../quizRewards'

it.each([
  [0, 100, 0, 5], [1, 100, 1, 5], [10, 100, 10, 7], [11, 100, 11, 8],
  [20, 100, 20, 10], [21, 100, 21, 11], [30, 100, 30, 15], [40, 100, 40, 20],
  [41, 100, 41, 21], [50, 100, 50, 25], [60, 100, 60, 30],
  [61, 100, 61, 31], [70, 100, 70, 35], [80, 100, 80, 40],
  [81, 100, 81, 41], [90, 100, 90, 46], [99, 100, 99, 50], [100, 100, 100, 50],
  [1, 3, 33, 17], [2, 3, 67, 34], [1, 200, 1, 5], [199, 200, 100, 50],
])('calculates %i / %i as %i%% and %i XP', (correct, total, scorePercent, xp) => {
  expect(calculateQuizReward(correct, total)).toEqual({ scorePercent, xp })
})

it('keeps XP in range and nondecreasing for every rounded whole percentage', () => {
  let previous = 5
  for (let percent = 0; percent <= 100; percent++) {
    const { xp } = calculateQuizReward(percent, 100)
    expect(xp).toBeGreaterThanOrEqual(previous)
    expect(xp).toBeLessThanOrEqual(50)
    expect(Number.isInteger(xp)).toBe(true)
    previous = xp
  }
})

it.each([[0, 0], [-1, 5], [6, 5], [0.5, 5], [1, 2.5], [NaN, 5]])(
  'rejects invalid grade %s / %s', (correct, total) => {
    expect(() => calculateQuizReward(correct, total)).toThrow('quiz score')
  },
)

it('presents the saved receipt without replacing capped XP or duplicate metadata', () => {
  expect(quizExperienceResult({ run_id: 'attempt', correct: 4, total: 5, delta: 40,
    appliedDelta: 5, xp: 250, level: 3, pokemonName: 'Charizard', duplicate: true,
  })).toMatchObject({ id: 'attempt', rewardType: 'quiz', title: 'Quiz complete!',
    scorePercent: 80, delta: 40, appliedDelta: 5, xp: 250, duplicate: true,
    pokemon: { name: 'Charizard', xp: 250, level: 3 }, saving: false,
  })
})
