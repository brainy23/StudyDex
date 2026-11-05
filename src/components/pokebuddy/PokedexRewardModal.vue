<script setup>
// Production version of PokeBuddy's remaining-XP / gift dialog. All ownership,
// eligibility, pack draws and XP transfers are validated and saved by Supabase.
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { getStudyPokemonRewards, resolveStudyPokemonReward } from '../../services/studyPokemonRewards'
import { resolveStudyImage } from '../../services/studyService'

const props = defineProps({ userId: { type: String, default: null } })
const emit = defineEmits(['saved'])
const dialog = ref(null)
const state = ref(null)
const busy = ref(false)
const error = ref('')
const notice = ref('')
let version = 0
let disposed = false
function isMaxLevel(pokemon) {
  return pokemon.level === 'MAX' || pokemon.evolution_stage === 'MAX' ||
    pokemon.is_max_evolution === true || pokemon.isMaxEvolution === true
}
const recipients = computed(() => (state.value?.pokemon || []).filter(p => !isMaxLevel(p)))
const pendingXP = computed(() => state.value?.pending_xp || 0)
const needsChoice = computed(() => pendingXP.value > 0 || state.value?.pokemon?.some(p => p.is_selected && isMaxLevel(p)))

async function openIfNeeded() {
  if (!props.userId || busy.value || disposed) return
  const owner = props.userId
  const requestVersion = version
  busy.value = true
  error.value = ''
  try {
    const result = await getStudyPokemonRewards(owner)
    if (disposed || requestVersion !== version) return
    state.value = result
    notice.value = ''
    if (needsChoice.value) {
      await nextTick()
      if (!disposed && requestVersion === version && !dialog.value?.open) dialog.value?.showModal()
    }
  } catch (cause) {
    if (!disposed && requestVersion === version) {
      error.value = cause.message || 'Your Pokédex could not load.'
      await nextTick()
      dialog.value?.showModal()
    }
  } finally { if (requestVersion === version) busy.value = false }
}
async function choose(choice) {
  if (busy.value) return
  const owner = props.userId
  const requestVersion = version
  busy.value = true
  error.value = ''
  try {
    const result = await resolveStudyPokemonReward(owner, choice)
    if (disposed || requestVersion !== version) return
    state.value = result
    const buddy = result.pokemon.find(p => p.is_selected)
    notice.value = `${buddy?.name || 'Your Pokémon'} is now your active buddy. Your XP has been saved.`
    emit('saved')
  } catch (cause) {
    if (!disposed && requestVersion === version) error.value = cause.message || 'Your reward could not be saved. Please retry.'
  } finally { if (requestVersion === version) busy.value = false }
}
function close() { if (!busy.value) dialog.value?.close() }
watch(() => props.userId, () => {
  version++
  busy.value = false
  state.value = null
  notice.value = ''
  error.value = ''
  dialog.value?.close()
  void openIfNeeded()
}, { immediate: true })
onBeforeUnmount(() => { disposed = true; version++; dialog.value?.close() })
defineExpose({ openIfNeeded })
</script>

<template>
  <Teleport to="body">
    <dialog ref="dialog" class="gift-dialog" aria-labelledby="pokedex-reward-title" @cancel.prevent="close">
      <button type="button" class="gift-close" aria-label="Close reward popup" :disabled="busy" @click="close">×</button>
      <span class="gift-emblem" aria-hidden="true">🎁</span>
      <p class="gift-brand">Trainer Rewards</p>
      <h2 id="pokedex-reward-title">Keep your journey growing</h2>
      <div role="status" aria-live="polite" :aria-busy="busy">
        <p v-if="busy">Updating your Pokédex…</p>
        <p v-if="notice">{{ notice }}</p>
        <p v-if="error" class="gift-error" role="alert">{{ error }}</p>
        <div v-if="pendingXP > 0" class="gift-xp"><strong>{{ pendingXP }} XP</strong><span>waiting to be transferred</span></div>
      </div>
      <template v-if="needsChoice && recipients.length">
        <p>Choose a Pokémon to receive XP and become your active buddy.</p>
        <div class="gift-choices">
          <button v-for="pokemon in recipients" :key="pokemon.owned_id" type="button" :disabled="busy" @click="choose({ ownedId: pokemon.owned_id })">
            <img v-if="pokemon.sprite_url" :src="resolveStudyImage(pokemon.sprite_url)" alt="" />
            {{ pokemon.name }} · Lv. {{ pokemon.level ?? 1 }} · {{ pokemon.xp }} XP →
          </button>
        </div>
      </template>
      <template v-else-if="needsChoice && state?.recovery_pack_id">
        <p>All your Pokémon are MAX! Open a Poképack for a new buddy and transfer your remaining XP.</p>
        <button type="button" class="gift-action" :disabled="busy" @click="choose({ packId: state.recovery_pack_id })">Open Poképack 🎁</button>
      </template>
      <p v-else-if="needsChoice">There are no eligible new Pokémon left. Your remaining XP is saved for later.</p>
      <button v-if="error" type="button" class="gift-action" :disabled="busy" @click="openIfNeeded">Refresh Pokédex</button>
      <button type="button" class="gift-action secondary" :disabled="busy" @click="close">{{ needsChoice ? 'Decide later' : 'Continue' }}</button>
    </dialog>
  </Teleport>
</template>

<style scoped>
.gift-dialog { position: relative; width: min(440px, calc(100vw - 32px)); max-height: calc(100dvh - 32px); overflow: auto; margin: auto; padding: 28px; border: 2px solid #e7dcc0; border-radius: 26px; background: #fffdf6; color: #26365b; font: 16px/1.5 'Fredoka', sans-serif; text-align: center; box-shadow: 0 20px 70px #15234450; }
.gift-dialog::backdrop { background: #15234499; backdrop-filter: blur(4px); }
.gift-dialog * { box-sizing: border-box; }
.gift-dialog h2 { font-size: 26px; margin: 8px 0 16px; }
.gift-emblem { display: block; font-size: 42px; }
.gift-brand { color: #8b7c50; }
.gift-close { position: absolute; top: 10px; right: 10px; width: 40px; height: 40px; border: 0; border-radius: 50%; background: #f5f0e3; color: #26365b; font-size: 26px; cursor: pointer; }
.gift-xp { display: flex; flex-direction: column; padding: 14px; margin: 14px 0; border-radius: 16px; background: #f0f7e9; color: #40754b; }
.gift-xp strong { font-size: 30px; }
.gift-choices { display: grid; gap: 8px; max-height: 220px; overflow: auto; }
.gift-choices img { width: 48px; height: 48px; object-fit: contain; vertical-align: middle; }
.gift-choices button, .gift-action { width: 100%; min-height: 44px; padding: 10px 16px; border: 1px solid #dfbd47; border-radius: 12px; background: #ffde59; color: #634f1f; font: inherit; cursor: pointer; }
.gift-action { margin-top: 12px; }
.gift-action.secondary { background: #fff; border-color: #e6dfcc; color: #64718a; }
.gift-dialog button:disabled { opacity: .6; cursor: wait; }
.gift-dialog button:focus-visible { outline: 3px solid #416d9d; outline-offset: 2px; }
.gift-error { color: #b42318; }
</style>
