import { checkedRpc, activityChanged } from './backendClient'

export const getStudyPokemonRewards = userId => checkedRpc('get_study_pokemon_rewards', undefined, userId)
export async function resolveStudyPokemonReward(userId, { ownedId = null, packId = null }) {
  const result = await checkedRpc('resolve_study_pokemon_reward', {
    p_owned_id: ownedId, p_pack_id: packId,
  }, userId)
  activityChanged({ xp: { pokemonRecordId: result.pokemon.find(p => p.is_selected)?.owned_id } })
  return result
}
