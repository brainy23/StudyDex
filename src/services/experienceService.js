import { getSupabase } from '../lib/supabase'
import { getDailyProgress } from './learningService'
import { checkedRpc, activityChanged } from './backendClient'
export const newExperienceId = () => crypto.randomUUID()
export async function getRewardedTimerCount(userId) {
  const progress = await getDailyProgress(userId)
  return Math.min(4, progress.timer_rewards || 0)
}
export async function awardExperience(event) {
  if (event.type === 'boss' && event.sessionId) {
    const result = await checkedRpc('record_learning_boss', { p_session_id:event.sessionId, p_event_id:event.id, p_health:event.health })
    activityChanged(result)
    return result
  }
  if (!event.pokemonId) throw Error('Select a Pokémon before earning XP.')
  const { data, error } = await getSupabase().rpc('award_studydex_xp', {
    p_event_id:event.id, p_pokemon_record_id:String(event.pokemonId), p_reward_type:event.type,
    p_correct:event.correct ?? null, p_total:event.total ?? null, p_boss_health:event.health ?? null,
  })
  if (error) throw error
  window.dispatchEvent(new CustomEvent('studydex:pokemon-xp', { detail:data }))
  return data
}
