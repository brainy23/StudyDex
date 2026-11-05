import { ref } from 'vue'
import { getSupabase } from '../lib/supabase'
import { dexFromUuid, loadPokemonMap } from '../lib/pokemon'

const activeId = ref(Number(localStorage.getItem('activePokemonId')) || null)

export function useActivePokemon() {
  function setActive(id) {
    activeId.value = id
    localStorage.setItem('activePokemonId', String(id))
  }

  async function loadActive() {
    const supabase = getSupabase()
    await loadPokemonMap()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data, error } = await supabase
      .from('user_pokemon')
      .select('pokemon_id')
      .eq('user_id', user.id)
      .eq('is_selected', true)
      .maybeSingle()

    if (error) {
      console.error('Could not load active Pokémon', error)
      return
    }
    if (data) setActive(dexFromUuid(data.pokemon_id))
  }

  return { activeId, setActive, loadActive }
}