import { getSupabase } from '../lib/supabase'
import { planPokemonXp } from './pokemonProgression'
import { resolveStudyImage } from './studyService'

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

// The database stores the final state atomically; all progression rules run here.
export async function awardExperience(event) {
  toRewardPayload(event)
  const client = getSupabase()
  const { data: previous, error: previousError } = await client.from('studydex_xp_events')
    .select('pokemon_record_id, reward_type, result').eq('event_id', event.id).maybeSingle()
  if (previousError) throw previousError
  if (previous) {
    if (previous.pokemon_record_id !== event.pokemonId || previous.reward_type !== event.type) {
      throw new Error('This activity was already used for another reward.')
    }
    return { ...previous.result, duplicate: true }
  }

  const { data: buddy, error: buddyError } = await client.from('user_pokemon')
    .select('id, user_id, pokemon_id, xp, level, is_defeated, pokemon:pokemon!user_pokemon_pokemon_id_fkey(id, name, sprite_url)')
    .eq('id', event.pokemonId).single()
  if (buddyError) throw buddyError
  if (!buddy?.pokemon) throw new Error('Your selected Pokémon could not load.')
  let delta
  switch (event.type) {
    case 'boss': delta = event.health === 0 ? 50 : -50; break
    case 'timer': delta = await getRewardedTimerCount(buddy.user_id) < 4 ? 10 : 0; break
    case 'flashcards': delta = 10; break
    case 'quiz': throw new Error('Quiz rewards are not configured yet.')
  }
  const originalPokemon = {
    name: buddy.pokemon.name, ownedId: buddy.id, xp: buddy.xp, level: buddy.level,
    is_defeated: buddy.is_defeated,
    static_img: resolveStudyImage(buddy.pokemon.sprite_url),
  }
  const plan = await planPokemonXp(originalPokemon, { delta })
  const result = {
    pokemonRecordId: buddy.id, pokemonName: plan.result.name,
    delta, appliedDelta: plan.appliedDelta, xp: plan.result.xp, level: plan.result.level,
    rewardType: event.type, duplicate: false,
    originalPokemon, pokemon: plan.result, evolutions: plan.evolutions,
    evolved: plan.evolved, devolved: plan.devolved,
    reachedMaxEvolution: plan.reachedMaxEvolution, overflowXP: plan.overflowXP,
  }
  const { data, error } = await client.rpc('save_studydex_progression', {
    p_event_id: event.id, p_pokemon_record_id: buddy.id, p_reward_type: event.type,
    p_expected: { pokemon_id: buddy.pokemon_id, xp: buddy.xp, level: buddy.level },
    p_result: result,
  })
  if (error) throw error
  try {
    window.dispatchEvent(new CustomEvent('studydex:pokemon-xp', { detail: data }))
  } catch (cause) {
    console.warn('Progress saved; Pokémon refresh notification failed.', cause)
  }
  return data
}
