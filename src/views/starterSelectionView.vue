
<script setup>
import { ref, onMounted } from 'vue'

const starters = ref([])
const loading = ref(true)
const selectedPokemon = ref(null)

const pokemonNames = ['charmander', 'bulbasaur', 'squirtle']

onMounted(async () => {
  try {
    starters.value = await Promise.all(
      pokemonNames.map(async (name) => {
        const response = await fetch(
          `https://pokeapi.co/api/v2/pokemon/${name}`
        )

        const data = await response.json()

        return {
          id: data.id,
          name: data.name,
          sprite:
            data.sprites.versions['generation-v'][
              'black-white'
            ].animated.front_default ||
            data.sprites.front_default,
          artwork:
            data.sprites.other['official-artwork'].front_default ||
            data.sprites.front_default
        }
      })
    )
  } catch (error) {
    console.error('Failed to load Pokémon:', error)
  } finally {
    loading.value = false
  }
})

function selectPokemon(pokemon) {
  selectedPokemon.value = pokemon.name
}

</script>

<template>
  <main>
    <div class="header">
      Choose your starter Pokemon!
    </div>

    <div class="starters">
      <div v-if="loading" class="loading">
        Loading starters...
      </div>

      <div
        v-for="pokemon in starters"
        :key="pokemon.id"
        class="starter"
        :class="{
          selected: selectedPokemon === pokemon.name
        }"
        :style="{
          '--pokemon-artwork': `url('${pokemon.artwork}')`
        }"
        @click="selectPokemon(pokemon)"
      >
        <img
          :src="pokemon.sprite"
          :alt="pokemon.name"
          class="pokemon-sprite"
        />

        <h2>{{ pokemon.name }}</h2>
      </div>
    </div>

    <!-- Confirm selection button -->
    <button
      class="confirm-button"
      :disabled="!selectedPokemon || loading"
      @click="confirmSelection"
    >
      I Choose You!
    </button>
  </main>
</template>

<style scoped>
    main{
        background-image: url('../../public/backgrounds/starter-bg.png');
        height: 100dvh;
    }

    .header{
        text-align: center;
        font-size:40px;
        color: white;
        background-color: rgba(0, 0, 0, 0.4);
        transform: translateY(70px);
        z-index: -2;
    }

    .starters {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 260px;
    width: 100%;
    transform: translateY(330px);
    }

    .starter {
    position: relative;
    isolation: isolate;
    display: flex;
    flex-direction: column;
    align-items: center;
    cursor: pointer;
    transition: transform 0.3s ease;
    overflow: visible;
    }

    .starter::before {
    content: "";
    position: absolute;
    inset: -200px -200px;
    z-index: -1;

    background-image: var(--pokemon-artwork);
    background-repeat: no-repeat;
    background-position: center;
    background-size: 500px 500px;
    transform: translateY(-90px);

    opacity: 0;
    transition: opacity 0.3s ease;
    pointer-events: none;
    }

    .starter:hover::before {
    opacity: 0.6;
    }

    .starter.selected::before {
    opacity: 0.9;
    }

    .starter:hover {
    transform: translateY(-10px) scale(1.08);
    }

    .pokemon-sprite {
    width: 120px;
    height: 120px;
    object-fit: contain;
    image-rendering: pixelated;
    filter: drop-shadow(0 5px 8px rgba(0, 0, 0, 0.2));
    transition: filter 0.3s ease;
    }

    .starter:hover .pokemon-sprite {
    filter:
        drop-shadow(0 0 12px rgba(255, 255, 255, 0.9))
        drop-shadow(0 5px 8px rgba(0, 0, 0, 0.2));
    }

    .starter h2 {
    margin-top: 8px;
    color: rgb(241, 234, 255);
    font-size: 22px;
    font-weight: 700;
    text-transform: capitalize;
    text-shadow: 0 2px 6px rgba(0, 0, 0, 0.8);
    transition: transform 0.3s ease;
    }

    .starter:hover h2 {
    transform: scale(1.1);
    }

    .loading {
    color: white;
    }

    /* New confirm button styles */
    .confirm-button {
    display: block;
    margin: 400px auto 0;
    padding: 15px 40px;
    border: 2px solid #ffffff;
    border-radius: 12px;
    background-color: #563d7c;
    color: white;
    font-size: 18px;
    font-weight: bold;
    cursor: pointer;
    transition:
        background-color 0.3s ease,
        transform 0.3s ease,
        opacity 0.3s ease;
    }

    .confirm-button:hover:not(:disabled) {
    background-color: #7855a9;
    transform: scale(1.05);
    }

    .confirm-button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    }

    @media (max-width: 480px) {
    .starters {
        gap: 12px;
    }

    .pokemon-sprite {
        width: 90px;
        height: 90px;
    }

    .starter h2 {
        font-size: 14px;
    }
    }
</style>
