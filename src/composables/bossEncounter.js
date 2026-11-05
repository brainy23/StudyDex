// One pending encounter per browser tab. No backend rewards are awarded here.
export const FAST_CARD_MS = 1000
export const FAST_CARD_STREAK = 6
export const BOSS_COOLDOWN_MS = 0
const KEY = 'studydex-boss-encounter-v1'
export function readEncounter() {
  try {
    const value = JSON.parse(sessionStorage.getItem(KEY))
    return value && Date.now() - value.createdAt < 2 * 60 * 60 * 1000 ? value : null
  } catch { return null }
}
export function writeEncounter(value) {
  try { sessionStorage.setItem(KEY, JSON.stringify(value)); return true } catch { return false }
}
export function makeQuestions(cards, random = Math.random) {
  const usable = cards.filter(card => card.front?.trim() && card.back?.trim())
  const answers = [...new Set(usable.map(card => card.back.trim()))]
  if (answers.length < 2) return []
  const shuffle = rows => {
    const result = [...rows]
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1)); [result[i], result[j]] = [result[j], result[i]]
    }
    return result
  }
  return shuffle(usable).slice(0, 5).map(card => {
    const answer = card.back.trim()
    const options = shuffle([answer, ...shuffle(answers.filter(item => item !== answer)).slice(0, 3)])
    return [card.front, options, options.indexOf(answer), card.back]
  })
}
