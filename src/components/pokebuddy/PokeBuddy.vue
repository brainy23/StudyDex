

<script setup>
import axios from 'axios'
import { ref, computed, onMounted, onUnmounted } from 'vue'
import NavBar from '../common/NavBar.vue'

// =====================================================
// CONFIGURATION
// =====================================================

const POKEAPI = 'https://pokeapi.co/api/v2'
const max_xp = 100
const GEN1_COUNT = 151

// Available starter Pokémon.
// Evolution information is retrieved from PokéAPI.
const starterPokemon = [
  { id: 172, species: 'Pichu' },
  { id: 4, species: 'Charmander' },
  { id: 7, species: 'Squirtle' },
  { id: 1, species: 'Bulbasaur' },
  { id: 133, species: 'Eevee' },
  { id: 446, species: 'Munchlax' }
]

// =====================================================
// USER DATA
// =====================================================

// Temporary sample data. Can later be loaded from Supabase.
//
// id                = Current Pokémon ID
// originalSpeciesId = Original Pokémon ID (never changes)
// name              = Current Pokémon name
// species           = Original Pokémon name (never changes)
// animated_img      = Animated GIF, with static fallback
// static_img        = Static PNG
//
// XP and evolution progress belong to each Pokémon.

const user = ref({
  name: 'Jake',
  age: 8,
  avatar_img: '/assets/male.png',
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

// =====================================================
// REACTIVE STATE
// =====================================================

const pokemon = ref(null)

const availableImages = ref({})

// Evolution animations
const isEvolving = ref(false)
const isDevolving = ref(false)
const isRevealing = ref(false)
const isSwapping = ref(false)
const isFetchingEvolution = ref(false)

const evolutionMessage = ref('')

// Random Pokémon
const isAddingRandomPokemon = ref(false)
const randomPokemonNotice = ref('')

// Reward modal
const showPokemonReward = ref(false)
const rewardedPokemon = ref(null)

// =====================================================
// API CACHE
// =====================================================

// Cache requests during this page session.
// Prevents repeatedly fetching the same Pokémon data.

const pokemonCache = new Map()
const speciesCache = new Map()
const evolutionCache = new Map()

async function cachedRequest(cache, url) {
  if (!cache.has(url)) {
    const request = axios.get(url)
      .then(response => response.data)
      .catch(error => {
        cache.delete(url)
        throw error
      })

    cache.set(url, request)
  }

  return cache.get(url)
}

function fetchPokemon(identifier) {
  return cachedRequest(
    pokemonCache,
    `${POKEAPI}/pokemon/${String(identifier).toLowerCase()}/`
  )
}

function fetchSpecies(identifier) {
  return cachedRequest(
    speciesCache,
    `${POKEAPI}/pokemon-species/${String(identifier).toLowerCase()}/`
  )
}

function fetchEvolutionChain(url) {
  return cachedRequest(evolutionCache, url)
}

// =====================================================
// HELPER FUNCTIONS
// =====================================================

const wait = ms =>
  new Promise(resolve => setTimeout(resolve, ms))

function capitalise(name) {
  return name.charAt(0).toUpperCase() + name.slice(1)
}

// Extract both image formats from one PokéAPI response.
//
// Animated GIF: Generation V Black & White
// Static PNG: Default Pokémon sprite
//
// If animated GIF is unavailable, use the static PNG.

function getPokemonImages(data) {
  const static_img = data.sprites.front_default || ''

  const animated_img =
    data.sprites.versions?.['generation-v']?.['black-white']
      ?.animated?.front_default || static_img

  return {
    animated_img,
    static_img
  }
}

// Create a Pokémon record for the user.

function createPokemon(data) {
  const name = capitalise(data.name)
  const images = getPokemonImages(data)

  return {
    id: data.id,
    originalSpeciesId: data.id,
    name,
    species: name,
    evolution_stage: 0,
    xp: 0,
    isDefeated: false,
    ...images
  }
}

// Check whether the user already owns a Pokémon.
// Uses original species ID rather than current evolution ID.

function ownsPokemon(originalSpeciesId) {
  return user.value.pokemons.some(
    p => p.originalSpeciesId === originalSpeciesId
  )
}

// =====================================================
// COMPUTED PROPERTIES
// =====================================================

const activePokemon = computed(() =>
  user.value.pokemons.find(
    p => p.species === user.value.active_pokemon_species
  )
)

const availablePokemon = computed(() =>
  starterPokemon.filter(p => !ownsPokemon(p.id))
)

// =====================================================
// AVATAR
// =====================================================

function avatar_click(gender) {
  user.value.avatar_gender = gender
  user.value.avatar_img = `/assets/${gender}.png`
}

// =====================================================
// FETCH POKÉMON DETAILS AND IMAGES
// =====================================================

// Fetch Pokémon details and update both image fields.
//
// Battle Buddy uses animated_img.
// Pokédex uses static_img.
//
// Images are stored in the individual user's Pokémon
// record after fetching.

async function getPokemon(identifier, species) {
  try {
    const data = await fetchPokemon(identifier)
    const images = getPokemonImages(data)

    const details = {
      id: data.id,
      name: capitalise(data.name),
      ...images,
      image: images.animated_img,
      image2:
        data.sprites.other['official-artwork'].front_default,
      type: data.types.map(t => t.type.name)
    }

    // Find Pokémon in user's collection.
    const ownedPokemon = user.value.pokemons.find(
      p => p.species === species
    )

    if (ownedPokemon && ownedPokemon.id === data.id) {
      // Store both image formats in the user's data.
      ownedPokemon.animated_img = images.animated_img
      ownedPokemon.static_img = images.static_img
    }

    // Active Battle Buddy gets the animated sprite.
    if (
      user.value.active_pokemon_species === species &&
      activePokemon.value?.id === data.id
    ) {
      pokemon.value = details
    }

    return details

  } catch (error) {
    console.error('Unable to fetch Pokémon:', error)
    return null
  }
}

// Load images for Pokémon already owned.

async function getBagImages() {
  await Promise.all(
    user.value.pokemons.map(
      p => getPokemon(p.id, p.species)
    )
  )
}

// Starter cards use STATIC images only.

async function getAvailableImages() {
  await Promise.all(
    starterPokemon.map(async p => {
      try {
        const data = await fetchPokemon(p.id)
        const images = getPokemonImages(data)

        availableImages.value[p.species] =
          images.static_img

      } catch (error) {
        console.error(
          `Unable to fetch ${p.species}:`,
          error
        )
      }
    })
  )
}

// =====================================================
// SELECT ACTIVE POKÉMON
// =====================================================

function selectPoke(poke) {
  if (isEvolving.value || isFetchingEvolution.value) {
    return
  }

  user.value.active_pokemon_species = poke.species

  // Immediately display existing animated GIF.
  pokemon.value = {
    id: poke.id,
    name: poke.name,
    image: poke.animated_img || poke.static_img,
    animated_img: poke.animated_img,
    static_img: poke.static_img
  }

  // Retrieve any additional details if needed.
  getPokemon(poke.id, poke.species)
}

// =====================================================
// ADD STARTER POKÉMON
// =====================================================

async function addPokemon(poke) {
  if (ownsPokemon(poke.id)) return

  try {
    const data = await fetchPokemon(poke.id)
    const newPokemon = createPokemon(data)

    user.value.pokemons.push(newPokemon)

  } catch (error) {
    console.error('Unable to add Pokémon:', error)
  }
}

// =====================================================
// ADD RANDOM GEN 1 POKÉMON
// =====================================================

// Requirements:
// 1. Gen 1 Pokémon (ID 1-151)
// 2. Must be first-stage Pokémon
// 3. Must not already be owned
//

// Returns a random, unowned, first-stage Gen 1 Pokémon.
// Does not add the Pokémon to the user's collection.

async function addRandomPokemon() {
  if (
    isAddingRandomPokemon.value ||
    isEvolving.value ||
    isFetchingEvolution.value
  ) return

  isAddingRandomPokemon.value = true
  randomPokemonNotice.value = ''

  try {
    // Generate unowned Gen 1 IDs.
    const availableIds = Array.from(
      { length: GEN1_COUNT },
      (_, i) => i + 1
    ).filter(id => !ownsPokemon(id))

    while (availableIds.length > 0) {
      // Randomly choose an untested ID.
      const randomIndex = Math.floor(
        Math.random() * availableIds.length
      )

      const [randomId] = availableIds.splice(
        randomIndex,
        1
      )

      // Check evolution stage.
      const speciesData = await fetchSpecies(randomId)

      if (speciesData.evolves_from_species !== null) {
        continue
      }

      // Retrieve Pokémon details and both images.
      const data = await fetchPokemon(randomId)
      const newPokemon = createPokemon(data)

      // Add to user's collection.
      user.value.pokemons.push(newPokemon)

      // Reward modal uses the animated GIF.
      rewardedPokemon.value = {
        name: newPokemon.name,
        image: newPokemon.animated_img
      }

      showPokemonReward.value = true

      console.log('New Pokémon added:', newPokemon)

      return
    }

    randomPokemonNotice.value =
      'You already own all available first-stage Gen 1 Pokémon!'

  } catch (error) {
    console.error('Unable to add Pokémon:', error)

    randomPokemonNotice.value =
      'Unable to find a Pokémon. Please try again.'

  } finally {
    isAddingRandomPokemon.value = false
  }
}

// =====================================================
// REWARD MODAL
// =====================================================

function closePokemonReward() {
  showPokemonReward.value = false
}

// =====================================================
// FETCH EVOLUTION CHAIN
// =====================================================

async function getEvolutionOptions(name) {
  const pokemonName = name.toLowerCase()

  // Fetch Pokémon species information.
  const speciesData = await fetchSpecies(pokemonName)

  // Fetch full evolution chain.
  const evolutionData = await fetchEvolutionChain(
    speciesData.evolution_chain.url
  )

  // Recursively find the Pokémon in the evolution tree.
  function findPokemon(node, previous = null) {
    if (node.species.name === pokemonName) {
      return {
        previous,
        next: node.evolves_to
          .filter(child => {
            const id = Number(
              child.species.url
                .split('/')
                .filter(Boolean)
                .pop()
            )

            return id >= 1 && id <= GEN1_COUNT
          })
          .map(child => child.species.name)
      }
    }

    for (const child of node.evolves_to) {
      const result = findPokemon(
        child,
        node.species.name
      )

      if (result) return result
    }

    return null
  }

  const options = findPokemon(evolutionData.chain)

  if (!options) {
    throw new Error(
      `Evolution information unavailable for ${name}`
    )
  }

  return options
}

// =====================================================
// UPDATE POKÉMON FORM
// =====================================================

// Shared helper for evolution and devolution.
//
// Updates:
// - Current Pokémon ID
// - Current Pokémon name
// - Animated GIF
// - Static PNG
// - Evolution stage
// - XP
//
// Original species information remains unchanged.

function updatePokemonForm(poke, data, stageChange, xp) {
  const images = getPokemonImages(data)

  poke.id = data.id
  poke.name = capitalise(data.name)
  poke.evolution_stage += stageChange
  poke.xp = xp

  poke.animated_img = images.animated_img
  poke.static_img = images.static_img


  // Active Battle Buddy displays animated image.
  if (user.value.active_pokemon_species === poke.species) {
    pokemon.value = {
      id: data.id,
      name: poke.name,
      image: images.animated_img,
      ...images,
      image2:
        data.sprites.other['official-artwork'].front_default,
      type: data.types.map(t => t.type.name)
    }
  }
}

// =====================================================
// EVOLUTION ANIMATION
// =====================================================

async function playEvolution(poke, newName) {
  isEvolving.value = true
  isRevealing.value = false
  isSwapping.value = false
  evolutionMessage.value = ''

  const oldName = poke.name

  try {
    const data = await fetchPokemon(newName)

    // Phase 1: Flash old Pokémon.
    await wait(1600)

    // Phase 2: White burst.
    isSwapping.value = true
    await wait(250)

    // Update form and both image formats.
    updatePokemonForm(poke, data, 1, 0)

    isSwapping.value = false

    // Phase 3: Reveal new animated Pokémon.
    isRevealing.value = true
    await wait(1600)

    evolutionMessage.value =
      `${oldName} evolved into ${poke.name}! 🎉`

  } catch (error) {
    console.error('Evolution failed:', error)

    evolutionMessage.value =
      'Evolution failed. Please try again.'

  } finally {
    isEvolving.value = false
    isRevealing.value = false
    isSwapping.value = false
  }
}

// =====================================================
// DEVOLUTION ANIMATION
// =====================================================

async function playDevolution(poke, newName) {
  isDevolving.value = true
  isEvolving.value = true
  isRevealing.value = false
  isSwapping.value = false
  evolutionMessage.value = ''

  const oldName = poke.name

  try {
    const data = await fetchPokemon(newName)

    // Phase 1: Flash Pokémon.
    await wait(1600)

    // Phase 2: Red burst.
    isSwapping.value = true
    await wait(250)

    // Update form and both image formats.
    updatePokemonForm(poke, data, -1, max_xp - 10)

    isSwapping.value = false

    // Phase 3: Reveal previous Pokémon.
    isRevealing.value = true
    await wait(1600)

    evolutionMessage.value =
      `${oldName} devolved into ${poke.name}!`

  } catch (error) {
    console.error('Devolution failed:', error)

    evolutionMessage.value =
      'Devolution failed. Please try again.'

  } finally {
    isEvolving.value = false
    isDevolving.value = false
    isRevealing.value = false
    isSwapping.value = false
  }
}

// =====================================================
// XP SYSTEM
// =====================================================

async function updateXP(action) {
  const poke = activePokemon.value

  if (
    !poke ||
    isEvolving.value ||
    isFetchingEvolution.value
  ) return

  evolutionMessage.value = ''

  // -------------------------------
  // ADD XP
  // -------------------------------

  if (action === 'add') {
    if (poke.isDefeated) {
      poke.isDefeated = false
    }

    const newXP = poke.xp + 10

    if (newXP < max_xp) {
      poke.xp = newXP
      return
    }

    isFetchingEvolution.value = true

    try {
      const evolution = await getEvolutionOptions(
        poke.name
      )

      // Already at final evolution.
      if (evolution.next.length === 0) {
        poke.xp = max_xp

        alert(
          `${poke.name} has reached its maximum evolution!`
        )

        return
      }

      // Randomly select branching evolution.
      const randomIndex = Math.floor(
        Math.random() * evolution.next.length
      )

      const newName = evolution.next[randomIndex]

      await playEvolution(poke, newName)

    } catch (error) {
      console.error('Unable to evolve:', error)

      evolutionMessage.value =
        'Unable to retrieve evolution. Please try again.'

    } finally {
      isFetchingEvolution.value = false
    }

  // -------------------------------
  // MINUS XP
  // -------------------------------

  } else if (action === 'minus') {
    if (poke.isDefeated) return

    const newXP = poke.xp - 10

    if (newXP >= 0) {
      poke.xp = newXP
      return
    }

    isFetchingEvolution.value = true

    try {
      const evolution = await getEvolutionOptions(
        poke.name
      )

      if (evolution.previous) {
        await playDevolution(
          poke,
          evolution.previous
        )

      } else {
        poke.xp = 0
        poke.isDefeated = true

        alert(`${poke.name} has been defeated!`)
      }

    } catch (error) {
      console.error('Unable to devolve:', error)

      evolutionMessage.value =
        'Unable to retrieve devolution. Please try again.'

    } finally {
      isFetchingEvolution.value = false
    }
  }
}

// =====================================================
// LIFECYCLE
// =====================================================

onMounted(() => {
  getBagImages()
  getAvailableImages()
})

onUnmounted(() => {
})
</script>



<template>
  <main>
    <div class="content">
      <NavBar />

      <div class="content-grid">

        <!-- LEFT SECTION -->
        <div class="left-section">

          <!-- AVATAR + BATTLE BUDDY -->
          <div class="current-avatar">

            <!-- TRAINER AVATAR -->
            <div class="avatar">
              <h2>{{ user.name }}'s Avatar</h2>
              <p>Selected Style: {{ user.avatar_gender }}</p>

              <img
                :src="user.avatar_img"
                alt="Trainer"
                class="avatar-img"
              />

              <div class="avatar-buttons">
                <button @click="avatar_click('female')">
                  Female
                </button>

                <button @click="avatar_click('male')">
                  Male
                </button>
              </div>
            </div>

            <!-- BATTLE BUDDY -->
            <div class="pokemon-div">
              <h2>Battle Buddy</h2>

              <div class="pokemon-image-container">

                <!-- Evolution glow -->
                <Transition name="glow-fade">
                  <div
                    v-if="isEvolving || isRevealing || isSwapping"
                    class="evo-glow"
                    :class="{ 'devolve-glow': isDevolving }"
                  ></div>
                </Transition>

                <!-- Sparkles -->
                <div
                  v-if="isEvolving || isRevealing || isSwapping"
                  class="sparkle-layer"
                >
                  <span class="sparkle s1"></span>
                  <span class="sparkle s2"></span>
                  <span class="sparkle s3"></span>
                  <span class="sparkle s4"></span>
                  <span class="sparkle s5"></span>
                  <span class="sparkle s6"></span>
                </div>

                <!-- Sprite-swap flash -->
                <div
                  v-if="isSwapping"
                  class="swap-flash"
                ></div>

                <!-- Active Pokémon -->
                <img
                  v-if="pokemon?.image"
                  :src="pokemon.image"
                  :alt="pokemon.name"
                  class="active-pokemon-img"
                  :class="{
                    evolving: isEvolving && !isRevealing && !isSwapping,
                    revealing: isRevealing,
                    swapping: isSwapping,
                    defeated: activePokemon?.isDefeated
                  }"
                />

              </div>

              <p
                v-if="evolutionMessage"
                class="evolution-message"
              >
                {{ evolutionMessage }}
              </p>

              <!-- Individual Pokémon XP -->
              <div
                v-if="activePokemon"
                class="xp-section"
              >
                <p>XP Progress</p>

                <div class="xp-bar">
                  <div
                    class="xp-fill"
                    :style="{ width: activePokemon.xp + '%' }"
                  ></div>
                </div>

                <p>
                  {{ activePokemon.xp }} / {{ max_xp }} XP
                </p>
              </div>

              <div class="xp-buttons">
                <button
                  :disabled="isEvolving || isFetchingEvolution"
                  @click="updateXP('add')"
                >
                  Add XP
                </button>

                <button
                  :disabled="isEvolving || isFetchingEvolution"
                  @click="updateXP('minus')"
                >
                  Minus XP
                </button>
              </div>

            </div>
          </div>

          <!-- USER'S POKÉDEX -->
          <div class="bag">
            <h2>My Pokédex</h2>

            <div class="bag-list">

              <div
                v-for="poke in user.pokemons"
                :key="poke.species"
                class="bag-pokemon"
              >
                <img
                  v-if="poke.static_img"
                  :src="poke.static_img"
                  :alt="poke.name"
                />

                <p>{{ poke.name }}</p>

                <p>
                  Stage: {{ poke.evolution_stage }}
                </p>

                <p>
                  XP: {{ poke.xp }}/100
                </p>

                <button
                  :disabled="
                    isEvolving ||
                    isFetchingEvolution ||
                    user.active_pokemon_species === poke.species
                  "
                  @click="selectPoke(poke)"
                >
                  {{
                    user.active_pokemon_species === poke.species
                      ? 'Active'
                      : 'Make Active'
                  }}
                </button>
              </div>

            </div>
          </div>

        </div>

      </div>
    </div>
    <!-- RANDOM POKEMON BUTTON -->
    <div
      v-if="randomPokemonNotice"
      class="random-pokemon-notice"
      role="status"
    >
      {{ randomPokemonNotice }}
    </div>

    <button
      type="button"
      class="random-pokemon-button"
      :disabled="isAddingRandomPokemon || isEvolving"
      @click="addRandomPokemon"
    >
      {{ isAddingRandomPokemon ? 'Finding Pokémon...' : '🎲 Add Random Pokémon' }}
    </button>


      <!-- POKEMON REWARD MODAL -->
      <div
        v-if="showPokemonReward && rewardedPokemon"
        class="modal show d-block"
        tabindex="-1"
        role="dialog"
        aria-modal="true"
        aria-labelledby="pokemonRewardTitle"
        @click.self="closePokemonReward"
        @keydown.esc="closePokemonReward"
      >
        <div class="modal-dialog modal-dialog-centered">

          <div class="modal-content rounded-4 shadow-lg border-0 reward-pop">

            <!-- HEADER -->
            <div class="modal-header border-0 pb-0">
              <span class="text-muted small fw-bold">
                STUDYDEX / NEW POKÉMON
              </span>

              <button
                type="button"
                class="btn-close"
                aria-label="Close"
                @click="closePokemonReward"
              ></button>
            </div>

            <!-- BODY -->
            <div class="modal-body text-center px-4 pb-4">

              <div class="fs-3 mb-2">✨ ⭐ ✨</div>

              <h2
                id="pokemonRewardTitle"
                class="fw-bold fs-4 mb-4"
              >
                You Got a Pokémon!
              </h2>

              <!-- POKEMON IMAGE WITH SPARKLES -->
              <div
                class="reward-image-box bg-warning bg-opacity-25 rounded-4
                      d-flex justify-content-center align-items-center
                      mx-auto mb-3"
              >
                <!-- SPARKLE EFFECT -->
                <div class="reward-sparkles" aria-hidden="true">
                  <span>✦</span>
                  <span>✦</span>
                  <span>✦</span>
                  <span>✦</span>
                  <span>✦</span>
                  <span>✦</span>
                  <span>✦</span>
                  <span>✦</span>
                </div>

                <!-- POKEMON SPRITE -->
                <img
                  v-if="rewardedPokemon.image"
                  :src="rewardedPokemon.image"
                  :alt="rewardedPokemon.name"
                  class="reward-pokemon-sprite img-fluid"
                />
              </div>


              <!-- POKEMON NAME -->
              <h3 class="fw-bold text-capitalize mb-2">
                {{ rewardedPokemon.name }}
              </h3>

              <p class="text-secondary small mb-4">
                A new Pokémon has joined your adventure!
              </p>

              <!-- CLOSE BUTTON -->
              <button
                type="button"
                class="btn btn-warning fw-bold rounded-3 w-100 py-3"
                @click="closePokemonReward"
              >
                Awesome! 🎉
              </button>

            </div>
          </div>
        </div>
      </div>

      <!-- BOOTSTRAP BACKDROP -->
      <div
        v-if="showPokemonReward"
        class="modal-backdrop fade show"
      ></div>

  </main>
</template>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Luckiest+Guy&family=Montserrat:ital,wght@0,100..900;1,100..900&family=Nunito:ital,wght@0,200..1000;1,200..1000&family=Playfair+Display:ital,wght@0,400..900;1,400..900&family=Raleway:ital,wght@0,100..900;1,100..900&family=Silkscreen:wght@400;700&display=swap');

/* =====================================================
   MAIN PAGE
===================================================== */

main {
  background: #ffd000;
  height: 100vh;
  width: 100%;
  padding: 16px;
  box-sizing: border-box;
  overflow: hidden;
}

.content {
  background: url('/backgrounds/morning_homepage.png') center/cover no-repeat;
  height: 100%;
  padding: 25px;
  box-sizing: border-box;

  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;

  overflow: hidden;
}

/* =====================================================
   DASHBOARD LAYOUT
===================================================== */

.content-grid {
  display: grid;
  grid-template-columns: 1.2fr 1fr;
  gap: 25px;

  width: 100%;
  max-width: 1250px;

  flex: 1;
  min-height: 0;
  min-width: 0;
}

.left-section {
  display: flex;
  flex-direction: column;
  gap: 15px;

  min-width: 0;
  min-height: 0;
}

/* =====================================================
   AVATAR + BATTLE BUDDY
===================================================== */

.current-avatar {
  display: flex;
  gap: 15px;

  width: 100%;
  flex: 1.5;
  min-height: 0;

  background: rgba(255, 255, 255, 0.85);
  border-radius: 15px;

  padding: 15px;
  box-sizing: border-box;
  overflow: hidden;
}

.avatar,
.pokemon-div {
  flex: 1;
  min-width: 0;
  min-height: 0;

  display: flex;
  flex-direction: column;
  align-items: center;

  text-align: center;
  gap: 8px;
}

.avatar h2,
.pokemon-div h2 {
  font-size: clamp(17px, 1.6vw, 24px);
  font-weight: 900;
  color: #30304b;
  margin: 0 0 5px;
}

.avatar p,
.pokemon-div p {
  margin: 0;
  font-size: 13px;
}

/* =====================================================
   TRAINER AVATAR
===================================================== */

.avatar-img {
  width: auto;
  height: clamp(95px, 24vh, 220px);
  max-width: 100%;
  min-height: 0;

  object-fit: contain;
  image-rendering: pixelated;
  margin: auto 0;
}

/* =====================================================
   BATTLE BUDDY IMAGE
===================================================== */

.pokemon-image-container {
  position: relative;
  width: 100%;
  height: clamp(90px, 22vh, 200px);

  display: flex;
  justify-content: center;
  align-items: center;

  margin: auto 0;
  overflow: hidden;
}

.active-pokemon-img {
  position: relative;
  z-index: 4;

  width: auto;
  height: 100px;
  max-width: 100%;
  max-height: 100%;

  object-fit: contain;
  image-rendering: pixelated;
  transform-origin: center;
}

.active-pokemon-img.defeated {
  filter: grayscale(100%);
  opacity: 0.5;
  transform: rotate(90deg);
}

/* =====================================================
   EVOLUTION GLOW
===================================================== */

.evo-glow {
  position: absolute;
  top: 50%;
  left: 50%;

  width: 85%;
  max-width: 200px;
  aspect-ratio: 1 / 1;
  border-radius: 50%;
  z-index: 1;

  background: radial-gradient(
    circle,
    rgba(255, 255, 255, 0.95) 0%,
    rgba(255, 255, 180, 0.75) 25%,
    rgba(160, 255, 220, 0.35) 50%,
    rgba(160, 255, 220, 0.10) 65%,
    transparent 80%
  );

  filter: blur(12px);
  animation: evo-glow-pulse 1s ease-in-out infinite alternate;
}

.evo-glow.devolve-glow {
  background: radial-gradient(
    circle,
    rgba(255, 120, 120, 0.95) 0%,
    rgba(255, 40, 40, 0.75) 25%,
    rgba(244, 17, 17, 0.35) 50%,
    rgba(250, 49, 49, 0.1) 65%,
    transparent 80%
  );
}

@keyframes evo-glow-pulse {
  from {
    transform: translate(-50%, -50%) scale(0.96);
    filter: blur(12px) brightness(0.85);
  }

  to {
    transform: translate(-50%, -50%) scale(1.08);
    filter: blur(16px) brightness(1.15);
  }
}

/* =====================================================
   SPARKLE EFFECTS
===================================================== */

.sparkle-layer {
  position: absolute;
  inset: 0;
  z-index: 5;
  pointer-events: none;
}

.sparkle {
  position: absolute;
  width: 12px;
  height: 12px;
  border-radius: 50%;

  background: rgba(255, 255, 255, 0.95);

  box-shadow:
    0 0 10px rgba(255, 255, 255, 0.95),
    0 0 22px rgba(255, 255, 210, 0.8);

  animation: sparkle-float 1.5s ease-in-out infinite;
}

.s1 {
  left: 18%;
  bottom: 12%;
  animation-delay: 0s;
}

.s2 {
  left: 30%;
  bottom: 18%;
  animation-delay: 0.2s;
}

.s3 {
  left: 45%;
  bottom: 8%;
  animation-delay: 0.45s;
}

.s4 {
  right: 28%;
  bottom: 16%;
  animation-delay: 0.15s;
}

.s5 {
  right: 16%;
  bottom: 10%;
  animation-delay: 0.5s;
}

.s6 {
  left: 58%;
  bottom: 20%;
  animation-delay: 0.3s;
}

@keyframes sparkle-float {
  0% {
    transform: translateY(0) scale(0.7);
    opacity: 0;
  }

  20% {
    opacity: 1;
  }

  60% {
    opacity: 0.95;
  }

  100% {
    transform: translateY(-70px) scale(1.25);
    opacity: 0;
  }
}

/* =====================================================
   SPRITE SWAP FLASH
===================================================== */

.swap-flash {
  position: absolute;
  inset: 0;
  z-index: 6;

  background: radial-gradient(
    circle,
    rgba(255, 255, 255, 1) 0%,
    rgba(255, 255, 255, 0.95) 35%,
    rgba(255, 255, 220, 0.7) 60%,
    rgba(255, 255, 255, 0) 100%
  );

  pointer-events: none;
  animation: swap-burst 0.5s ease-out forwards;
}

@keyframes swap-burst {
  0% {
    opacity: 0.2;
    transform: scale(0.9);
  }

  35% {
    opacity: 1;
    transform: scale(1.08);
  }

  100% {
    opacity: 0;
    transform: scale(1.18);
  }
}

/* =====================================================
   EVOLUTION SPRITE ANIMATIONS
===================================================== */

.active-pokemon-img.evolving,
.active-pokemon-img.revealing {
  animation: pokemon-flash 0.36s ease-in-out infinite alternate;
}

.active-pokemon-img.swapping {
  filter: brightness(0) invert(1);
  transform: scale(1.22);
  opacity: 0.9;
}

@keyframes pokemon-flash {
  from {
    filter: brightness(1);
    transform: scale(1);
    opacity: 1;
  }

  to {
    filter: brightness(0) invert(1);
    transform: scale(1.18);
    opacity: 0.78;
  }
}

.evolution-message {
  font-weight: bold;
  font-size: 13px;
  color: #795500;
  text-align: center;
}

/* =====================================================
   EVOLUTION GLOW FADE
===================================================== */

.glow-fade-enter-active {
  transition: opacity 0.7s ease-in;
}

.glow-fade-leave-active {
  transition: opacity 1s ease-out;
}

.glow-fade-enter-from,
.glow-fade-leave-to {
  opacity: 0;
}

.glow-fade-enter-to,
.glow-fade-leave-from {
  opacity: 1;
}

/* =====================================================
   BUTTONS
===================================================== */

.avatar-buttons,
.xp-buttons {
  display: flex;
  justify-content: center;
  flex-wrap: wrap;
  gap: 8px;
}

.avatar-buttons button,
.xp-buttons button,
.bag-pokemon button {
  background: #ffd21f;
  border: 2px solid #30304b;
  border-radius: 8px;

  padding: 6px 12px;
  font-size: 12px;
  font-weight: bold;
  color: #30304b;

  cursor: pointer;
}

.avatar-buttons button:hover,
.xp-buttons button:hover,
.bag-pokemon button:hover:not(:disabled) {
  background: #ffbd00;
}

button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* =====================================================
   XP BAR
===================================================== */

.xp-section {
  width: 100%;
  max-width: 220px;
}

.xp-bar {
  width: 100%;
  height: 18px;

  background: lightgray;
  border-radius: 15px;
  overflow: hidden;
  margin: 8px auto;
}

.xp-fill {
  height: 100%;
  background: #4caf50;
  transition: width 0.3s ease;
}

/* =====================================================
   MY POKÉDEX
===================================================== */

.bag {
  flex: 1;
  min-height: 0;
  min-width: 0;
  width: 100%;

  background: rgba(255, 255, 255, 0.85);
  border-radius: 15px;
  padding: 15px;
  box-sizing: border-box;

  display: flex;
  flex-direction: column;
  align-items: center;
  overflow: hidden;
}

.bag h2,
.available-section h2 {
  font-size: clamp(18px, 1.7vw, 24px);
  font-weight: 900;
  color: #30304b;

  margin: 0 0 12px;
  flex-shrink: 0;
}

.bag-list {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  align-content: flex-start;

  gap: 12px;
  width: 100%;
  flex: 1;
  min-height: 0;

  overflow-y: auto;
}

.bag-pokemon {
  width: 145px;
  flex-shrink: 0;

  background: rgba(255, 255, 255, 0.85);
  border: 2px solid #ffcc00;
  border-radius: 10px;

  padding: 8px;
  box-sizing: border-box;
  text-align: center;
}

.bag-pokemon img {
  width: 100%;
  height: clamp(60px, 11vh, 100px);
  object-fit: contain;
  image-rendering: pixelated;
}

.bag-pokemon p {
  font-size: 12px;
  font-weight: bold;
  margin: 3px 0;
  text-transform: capitalize;
}

.bag-pokemon button {
  width: 100%;
  margin-top: 5px;
  padding: 5px;
}

/* =====================================================
   AVAILABLE POKÉMON
===================================================== */

.available-section {
  display: flex;
  flex-direction: column;
  align-items: center;

  min-width: 0;
  min-height: 0;
  width: 100%;

  background: rgba(255, 255, 255, 0.85);
  border-radius: 15px;

  padding: 20px;
  box-sizing: border-box;
  overflow: hidden;
}

.available-list {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  align-content: start;

  gap: 12px;
  width: 100%;
  flex: 1;
  min-height: 0;

  overflow-y: auto;
}

.available-card {
  background: rgba(255, 255, 255, 0.85);
  border: 2px solid #ffcc00;
  border-radius: 12px;

  padding: 10px;
  min-width: 0;
  box-sizing: border-box;
  text-align: center;
}

.available-card img {
  width: 100%;
  height: clamp(65px, 12vh, 110px);
  object-fit: contain;
  image-rendering: pixelated;
}

.available-card h3 {
  font-size: 15px;
  font-weight: bold;
  color: #30304b;
  margin: 5px 0;
}

.available-card p {
  font-size: 12px;
  margin: 4px 0;
}

.available-card button {
  background: #96c0f1;
  border: 2px solid white;
  border-radius: 8px;

  padding: 6px 12px;
  font-size: 12px;
  font-weight: bold;
  color: #30304b;

  cursor: pointer;
}

.available-card button:hover {
  background: #76a9e8;
}

/* =====================================================
   RESPONSIVE DESIGN
===================================================== */

@media (max-width: 1100px) {
  .content {
    gap: 12px;
    padding: 15px;
  }

  .content-grid {
    gap: 15px;
  }
}

@media (max-width: 800px) {
  main {
    height: auto;
    min-height: 100vh;
    overflow: visible;
  }

  .content {
    height: auto;
    min-height: calc(100vh - 32px);
    overflow: visible;
  }

  .content-grid {
    grid-template-columns: 1fr;
    flex: none;
  }

  .current-avatar {
    min-height: 350px;
  }

  .bag {
    min-height: 220px;
  }

  .available-section {
    min-height: 300px;
  }

  .bag-list,
  .available-list {
    overflow: visible;
  }
}

@media (max-width: 500px) {
  main {
    padding: 8px;
  }

  .content {
    padding: 12px;
  }

  .current-avatar {
    flex-direction: column;
    align-items: center;
  }

  .avatar,
  .pokemon-div {
    width: 100%;
  }

  .available-list {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .bag-pokemon {
    width: 130px;
  }
}

/* =====================================================
   ACCESSIBILITY
===================================================== */

@media (prefers-reduced-motion: reduce) {
  .active-pokemon-img.evolving,
  .active-pokemon-img.revealing,
  .evo-glow,
  .sparkle,
  .swap-flash {
    animation: none;
  }

  .glow-fade-enter-active,
  .glow-fade-leave-active {
    transition: none;
  }
}


/* RANDOM POKEMON BUTTON */

.random-pokemon-button {
  position: fixed;
  bottom: 24px;
  right: 24px;
  z-index: 1000;

  padding: 14px 22px;
  background: #ffde59;
  color: #30304b;

  border-radius: 14px;

  font-family: 'Nunito', sans-serif;
  font-size: 14px;
  font-weight: 800;

  cursor: pointer;
  box-shadow: 0 5px 0 #c69d20;

  transition: transform 0.2s;
}

.random-pokemon-button:hover:not(:disabled) {
  transform: translateY(-3px);
}

.random-pokemon-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* FEEDBACK MESSAGE */

.random-pokemon-notice {
  position: fixed;
  bottom: 95px;
  right: 24px;
  z-index: 1000;

  max-width: 300px;
  padding: 12px 18px;

  background: #fffdf5;
  color: #30304b;
  border: 2px solid #30304b;
  border-radius: 12px;

  font-size: 13px;
  font-weight: 700;
  text-align: center;
}

/* POKEMON REWARD MODAL */

.modal-content {
  background: #fff9e8;
  color: #293c60;
  font-family: 'Silkscreen', monospace;
  font-size: 15px;
}

.modal-body h2,
.modal-body h3 {
  font-family: 'Silkscreen', monospace;
}

.modal-dialog {
  max-width: 350px;
}

.modal-backdrop {
  background-color: #0a1730;
}

/* ========================================
   POKEMON REWARD - MODAL ENTRANCE
======================================== */

.reward-pop {
  animation: reward-popup 0.5s cubic-bezier(0.2, 1.4, 0.4, 1) both;
}

@keyframes reward-popup {
  from {
    opacity: 0;
    transform: translateY(30px) scale(0.7);
  }

  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}


/* ========================================
   POKEMON IMAGE REVEAL
======================================== */

.reward-image-box {
  position: relative;
  width: 180px;
  height: 180px;
}

.reward-pokemon-sprite {
  position: relative;
  z-index: 1;

  width: 150px;
  height: 150px;
  object-fit: contain;
  image-rendering: pixelated;

  animation: pokemon-reveal 0.6s ease-out 0.2s both;
}

@keyframes pokemon-reveal {
  0% {
    opacity: 0;
    transform: scale(0.3);
  }

  65% {
    opacity: 1;
    transform: scale(1.2);
  }

  100% {
    opacity: 1;
    transform: scale(1);
  }
}


/* ========================================
   GOLDEN SPARKLE BURST
======================================== */

.reward-sparkles {
  position: absolute;
  inset: 0;
  z-index: 2;
  pointer-events: none;
}

.reward-sparkles span {
  position: absolute;
  top: 50%;
  left: 50%;

  color: #ffca28;
  font-size: 25px;
  text-shadow: 0 0 8px rgba(255, 222, 89, 0.9);

  animation: reward-sparkle-burst 1s ease-out 0.3s both;
}

/* Position each sparkle in a different direction */
.reward-sparkles span:nth-child(1) { --x: -100px; --y: -90px; }
.reward-sparkles span:nth-child(2) { --x: 0px;    --y: -110px; }
.reward-sparkles span:nth-child(3) { --x: 100px;  --y: -90px; }
.reward-sparkles span:nth-child(4) { --x: 120px;  --y: 0px; }
.reward-sparkles span:nth-child(5) { --x: 90px;   --y: 90px; }
.reward-sparkles span:nth-child(6) { --x: 0px;    --y: 110px; }
.reward-sparkles span:nth-child(7) { --x: -90px;  --y: 90px; }
.reward-sparkles span:nth-child(8) { --x: -120px; --y: 0px; }

@keyframes reward-sparkle-burst {
  0% {
    opacity: 0;
    transform: translate(-50%, -50%) scale(0);
  }

  30% {
    opacity: 1;
  }

  100% {
    opacity: 0;
    transform:
      translate(-50%, -50%)
      translate(var(--x), var(--y))
      scale(0.6)
      rotate(120deg);
  }
}

/* Accessibility */
@media (prefers-reduced-motion: reduce) {
  .reward-pop,
  .reward-pokemon-sprite,
  .reward-sparkles span {
    animation: none;
  }

  .reward-sparkles {
    display: none;
  }
}


</style>
