import { getSupabase } from '../lib/supabase'

// Generate ONCE when starting an activity; persist and reuse through retries.
// For quiz/boss attempts, use the saved attempt UUID instead where possible.
export const newExperienceId = () => crypto.randomUUID()

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function toRewardPayload(event) {
  if (!UUID.test(event.id || '')) throw Error('A stable activity UUID is required.')
  if (!UUID.test(String(event.pokemonId || ''))) throw Error('Select a Pokémon before earning XP.')
  if (!['timer', 'flashcards', 'quiz', 'boss'].includes(event.type)) {
    throw Error('Unsupported reward type.')
  }
  const payload = {
    p_event_id: event.id,
    p_pokemon_record_id: String(event.pokemonId),
    p_reward_type: event.type,
    p_correct: null, p_total: null, p_boss_health: null,
  }
  if (event.type === 'quiz') {
    if (!Number.isInteger(event.correct) || !Number.isInteger(event.total) ||
        event.total <= 0 || event.correct < 0 || event.correct > event.total) {
      throw Error('Quiz requires integer correct/total counts with 0 ≤ correct ≤ total and total > 0.')
    }
    payload.p_correct = event.correct
    payload.p_total = event.total
  } else if (event.correct != null || event.total != null) {
    throw Error('Only quiz rewards accept correct and total.')
  }
  if (event.type === 'boss') {
    // Zero must stay zero. Never substitute player health or initial boss health.
    if (!Number.isInteger(event.health) || event.health < 0 || event.health > 5) {
      throw Error('Pass final remaining boss health as an integer from 0 to 5.')
    }
    payload.p_boss_health = event.health
  } else if (event.health != null) {
    throw Error('Only boss rewards accept health.')
  }
  return payload
}

export async function getRewardedTimerCount(userId) {
  const singaporeDate = new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString().slice(0, 10)
  const dayStart = new Date(`${singaporeDate}T00:00:00+08:00`)
  const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000)
  const { count, error } = await getSupabase().from('studydex_xp_events')
    .select('event_id', { count: 'exact', head: true }).eq('user_id', userId)
    .eq('reward_type', 'timer').eq('requested_delta', 10)
    .gte('created_at', dayStart.toISOString()).lt('created_at', dayEnd.toISOString())
  if (error) throw error
  return Math.min(4, count || 0)
}

export async function awardExperience(event) {
  const { data, error } = await getSupabase().rpc('award_studydex_xp', toRewardPayload(event))
  if (error) throw error
  // UI refresh failures must not turn a committed award into a failed save.
  try {
    window.dispatchEvent(new CustomEvent('studydex:pokemon-xp', { detail: data }))
  } catch (cause) {
    console.warn('XP saved; Pokémon refresh notification failed.', cause)
  }
  return data
}
