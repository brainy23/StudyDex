// StudyDex demo progression, approved 4 November 2026.
// Cumulative XP stays with an owned Pokémon through every evolution.
// These are application rules, not official Pokémon evolution requirements.
export const TRAINING_XP_CAP = 250
export const EVOLUTION_XP = Object.freeze({
  1: Object.freeze([]),
  2: Object.freeze([125]),
  3: Object.freeze([75, 175]),
})

export function trainingProgress(xp, stageCount = 1) {
  if (!Number.isSafeInteger(xp) || xp < 0) throw new Error('XP must be a nonnegative integer.')
  if (!Object.hasOwn(EVOLUTION_XP, stageCount)) throw new Error('Evolution lines need 1–3 stages.')
  const thresholds = EVOLUTION_XP[stageCount]
  const totalXp = Math.min(xp, TRAINING_XP_CAP)
  const stage = thresholds.filter(threshold => totalXp >= threshold).length
  return {
    xp: totalXp,
    stage,
    stageCount: Number(stageCount),
    complete: totalXp === TRAINING_XP_CAP,
    nextEvolutionXp: thresholds[stage] ?? null,
    nextTargetXp: thresholds[stage] ?? TRAINING_XP_CAP,
    percentage: totalXp / TRAINING_XP_CAP * 100,
  }
}

// Used by the existing local buddy preview. Real awards must be authorized and
// persisted on the server; browser calculations never grant saved XP or packs.
export function planTrainingXp(currentXp, change) {
  if (!Number.isSafeInteger(currentXp) || currentXp < 0 || currentXp > TRAINING_XP_CAP ||
      !Number.isSafeInteger(change) || !Number.isSafeInteger(currentXp + change)) {
    throw new Error('Invalid XP change.')
  }
  const total = currentXp + change
  return {
    xp: Math.max(0, Math.min(total, TRAINING_XP_CAP)),
    overflow: Math.max(0, total - TRAINING_XP_CAP),
    defeated: total < 0,
  }
}
