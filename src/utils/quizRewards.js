const bands = [
  [1, 20, 5, 10],
  [21, 40, 11, 20],
  [41, 60, 21, 30],
  [61, 80, 31, 40],
  [81, 99, 41, 50],
]

// Match the saved quiz's reward rules. This function calculates a display value;
// submit_learning_quiz remains the only operation that awards quiz XP.
export function calculateQuizReward(correct, total) {
  if (!Number.isInteger(correct) || !Number.isInteger(total) ||
      total <= 0 || correct < 0 || correct > total) {
    throw new Error('A quiz score requires correct answers between zero and the total.')
  }
  const scorePercent = Math.round(correct * 100 / total)
  if (scorePercent === 0) return { scorePercent, xp: 5 }
  if (scorePercent === 100) return { scorePercent, xp: 50 }
  const [low, high, minXp, maxXp] = bands.find(([low, high]) => scorePercent >= low && scorePercent <= high)
  const xp = Math.round(minXp + (scorePercent - low) * (maxXp - minXp) / (high - low))
  return { scorePercent, xp }
}

export function quizExperienceResult(result) {
  const { scorePercent, xp } = calculateQuizReward(result.correct, result.total)
  return {
    ...result,
    id: result.run_id || result.eventId,
    title: 'Quiz complete!',
    rewardType: 'quiz',
    scorePercent,
    // Prefer the actual saved reward, including receipts from an earlier rule version.
    delta: result.delta ?? xp,
    saving: false,
    error: '',
    pokemon: result.pokemon || (result.pokemonName ? {
      name: result.pokemonName, xp: result.xp, level: result.level,
    } : null),
  }
}
