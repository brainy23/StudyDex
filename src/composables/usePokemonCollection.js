import { computed, onMounted, onUnmounted, readonly, ref } from 'vue'
import { getOwnedPokemon, selectOwnedPokemon } from '../services/pokemonService'
import { watchRewardAccount } from '../services/rewardsService'

const pokemon = ref([])
const userId = ref(null)
const starterClaimed = ref(null)
const pendingXp = ref(0)
const loading = ref(false)
const saving = ref(false)
const error = ref('')
let consumers = 0
let generation = 0
let subscription
let scheduled

function clear() {
  generation++
  pokemon.value = []
  starterClaimed.value = null
  pendingXp.value = 0
  loading.value = false
  saving.value = false
  error.value = ''
}
function apply(data) {
  userId.value = data.userId
  pokemon.value = data.pokemon
  starterClaimed.value = data.starterClaimed
  pendingXp.value = data.pendingXp
  error.value = ''
}
async function refresh() {
  const request = ++generation
  loading.value = true
  try {
    const data = await getOwnedPokemon()
    if (consumers && request === generation) apply(data)
  } catch (failure) {
    if (request === generation && consumers) {
      pokemon.value = []
      starterClaimed.value = null
      error.value = failure.message || 'Your Pokémon could not load.'
    }
  } finally { if (request === generation) loading.value = false }
}
function visibleRefresh() {
  if (document.visibilityState !== 'hidden' && !saving.value) void refresh()
}
async function select(owned) {
  if (saving.value || loading.value || !pokemon.value.some(p => p.ownedId === owned.ownedId)) return
  saving.value = true
  const request = ++generation
  try {
    const result = await selectOwnedPokemon(owned.ownedId)
    if (request === generation && consumers) apply(result)
  } catch (failure) {
    if (request === generation && consumers) error.value = failure.message
  } finally { if (request === generation) saving.value = false }
}
function start() {
  try {
    subscription = watchRewardAccount((event, nextId) => {
      if (event === 'SIGNED_OUT' || nextId !== userId.value) { clear(); userId.value = nextId }
      clearTimeout(scheduled)
      if (nextId) scheduled = setTimeout(visibleRefresh, 0)
    })
  } catch { /* refresh reports configuration/auth failure. */ }
  void refresh()
  window.addEventListener('focus', visibleRefresh)
  window.addEventListener('studydex:pokemon-changed', visibleRefresh)
  document.addEventListener('visibilitychange', visibleRefresh)
}
function stop() {
  clearTimeout(scheduled)
  subscription?.unsubscribe()
  subscription = null
  window.removeEventListener('focus', visibleRefresh)
  window.removeEventListener('studydex:pokemon-changed', visibleRefresh)
  document.removeEventListener('visibilitychange', visibleRefresh)
  clear()
  userId.value = null
}
export function usePokemonCollection() {
  onMounted(() => { if (++consumers === 1) start() })
  onUnmounted(() => { if (--consumers === 0) stop() })
  return {
    pokemon: readonly(pokemon), starterClaimed: readonly(starterClaimed), pendingXp: readonly(pendingXp),
    loading: readonly(loading), saving: readonly(saving), error: readonly(error), refresh, select,
    active: computed(() => pokemon.value.find(p => p.is_selected) || null),
  }
}
