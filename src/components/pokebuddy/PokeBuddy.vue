<script setup>
import axios from 'axios';
import { onMounted, ref,onUnmounted, computed } from 'vue';

const avatar_img = ref('/assets/male.png')
const max_xp = 100

const pokemondata = [
  {
    species: "Pichu",
    type: ["Electric"],
    evolution: ["Pichu", "Pikachu", "Raichu"]
  },
  {
    species: "Charmander",
    type: ["Fire"],
    evolution: ["Charmander", "Charmeleon", "Charizard"]
  },
  {
    species: "Squirtle",
    type: ["Water"],
    evolution: ["Squirtle", "Wartortle", "Blastoise"]
  },
  {
    species: "Bulbasaur",
    type: ["Grass", "Poison"],
    evolution: ["Bulbasaur", "Ivysaur", "Venusaur"]
  },
  {
    species: "Eevee",
    type: ["Normal"],
    evolution: ["Eevee", "Vaporeon"]
  },
  {
    species: "Munchlax",
    type: ["Normal"],
    evolution: ["Munchlax", "Snorlax"]
  }
]

// holder as data is now local
const user = ref({
  name: "Jake",
  age: 8,
  avatar_img: '/assets/male.png',
  avatar_gender: 'male',
  active_pokemon_species: 'Pichu',
  pokemons: [
    {
      name: "Pichu",
      species: "Pichu",
      evolution_stage: 0,
      xp: 80,
      isDefeated: false
    },
    {
      name: "Charmander",
      species: "Charmander",
      evolution_stage: 0,
      xp: 60,
      isDefeated: false
    }
  ]
})

function avatar_click(avatar){
    avatar_img.value = `/assets/${avatar}.png`

    user.value.avatar_img = avatar_img.value

    user.value.avatar_gender = avatar
}


const pokemon = ref(null)
const bagImages = ref({})

async function getPokemon(poke_name, species) {
  try {
    const response = await axios.get(
      `https://pokeapi.co/api/v2/pokemon/${poke_name.toLowerCase()}`
    )

    const pokemonData = {
      id: response.data.id,
      name: response.data.name,
      image: response.data.sprites.front_default,
      image2: response.data.sprites.other['official-artwork'].front_default,
      type: response.data.types.map(t => t.type.name)
    }

    // Update the Pokemon image in the bag
    bagImages.value[species] = pokemonData.image

    // Update the active Pokemon image if it matches
    if (species === user.value.active_pokemon_species) {
      pokemon.value = pokemonData
    }

    return pokemonData

  } catch (error) {
    console.error('Error fetching Pokemon:', error)
    return null
  }
}

const poke_Stats = ref(null)
function getactivePokemonStats(){
  poke_Stats.value = pokemondata.find(p => p.species == user.value.active_pokemon_species)
  console.log(poke_Stats.value,'pokeee')
}

function updateXP(action) {
  if (!activePokemon.value) return

  getactivePokemonStats()

  const maxStage = poke_Stats.value.evolution.length - 1

  if (action === 'add') {

    // Revive defeated Pokemon
    if (activePokemon.value.isDefeated) {
      activePokemon.value.isDefeated = false
    }

    let newxp = activePokemon.value.xp + 10

    if (newxp >= max_xp) {

      // Already at maximum evolution
      if (activePokemon.value.evolution_stage >= maxStage) {
        activePokemon.value.xp = max_xp

        alert(
          `${activePokemon.value.name} has reached its maximum evolution!`
        )

        return
      }

      // Evolve Pokemon
      activePokemon.value.evolution_stage += 1

      activePokemon.value.name =
        poke_Stats.value.evolution[activePokemon.value.evolution_stage]

      activePokemon.value.xp = 0

      getPokemon(
        activePokemon.value.name,
        activePokemon.value.species
      )

    } else {
      activePokemon.value.xp = newxp
    }

  } else if (action === 'minus') {

    // Already defeated
    if (activePokemon.value.isDefeated) return

    let newxp = activePokemon.value.xp - 10

    if (newxp < 0) {

      if (activePokemon.value.evolution_stage > 0) {

        // Devolve Pokemon
        activePokemon.value.evolution_stage -= 1

        activePokemon.value.name =
          poke_Stats.value.evolution[activePokemon.value.evolution_stage]

        activePokemon.value.xp = max_xp - 10

        getPokemon(
          activePokemon.value.name,
          activePokemon.value.species
        )

      } else {

        // First evolution at 0 XP -> Defeated
        activePokemon.value.xp = 0
        activePokemon.value.isDefeated = true

        alert(`${activePokemon.value.name} has been defeated!`)
      }

    } else {
      activePokemon.value.xp = newxp
    }
  }
}

// BAGGGG

async function getBagImages() {
  await Promise.all(
    user.value.pokemons.map(poke =>
      getPokemon(poke.name, poke.species)
    )
  )
}

function selectPoke(poke){
    user.value.active_pokemon_species = poke.species
    getActivePokemon()

    alert(`${poke.name} set as new Active Pokemon`)

}


const activePokemon = ref(null)

function getActivePokemon() {
  activePokemon.value = user.value.pokemons.find(
    p => p.species === user.value.active_pokemon_species
  )

  if (activePokemon.value) {
    getPokemon(
      activePokemon.value.name,
      activePokemon.value.species
    )
  }
}

function addPokemon(poke){
  let user_pokemons = user.value.pokemons
  console.log(user_pokemons)
  console.log(poke)
  user_pokemons.push(
    {
      name: poke.evolution[0],
      species: poke.species,
      evolution_stage: 0,
      xp: 0,
      isDefeated: false
    }
  )

  alert(`${poke.species} added to PokeDex!`)

  getBagImages()
}


// navbar script
const currentTime = ref(new Date())

let clockInterval

// Separated from the onMOunted for this page as we will move this to common later
onMounted(() => {
  clockInterval = setInterval(() => {
    currentTime.value = new Date()
  }, 1000)
})

// used to update the timing of the real-time clock 
onUnmounted(() => {
  clearInterval(clockInterval)
})

const time = () => {
  return currentTime.value.toLocaleTimeString('en-SG', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  })
}

const date = () => {
  return currentTime.value.toLocaleDateString('en-SG', {
    weekday: 'short',
    day: '2-digit',
    month: 'short'
  })
}

// Pokemon that the user does not own
const availablePokemon = computed(() => {
  return pokemondata.filter(poke =>
    !user.value.pokemons.some(
      owned => owned.species === poke.species
    )
  )
})

// Store the stage 0 Pokemon sprites
const availableImages = ref({})

async function getAvailableImages() {
  await Promise.all(
    pokemondata.map(async poke => {
      try {
        const response = await axios.get(
          `https://pokeapi.co/api/v2/pokemon/${poke.evolution[0].toLowerCase()}`
        )

        availableImages.value[poke.species] =
          response.data.sprites.front_default

      } catch (error) {
        console.error(error)
      }
    })
  )
}

// ON MOUNTED
onMounted(() => {
  getActivePokemon()
  getBagImages()
  getAvailableImages()
})

</script>

<template>
    <main>
        <div class="content">
            <!-- NAVBARRRRRRR MOVE OVER TO COMMON LATER -->
             <nav class="navbar">

              <!-- Clock -->
              <div class="clock">
                <div class="clock-time">
                  ☀️ {{ time() }}
                </div>
                <div class="clock-date">
                  {{ date() }}
                </div>
              </div>

              <!-- Logo -->
              <div class="logo">
                <img src="/assets/studydexlogo.png" style="width: 200px;">
              </div>

              <!-- Trainer -->
              <div class="trainer">
                <img :src="user.avatar_img" alt="Trainer">
                <span>Trainer {{ user.name }}</span>
              </div>

              <!-- Navigation Links -->
              <div class="nav-links">
                <RouterLink to="/" class="nav-btn">
                  Study Decks
                </RouterLink>

                <RouterLink to="/" class="nav-btn">
                  My Progress
                </RouterLink>

                <RouterLink to="/" class="nav-btn">
                  View Pokepacks
                </RouterLink>

                <RouterLink to="/" class="nav-btn">
                  Home
                </RouterLink>
              </div>

            </nav>

            <!-- Main Content -->

            <!-- GRID -->
            <div class="content-grid">

              <!-- LEFT COLUMN -->
              <div class="left-section">

                <!-- AVATAR + BATTLE BUDDY -->
                <div class="current-avatar">

                  <!-- Jake's Avatar -->
                  <div class="avatar">
                    <h2>{{ user.name }}'s Avatar</h2>

                    <p>Selected Style: {{ user.avatar_gender }}</p>

                    <img
                      :src="user.avatar_img"
                      class="avatar-img"
                      alt="Trainer Avatar"
                    >

                    <div class="avatar-buttons">
                      <button @click="avatar_click('female')">
                        Female
                      </button>

                      <button @click="avatar_click('male')">
                        Male
                      </button>
                    </div>
                  </div>

                  <!-- Battle Buddy -->
                  <div class="pokemon-div">
                    <h2>Battle Buddy</h2>

                    <img
                      v-if="pokemon"
                      :src="pokemon.image"
                      :alt="pokemon.name"
                      class="active-pokemon-img"
                      :class="{ defeated: activePokemon?.isDefeated }"
                    >

                    <div v-if="activePokemon" class="xp-section">

                      <p>XP Progress</p>

                      <div class="xp-bar">
                        <div
                          class="xp-fill"
                          :style="{ width: activePokemon.xp + '%' }"
                        ></div>
                      </div>

                      <p>{{ activePokemon.xp }} / {{ max_xp }} XP</p>
                    </div>

                    <div class="xp-buttons">
                      <button @click="updateXP('add')">Add XP</button>
                      <button @click="updateXP('minus')">Minus XP</button>
                    </div>
                  </div>

                </div>

                <!-- MY POKEDEX -->
                <div class="bag">
                  <h2>My Pokédex</h2>

                  <div class="bag-list">
                    <div
                      v-for="poke in user.pokemons"
                      :key="poke.species"
                      class="bag-pokemon"
                    >
                      <img
                        v-if="bagImages[poke.species]"
                        :src="bagImages[poke.species]"
                        :alt="poke.name"
                      >

                      <p>{{ poke.name }}</p>
                      <p>Stage: {{ poke.evolution_stage }}</p>
                      <p>XP: {{ poke.xp }}/100</p>

                      <button
                        @click="selectPoke(poke)"
                        :disabled="user.active_pokemon_species === poke.species"
                      >
                        {{ user.active_pokemon_species === poke.species? 'Active': 'Make Active' }}
                      </button>
                    </div>
                  </div>

                </div>

              </div>

              <!-- RIGHT COLUMN -->
              <div class="available-section">

                <h2>Available Pokémon</h2>

                <div class="available-list">

                  <div
                    v-for="poke in availablePokemon"
                    :key="poke.species"
                    class="available-card"
                  >
                    <img
                      v-if="availableImages[poke.species]"
                      :src="availableImages[poke.species]"
                      :alt="poke.species"
                    >

                    <h3>{{ poke.species }}</h3>

                    <p>Stage 0</p>

                    <button @click="addPokemon(poke)">
                      Add
                    </button>
                  </div>

                  <p v-if="availablePokemon.length === 0">
                    All Pokémon collected!
                  </p>

                </div>

              </div>

            </div>
            <!-- END GRID -->
          </div>
          <!-- END CONTENT -->

    </main>


</template>


<style scoped>
main {
  background-color: rgb(255, 208, 0);
  height: 100vh;
  width: 100%;
  padding: 16px;
  box-sizing: border-box;
  overflow: hidden;
}

.content {
  background-image: url('/backgrounds/morning_homepage.png');
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;

  width: 100%;
  height: 100%;
  box-sizing: border-box;

  display: flex;
  flex-direction: column;
  align-items: center;

  padding: 25px;
  gap: 20px;
  overflow: hidden;
}

/* =========================================
   NAVBAR -> TO BE MOVEDD
========================================= */

.navbar {
  display: flex;
  align-items: center;
  gap: 15px;

  width: 100%;
  min-height: 65px;
  flex-shrink: 0;
  padding: 8px 12px;
  box-sizing: border-box;

  background-color: rgba(255, 255, 255, 0.85);
  border-radius: 15px;
}

/* CLOCK */

.clock {
  background-color: #ffe49b;
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

/* LOGO */

.logo {
  display: flex;
  align-items: center;
  flex-shrink: 0;
}

.logo img {
  width: clamp(110px, 12vw, 200px);
  height: auto;
}

/* TRAINER PROFILE */

.trainer {
  display: flex;
  align-items: center;
  gap: 7px;

  background-color: #adb5bd;
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
}

/* NAVIGATION BUTTONS */

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

  background-color: #aeb6bf;
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
  background-color: #ffd942;
}

/* =========================================
   MAIN CONTENT STUFF BELOW
========================================= */

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

/* left section, avatar/battle buddy, pokedex */

.left-section {
  display: flex;
  flex-direction: column;
  gap: 15px;

  min-width: 0;
  min-height: 0;
}

/* avatar and battle buddy */

.current-avatar {
  display: flex;
  gap: 15px;

  width: 100%;
  flex: 1.5;
  min-height: 0;

  background-color: rgba(255, 255, 255, 0.85);
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
  justify-content: flex-start;

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

/* AVATAR IMAGE */

.avatar-img {
  width: auto;
  height: clamp(95px, 24vh, 220px);
  max-width: 100%;
  min-height: 0;

  object-fit: contain;
  image-rendering: pixelated;

  margin: auto 0;
}

/* POKEMON IMAGE */

.active-pokemon-img {
  width: auto;
  height: clamp(90px, 22vh, 200px);
  max-width: 100%;
  min-height: 0;

  object-fit: contain;
  image-rendering: pixelated;

  margin: auto 0;
}

/* DEFEATED POKEMON */

.active-pokemon-img.defeated {
  filter: grayscale(100%);
  opacity: 0.5;
  transform: rotate(90deg);
}

/* BUTTONS */

.avatar-buttons,
.xp-buttons {
  display: flex;
  justify-content: center;
  flex-wrap: wrap;
  gap: 8px;
}

.avatar-buttons button,
.xp-buttons button,
.bag-pokemon button{
  background-color: #ffd21f;
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
  background-color: #ffbd00;
}

button:disabled {
  background-color: #adb5bd;
  opacity: 0.65;
  cursor: not-allowed;
}

.addPoke-btn{
  background-color: #243954;
}

/* XP BAR */

.xp-section {
  width: 100%;
  max-width: 220px;
}

.xp-bar {
  width: 100%;
  height: 18px;

  background-color: lightgray;
  border-radius: 15px;
  overflow: hidden;

  margin: 8px auto;
}

.xp-fill {
  height: 100%;
  background-color: #4caf50;
  border-radius: 15px;
  transition: width 0.3s ease;
}

/* POKEDEXXXXX */

.bag {
  flex: 1;
  min-height: 0;
  min-width: 0;

  width: 100%;
  box-sizing: border-box;

  background-color: rgba(255, 255, 255, 0.85);
  border-radius: 15px;
  padding: 15px;

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

/* POKEDEX LIST */

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

/* OWNED POKEMON CARD */

.bag-pokemon {
  width: 145px;
  flex-shrink: 0;
  box-sizing: border-box;

  padding: 8px;
  border: 2px solid #ffcc00;
  border-radius: 10px;

  background-color: rgba(255, 255, 255, 0.85);
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
  margin-top: 5px;
  padding: 5px 8px;
  width: 100%;
}

/* right section, available pokemon */

.available-section {
  display: flex;
  flex-direction: column;
  align-items: center;

  min-width: 0;
  min-height: 0;

  width: 100%;
  box-sizing: border-box;

  padding: 20px;
  border-radius: 15px;

  background-color: rgba(255, 255, 255, 0.85);
  overflow: hidden;
}

/* AVAILABLE POKEMON GRID */

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

/* AVAILABLE POKEMON CARD */

.available-card {
  background-color: rgba(255, 255, 255, 0.85);
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
  margin: 5px 0;
  color: #30304b;
}

.available-card p {
  font-size: 12px;
  margin: 4px 0;
}

.available-card button {
  background-color: #96c0f1;
  color:white;
  border: 2px solid white;
  border-radius: 8px;

  padding: 6px 12px;
  font-size: 12px;
  font-weight: bold;
  color: #30304b;
}

/* =========================================
   RESPONSIVE DESIGN - CHATGPTED to be updated
========================================= */

/* SMALL DESKTOP / TABLET */

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

/* TABLET / MOBILE */

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

/* MOBILE */

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
</style>

