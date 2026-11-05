import { getSupabase } from './supabase'

let dexToUuid = null
let uuidToDex = null

// Loads the pokemon table once and caches the mapping
export async function loadPokemonMap() {
  if (dexToUuid) return
  const { data, error } = await getSupabase()
    .from('pokemon')
    .select('id, pokeapi_id')
  if (error) throw error

  dexToUuid = new Map(data.map(p => [p.pokeapi_id, p.id]))
  uuidToDex = new Map(data.map(p => [p.id, p.pokeapi_id]))
}

export const uuidFromDex = (dex) => dexToUuid?.get(dex)
export const dexFromUuid = (uuid) => uuidToDex?.get(uuid)