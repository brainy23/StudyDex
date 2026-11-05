import { getSupabase } from '../lib/supabase'
export const newExperienceId = () => crypto.randomUUID()
export async function getRewardedTimerCount(userId) {
  const { count, error } = await getSupabase().from('studydex_xp_events')
    .select('event_id', { count:'exact', head:true }).eq('user_id', userId)
    .eq('reward_type','timer').eq('requested_delta',10)
  if (error) throw error
  return Math.min(4, count || 0)
}
export async function awardExperience(event) {
  if (!event.pokemonId) throw Error('Select a Pokémon before earning XP.')
  const { data, error } = await getSupabase().rpc('award_studydex_xp', {
    p_event_id:event.id, p_pokemon_record_id:String(event.pokemonId), p_reward_type:event.type,
    p_correct:event.correct ?? null, p_total:event.total ?? null, p_boss_health:event.health ?? null,
  })
  if (error) throw error
  window.dispatchEvent(new CustomEvent('studydex:pokemon-xp', { detail:data }))
  return data
}
