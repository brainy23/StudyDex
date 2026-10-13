<script setup>
import axios from 'axios';
import { onMounted, ref } from 'vue';
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
          `${activePokemon.value.name} has reached its maximum evolution! 🎉\nChoose a new Pokemon to add to your bag!`
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
  if(poke.name == activePokemon.value.name){
    alert(`${poke.name} is already active.`)
    return
  }else{
    user.value.active_pokemon_species = poke.species
    getActivePokemon()

    alert(`${poke.name} set as new Active Pokemon`)
  }
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

onMounted(() => {
  getActivePokemon()
  getBagImages()
})


</script>

<template>
    <main>
        <div class="container content">
            <div class="main-content" style="text-align:center">
                <div class="avatar">
                  <p style="font-weight: bold; font-size: 1.5rem;">{{ user.name }}'s Avatar</p>
                  Selected Style: {{ user.avatar_gender }}

                  <img :src="user.avatar_img" style="display:block; margin: auto;">

                    <button @click="avatar_click('female')">Female</button>
                    <button @click="avatar_click('male')">Male</button>
                </div>

                <div class="pokemon-div">
                  <p style="font-weight: bold; font-size: 1.5rem;">Your Battle Buddy</p>
                  <img v-if="pokemon" :src="pokemon.image" alt="" style="width: 300px;">

                   <div class="xp-section" v-if="activePokemon">
                    <p>XP Progress</p>

                    <div class="xp-bar" >
                      <div
                        class="xp-fill"
                        :style="{'width': activePokemon.xp + '%'}"
                      >
                      </div>
                    </div>
                    <p>
                        {{ activePokemon.xp }} / {{ max_xp }} XP
                    </p>


                  </div>
                  <button @click="updateXP('add')">Add XP</button>
                  <button @click="updateXP('minus')">Minus XP</button>
                </div>
            </div>
            <div class="bag">
              <h2>Your PokeDex</h2>

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
                  <button @click="selectPoke(poke)">Make Active Pokemon</button>
                </div>
              </div>
            </div>
        </div>
    </main>


</template>

<style scoped>
    main{
        background-color: rgb(255, 208, 0);
        min-height: 100vh;
        width: 100%;
        padding: 16px;
        box-sizing: border-box;

    }

    .content {
      background-image: url('/backgrounds/morning_homepage.png');
      background-size: cover;
      background-position: center;
      background-repeat: no-repeat;

      width: 100%;
      min-height: calc(100vh - 32px);
      box-sizing: border-box;

      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;

      gap: 25px;
      padding: 30px;
    }

    .main-content{
        background-color: rgba(255, 255, 255, 0.8);
        padding: 10px;
        border-radius: 15px;
        box-shadow: 5px;
        width: fit-content;

        margin: auto;
        display:grid;

        grid-template-columns: 1fr 1fr;
    }

    .xp-bar {
      width: 250px;
      height: 25px;
      background-color: lightgray;
      border-radius: 15px;
      margin: 10px auto;
      overflow: hidden;
    }

    .xp-fill {
      height: 100%;
      background-color: #4caf50;
      border-radius: 15px;
      transition: width 0.3s ease;
    }

    .bag {
      background-color: rgba(255, 255, 255, 0.8);
      border-radius: 15px;
      padding: 20px;
      text-align: center;

      width: 100%;
      max-width: 700px;
      box-sizing: border-box;
    }

  .bag h2 {
    font-size: 1.5rem;
    font-weight: bold;
    margin-bottom: 20px;
  }

  .bag-list {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 15px;
  }

  .bag-pokemon {
    width: 240px;
    padding: 15px;
    text-align: center;

    border: 2px solid rgb(255, 208, 0);
    border-radius: 8px;
    background-color: rgba(255, 255, 255, 0.8);
  }

  .bag-pokemon img {
    width: 200px;
  }

  .bag-pokemon p {
    margin: 5px 0;
    font-weight: bold;
    text-transform: capitalize;
  }

</style>
