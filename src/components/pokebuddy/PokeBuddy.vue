<script setup>
import axios from 'axios'
import { ref, computed, onMounted, onUnmounted } from 'vue'
import NavBar from '../common/NavBar.vue'

const max_xp = 100
const pokemondata = [
  { species: 'Pichu', type: ['Electric'], evolution: ['Pichu', 'Pikachu', 'Raichu'] },
  { species: 'Charmander', type: ['Fire'], evolution: ['Charmander', 'Charmeleon', 'Charizard'] },
  { species: 'Squirtle', type: ['Water'], evolution: ['Squirtle', 'Wartortle', 'Blastoise'] },
  { species: 'Bulbasaur', type: ['Grass', 'Poison'], evolution: ['Bulbasaur', 'Ivysaur', 'Venusaur'] },
  { species: 'Eevee', type: ['Normal'], evolution: ['Eevee', 'Vaporeon'] },
  { species: 'Munchlax', type: ['Normal'], evolution: ['Munchlax', 'Snorlax'] }
]

const user = ref({
  name: 'Jake',
  age: 8,
  avatar_img: '/assets/male.png',
  avatar_gender: 'male',
  active_pokemon_species: 'Pichu',
  pokemons: [
    { name: 'Pichu', species: 'Pichu', evolution_stage: 0, xp: 90, isDefeated: false },
    { name: 'Charmander', species: 'Charmander', evolution_stage: 0, xp: 60, isDefeated: false }
  ]
})

const pokemon = ref(null)
const bagImages = ref({})
const availableImages = ref({})
const isEvolving = ref(false)
const isDevolving = ref(false)
const isRevealing = ref(false)
const isSwapping = ref(false)
const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms))

const evolutionMessage = ref('')
const activePokemon = computed(() => user.value.pokemons.find(
  p => p.species === user.value.active_pokemon_species
))
const availablePokemon = computed(() => pokemondata.filter(p =>
  !user.value.pokemons.some(owned => owned.species === p.species)
))

function avatar_click(gender) {
  user.value.avatar_gender = gender
  user.value.avatar_img = `/assets/${gender}.png`
}

// Shared fetch function: updates the bag and (when active) the Battle Buddy.
async function getPokemon(name, species) {
  try {
    const { data } = await axios.get(
      `https://pokeapi.co/api/v2/pokemon/${name.toLowerCase()}`
    )
    const details = {
      id: data.id,
      name: data.name,
      image: data.sprites.front_default,
      image2: data.sprites.other['official-artwork'].front_default,
      type: data.types.map(t => t.type.name)
    }
    bagImages.value[species] = details.image
    if (user.value.active_pokemon_species === species) pokemon.value = details
    return details
  } catch (error) {
    console.error('Unable to fetch Pokémon:', error)
    return null
  }
}

async function getBagImages() {
  await Promise.all(user.value.pokemons.map(p => getPokemon(p.name, p.species)))
}

async function getAvailableImages() {
  await Promise.all(pokemondata.map(async p => {
    try {
      const { data } = await axios.get(
        `https://pokeapi.co/api/v2/pokemon/${p.evolution[0].toLowerCase()}`
      )
      availableImages.value[p.species] = data.sprites.front_default
    } catch (error) {
      console.error('Unable to fetch starter image:', error)
    }
  }))
}

function selectPoke(poke) {
  if (isEvolving.value) return
  user.value.active_pokemon_species = poke.species
  // Reuse cached image immediately, then refresh details.
  pokemon.value = { name: poke.name, image: bagImages.value[poke.species] }
  getPokemon(poke.name, poke.species)
}

function addPokemon(poke) {
  if (user.value.pokemons.some(p => p.species === poke.species)) return
  user.value.pokemons.push({
    name: poke.evolution[0], species: poke.species,
    evolution_stage: 0, xp: 0, isDefeated: false
  })
  getPokemon(poke.evolution[0], poke.species)
}

// Small animation only on the Battle Buddy image (no popup/modal).
async function playEvolution(poke, newName) {
  isEvolving.value = true
  isRevealing.value = false
  isSwapping.value = false
  evolutionMessage.value = ''

  const oldName = poke.name
  const species = poke.species

  try {
    const { data } = await axios.get(
      `https://pokeapi.co/api/v2/pokemon/${newName.toLowerCase()}`
    )

    // Phase 1: old Pokemon flashing
    await wait(1600)

    // Phase 2: strong burst / swap moment
    isSwapping.value = true
    await wait(250)

    // update pokemon data
    poke.evolution_stage += 1
    poke.name = newName
    poke.xp = 0

    bagImages.value[species] = data.sprites.front_default

    if (user.value.active_pokemon_species === species) {
      pokemon.value = {
        id: data.id,
        name: data.name,
        image: data.sprites.front_default,
        image2: data.sprites.other['official-artwork'].front_default,
        type: data.types.map(t => t.type.name)
      }
    }

    // end swap burst
    isSwapping.value = false

    // Phase 3: new Pokemon flashing
    isRevealing.value = true
    await wait(1600)

    evolutionMessage.value = `${oldName} evolved into ${newName}! 🎉`

  } catch (error) {
    console.error('Evolution failed:', error)
    evolutionMessage.value = 'Evolution failed. Please try again.'
  } finally {
    isEvolving.value = false
    isRevealing.value = false
    isSwapping.value = false
  }
}

async function playDevolution(poke, newName) {
  isDevolving.value = true
  isEvolving.value = true
  isRevealing.value = false
  isSwapping.value = false
  evolutionMessage.value = ''

  const oldName = poke.name
  const species = poke.species

  try {
    const { data } = await axios.get(
      `https://pokeapi.co/api/v2/pokemon/${newName.toLowerCase()}`
    )

    // Phase 1: old Pokemon flashing
    await wait(1600)

    // Phase 2: strong burst / swap moment
    isSwapping.value = true
    await wait(250)

    // update pokemon data
    poke.evolution_stage -= 1
    poke.name = newName
    poke.xp = max_xp - 10

    bagImages.value[species] = data.sprites.front_default

    if (user.value.active_pokemon_species === species) {
      pokemon.value = {
        id: data.id,
        name: data.name,
        image: data.sprites.front_default,
        image2: data.sprites.other['official-artwork'].front_default,
        type: data.types.map(t => t.type.name)
      }
    }

    // end swap burst
    isSwapping.value = false

    // Phase 3: new Pokemon flashing
    isRevealing.value = true
    await wait(1600)

    evolutionMessage.value = `${oldName} devolved into ${newName}!`

  } catch (error) {
    console.error('Devolution failed:', error)
    evolutionMessage.value = 'Devolution failed. Please try again.'
  } finally {
    isEvolving.value = false
    isRevealing.value = false
    isSwapping.value = false

    isDevolving.value = false
  }
}


async function updateXP(action) {
  const poke = activePokemon.value
  if (!poke || isEvolving.value) return
  const stats = pokemondata.find(p => p.species === poke.species)
  if (!stats) return
  const maxStage = stats.evolution.length - 1
  evolutionMessage.value = ''

  if (action === 'add') {
    if (poke.isDefeated) poke.isDefeated = false
    const newXP = poke.xp + 10
    if (newXP >= max_xp) {
      if (poke.evolution_stage >= maxStage) {
        if (poke.xp < max_xp) {
          poke.xp = max_xp
          alert(`${poke.name} has reached its maximum evolution!`)
        }
        return
      }
      const newName = stats.evolution[poke.evolution_stage + 1]
      await playEvolution(poke, newName)
    } else {
      poke.xp = newXP
    }
  } else if (action === 'minus') {
    if (poke.isDefeated) return
    const newXP = poke.xp - 10
    if (newXP < 0) {
      if (poke.evolution_stage > 0) {

  const newName = stats.evolution[poke.evolution_stage - 1]

  await playDevolution(poke, newName)

      } else {
        poke.xp = 0
        poke.isDefeated = true
        alert(`${poke.name} has been defeated!`)
      }
    } else {
      poke.xp = newXP
    }
  }
}

const currentTime = ref(new Date())
let clockInterval
const time = () => currentTime.value.toLocaleTimeString('en-SG', {
  hour: '2-digit', minute: '2-digit', hour12: true
})
const date = () => currentTime.value.toLocaleDateString('en-SG', {
  weekday: 'short', day: '2-digit', month: 'short'
})

onMounted(() => {
  getBagImages()
  getAvailableImages()
  clockInterval = setInterval(() => { currentTime.value = new Date() }, 1000)
})
onUnmounted(() => clearInterval(clockInterval))
</script>

<template>
  <main>
    <div class="content">
      <NavBar/>
      <!-- <nav class="navbar">
        <div class="clock">
          <div class="clock-time">☀️ {{ time() }}</div>
          <div class="clock-date">{{ date() }}</div>
        </div>
        <div class="logo"><img src="/assets/studydexlogo.png" alt="StudyDex"></div>
        <div class="trainer">
          <img :src="user.avatar_img" alt="Trainer">
          <span>Trainer {{ user.name }}</span>
        </div>
        <div class="nav-links">
          <RouterLink to="/" class="nav-btn">Study Decks</RouterLink>
          <RouterLink to="/" class="nav-btn">My Progress</RouterLink>
          <RouterLink to="/" class="nav-btn">View Pokepacks</RouterLink>
          <RouterLink to="/" class="nav-btn">Home</RouterLink>
        </div>
      </nav> -->

      <div class="content-grid">
        <div class="left-section">
          <div class="current-avatar">
            <div class="avatar">
              <h2>{{ user.name }}'s Avatar</h2>
              <p>Selected Style: {{ user.avatar_gender }}</p>
              <img :src="user.avatar_img" alt="Trainer" class="avatar-img">
              <div class="avatar-buttons">
                <button @click="avatar_click('female')">Female</button>
                <button @click="avatar_click('male')">Male</button>
              </div>
            </div>

            <div class="pokemon-div">
              <h2>Battle Buddy</h2>
              <div class="pokemon-image-container">
                <!-- soft background glow -->
                <Transition name="glow-fade">
                  <div
                    v-if="isEvolving || isRevealing || isSwapping"
                    class="evo-glow"
                    :class="{ 'devolve-glow': isDevolving }"
                  ></div>
                </Transition>

                <!-- floating sparkles -->
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

                <!-- white burst at the exact swap moment -->
                <div
                  v-if="isSwapping"
                  class="swap-flash"
                ></div>

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
                >
              </div>
              <p v-if="evolutionMessage" class="evolution-message">{{ evolutionMessage }}</p>
              <div v-if="activePokemon" class="xp-section">
                <p>XP Progress</p>
                <div class="xp-bar">
                  <div class="xp-fill" :style="{ width: activePokemon.xp + '%' }"></div>
                </div>
                <p>{{ activePokemon.xp }} / {{ max_xp }} XP</p>
              </div>
              <div class="xp-buttons">
                <button :disabled="isEvolving" @click="updateXP('add')">Add XP</button>
                <button :disabled="isEvolving" @click="updateXP('minus')">Minus XP</button>
              </div>
            </div>
          </div>

          <div class="bag">
            <h2>My Pokédex</h2>
            <div class="bag-list">
              <div v-for="poke in user.pokemons" :key="poke.species" class="bag-pokemon">
                <img v-if="bagImages[poke.species]" :src="bagImages[poke.species]" :alt="poke.name">
                <p>{{ poke.name }}</p>
                <p>Stage: {{ poke.evolution_stage }}</p>
                <p>XP: {{ poke.xp }}/100</p>
                <button
                  :disabled="isEvolving || user.active_pokemon_species === poke.species"
                  @click="selectPoke(poke)"
                >{{ user.active_pokemon_species === poke.species ? 'Active' : 'Make Active' }}</button>
              </div>
            </div>
          </div>
        </div>

        <div class="available-section">
          <h2>Available Pokémon</h2>
          <div class="available-list">
            <div v-for="poke in availablePokemon" :key="poke.species" class="available-card">
              <img v-if="availableImages[poke.species]" :src="availableImages[poke.species]" :alt="poke.species">
              <h3>{{ poke.species }}</h3>
              <p>Stage 0</p>
              <button @click="addPokemon(poke)">Add</button>
            </div>
            <p v-if="availablePokemon.length === 0">All Pokémon collected!</p>
          </div>
        </div>
      </div>
    </div>
  </main>
</template>



<style scoped>

/* =====================================================
   1. MAIN PAGE
   Yellow frame surrounding the entire StudyDex page
===================================================== */

main {
  background: #ffd000;
  height: 100vh;
  width: 100%;
  padding: 16px;
  box-sizing: border-box;
  overflow: hidden;
}


/* =====================================================
   2. PAGE BACKGROUND
   Background image behind the dashboard and navbar
===================================================== */

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
   3. NAVBAR - MAIN CONTAINER
===================================================== */

.navbar {
  display: flex;
  align-items: center;
  gap: 15px;

  width: 100%;
  min-height: 65px;
  flex-shrink: 0;

  padding: 8px 12px;

  background: rgba(255,255,255,0.85);
  border-radius: 15px;
  box-sizing: border-box;
}


/* =====================================================
   4. NAVBAR - CLOCK AND DATE
===================================================== */

.clock {
  background: #ffe49b;
  border: 2px solid #30304b;

  padding: 5px 8px;
  text-align: center;

  min-width: 115px;
  flex-shrink: 0;
}

.clock-time {
  font-size: 19px;
  font-weight: 900;
  color: #243954;
  white-space: nowrap;
}

.clock-date {
  font-size: 11px;
  font-weight: bold;
  color: #243954;
  text-transform: uppercase;
}


/* =====================================================
   5. NAVBAR - STUDYDEX LOGO
===================================================== */

.logo {
  display: flex;
  align-items: center;
  flex-shrink: 0;
}

.logo img {
  width: clamp(110px, 12vw, 200px);
  height: auto;
}


/* =====================================================
   6. NAVBAR - TRAINER PROFILE
===================================================== */

.trainer {
  display: flex;
  align-items: center;
  gap: 7px;

  background: #adb5bd;
  border: 2px solid white;
  border-radius: 25px;

  padding: 3px 12px 3px 4px;

  white-space: nowrap;
  font-weight: bold;
  color: #30304b;

  flex-shrink: 0;
}

.trainer img {
  width: 25px;
  height: 25px;
  object-fit: contain;
  image-rendering: pixelated;
}


/* =====================================================
   7. NAVBAR - NAVIGATION LINKS
   Study Decks, My Progress, Pokepacks and Home
===================================================== */

.nav-links {
  display: flex;
  align-items: center;

  flex: 1;
  gap: 10px;
  min-width: 0;
}

.nav-btn {
  flex: 1;
  min-width: 0;

  background: #aeb6bf;
  border: 3px solid white;
  border-radius: 25px;

  padding: 5px 8px;

  color: #30304b;
  font-weight: bold;
  font-size: 14px;

  text-align: center;
  text-decoration: none;
  white-space: nowrap;

  transition: background-color 0.2s;
}

.nav-btn:hover,
.nav-btn.router-link-exact-active {
  background: #ffd942;
}


/* =====================================================
   8. MAIN DASHBOARD GRID
   Left: Avatar, Battle Buddy, My Pokédex
   Right: Available Pokémon
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


/* =====================================================
   9. LEFT COLUMN
===================================================== */

.left-section {
  display: flex;
  flex-direction: column;
  gap: 15px;

  min-width: 0;
  min-height: 0;
}


/* =====================================================
   10. AVATAR + BATTLE BUDDY CARD
   Shared translucent white background
===================================================== */

.current-avatar {
  display: flex;
  gap: 15px;

  width: 100%;
  flex: 1.5;
  min-height: 0;

  background: rgba(255,255,255,0.85);
  border-radius: 15px;

  padding: 15px;
  box-sizing: border-box;
  overflow: hidden;
}


/* =====================================================
   11. AVATAR / BATTLE BUDDY INNER COLUMNS
===================================================== */

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
   12. TRAINER AVATAR IMAGE
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
   13. BATTLE BUDDY - POKÉMON IMAGE CONTAINER
   Keeps sprite, glow, sparkles and flash together
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


/* =====================================================
   14. BATTLE BUDDY - NORMAL POKÉMON IMAGE
===================================================== */

.active-pokemon-img {
  position: relative;
  z-index: 4;

  width: auto;
  height: 100%;
  max-width: 100%;

  object-fit: contain;
  image-rendering: pixelated;

  transform-origin: center;
}


/* =====================================================
   15. BATTLE BUDDY - DEFEATED POKÉMON
   Grey and tilted sprite when Pokémon is defeated
===================================================== */

.active-pokemon-img.defeated {
  filter: grayscale(100%);
  opacity: 0.5;
  transform: rotate(90deg);
}


/* =====================================================
   16. EVOLUTION - GLOWING BACKGROUND
   Soft circular light appears behind the Pokémon
===================================================== */

.evo-glow {
  position: absolute;

  /* Centre the glow behind the Pokémon */
  top: 50%;
  left: 50%;

  /* Make the glow circular */
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

  /* Soften edges further */
  filter: blur(12px);

  animation: evo-glow-pulse 1s ease-in-out infinite alternate;
}
/* =====================================================
   DEVOLUTION - RED BACKGROUND GLOW
   Overrides the default evolution glow colour
===================================================== */
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
/* =====================================================
   17. EVOLUTION - GLOW PULSING ANIMATION
===================================================== */

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
   18. EVOLUTION - SPARKLE LAYER
   Holds the floating white particles
===================================================== */

.sparkle-layer {
  position: absolute;
  inset: 0;
  z-index: 5;
  pointer-events: none;
}


/* =====================================================
   19. EVOLUTION - INDIVIDUAL SPARKLES
===================================================== */

.sparkle {
  position: absolute;

  width: 12px;
  height: 12px;
  border-radius: 50%;

  background: rgba(255,255,255,0.95);

  box-shadow:
    0 0 10px rgba(255,255,255,0.95),
    0 0 22px rgba(255,255,210,0.8);

  animation: sparkle-float 1.5s ease-in-out infinite;
}
/* =====================================================
   20. EVOLUTION - SPARKLE POSITIONS
===================================================== */

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


/* =====================================================
   21. EVOLUTION - FLOATING SPARKLE ANIMATION
===================================================== */

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
   22. EVOLUTION - WHITE FLASH DURING SPRITE SWAP
   Bright flash helps disguise image replacement
===================================================== */

.swap-flash {
  position: absolute;
  inset: 0;
  z-index: 6;

  background: radial-gradient(
    circle,
    rgba(255,255,255,1) 0%,
    rgba(255,255,255,0.95) 35%,
    rgba(255,255,220,0.7) 60%,
    rgba(255,255,255,0) 100%
  );

  pointer-events: none;

  animation: swap-burst 0.5s ease-out forwards;
}


/* =====================================================
   23. EVOLUTION - WHITE BURST ANIMATION
===================================================== */

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
   24. EVOLUTION / DEVOLUTION - FLASHING SPRITES
   Same animation for both the old and new Pokémon
===================================================== */

.active-pokemon-img.evolving,
.active-pokemon-img.revealing {
  animation: pokemon-flash 0.36s ease-in-out infinite alternate;
}


/* =====================================================
   25. EVOLUTION - SPRITE SWAPPING STATE
   Temporarily turns the Pokémon into white silhouette
===================================================== */

.active-pokemon-img.swapping {
  filter: brightness(0) invert(1);
  transform: scale(1.22);
  opacity: 0.9;
}


/* =====================================================
   26. EVOLUTION - FLASHING ANIMATION KEYFRAMES
===================================================== */

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


/* =====================================================
   27. EVOLUTION / DEVOLUTION - RESULT MESSAGE
===================================================== */

.evolution-message {
  font-weight: bold;
  font-size: 13px;
  color: #795500;
  text-align: center;
}

/* =====================================================
   EVOLUTION - SMOOTH FADE IN / OUT
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

@media (prefers-reduced-motion: reduce) {
  .evo-glow {
    animation: none;
  }

  .glow-fade-enter-active,
  .glow-fade-leave-active {
    transition: none;
  }
}


/* =====================================================
   28. AVATAR AND XP BUTTON CONTAINERS
===================================================== */

.avatar-buttons,
.xp-buttons {
  display: flex;
  justify-content: center;
  flex-wrap: wrap;
  gap: 8px;
}


/* =====================================================
   29. BUTTONS - AVATAR, XP AND MAKE ACTIVE
===================================================== */

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
   30. BATTLE BUDDY - XP SECTION
===================================================== */

.xp-section {
  width: 100%;
  max-width: 220px;
}


/* =====================================================
   31. BATTLE BUDDY - XP PROGRESS BAR
===================================================== */

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
   32. MY POKÉDEX - MAIN CONTAINER
===================================================== */

.bag {
  flex: 1;
  min-height: 0;
  min-width: 0;
  width: 100%;

  background: rgba(255,255,255,0.85);
  border-radius: 15px;

  padding: 15px;
  box-sizing: border-box;

  display: flex;
  flex-direction: column;
  align-items: center;

  overflow: hidden;
}


/* =====================================================
   33. MY POKÉDEX AND AVAILABLE POKÉMON HEADINGS
===================================================== */

.bag h2,
.available-section h2 {
  font-size: clamp(18px, 1.7vw, 24px);
  font-weight: 900;
  color: #30304b;

  margin: 0 0 12px;
  flex-shrink: 0;
}


/* =====================================================
   34. MY POKÉDEX - POKÉMON LIST
===================================================== */

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


/* =====================================================
   35. MY POKÉDEX - INDIVIDUAL POKÉMON CARD
===================================================== */

.bag-pokemon {
  width: 145px;
  flex-shrink: 0;

  background: rgba(255,255,255,0.85);
  border: 2px solid #ffcc00;
  border-radius: 10px;

  padding: 8px;
  box-sizing: border-box;

  text-align: center;
}


/* =====================================================
   36. MY POKÉDEX - POKÉMON IMAGE
===================================================== */

.bag-pokemon img {
  width: 100%;
  height: clamp(60px, 11vh, 100px);

  object-fit: contain;
  image-rendering: pixelated;
}


/* =====================================================
   37. MY POKÉDEX - TEXT AND BUTTON
===================================================== */

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
   38. AVAILABLE POKÉMON - RIGHT PANEL
===================================================== */

.available-section {
  display: flex;
  flex-direction: column;
  align-items: center;

  min-width: 0;
  min-height: 0;
  width: 100%;

  background: rgba(255,255,255,0.85);
  border-radius: 15px;

  padding: 20px;
  box-sizing: border-box;

  overflow: hidden;
}


/* =====================================================
   39. AVAILABLE POKÉMON - GRID
===================================================== */

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


/* =====================================================
   40. AVAILABLE POKÉMON - INDIVIDUAL CARD
===================================================== */

.available-card {
  background: rgba(255,255,255,0.85);
  border: 2px solid #ffcc00;
  border-radius: 12px;

  padding: 10px;
  min-width: 0;
  box-sizing: border-box;

  text-align: center;
}


/* =====================================================
   41. AVAILABLE POKÉMON - IMAGE
===================================================== */

.available-card img {
  width: 100%;
  height: clamp(65px, 12vh, 110px);

  object-fit: contain;
  image-rendering: pixelated;
}


/* =====================================================
   42. AVAILABLE POKÉMON - NAME AND DESCRIPTION
===================================================== */

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


/* =====================================================
   43. AVAILABLE POKÉMON - ADD BUTTON
===================================================== */

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
   44. RESPONSIVE DESIGN - SMALL DESKTOP
   Screen width 1100px and below
===================================================== */

@media (max-width: 1100px) {

  .navbar {
    flex-wrap: wrap;
    justify-content: center;
  }

  .nav-links {
    flex-basis: 100%;
  }

  .content {
    gap: 12px;
    padding: 15px;
  }

  .content-grid {
    gap: 15px;
  }

}


/* =====================================================
   45. RESPONSIVE DESIGN - TABLET
   Screen width 800px and below
===================================================== */

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


/* =====================================================
   46. RESPONSIVE DESIGN - MOBILE
   Screen width 500px and below
===================================================== */

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

  .nav-links {
    flex-wrap: wrap;
    gap: 8px;
  }

  .nav-btn {
    flex: 1 1 40%;
  }

  .available-list {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .bag-pokemon {
    width: 130px;
  }

}


/* =====================================================
   47. ACCESSIBILITY - REDUCED MOTION
   Disables animated effects for sensitive users
===================================================== */

@media (prefers-reduced-motion: reduce) {

  .active-pokemon-img.evolving,
  .active-pokemon-img.revealing,
  .evo-glow,
  .sparkle,
  .swap-flash {
    animation: none;
  }

}

</style>
