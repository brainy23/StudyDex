import { getSupabase } from '../lib/supabase'
import { isPackId } from '../utils/pendingReward'
import { TRAINING_XP_CAP } from '../data/pokemonProgression'

async function ownedRpc(name, args) {
  const client = getSupabase()
  const { data: auth, error: authError } = await client.auth.getUser()
  if (authError || !auth?.user) throw new Error('Please log in to see your Pokémon.')
  const { data, error } = name === 'get_user_pokemon'
    ? await client.rpc(name, {}, { get: true })
    : await client.rpc(name, args)
  if (error) throw new Error('Your Pokémon could not load. Please try again.', { cause: error })
  const { data: current, error: changed } = await client.auth.getUser()
  if (changed || current?.user?.id !== auth.user.id || data?.user_id !== auth.user.id) {
    throw new Error('Your account changed. Please log in again.')
  }
  if (!Array.isArray(data.pokemon) || typeof data.starter_claimed !== 'boolean' ||
      !Number.isSafeInteger(data.pending_xp) || data.pending_xp < 0 ||
      data.pokemon.some(p => !isPackId(p.owned_id) || !Number.isSafeInteger(p.pokeapi_id) ||
        p.pokeapi_id < 1 || !Number.isSafeInteger(p.original_pokeapi_id) || p.original_pokeapi_id < 1 ||
        typeof p.name !== 'string' || !p.name.trim() || !Number.isSafeInteger(p.level) || p.level < 1 || !Number.isSafeInteger(p.xp) || p.xp < 0 || p.xp > TRAINING_XP_CAP ||
        ![1, 2, 3].includes(p.stage_count) || typeof p.is_selected !== 'boolean') ||
      new Set(data.pokemon.map(p => p.owned_id)).size !== data.pokemon.length ||
      data.pokemon.filter(p => p.is_selected).length > 1) {
    throw new Error('Your Pokémon collection could not be checked. Please try again.')
  }
  return {
    userId: data.user_id, starterClaimed: data.starter_claimed, pendingXp: data.pending_xp,
    pokemon: data.pokemon.map(p => ({
      ownedId: p.owned_id, pokemon_id: p.pokemon_id, id: p.pokeapi_id,
      originalSpeciesId: p.original_pokeapi_id,
      name: p.name.charAt(0).toUpperCase() + p.name.slice(1),
      xp: p.xp, level: p.level, stageCount: p.stage_count,
      evolution_stage: p.fully_trained ? 'MAX' : p.evolution_stage,
      stageBeforeMax: p.evolution_stage,
      is_selected: p.is_selected, is_defeated: p.is_defeated, isDefeated: p.is_defeated,
      static_img: p.sprite_url || '', obtained_at: p.obtained_at,
    })),
  }
}

export const getOwnedPokemon = () => ownedRpc('get_user_pokemon')

export async function selectOwnedPokemon(ownedId) {
  if (!isPackId(ownedId)) throw new Error('Choose a Pokémon from your collection.')
  const result = await ownedRpc('select_user_pokemon', { p_owned_id: ownedId })
  window.dispatchEvent(new Event('studydex:rewards-changed'))
  return result
}
