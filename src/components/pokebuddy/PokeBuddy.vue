<script setup>
import axios from 'axios'
import { computed, nextTick, onMounted, onBeforeUnmount, ref, watch } from 'vue'
import PokeSprite from './PokeSprite.vue'

const API = 'https://pokeapi.co/api/v2'
const MAX_XP = 100

// =========================================
// SAMPLE USER
// =========================================

const user = ref({
  name: 'Jake',
  avatar_gender: 'male',
  active_pokemon_species: 'Pichu',

  pokemons: [
    {
      id: 172,
      originalSpeciesId: 172,
      name: 'Pichu',
      species: 'Pichu',
      evolution_stage: 0,
      xp: 90,
      isDefeated: false,
      animated_img: '',
      static_img: ''
    },
    {
      id: 4,
      originalSpeciesId: 4,
      name: 'Charmander',
      species: 'Charmander',
      evolution_stage: 0,
      xp: 60,
      isDefeated: false,
      animated_img: '',
      static_img: ''
    }
  ]
})

const activePokemon = computed(() =>
  user.value.pokemons.find(
    pokemon => pokemon.species === user.value.active_pokemon_species
  )
)

const avatarImage = computed(() =>
  `/assets/${user.value.avatar_gender}.png`
)

// =========================================
// PAGE STATE
// =========================================

const buddyRef = ref(null)

const loadingImages = ref(false)
const addingPokemon = ref(false)
const processingReward = ref(false)

const notice = ref('')
const pageError = ref('')
const lastReward = ref(0)
const unallocatedXP = ref(0)
const rewardDialog = ref(null)
const rewardOpen = ref(false)
const rewardPending = ref(false)
const collectionExhausted = ref(false)
const giftPokemon = ref(null)
let pageDisposed = false

async function openRewardPopup() {
  rewardOpen.value = true
  await nextTick()
  if (!pageDisposed && rewardDialog.value && !rewardDialog.value.open) {
    rewardDialog.value.showModal()
  }
}
function closeRewardPopup() {
  if (controlsLocked.value) return
  rewardDialog.value?.close()
  rewardOpen.value = false
}
onBeforeUnmount(() => { pageDisposed = true; rewardDialog.value?.close() })


const controlsLocked = computed(() =>
  loadingImages.value ||
  addingPokemon.value ||
  processingReward.value ||
  Boolean(buddyRef.value?.busy)
)

const xpRecipients = computed(() =>
  user.value.pokemons.filter(
    pokemon => pokemon.evolution_stage !== 'MAX'
  )
)

watch([unallocatedXP, controlsLocked], ([amount, locked]) => {
  if (amount > 0 && !locked && rewardPending.value) {
    rewardPending.value = false
    openRewardPopup()
  }
})

// =========================================
// COLLECTION IMAGES
// Evolution requests belong to PokeSprite.
// These requests load collection images/new Pokémon.
// =========================================

const apiCache = new Map()

async function request(url) {
  if (!apiCache.has(url)) {
    apiCache.set(
      url,
      axios.get(url, { timeout: 15000 })
        .then(response => response.data)
        .catch(error => {
          apiCache.delete(url)
          throw error
        })
    )
  }

  return apiCache.get(url)
}

function getImages(data) {
  const staticImage = data.sprites.front_default || ''

  return {
    static_img: staticImage,
    animated_img:
      data.sprites.versions?.['generation-v']?.['black-white']
        ?.animated?.front_default || staticImage
  }
}

async function loadCollectionImages() {
  if (loadingImages.value) return

  loadingImages.value = true
  pageError.value = ''

  try {
    const results = await Promise.allSettled(
      user.value.pokemons.map(async pokemon => {
        const requestedId = pokemon.id
        const data = await request(`${API}/pokemon/${requestedId}/`)

        // Avoid overwriting images if the Pokémon changed form.
        if (pokemon.id === requestedId) {
          Object.assign(pokemon, getImages(data))
        }
      })
    )

    if (results.some(result => result.status === 'rejected')) {
      pageError.value = 'Some Pokémon images could not load. Please retry.'
    }
  } finally {
    loadingImages.value = false
  }
}

onMounted(loadCollectionImages)

// =========================================
// AVATAR AND ACTIVE BUDDY
// =========================================

function selectAvatar(gender) {
  user.value.avatar_gender = gender
}

function selectPokemon(pokemon) {
  if (controlsLocked.value) return

  user.value.active_pokemon_species = pokemon.species
  notice.value = ''
}

// =========================================
// RECEIVE UPDATES FROM POKEMONBUDDY
// =========================================

function savePokemonUpdate({ pokemon, changes }) {
  // Update the same owned record.
  // Both PokeSprite and the Pokédex read this record.
  if (user.value.pokemons.includes(pokemon)) {
    Object.assign(pokemon, changes)
  }
}

function keepOverflowXP({ amount }) {
  unallocatedXP.value += amount
  rewardPending.value = true
  // Open after the buddy's animation finishes.

}

// =========================================
// TEST XP REWARDS AND PENALTIES
// No evolution calculations belong here.
// =========================================

async function giveXP(amount) {
  if (
    controlsLocked.value ||
    !activePokemon.value ||
    !buddyRef.value
  ) {
    return { accepted: false }
  }

  processingReward.value = true
  notice.value = ''

  try {
    const result = await buddyRef.value.addXP(amount)

    if (result.accepted) {
      lastReward.value = amount
    }

    return result
  } finally {
    processingReward.value = false
  }
}

function giveRandomXP() {
  const amount = Math.floor(Math.random() * 41) + 10
  return giveXP(amount)
}

async function removeXP() {
  if (
    controlsLocked.value ||
    !activePokemon.value ||
    activePokemon.value.isDefeated ||
    !buddyRef.value
  ) return

  processingReward.value = true
  notice.value = ''

  try {
    await buddyRef.value.subtractXP(10)
  } finally {
    processingReward.value = false
  }
}

// =========================================
// TRANSFER LEFTOVER XP
// PokeSprite still calculates the result.
// =========================================

async function transferXP(pokemon) {
  if (
    controlsLocked.value ||
    unallocatedXP.value <= 0 ||
    pokemon.evolution_stage === 'MAX'
  ) return

  processingReward.value = true

  const amount = unallocatedXP.value
  pageError.value = ''

  try {
    user.value.active_pokemon_species = pokemon.species

    // Allow the component to receive the new active Pokémon.
    await nextTick()

    if (!buddyRef.value) return

    const result = await buddyRef.value.addXP(amount)

    if (result.accepted) {
      // Any new overflow has already been added by keepOverflowXP().
      // Deduct only the amount we attempted to transfer.
      unallocatedXP.value -= amount
      if (unallocatedXP.value === 0) notice.value = `Your remaining XP was transferred to ${pokemon.name}!`
    } else {
      pageError.value = 'XP could not be transferred. Your remaining XP is unchanged. Choose a Pokémon to retry.'
    }
  } finally {
    processingReward.value = false
  }
}

// =========================================
// RANDOM POKÉMON / MAXED COLLECTION GIFT
// =========================================

async function addRandomPokemon(asGift = false) {
  if (controlsLocked.value) return

  if (
    asGift &&
    (unallocatedXP.value <= 0 || xpRecipients.value.length > 0)
  ) return

  addingPokemon.value = true
  pageError.value = ''
  notice.value = ''
  giftPokemon.value = null
  await openRewardPopup()

  let newPokemon = null

  try {
    const ownedIds = new Set(
      user.value.pokemons.map(pokemon => pokemon.originalSpeciesId)
    )

    // Preserve your original rule:
    // Gen 1, unevolved species, not already owned, excluding Ditto.
    const candidates = Array.from(
      { length: 151 },
      (_, index) => index + 1
    ).filter(id => id !== 132 && !ownedIds.has(id))

    while (candidates.length) {
      const index = Math.floor(Math.random() * candidates.length)
      const [id] = candidates.splice(index, 1)

      const species = await request(`${API}/pokemon-species/${id}/`)

      if (species.evolves_from_species !== null) continue

      const data = await request(`${API}/pokemon/${id}/`)
      const name = data.name.charAt(0).toUpperCase() + data.name.slice(1)

      newPokemon = {
        id: data.id,
        originalSpeciesId: data.id,
        name,
        species: name,
        evolution_stage: 0,
        xp: 0,
        isDefeated: false,
        ...getImages(data)
      }

      if (pageDisposed) return
      user.value.pokemons.push(newPokemon)
      giftPokemon.value = newPokemon
      notice.value = `${name} joined your Pokédex! 🎉`
      break
    }

    if (!newPokemon) {
      collectionExhausted.value = true
      notice.value =
        'No eligible unowned Pokémon remain. Any leftover XP is kept.'
    }
  } catch (error) {
    console.error('Unable to add Pokémon:', error)
    pageError.value = 'Unable to load a new Pokémon. Please try again.'
  } finally {
    addingPokemon.value = false
  }

  // A gift becomes the new buddy and receives the saved XP.
  // If applying XP fails, the Pokémon and saved XP remain available.
  if (asGift && newPokemon) {
    await transferXP(newPokemon)
    if (unallocatedXP.value === 0) notice.value = `${newPokemon.name} joined your Pokédex and received your leftover XP!`
  }
}
</script>

<template>
  <main class="trainer-page">
    <div class="page-content">

      <div class="page-layout">
        <!-- AVATAR AND ACTIVE BUDDY -->
        <section class="trainer-panel">
          <div class="avatar-panel">
            <h2>{{ user.name }}'s Avatar</h2>
            <p>Selected style: {{ user.avatar_gender }}</p>

            <img
              :src="avatarImage"
              alt="Trainer avatar"
              class="avatar-image"
            />

            <div class="button-row">
              <button
                type="button"
                class="btn btn-warning"
                @click="selectAvatar('female')"
              >
                Female
              </button>

              <button
                type="button"
                class="btn btn-warning"
                @click="selectAvatar('male')"
              >
                Male
              </button>
            </div>
          </div>

          <div class="buddy-panel">
            <PokeSprite
              ref="buddyRef"
              :active-pokemon="activePokemon"
              @update-pokemon="savePokemonUpdate"
              @xp-overflow="keepOverflowXP"
            />

            <!-- Testing controls belong to the parent -->
            <div class="testing-panel">
              <p class="testing-label">XP testing</p>

              <div class="button-row">
                <button
                  type="button"
                  class="btn btn-success"
                  :disabled="controlsLocked || !activePokemon"
                  @click="giveXP(10)"
                >
                  +10 XP
                </button>

                <button
                  type="button"
                  class="btn btn-success"
                  :disabled="controlsLocked || !activePokemon"
                  @click="giveXP(50)"
                >
                  +50 XP
                </button>

                <button
                  type="button"
                  class="btn btn-outline-success"
                  :disabled="controlsLocked || !activePokemon"
                  @click="giveRandomXP"
                >
                  🎲 +10–50 XP
                </button>

                <button
                  type="button"
                  class="btn btn-danger"
                  :disabled="
                    controlsLocked ||
                    !activePokemon ||
                    activePokemon?.isDefeated
                  "
                  @click="removeXP"
                >
                  −10 XP
                </button>
              </div>

              <p v-if="controlsLocked" class="small mt-2" role="status">
                {{
                  loadingImages
                    ? 'Loading Pokémon…'
                    : addingPokemon
                      ? 'Finding a Pokémon…'
                      : 'Updating Pokémon…'
                }}
              </p>

              <p v-if="lastReward" class="small mt-2">
                Last accepted reward: +{{ lastReward }} XP
              </p>
            </div>
          </div>
        </section>

        <!-- COLLECTION -->
        <section class="collection-panel">
          <div class="collection-header">
            <h2>My Pokédex</h2>
            <span>{{ user.pokemons.length }} Pokémon</span>
          </div>

          <div class="pokemon-grid">
            <article
              v-for="pokemon in user.pokemons"
              :key="pokemon.originalSpeciesId"
              class="pokemon-card"
              :class="{
                selected:
                  pokemon.species === user.active_pokemon_species
              }"
            >
              <img
                v-if="pokemon.static_img"
                :src="pokemon.static_img"
                :alt="pokemon.name"
              />

              <div v-else class="image-placeholder">…</div>

              <h3>{{ pokemon.name }}</h3>

              <p>Stage: {{ pokemon.evolution_stage }}</p>

              <p>
                {{
                  pokemon.evolution_stage === 'MAX'
                    ? 'Maximum evolution'
                    : `${pokemon.xp} / ${MAX_XP} XP`
                }}
              </p>

              <p v-if="pokemon.isDefeated" class="text-danger">
                Defeated
              </p>

              <button
                type="button"
                class="btn btn-warning w-100 mt-2"
                :disabled="
                  controlsLocked ||
                  pokemon.species === user.active_pokemon_species
                "
                @click="selectPokemon(pokemon)"
              >
                {{
                  pokemon.species === user.active_pokemon_species
                    ? 'Active buddy'
                    : 'Make active'
                }}
              </button>
            </article>
          </div>

          <button
            type="button"
            class="btn btn-warning"
            :disabled="controlsLocked"
            @click="addRandomPokemon(false)"
          >
            {{ addingPokemon ? 'Finding Pokémon…' : '🎲 Add Random Pokémon' }}
          </button>

          <p v-if="notice" class="notice" role="status">
            {{ notice }}
          </p>

          <div v-if="pageError" class="alert alert-warning mb-0" role="alert">
            {{ pageError }}

            <button
              type="button"
              class="btn btn-sm btn-outline-dark mt-2 d-block"
              :disabled="controlsLocked"
              @click="loadCollectionImages"
            >
              Reload collection images
            </button>
          </div>
        </section>

        <button v-if="unallocatedXP > 0" type="button" class="btn btn-warning"
          :disabled="controlsLocked" @click="openRewardPopup">
          View {{ unallocatedXP }} remaining XP 🎁
        </button>

        <Teleport to="body">
          <dialog ref="rewardDialog" class="gift-dialog" aria-labelledby="gift-title"
            @cancel.prevent="closeRewardPopup" @close="rewardOpen = false">
            <button type="button" class="gift-close" aria-label="Close reward popup"
              :disabled="controlsLocked" @click="closeRewardPopup">×</button>
            <span class="gift-emblem" aria-hidden="true">🎁</span>
            <p class="gift-brand">Trainer Rewards</p>
            <h2 id="gift-title">{{ collectionExhausted ? 'Your Pokédex is complete!' : giftPokemon ? 'Meet your new buddy!' : 'Keep your journey growing' }}</h2>
            <div role="status" aria-live="polite" :aria-busy="controlsLocked">
              <img v-if="giftPokemon" class="gift-sprite" :src="giftPokemon.animated_img || giftPokemon.static_img" :alt="giftPokemon.name" />
              <h3 v-if="giftPokemon">{{ giftPokemon.name }}</h3>
              <p v-if="controlsLocked">{{ addingPokemon ? 'Finding your new Pokémon…' : 'Updating your buddy…' }}</p>
              <p v-else-if="notice">{{ notice }}</p>
              <p v-if="pageError" class="gift-error" role="alert">{{ pageError }}</p>
              <div v-if="unallocatedXP > 0" class="gift-xp"><strong>{{ unallocatedXP }} XP</strong><span>waiting to be transferred</span></div>
            </div>
            <template v-if="unallocatedXP > 0 && xpRecipients.length">
              <p>Choose a Pokémon to receive the remaining XP.</p>
              <div class="gift-choices">
                <button v-for="pokemon in xpRecipients" :key="pokemon.originalSpeciesId"
                  type="button" :disabled="controlsLocked" @click="transferXP(pokemon)">
                  {{ pokemon.name }} →
                </button>
              </div>
            </template>
            <template v-else-if="unallocatedXP > 0 && !collectionExhausted">
              <p>All your Pokémon are MAX! Open a gift for a new buddy and transfer your remaining XP.</p>
              <button type="button" class="gift-action" :disabled="controlsLocked" @click="addRandomPokemon(true)">
                {{ addingPokemon ? 'Opening…' : pageError ? 'Retry opening gift' : 'Open gift 🎁' }}
              </button>
            </template>
            <p v-else-if="collectionExhausted">There are no eligible new Pokémon left. Your remaining XP stays available on this page.</p>
            <button type="button" class="gift-action secondary" :disabled="controlsLocked" @click="closeRewardPopup">
              {{ unallocatedXP > 0 ? 'Decide later' : 'Continue' }}
            </button>
          </dialog>
        </Teleport>
      </div>
    </div>
  </main>
</template>

<style scoped>
.trainer-page {
  min-height: 100dvh;
  padding: 16px;
  background: #ffd000;
  color: #30304b;
}

.page-content {
  min-height: calc(100dvh - 32px);
  padding: 24px;
  background:
    url('/backgrounds/morning_homepage.png')
    center / cover no-repeat;

  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 24px;
}

.page-layout {
  display: grid;
  grid-template-columns: minmax(0, 1.2fr) minmax(0, 1fr);
  align-items: start;
  gap: 24px;
  width: 100%;
  max-width: 1250px;
}

.trainer-panel,
.collection-panel,
.overflow-panel {
  min-width: 0;
  padding: 22px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.9);
}

.trainer-panel {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  align-items: start;
  gap: 16px;
}

.avatar-panel,
.buddy-panel {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  min-width: 0;
  text-align: center;
}

.avatar-panel {
  padding: 12px;
}

h2 {
  margin: 0;
  font-size: clamp(18px, 1.7vw, 24px);
  font-weight: 900;
}

p {
  margin: 0;
  font-size: 13px;
  line-height: 1.6;
}

.avatar-image {
  width: 100%;
  height: 220px;
  object-fit: contain;
  image-rendering: pixelated;
}

.button-row {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-wrap: wrap;
  gap: 8px;
}

.btn {
  font-size: 13px;
  font-weight: 700;
}

.testing-panel {
  width: 100%;
  padding: 14px;
  border: 1px dashed #d9c37a;
  border-radius: 12px;
  background: #fff9e8;
}

.testing-label {
  margin-bottom: 10px;
  color: #79621c;
  font-weight: 800;
}

.collection-panel {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.collection-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
}

.collection-header span {
  font-size: 13px;
  color: #697386;
}

.pokemon-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(135px, 1fr));
  gap: 12px;
  max-height: 65vh;
  overflow-y: auto;
  padding: 2px;
}

.pokemon-card {
  min-width: 0;
  padding: 12px;
  border: 2px solid #eee2aa;
  border-radius: 12px;
  background: #fff;
  text-align: center;
}

.pokemon-card.selected {
  border-color: #e9b800;
  background: #fffbea;
}

.pokemon-card img,
.image-placeholder {
  width: 100%;
  height: 100px;
  object-fit: contain;
  image-rendering: pixelated;
}

.image-placeholder {
  display: grid;
  place-items: center;
  color: #697386;
}

.pokemon-card h3 {
  margin: 8px 0;
  font-size: 16px;
  font-weight: 800;
}

.pokemon-card p {
  margin: 4px 0;
  font-size: 12px;
}

.notice {
  padding: 12px;
  border-radius: 10px;
  background: #e9f7ed;
  color: #246b40;
}

.overflow-panel {
  grid-column: 1 / -1;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 14px;
  border: 2px solid #efd16a;
  background: #fff9e8;
}

button:disabled {
  cursor: not-allowed;
}

@media (max-width: 950px) {
  .page-layout {
    grid-template-columns: minmax(0, 1fr);
  }
}

@media (max-width: 540px) {
  .trainer-page {
    padding: 8px;
  }

  .page-content {
    min-height: calc(100dvh - 16px);
    padding: 12px;
  }

  .trainer-panel {
    grid-template-columns: minmax(0, 1fr);
  }

  .trainer-panel,
  .collection-panel,
  .overflow-panel {
    padding: 16px;
  }
}

.gift-dialog { position: relative; width: min(440px, calc(100vw - 32px)); max-height: calc(100dvh - 32px); overflow: auto; margin: auto; padding: 28px; border: 2px solid #e7dcc0; border-radius: 26px; background: #fffdf6; color: #26365b; font: 16px/1.5 'Fredoka', sans-serif; text-align: center; box-shadow: 0 20px 70px #15234450; }
.gift-dialog::backdrop { background: #15234499; backdrop-filter: blur(4px); }
.gift-dialog * { box-sizing: border-box; }
.gift-dialog h2 { font-size: 26px; margin: 8px 0 16px; }
.gift-dialog h3 { font-size: 20px; }
.gift-emblem { display: block; font-size: 42px; }
.gift-brand { font-size: var(--sd-text-small, 14px); font-family: var(--sd-font-body); letter-spacing: 0; color: #8b7c50; }
.gift-close { position: absolute; top: 10px; right: 10px; width: 40px; height: 40px; border: 0; border-radius: 50%; background: #f5f0e3; color: #26365b; font-size: 26px; cursor: pointer; }
.gift-sprite { height: 88px; max-width: 100%; object-fit: contain; image-rendering: pixelated; }
.gift-xp { display: flex; flex-direction: column; padding: 14px; margin: 14px 0; border-radius: 16px; background: #f0f7e9; color: #40754b; }
.gift-xp strong { font-size: 30px; }
.gift-choices { display: grid; gap: 8px; max-height: 220px; overflow: auto; }
.gift-choices button, .gift-action { width: 100%; min-height: 44px; padding: 10px 16px; border: 1px solid #dfbd47; border-radius: 12px; background: #ffde59; color: #634f1f; font: inherit; cursor: pointer; }
.gift-action { margin-top: 12px; }
.gift-action.secondary { background: #fff; border-color: #e6dfcc; color: #64718a; }
.gift-dialog button:disabled { opacity: .6; cursor: wait; }
.gift-dialog button:focus-visible { outline: 3px solid #416d9d; outline-offset: 2px; }
.gift-error { color: #b42318; }

</style>
